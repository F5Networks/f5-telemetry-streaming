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
const logger = require('./logger.js');
const util = require('./util.js');

const baseSchema = require('./schema/base_schema.json');
const controlsSchema = require('./schema/controls_schema.json');
const systemPollerSchema = require('./schema/system_poller_schema.json');
const listenerSchema = require('./schema/listener_schema.json');
const consumerSchema = require('./schema/consumer_schema.json');
const customKeywords = require('./customKeywords.js');
const CONTROLS_CLASS_NAME = require('./constants.js').CONTROLS_CLASS_NAME;
const CONTROLS_PROPERTY_NAME = require('./constants.js').CONTROLS_PROPERTY_NAME;

/**
 * ConfigWorker class
 *
 * @property {Object} state - current state
 * @property {Object} state.config - current config object
 *
 * @event change - config was validated and can be propogated
 */
function ConfigWorker() {
    this._state = {
        config: {
            raw: {},
            parsed: {}
        }
    };
    this.restWorker = null;
    this.validator = this.compileSchema();
}

nodeUtil.inherits(ConfigWorker, EventEmitter);

/**
 * Define 'config' property
 */
Object.defineProperty(ConfigWorker.prototype, 'config', {
    /**
     * Getter
     *
     * @returns {Object} current config
     */
    // eslint-disable-next-line object-shorthand
    get: function () {
        return this._state.config;
    }
});

/**
 * Setter for config
 *
 * @public
 * @param {Object} newConfig - new config
 * @param {Boolean} fire     - fire 'change' event or not
 */
ConfigWorker.prototype.setConfig = function (newConfig, fire) {
    this._state.config = newConfig;
    if (fire !== false) {
        return this._notifyConfigChange();
    }
    return Promise.resolve();
};

/**
 * Notify listeners about config change
 *
 * @private
 * @emits ConfigWorker#change
 */
ConfigWorker.prototype._notifyConfigChange = function () {
    // deep copy parsed config
    let parsedConfig;
    if (this._state && this._state.config && this._state.config.parsed) {
        parsedConfig = JSON.parse(JSON.stringify(this._state.config.parsed));
    } else {
        throw new Error('_notifyConfigChange() Missing parsed config.');
    }
    // handle passphrases first - decrypt, download, etc.
    return util.decryptAllSecrets(parsedConfig)
        .then((config) => {
            // copy config to avoid changes from listeners
            this.emit('change', JSON.parse(JSON.stringify(config)));
        })
        .catch((err) => {
            logger.error(`notifyConfigChange error: ${err}`);
        });
};

/**
 * Private method to save state to rest storage
 *
 * @private
 * @returns {Object} Promise which is resolved once state is saved
 */
ConfigWorker.prototype._saveState = function () {
    if (!this.restWorker) {
        const err = 'restWorker is not specified';
        return Promise.reject(new Error(err));
    }
    const _this = this;
    return new Promise((resolve, reject) => {
        _this.restWorker.saveState(null, _this._state, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

/**
 * Save state
 *
 * @public
 * @returns {Object} Promise which is resolved once state is saved
 */
ConfigWorker.prototype.saveState = function () {
    return this._saveState()
        .then(() => logger.debug('Application state saved'))
        .catch((err) => {
            logger.exception('Unexpected error on attempt to save application state', err);
            return Promise.reject(err);
        });
};

/**
 * Private method to load state from rest storage
 *
 * @private
 * @returns {Object} Promise which is resolved with the loaded state
 */
ConfigWorker.prototype._loadState = function () {
    if (!this.restWorker) {
        const err = 'restWorker is not specified';
        return Promise.reject(new Error(err));
    }
    const _this = this;
    const baseState = {
        config: {}
    };
    return new Promise((resolve, reject) => {
        _this.restWorker.loadState(null, (err, state) => {
            if (err) {
                reject(err);
            } else {
                resolve(state || baseState);
            }
        });
    });
};

/**
 * Load state
 *
 * @public
 * @emits ConfigWorker#loadState
 *
 * @returns {Object} Promise which is resolved with the loaded state
 */
ConfigWorker.prototype.loadState = function () {
    return this._loadState()
        .then((state) => {
            logger.info('Application state loaded');
            this._state = state;
            this._notifyConfigChange();
            return Promise.resolve(state);
        })
        .catch((err) => {
            logger.exception('Unexpected error on attempt to load application state', err);
            return Promise.reject(err);
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
        systemPoller: systemPollerSchema,
        listener: listenerSchema,
        consumer: consumerSchema
    };
    const keywords = customKeywords;

    const ajvOptions = {
        useDefaults: true,
        coerceTypes: true,
        async: true,
        extendRefs: true
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
    let validatedConfig = {};
    return this.validate(data)
        .then((config) => {
            validatedConfig = config;
            // no need for raw config
            const configToSave = {
                raw: JSON.parse(JSON.stringify(validatedConfig)),
                parsed: util.formatConfig(config)
            };
            logger.debug('Configuration successfully validated');
            logger.debug(`Configuration to save: ${util.stringify(configToSave)}`); // helpful debug, for now

            // do not fire event until state saved
            this.setConfig(configToSave, false);
            return this.saveState();
        })
        .then(() => {
            // propagate config change
            this.setConfig(this.config, true);
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

    if (method === 'POST') {
        // try to validate new config
        actionName = 'validateAndApply';
        promise = this.validateAndApply(restOperation.getBody());
    } else {
        actionName = 'getDeclaration';
        promise = Promise.resolve((this._state && this._state.config && this._state.config.raw) || {});
    }

    return promise.then((config) => {
        util.restOperationResponder(restOperation, 200,
            { message: 'success', declaration: config });
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
const configWorker = new ConfigWorker();

// config worker change event, should be first in the handlers chain
configWorker.on('change', (config) => {
    let settings;
    if (config && config[CONTROLS_CLASS_NAME] && config[CONTROLS_CLASS_NAME][CONTROLS_PROPERTY_NAME]) {
        settings = config[CONTROLS_CLASS_NAME][CONTROLS_PROPERTY_NAME];
    }
    if (!settings) {
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
