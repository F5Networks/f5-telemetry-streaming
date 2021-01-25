/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EventEmitter2 = require('eventemitter2');
const nodeUtil = require('util');
const errors = require('./errors');

const deviceUtil = require('./utils/device');
const logger = require('./logger');
const persistentStorage = require('./persistentStorage').persistentStorage;
const util = require('./utils/misc');
const configUtil = require('./utils/config');
const TeemReporter = require('./teemReporter').TeemReporter;
const CONFIG_CLASSES = require('./constants').CONFIG_CLASSES;

const PERSISTENT_STORAGE_KEY = 'config';
const BASE_CONFIG = {
    raw: {},
    normalized: { components: [], mappings: {} }
};

/**
 * ConfigWorker class
 *
 * @property {Object} validator - JSON schema validator
 *
 * @event change - config was validated and can be propagated
 */
function ConfigWorker() {
    this.validators = configUtil.getValidators();
    this.teemReporter = new TeemReporter();
}

nodeUtil.inherits(ConfigWorker, EventEmitter2);

/**
 * Setter for config
 *
 * @public
 * @param {Object} newConfig - new config
 * @param {Object} options - options when setting config
 * @param {String} options.namespaceToUpdate - namespace name of components
 *               that are the only ones that need updating instead of all config
 *
 * @returns {Promise} resolve once config applied
 */
ConfigWorker.prototype.setConfig = function (newConfig, options) {
    return this.upgradeConfiguration(newConfig)
        .then(upgradedConfig => this._notifyConfigChange(upgradedConfig, options));
};

/**
 * TS 1.16.0 introduced the 'normalized' property on the configuration object.
 * Configurations saved prior to 1.16.0 will need to have this property set. Ensure it is set.
 *
 * @param {Object} config           - Configuration object
 * @param {Object} [config.parsed]  - Parsed configuration
 *
 * @returns {Promise} Promise resolved with upgraded config
 */
ConfigWorker.prototype.upgradeConfiguration = function (config) {
    if (util.isObjectEmpty(config)) {
        return Promise.resolve(util.deepCopy(BASE_CONFIG));
    }

    if (config.normalized) {
        return Promise.resolve(config);
    }

    return this.expandConfig(util.deepCopy(config.raw))
        .then(expandedConfig => configUtil.normalizeConfig(expandedConfig))
        .then((normalizedConfig) => {
            config.normalized = normalizedConfig;
            // Remove unnecessary config.parsed property
            delete config.parsed;
            return this.saveConfig(config);
        })
        .then(() => {
            logger.debug('Upgraded saved configuration to have \'normalized\' configuration');
            return this.getConfig();
        });
};

/**
 * Notify listeners about config change
 *
 * @private
 * @param {Object} newConfig - new config
 * @param {Object} options - options when setting config
 * @param {String} options.namespaceToUpdate - namespace of components
 *               that are the only ones that need updating instead of all config
 *
 * @emits ConfigWorker#change
 *
 * @returns {Promise} resolved once all listeners received config and processed it
 */
ConfigWorker.prototype._notifyConfigChange = function (newConfig, options) {
    if (!newConfig || !newConfig.normalized) {
        throw new Error('_notifyConfigChange() Missing required config.');
    }
    // handle passphrases first - decrypt, download, etc.
    return deviceUtil.decryptAllSecrets(newConfig.normalized)
        .then((decryptedConfig) => {
            // deepCopy the emitted config
            // HOWEVER: the copy is passed by reference to each Listener.
            // Any listener that modifies the config must make its own local copy.
            const configToEmit = util.deepCopy(decryptedConfig);
            if (!util.isObjectEmpty(options) && typeof options.namespaceToUpdate !== 'undefined') {
                configToEmit.components.forEach((component) => {
                    if (component.namespace !== options.namespaceToUpdate) {
                        component.skipUpdate = true;
                    }
                });
            }
            return this.emitAsync('change', configToEmit);
        })
        .catch((err) => {
            logger.error(`notifyConfigChange error: ${err}`);
        });
};
/**
 * Load config
 *
 * @public
 * @returns {Object} Promise which is resolved once state is saved
 */
