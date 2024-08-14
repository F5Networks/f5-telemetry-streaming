/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const assert = require('./utils/assert');
const CONFIG_CLASSES = require('./constants').CONFIG_CLASSES;
const CONFIG_WORKER = require('./constants').CONFIG_WORKER;
const configUtil = require('./utils/config');
const errors = require('./errors');
const logger = require('./logger');
const SafeEventEmitter = require('./utils/eventEmitter');
const util = require('./utils/misc');

/**
 * @module config
 *
 * @typedef {import('./utils/config').Component} Component
 * @typedef {import('./utils/config').FilterOptions} FilterOptions
 */

const BASE_CONFIG = {
    components: [],
    mappings: {}
};
const BASE_DECLARATION = {
    class: CONFIG_CLASSES.ROOT_CLASS
};
const BASE_STORAGE_DATA = {};

/**
 * ConfigWorker class
 *
 * @event change - config was validated and can be propagated
 * @event received - new declaration received
 * @event validationFailed - declaration validation failed
 * @event validationSucceed - declaration validation succeed
 *
 * @property {configUtil.Configuration} currentConfig - copy of current configuration
 * @property {logger.Logger} logger - logger instance
 * @property {object} validators - AJV validators
 */
class ConfigWorker extends SafeEventEmitter {
    /**
     * @public
     * @returns {configUtil.Configuration} copy of current configuration
     */
    get currentConfig() {
        return util.deepCopy(this._currentConfig || BASE_CONFIG);
    }

    /**
     * @public
     * @returns {logger.Logger} instance
     */
    get logger() {
        // lazy initialization
        Object.defineProperty(this, 'logger', {
            value: logger.getChild('ConfigWorker')
        });
        return this.logger;
    }

    /**
     * @public
     * @returns {object} AJV validators
     */
    get validators() {
        // lazy initialization
        Object.defineProperty(this, 'validators', {
            value: configUtil.getValidators()
        });
        return this.validators;
    }

    /**
     * Cleanup current state
     *
     * @public
     * @returns {void} once data removed from storage
     */
    async cleanup() {
        delete this._currentConfig;

        await new Promise((resolve) => {
            this.emitAsync('storage.remove', CONFIG_WORKER.STORAGE_KEY, resolve);
        });
    }

    /**
     * Get raw (original) config
     *
     * @public
     * @param {string} [namespace] - namespace name
     *
     * @returns {Promise<object>} resolved with raw (original) config - full declaration
     *     if no namespace param provided, otherwise just the namespace config
     */
    getDeclaration(namespace) {
        // returns copy already, don't need to copy one more time
        return getStorageData.call(this)
            .then((storageData) => {
                let declaration = (storageData && storageData.raw) || util.deepCopy(BASE_DECLARATION);
                if (namespace) {
                    declaration = declaration[namespace];
                    if (util.isObjectEmpty(declaration)) {
                        return Promise.reject(new errors.ObjectNotFoundInConfigError(`Namespace with name '${namespace}' doesn't exist`));
                    }
                }
                return declaration;
            });
    }

    /**
     * Load config
     *
     * @public
     * @returns {Promise<object>} resolved with loaded and processed declaration
     */
    load() {
        return this.getDeclaration()
            .then((declaration) => this.processDeclaration(declaration, {
                metadata: {
                    message: 'Loading saved configuration'
                }
            }))
            .catch((error) => {
                this.logger.exception('Unable to load and validate existing declaration', error);
                this.logger.warning('Going to try to load default empty declaration. Old declaration is still accessible via API');
                // to be able to retrieve current declaration via API do not save empty declaration
                return this.processDeclaration(util.deepCopy(BASE_DECLARATION), {
                    save: false,
                    metadata: {
                        message: 'Loading default config! Unable to load saved config, see error message in logs'
                    }
                });
            })
            .then((declaration) => {
                this.logger.info('Application config loaded');
                return declaration;
            });
    }

