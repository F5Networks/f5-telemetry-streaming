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

const baseSchema = require('./config/base_schema.json');
const systemPollerSchema = require('./config/system_poller_schema.json');
const listenerSchema = require('./config/listener_schema.json');
const consumerSchema = require('./config/consumer_schema.json');
const customKeywords = require('./customKeywords.js');

/**
 * ConfigWorker class
 *
 * @property {Object} state - current state
 * @property {Object} state.config - current config object
 *
 * @event change - config was validated and can be propogated
 */
function ConfigWorker() {
    this._state = {};
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
 * @param {bool} fire - fire 'change' event or not
 */
ConfigWorker.prototype.setConfig = function (newConfig, fire) {
    this._state.config = newConfig;
    if (fire === undefined || fire) {
        this._notifyConfigChange();
    }
};

/**
 * Notify listeners about config change
 *
 * @private
 * @emits ConfigWorker#change
 */
ConfigWorker.prototype._notifyConfigChange = function () {
    // handle passphrases first - decrypt, download, etc.
    util.decryptAllSecrets(this._state.config)
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
        .then(() => logger.info('state saved'))
        .catch((err) => {
            logger.exception('Unexpected error on attempt to save state', err);
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
            logger.info('state loaded');
            this._state = state;
            this._notifyConfigChange();
            return Promise.resolve(state);
        })
        .catch((err) => {
            logger.exception('Unexpected error on attempt to load state', err);
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
        systemPoller: systemPollerSchema,
        listener: listenerSchema,
        consumer: consumerSchema
    };
    const keywords = customKeywords;

    const ajv = setupAsync(new Ajv({ useDefaults: true, coerceTypes: true, async: true }));
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
        return this.validator(data).then(() => data);
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
                raw: null,
                parsed: util.formatConfig(config)
            };
            logger.debug(`Configuration to save: ${util.stringify(configToSave)}`); // helpful debug, for now

            // do not fire event until state saved
            logger.info('Configuration successfully validated');
            this.setConfig(configToSave, false);
            return this.saveState();
        })
        .then(() => {
            // propagate config change
            this.setConfig(this.config);
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
    // try to validate new config
    return this.validateAndApply(restOperation.getBody())
        .then((config) => {
            util.restOperationResponder(restOperation, 200,
                { message: 'success', declaration: config });
        })
        .catch((err) => {
            const errObj = {};
            if (err instanceof Ajv.ValidationError) {
                errObj.code = 422;
                errObj.message = 'Unprocessable entity';
                // eslint-disable-next-line
                errObj.error = err.errors.map((errItem) => {
                    return {
                        keyword: errItem.keyword,
                        dataPath: errItem.dataPath,
                        schemaPath: errItem.schemaPath,
                        params: errItem.params,
                        message: errItem.message
                    };
                });
            } else {
                errObj.code = 500;
                errObj.message = 'Internal Server Error';
                errObj.error = `${err.message ? err.message : err}`;
            }
            logger.exception(`validateAndApply error: ${err}`, err);
            util.restOperationResponder(restOperation, errObj.code, errObj);
        });
};

// initialize singleton
const configWorker = new ConfigWorker();

// handle EventEmitter errors to avoid NodeJS crashing
configWorker.on('error', (err) => {
    logger.exception('Unhandled error in ConfigWorker', err);
});

module.exports = configWorker;
