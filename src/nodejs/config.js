/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EventEmitter = require('events');
const logger = require('./logger.js');
const util = require('./util.js');

const baseSchema = require('./config/base_schema.json');
const systemPollerSchema = require('./config/system_poller_schema.json');
const eventListenerSchema = require('./config/event_listener_schema.json');
const consumersSchema = require('./config/consumers_schema.json');

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
        // copy config to avoid changes from listeners
        this.emit('change', JSON.parse(JSON.stringify(this._state.config)));
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
     * Validate JSON data against config schema
     *
     * @param {Object} data - data to validate against config schema
     *
     * @returns {Object} Promise which is resolved with the validated schema
     */
    validate(data) {
        const schemas = {
            base: baseSchema,
            systemPoller: systemPollerSchema,
            eventListener: eventListenerSchema,
            consumers: consumersSchema
        };
        return util.validateSchema(data, schemas);
    }

    /**
     * Validate JSON data against config schema and apply it to current app
     *
     * @param {Object} data - data to validate against config schema
     *
     * @returns {Object} Promise resolved on success
     */
    validateAndApply(data) {
        return this.validate(data)
            .then((newConfig) => {
                logger.debug(`New config: ${util.stringify(newConfig)}`);
                // do not fire event until state saved
                logger.info('New config successfully validated');
                this.setConfig(newConfig, false);
                return this.saveState();
            })
            .then(() => {
                // propagate config change
                this.setConfig(this.config);
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