ConfigWorker.prototype.loadConfig = function () {
    return this.getConfig()
        .then(config => this.setConfig(config))
        .then(() => {
            logger.info('Application config loaded');
        })
        .catch((err) => {
            logger.exception('Unexpected error on attempt to load application state', err);
            return Promise.reject(err);
        });
};

/**
 * Save config
 *
 * @public
 * @returns {Object} Promise which is resolved once state is saved
 */
ConfigWorker.prototype.saveConfig = function (config) {
    // persistentStorage.set will make copy of data
    return persistentStorage.set(PERSISTENT_STORAGE_KEY, config)
        .then(() => logger.debug('Application config saved'))
        .catch((err) => {
            logger.exception('Unexpected error on attempt to save application state', err);
            return Promise.reject(err);
        });
};

/**
 * Get config
 *
 * @public
 * @returns {Promise} Promise resolved with config
 */
ConfigWorker.prototype.getConfig = function () {
    // persistentStorage.get returns data copy
    return persistentStorage.get(PERSISTENT_STORAGE_KEY)
        .then((data) => {
            let config = util.deepCopy(BASE_CONFIG);

            if (typeof data === 'undefined') {
                logger.debug(`persistentStorage did not have a value for ${PERSISTENT_STORAGE_KEY}`);
            } else if (!util.isObjectEmpty(data.raw)) {
                // NOTE: data.parsed would only be available for legacy format (< v1.16 )
                // starting 1.16, data.parsed is replaced by data.normalized
                config = data;
            }
            return config;
        });
};

/**
 * Validate JSON data against config schema
 *
 * @public
 * @param {Object} data       - data to validate against config schema
 * @param {Object} options    - optional validation settings
 * @param {String} options.schemaType - type of schema to validate against. Defaults to full (whole schema)
 * @param {Object} options.context - additional context to pass through to validator
 *
 * @returns {Object} Promise which is resolved with the validated schema
 */
ConfigWorker.prototype.validate = function (data, options) {
    options = util.assignDefaults(options, { schemaType: 'full' });

    if (!util.isObjectEmpty(this.validators)) {
        const validatorFunc = this.validators[options.schemaType];
        if (typeof validatorFunc !== 'undefined') {
            return configUtil.validate(validatorFunc, data, options.context)
                .catch(err => Promise.reject(new errors.ValidationError(err)));
        }
    }

    return Promise.reject(new Error('Validator is not available'));
};

/**
 * Performs additional processing for config and returns an expanded version
 * (e.g. assign property defaults)
 *
 * @private
 * @param {Object} rawConfig     - config to expand
 *
 * @returns {Object} Promise which is resolved with the expanded config
 */
ConfigWorker.prototype.expandConfig = function (rawConfig) {
    return this.validate(rawConfig, { context: { expand: true } }); // set flag for additional decl processing
};

/**
 * Process incoming, user provided declaration (namespace only)
 *
 * Merge namespace declaration with any existing config and then perform validation, parsing and application
 *
 * @public
 * @param {Object} data - namespace-only data to process
 * @param {String} namespace - namespace to which config belongs to
 *
 * @returns {Object} Promise resolved with copy of validated namespace config resolved on success
 */

ConfigWorker.prototype.processNamespaceDeclaration = function (data, namespace) {
    return this.validate(data, { schemaType: CONFIG_CLASSES.NAMESPACE_CLASS_NAME })
        .then(() => this.getConfig())
        .then((savedConfig) => {
            const mergedDecl = util.isObjectEmpty(savedConfig.raw) ? { class: 'Telemetry' } : util.deepCopy(savedConfig.raw);
            mergedDecl[namespace] = data;
            return this.processDeclaration(mergedDecl, { savedConfig, namespaceToUpdate: namespace })
                .then(fullConfig => Promise.resolve(fullConfig[namespace] || {}));
        });
};

