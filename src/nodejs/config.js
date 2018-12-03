/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

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

class ConfigWorker extends EventEmitter {
    /**
     * ConfigWorker class
     *
     * @property {Object} state - current state
     * @property {Object} state.config - current config object
     *
     * @event change - config was validated and can be propogated
     */
    constructor() {
        super();
        this._state = {};
        this.restWorker = null;
        this.validator = this.compileSchema();
    }

    /** Getter for config
    *
    * @returns {Object} current config
    */
    get config() {
        return this._state.config;
    }

    /** Setter for config
    *
    * @param {Object} newConfig - new config
    * @param {bool} fire - fire 'change' event or not
    */
    setConfig(newConfig, fire) {
        this._state.config = newConfig;
        if (fire === undefined || fire) {
            this._notifyConfigChange();
        }
    }

    /**
     * Notify listeners about config change
     *
     * @emits ConfigWorker#change
     */
    _notifyConfigChange() {
        // handle passphrases first - decrypt, download, etc.
        util.decryptAllSecrets(this._state.config)
            .then((config) => {
                // copy config to avoid changes from listeners
                this.emit('change', JSON.parse(JSON.stringify(config)));
            })
            .catch((err) => {
                logger.error(`notifyConfigChange error: ${err}`);
            });
    }

    /**
     * Private method to save state to rest storage
     *
     * @returns {Object} Promise which is resolved once state is saved
     */
    _saveState() {
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
    }

    /**
     * Save state
     *
     * @returns {Object} Promise which is resolved once state is saved
     */
    saveState() {
        return this._saveState()
            .then(() => logger.info('state saved'))
            .catch((err) => {
                logger.exception('Unexpected error on attempt to save state', err);
            });
    }

    /**
     * Private method to load state from rest storage
     *
     * @returns {Object} Promise which is resolved with the loaded state
     */
    _loadState() {
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
    }

    /**
     * Load state
     *
     * @emits ConfigWorker#loadState
     *
     * @returns {Object} Promise which is resolved with the loaded state
     */
    loadState() {
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
    }

    /**
     * Pre-compile schema (avoids ~5 second delay during config event, when using ajv-async nodent transpiler)
     *
     * @returns {Object} Promise which is resolved with the validated schema validator
     */
    compileSchema() {
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
    }

    /**
     * Validate JSON data against config schema
     *
     * @param {Object} data - data to validate against config schema
     *
     * @returns {Object} Promise which is resolved with the validated schema
     */
    validate(data) {
        if (this.validator) {
            return this.validator(data)
                .then(() => data)
                .catch((e) => {
                    if (e instanceof Ajv.ValidationError) {
                        throw new Error(`validation errors: ${util.stringify(e.errors)}`);
                    }
                    throw e;
                });
        }
        return Promise.reject(new Error('Validator is not available'));
    }

    /**
     * Validate JSON data against config schema and apply it to current app
     *
     * @param {Object} data - data to validate against config schema
     *
     * @returns {Object} Promise with validate config resolved on success
     */
    validateAndApply(data) {
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
            .catch((err) => {
                const res = `config.validateAndApply error: ${err.message ? err.message : err}`;
                logger.exception(res, err);
                return Promise.reject(new Error(res));
            });
    }
}

// initialize singleton
const configWorker = new ConfigWorker();

// handle EventEmitter errors to avoid NodeJS crashing
configWorker.on('error', (err) => {
    logger.exception('Unhandled error in ConfigWorker', err);
});

module.exports = configWorker;