    /**
     * Process incoming, user provided declaration (namespace only)
     *
     * Merge namespace declaration with any existing config and then perform validation, parsing and application
     *
     * Note: this method mutates 'namespaceDeclaration'
     *
     * @public
     * @param {object} namespaceDeclaration - namespace-only data to process
     * @param {string} namespace - namespace to which config belongs to
     * @param {object} [options] - options, see 'processDeclaration' for more defaults
     * @param {any} [options.metadata] - additional metadata (for logging/debugging only)
     *
     * @returns {Promise<object>} resolved with copy of validated namespace declaration resolved on success
     */
    processNamespaceDeclaration(namespaceDeclaration, namespace, options) {
        // each call to 'validate' mutates data
        namespaceDeclaration = namespaceDeclaration || {};
        options = options || {};
        // make copy of declaration to avoid modifications caused by validation
        return validate.call(this, util.deepCopy(namespaceDeclaration), {
            schemaType: CONFIG_CLASSES.NAMESPACE_CLASS_NAME
        })
            .then(() => this.getDeclaration())
            .then((declaration) => {
                if (typeof declaration[namespace] === 'object' && declaration[namespace].class !== CONFIG_CLASSES.NAMESPACE_CLASS_NAME) {
                    return Promise.reject(new Error(`Unable to override existing object with name "${namespace}" and "class" different from "${CONFIG_CLASSES.NAMESPACE_CLASS_NAME}"`));
                }
                options.namespaceToUpdate = namespace;
                declaration[namespace] = namespaceDeclaration;
                return this.processDeclaration(declaration, options)
                    .then((fullConfig) => (fullConfig[namespace] || {}));
            });
    }

    /**
     * Process incoming, user provided declaration (full config)
     *
     * Validate JSON declaration against config schema, parse it and apply it to current app
     *
     * Note: this method mutates 'declaration'
     *
     * @public
     * @param {object} declaration - declaration to validate against config schema
     * @param {object} [options] - options when processing declaration config
     * @param {boolean} [options.expanded = false] - return expanded declaration instead of just validated
     * @param {any} [options.metadata] - additional metadata (for logging/debugging only)
     * @param {string} [options.namespaceToUpdate] - only update this namespace config
     * @param {boolean} [options.save = true] - save validated declaration to storage
     *
     * @returns {Promise<object>} resolved with copy of validated declaration resolved on success
     */
    processDeclaration(declaration, options) {
        const originDeclaration = util.deepCopy(declaration);
        const setConfigOpts = {};
        const storageData = util.deepCopy(BASE_STORAGE_DATA);
        const transactionID = util.generateUuid();
        let expandedConfig = {};
        let validatedConfig = {};

        declaration = declaration || {};
        options = util.assignDefaults(options, {
            expanded: false,
            save: true
        });
        this.logger.debug(`Configuration to process: ${util.stringify(declaration)}`);
        // validate declaration, then run it back through validator with scratch
        // property set for additional processing required prior to internal consumption
        // each call to 'validate' mutates data
        return this.safeEmitAsync('received', {
            declaration: util.deepCopy(originDeclaration),
            metadata: util.deepCopy(options.metadata),
            transactionID
        })
            .then(() => validate.call(this, declaration))
            .then((config) => {
                // ensure that 'validatedConfig' is a copy
                validatedConfig = util.deepCopy(config);
                storageData.raw = util.deepCopy(config);
                return this.safeEmitAsync('prevalidationSucceed', {
                    declaration: util.deepCopy(validatedConfig),
                    metadata: util.deepCopy(options.metadata),
                    transactionID
                });
            })
            .then(() => {
                this.logger.debug('Expanding configuration');
                return expandDeclaration.call(this, declaration);
            })
            .catch((error) => this.safeEmitAsync('validationFailed', {
                declaration: util.deepCopy(originDeclaration),
                errorMsg: `${error}`,
                metadata: util.deepCopy(options.metadata),
                transactionID
            })
                .then(() => Promise.reject(error)))
            .then((config) => {
                this.logger.debug('Configuration successfully validated');
                expandedConfig = config;
                return this.safeEmitAsync('validationSucceed', {
                    declaration: util.deepCopy(expandedConfig),
                    metadata: util.deepCopy(options.metadata),
                    transactionID
                });
            })
            .then(() => {
                if (options.namespaceToUpdate) {
                    setConfigOpts.namespaceToUpdate = options.namespaceToUpdate;
                    // normalize the specified namespace config only
                    // keep the values for other namespaces if  they already exist
                    return configUtil.mergeDeclaration(
                        { [options.namespaceToUpdate]: expandedConfig[options.namespaceToUpdate] },
                        this.currentConfig
                    );
                }
                // normalize the whole config, will generate new UUIDs
                return configUtil.normalizeDeclaration(expandedConfig);
            })
            .then((conf) => {
                // normalized config is a config that is
                // - validated against schema decl
                // - expanded with schema defaults
                // - polymorphic components like poller, systems and endpoints are normalized
                // - converted to the format with ids for lookup
                this._currentConfig = conf;
                this.logger.debug(`Configuration to save: ${util.stringify(storageData)}`);
                if (options.save) {
                    return saveToStorage.call(this, storageData);
                }
                return Promise.resolve();
            })
            .then(() => notifyConfigChange.call(this, this.currentConfig, setConfigOpts))
            .then(() => (options.expanded ? expandedConfig : validatedConfig));
    }
}