/**
 * Process incoming, user provided declaration (full config)
 *
 * Validate JSON data against config schema, parse it and apply it to current app
 *
 * @public
 * @param {Object} data - data to validate against config schema
 * @param {Object} options - options when processing declaration config
 * @param {String} options.namespaceToUpdate - only update this namespace config
 * @param {Object} options.savedConfig - existing config to merge namespace config with
 *
 * @returns {Object} Promise resolved with copy of validated config resolved on success
 */
ConfigWorker.prototype.processDeclaration = function (data, options) {
    data = data || {};
    let validatedConfig = {};
    const configToSave = {
        raw: {},
        normalized: {}
    };
    const setConfigOpts = {};
    logger.debug(`Configuration to process: ${util.stringify(data)}`);
    // validate declaration, then run it back through validator with scratch
    // property set for additional processing required prior to internal consumption
    // note: ?show=expanded could return config to user with this processing done (later)
    return this.validate(data)
        .then((config) => {
            // Ensure that 'validatedConfig' is a copy
            validatedConfig = util.deepCopy(config);
            configToSave.raw = validatedConfig;
            logger.debug('Expanding configuration');
            return this.expandConfig(data);
        })
        .then((expandedConfig) => {
            logger.debug('Configuration successfully validated');
            if (!util.isObjectEmpty(options) && options.namespaceToUpdate) {
                setConfigOpts.namespaceToUpdate = options.namespaceToUpdate;
                // normalize the specified namespace config only
                // keep the values for other namespaces if  they already exist
                return configUtil.mergeNamespaceConfig(expandedConfig[options.namespaceToUpdate], options);
            }
            // normalize the whole config, will generate new UUIDs
            return configUtil.normalizeConfig(expandedConfig);
        })
        .then((normalizedConfig) => {
            // config.normalized that we save is a config that is
            // - validated against schema decl
            // - expanded with schema defaults
            // - polymorphic components like poller, systems and endpoints are normalized
            // - converted to the format with ids for lookup
            configToSave.normalized = normalizedConfig;
            logger.debug(`Configuration to save: ${util.stringify(configToSave)}`);
            return this.saveConfig(configToSave);
        })
        .then(() => this.getConfig())
        .then(config => this.setConfig(config, setConfigOpts))
        .then(() => {
            this.teemReporter.process(validatedConfig);
            return validatedConfig;
        })
        .catch(error => Promise.reject(error));
};

/**
 * Get raw (original) config
 *
 * @public
 * @param {String} namespace - namespace name
 *
 * @returns {Promise<Object>} resolved with raw (original) config
 *                           - full declaration if namespace param provided,
 *                             otherwise just the namespace config
 */
ConfigWorker.prototype.getRawConfig = function (namespace) {
    return this.getConfig()
        .then(config => Promise.resolve((config && config.raw) || {}))
        .then((fullConfig) => {
            if (namespace) {
                const namespaceConfig = fullConfig[namespace];
                if (util.isObjectEmpty(namespaceConfig)) {
                    return Promise.reject(new errors.ObjectNotFoundInConfigError(`Namespace with name '${namespace}' doesn't exist`));
                }
                return namespaceConfig;
            }
            return fullConfig;
        });
};


// initialize singleton
let configWorker;
try {
    configWorker = new ConfigWorker();
} catch (err) {
    logger.exception('Unable to create new Config Worker', err);
    throw err;
}


// config worker change event, should be first in the handlers chain
configWorker.on('change', config => new Promise((resolve) => {
    const settings = configUtil.getControls(config);
    if (!util.isObjectEmpty(settings)) {
        // default value should be 'info'
        logger.setLogLevel(settings.logLevel);
    }
    resolve();
}));

// handle EventEmitter errors to avoid NodeJS crashing
configWorker.on('error', (err) => {
    logger.exception('Unhandled error in ConfigWorker', err);
});

module.exports = configWorker;
