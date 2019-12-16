/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const nodeUtil = require('util');
const Ajv = require('ajv');
const setupAsync = require('ajv-async');
const EventEmitter = require('events');
const TeemDevice = require('@f5devcentral/f5-teem').Device;

const logger = require('./logger.js');
const util = require('./util.js');
const deviceUtil = require('./deviceUtil.js');
const persistentStorage = require('./persistentStorage.js').persistentStorage;

const baseSchema = require('../schema/latest/base_schema.json');
const controlsSchema = require('../schema/latest/controls_schema.json');
const systemSchema = require('../schema/latest/system_schema.json');
const sharedSchema = require('../schema/latest/shared_schema.json');
const systemPollerSchema = require('../schema/latest/system_poller_schema.json');
const listenerSchema = require('../schema/latest/listener_schema.json');
const consumerSchema = require('../schema/latest/consumer_schema.json');
const iHealthPollerSchema = require('../schema/latest/ihealth_poller_schema.json');

const customKeywords = require('./customKeywords.js');
const CONTROLS_CLASS_NAME = require('./constants.js').CONTROLS_CLASS_NAME;
const CONTROLS_PROPERTY_NAME = require('./constants.js').CONTROLS_PROPERTY_NAME;
const VERSION = require('./constants.js').VERSION;

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
 * @event change - config was validated and can be propogated
 */
function ConfigWorker() {
    this.validator = this.compileSchema();
    const assetInfo = {
        name: 'Telemetry Streaming',
        version: VERSION
    };
    this.teemDevice = new TeemDevice(assetInfo, 'staging');
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
    return persistentStorage.get(PERSISTENT_STORAGE_KEY)
        .then((data) => {
            if (typeof data === 'undefined') {
                logger.debug(`persistentStorage did not have a value for ${PERSISTENT_STORAGE_KEY}`);
            }
            return (typeof data === 'undefined'
                || typeof data.parsed === 'undefined') ? BASE_CONFIG : data;
        });
};

/**
 * Pre-compile schema (avoids ~5 second delay during config event, when using ajv-async nodent transpiler)
 *
 * @public
 * @returns {Object} Promise which is resolved with the validated schema validator
 */
ConfigWorker.prototype.compileSchema = function () {
    const schemas = {
        base: baseSchema,
        controls: controlsSchema,
        system: systemSchema,
        shared: sharedSchema,
        systemPoller: systemPollerSchema,
        listener: listenerSchema,
        consumer: consumerSchema,
        iHealthPoller: iHealthPollerSchema
    };
    const keywords = customKeywords;

    const ajvOptions = {
        useDefaults: true,
        coerceTypes: true,
        async: true,
        extendRefs: true,
        jsonPointers: true
    };
    const ajv = setupAsync(new Ajv(ajvOptions));
    // add schemas
    Object.keys(schemas).forEach((k) => {
        // ignore base, that will be added later
        if (k !== 'base') {
            ajv.addSchema(schemas[k]);
        }
    });
    // add keywords
    Object.keys(keywords).forEach((k) => {
        ajv.addKeyword(k, keywords[k]);
    });
    // ajv-async nodent transpiler very slow, for now simply prime the pump with seperate compile function
    return ajv.compile(schemas.base);
};

/**
 * Validate JSON data against config schema
 *
 * @public
 * @param {Object} data - data to validate against config schema
 *
 * @returns {Object} Promise which is resolved with the validated schema
 */
ConfigWorker.prototype.validate = function (data) {
    if (this.validator) {
        return this.validator(data)
            .then(() => data)
            .catch((err) => {
                if (err instanceof Ajv.ValidationError) {
                    // eslint-disable-next-line arrow-body-style
                    const errorMap = err.errors.map((errItem) => {
                        return {
                            keyword: errItem.keyword,
                            dataPath: errItem.dataPath,
                            schemaPath: errItem.schemaPath,
                            params: errItem.params,
                            message: errItem.message
                        };
                    });
                    const customError = new Error(util.stringify(errorMap));
                    customError.code = 'ValidationError';
                    return Promise.reject(customError);
                }
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
            configToSave.raw = JSON.parse(JSON.stringify(validatedConfig));

            logger.debug('Expanding configuration');
            data.scratch = { expand: true }; // set flag for additional decl processing
            return this.validate(data);
        })
        .then((expandedConfig) => {
            if (expandedConfig.scratch) delete expandedConfig.scratch; // cleanup
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
                const extraFields = util.getConsumerClasses(config);
                this.teemDevice.report('Telemetry Streaming Telemetry Data', '1', config, extraFields)
                    .catch(err => logger.info(`Unable to send analytics data: ${err.message}`));
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
            logger.exception(`${actionName} error: ${err}`, err);
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
