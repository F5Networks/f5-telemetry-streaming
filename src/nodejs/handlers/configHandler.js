/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EventEmitter = require('events');
const configSchema = require('../config/schema-main.json');
const logger = require('../logger.js');
const validator = require('../validator.js');


const baseStateObj = {
    config: {}
};

class ConfigHandler extends EventEmitter {
    /**
     * ConfigHandler class
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
     * @emits ConfigHandler#change
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
        return new Promise((resolve, reject) => {
            _this.restWorker.loadState(null, (err, state) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(state || baseStateObj);
                }
            });
        });
    }

    /**
     * Load state
     *
     * @emits ConfigHandler#loadState
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
        return validator.validateSchema(data, configSchema);
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
            .catch((err) => {
                err = new Error(`config.validateConfig error: ${err}`);
                err.validationError = true;
                return Promise.reject(err);
            })
            .then((newConfig) => {
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
                if (!err.validationError) {
                    const res = `config.applyConfig error: ${err}`;
                    logger.exception(res, err);
                    err = new Error(res);
                }
                return Promise.reject(err);
            });
    }
}

// initialize singleton
const configHandler = new ConfigHandler();

// handle EventEmitter errors to avoid NodeJS crashing
configHandler.on('error', (err) => {
    logger.exception('Unhandled error in ConfigHandler', err);
});

module.exports = configHandler;
