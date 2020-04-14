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

const declValidator = require('./declarationValidator');
const deviceUtil = require('./deviceUtil');
const logger = require('./logger');
const persistentStorage = require('./persistentStorage').persistentStorage;
const util = require('./util');
const TeemReporter = require('./teemReporter').TeemReporter;

const CONTROLS_CLASS_NAME = require('./constants').CONFIG_CLASSES.CONTROLS_CLASS_NAME;
const CONTROLS_PROPERTY_NAME = require('./constants').CONTROLS_PROPERTY_NAME;

const PERSISTENT_STORAGE_KEY = 'config';
const BASE_CONFIG = {
    raw: {},
    parsed: {}
};

/**
 * ConfigWorker class
 *
 * @property {Object} validator - JSON schema validator
 *
 * @event change - config was validated and can be propagated
 */
function ConfigWorker() {
    this.validator = declValidator.getValidator();
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
    return this._notifyConfigChange(newConfig);
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
    // deep copy parsed config
    let parsedConfig;
    if (newConfig && newConfig.parsed) {
        parsedConfig = util.deepCopy(newConfig.parsed);
    } else {
        throw new Error('_notifyConfigChange() Missing parsed config.');
    }
    // handle passphrases first - decrypt, download, etc.
    return deviceUtil.decryptAllSecrets(parsedConfig)
        .then((config) => {
            // copy config to avoid changes from listeners
            this.emit('change', util.deepCopy(config));
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
        .then((config) => {
            logger.info('Application config loaded');
            return this.setConfig(config).then(() => config);
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
            if (typeof data === 'undefined') {
                logger.debug(`persistentStorage did not have a value for ${PERSISTENT_STORAGE_KEY}`);
            }
            return (typeof data === 'undefined'
                || typeof data.parsed === 'undefined') ? util.deepCopy(BASE_CONFIG) : data;
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
        return declValidator.validate(this.validator, data, context)
            .catch((err) => {
                err.code = 'ValidationError';
                return Promise.reject(err);
            });
    }
    return Promise.reject(new Error('Validator is not available'));
};

/**
 * Validate JSON data against config schema and apply it to current app
 *
 * @public
 * @param {Object} data - data to validate against config schema
 *
 * @returns {Object} Promise with validate config resolved on success
 */
ConfigWorker.prototype.validateAndApply = function (data) {
    data = data || {};
    let validatedConfig = {};
    const configToSave = {
        raw: {},
        parsed: {}
    };
    logger.debug(`Configuration to process: ${util.stringify(data)}`);

    // validate declaration, then run it back through validator with scratch
    // property set for additional processing required prior to internal consumption
    // note: ?show=expanded could return config to user with this processing done (later)
    return this.validate(data)
        .then((config) => {
            validatedConfig = config;
            configToSave.raw = util.deepCopy(validatedConfig);

            logger.debug('Expanding configuration');
            return this.validate(data, { expand: true }); // set flag for additional decl processing
        })
        .then((expandedConfig) => {
            configToSave.parsed = util.formatConfig(expandedConfig);

            logger.debug('Configuration successfully validated');
            logger.debug(`Configuration to save: ${util.stringify(configToSave)}`);

            return this.saveConfig(configToSave);
        })
        .then(() => this.getConfig())
        .then((config) => {
            // propagate config change
            this.setConfig(config);
            return validatedConfig;
        })
        .catch(error => Promise.reject(error));
};

/**
 * Handles all client's requests.
 *
 * @public
 * @param {Object} restOperation
 *
 * @returns {void}
 */
ConfigWorker.prototype.processClientRequest = function (restOperation) {
    const method = restOperation.getMethod().toUpperCase();
    let actionName;
    let promise;
    let sendAnalytics = false;

    if (method === 'POST') {
        // try to validate new config
        actionName = 'validateAndApply';
        sendAnalytics = true;
        promise = this.validateAndApply(restOperation.getBody());
    } else {
        actionName = 'getDeclaration';
        promise = this.getConfig().then(config => Promise.resolve((config && config.raw) || {}));
    }

    return promise.then((config) => {
        util.restOperationResponder(restOperation, 200,
            { message: 'success', declaration: config });
        return config;
    })
        .then((config) => {
            if (sendAnalytics) {
                this.teemReporter.process(config);
            }
        })
        .catch((err) => {
            const errObj = {};
            if (err.code === 'ValidationError') {
                errObj.code = 422;
                errObj.message = 'Unprocessable entity';
                errObj.error = err.message;
            } else {
                errObj.code = 500;
                errObj.message = 'Internal Server Error';
                errObj.error = `${err.message ? err.message : err}`;
            }
            logger.exception(`config.${actionName} error`, err);
            util.restOperationResponder(restOperation, errObj.code, errObj);
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
configWorker.on('change', (config) => {
    const settings = util.getDeclarationByName(config, CONTROLS_CLASS_NAME, CONTROLS_PROPERTY_NAME);
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