/**
 * @this ConfigWorker
 * @returns {object} data loaded from Persistent Storage
 */
async function getStorageData() {
    let data = await new Promise((resolve, reject) => {
        this.emitAsync('storage.get', CONFIG_WORKER.STORAGE_KEY, (error, value) => {
            if (error) {
                reject(error);
            } else {
                resolve(value);
            }
        });
    });

    if (typeof data === 'undefined') {
        data = util.deepCopy(BASE_STORAGE_DATA);
        this.logger.debug('No pre-existing configuration. Using the default one.');
    }

    // the storage returns data copy
    return data;
}

/**
 * Performs additional processing for declaration and returns an expanded version
 * (e.g. assign property defaults)
 *
 * @this ConfigWorker
 * @param {object} declaration - declaration to expand
 *
 * @returns {Promise<object>} resolved once declaration expanded
 */
function expandDeclaration(declaration) {
    // set flag for additional declaration processing
    return validate.call(this, declaration, { context: { expand: true } });
}

/**
 * Notify listeners about config change
 *
 * NOTE: it mutates 'newConfig'.
 *
 * @this ConfigWorker
 * @param {configUtil.Configuration} newConfig - new config
 * @param {object} options - options when setting config
 * @param {string} options.namespaceToUpdate - namespace of components
 *     that are the only ones that need updating instead of all config
 *
 * @fires ConfigWorker#change
 *
 * @returns {Promise} resolved once all listeners received config and processed it
 */
function notifyConfigChange(newConfig, options) {
    if (!newConfig || !newConfig.components) {
        return Promise.reject(new Error('notifyConfigChange() Missing required config.'));
    }
    // handle passphrases first - decrypt, download, etc.
    // this call mutates 'newConfig'
    return configUtil.decryptSecrets(newConfig)
        .then((decryptedConfig) => {
            if (!util.isObjectEmpty(options) && typeof options.namespaceToUpdate !== 'undefined') {
                decryptedConfig.components.forEach((component) => {
                    if (component.namespace !== options.namespaceToUpdate) {
                        component.skipUpdate = true;
                    }
                });
            }
            return this.emitAsync('change', decryptedConfig);
        })
        .catch((err) => {
            this.logger.exception('notifyConfigChange error: ', err);
        });
}

/**
 * @this ConfigWorker
 *
 * @param {object} storageData - data to save to Persistent Storage
 *
 * @returns {void} once config is saved
 */
async function saveToStorage(storageData) {
    // the storage will make copy of data
    await new Promise((resolve) => {
        this.emitAsync('storage.set', CONFIG_WORKER.STORAGE_KEY, storageData, resolve);
    });

    this.logger.debug('Application config saved');
}

/**
 * Validate JSON declaration against config schema
 *
 * NOTE: it mutates 'declaration'.
 *
 * @this ConfigWorker
 * @param {object} declaration - declaration to validate against config schema
 * @param {object} options - optional validation settings
 * @param {string} options.schemaType - type of schema to validate against. Defaults to full (whole schema)
 * @param {object} options.context - additional context to pass through to validator
 *
 * @returns {Object} Promise which is resolved with the validated schema
 */
