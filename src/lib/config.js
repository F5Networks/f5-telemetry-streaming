/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EventEmitter = require('events');
const nodeUtil = require('util');

const deviceUtil = require('./deviceUtil');
const logger = require('./logger');
const persistentStorage = require('./persistentStorage').persistentStorage;
const util = require('./util');
const configUtil = require('./configUtil');
const TeemReporter = require('./teemReporter').TeemReporter;

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
    this.validator = configUtil.getValidator();
    this.teemReporter = new TeemReporter();
}

nodeUtil.inherits(ConfigWorker, EventEmitter);

/**
 * Setter for config
 *
 * @public
 * @param {Object} newConfig - new config
 */
ConfigWorker.prototype.setConfig = function (newConfig) {
    return this.upgradeConfiguration(newConfig)
        .then(upgradedConfig => this._notifyConfigChange(upgradedConfig));
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
 *
 * @emits ConfigWorker#change
 */
ConfigWorker.prototype._notifyConfigChange = function (newConfig) {
    if (!newConfig || !newConfig.normalized) {
        throw new Error('_notifyConfigChange() Missing required config.');
    }
    // handle passphrases first - decrypt, download, etc.
    return deviceUtil.decryptAllSecrets(newConfig.normalized)
        .then((decryptedConfig) => {
            // deepCopy the emitted config
            // HOWEVER: the copy is passed by reference to each Listener.
            // Any listener that modifies the config must make its own local copy.
            this.emit('change', util.deepCopy(decryptedConfig));
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
 * @param {Object} data      - data to validate against config schema
 * @param {Object} [context] - context to pass to validator
 *
 * @returns {Object} Promise which is resolved with the validated schema
 */
ConfigWorker.prototype.validate = function (data, context) {
    if (this.validator) {
        return configUtil.validate(this.validator, data, context)
            .catch((err) => {
                err.code = 'ValidationError';
                return Promise.reject(err);
            });
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
    return this.validate(rawConfig, { expand: true }); // set flag for additional decl processing
};

/**
 * Process incoming, user provided declaration
 * Validate JSON data against config schema, parse it and apply it to current app
 *
 * @public
 * @param {Object} data - data to validate against config schema
 *
 * @returns {Object} Promise with validated config (not the parsed one) resolved on success
 */
ConfigWorker.prototype.processDeclaration = function (data) {
    data = data || {};
    let validatedConfig = {};
    const configToSave = {
        raw: {},
        normalized: {}
    };
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
        .then((config) => {
            // propagate config change
            this.setConfig(config);
            this.teemReporter.process(validatedConfig);
            return validatedConfig;
        })
        .catch(error => Promise.reject(error));
};

/**
 * Get raw (origin) config
 *
 * @public
 * @param {Object} restOperation
 *
 * @returns {Promise<Object>} resolved with raw (origin) config
 */
ConfigWorker.prototype.getRawConfig = function () {
    return this.getConfig().then(config => Promise.resolve((config && config.raw) || {}));
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
configWorker.on('change', (config) => {
    const settings = configUtil.getControls(config);
    if (util.isObjectEmpty(settings)) {
        return;
    }
    // default value should be 'info'
    logger.setLogLevel(settings.logLevel);
});

// handle EventEmitter errors to avoid NodeJS crashing
configWorker.on('error', (err) => {
    logger.exception('Unhandled error in ConfigWorker', err);
});

module.exports = configWorker;