function validate(declaration, options) {
    options = util.assignDefaults(options, { schemaType: 'full' });
    const validatorFunc = this.validators[options.schemaType];
    if (typeof validatorFunc !== 'undefined') {
        // AJV validators mutates 'declaration'
        return configUtil.validate(validatorFunc, declaration, options.context)
            .catch((err) => Promise.reject(new errors.ValidationError(err.message)));
    }
    return Promise.reject(new Error('Validator is not available'));
}

/**
 * NOTE: mutates `config`
 *
 * @param {Component | Component[]} config
 * @param {function(error, config: Component | Component[])} callback
 */
async function onDecryptConfig(config, callback) {
    try {
        callback(null, await configUtil.decryptSecrets(config));
    } catch (error) {
        callback(error);
    }
}

/**
 * @param {function(result: Component[])} callback
 * @param {FilterOptions} [filter] filtering options. 'filter' property ignored.
 */
function onGetConfig(callback, filter = {}) {
    delete filter.filter;
    // currentConfig returns a copy every time
    callback(configUtil.getComponents(this.currentConfig, filter));
}

/**
 * @param {Component | Component[]} config
 * @param {function(error, hash: string | string[])} callback
 */
async function onGetHash(config, callback) {
    const isArray = Array.isArray(config);
    config = isArray ? config : [config];

    try {
        assert.not.empty(config, 'config');
        const hash = config.map((c) => {
            assert.object(c, 'config');
            return configUtil.getComponentHash(c);
        });
        callback(null, isArray ? hash : hash[0]);
    } catch (error) {
        callback(error);
    }
}

// initialize singleton
const configWorker = new ConfigWorker();
configWorker.setMaxListeners(20);

// config worker change event, should be first in the handlers chain
configWorker.on('change', (config) => new Promise((resolve) => {
    const settings = configUtil.getTelemetryControls(config);
    if (!util.isObjectEmpty(settings)) {
        // default value should be 'info'
        logger.setLogLevel(settings.logLevel);
    }
    resolve();
}));

// handle EventEmitter errors to avoid NodeJS crashing
configWorker.on('error', (err) => {
    configWorker.logger.exception('Unhandled error in ConfigWorker', err);
});

function initialize(appEvents) {
    const namespace = 'config';
    appEvents.register(configWorker, namespace, [
        { change: 'change' },
        { prevalidationSucceed: 'prevalidated' },
        { received: 'received' },
        { validationFailed: 'validationFailed' },
        { validationSucceed: 'validationSucceed' },
        'storage.get',
        'storage.remove',
        'storage.set'
    ]);

    appEvents.on(`*.${namespace}.decrypt`, onDecryptConfig.bind(configWorker), { objectify: true });
    appEvents.on(`*.${namespace}.getConfig`, onGetConfig.bind(configWorker), { objectify: true });
    appEvents.on(`*.${namespace}.getHash`, onGetHash.bind(configWorker), { objectify: true });
}

module.exports = configWorker;
module.exports.initialize = initialize;

/**
 * Config changed event.
 *
 * The config copy is passed by reference to each Listener. Any listener that modifies
 * the config must make its own local copy.
 *
 * @event ConfigWorker#change
 * @type {configUtil.Configuration}
 */
/**
 * New declaration received.
 *
 * @event ConfigWorker#received
 * @type {object}
 * @property {object} declaration - newly received declaration
 * @property {any} metadata - additional metadata (for logging/debug only)
 * @property {string} transactionID - transaction ID
 */
/**
 * Declaration validation failed.
 *
 * @event ConfigWorker#validationFailed
 * @type {object}
 * @property {object} declaration - declaration
 * @property {Error} error - error
 * @property {any} metadata - additional metadata (for logging/debug only)
 * @property {string} transactionID - transaction ID
 */
/**
 * Declaration validation succeed.
 *
 * @event ConfigWorker#validationSucceed
 * @type {object}
 * @property {object} declaration - newly received declaration
 * @property {any} metadata - additional metadata (for logging/debug only)
 * @property {string} transactionID - transaction ID
 */
