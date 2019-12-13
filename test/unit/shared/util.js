/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const systemPollerData = require('../consumers/data/systemPollerData.json');
const avrData = require('../consumers/data/avrData.json');

module.exports = {
    /**
     * Deep copy
     *
     * @param {any} obj - object to copy
     *
     * @returns {any} deep copy of source object
     */
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Generates a consumer config
     *
     * @param {Object} [options]           - options to pass to context builder
     * @param {String} [options.eventType] - which event type to return
     * @param {Object} [options.config]    - optional config to inject into context
     *
     * @returns {Object} Returns object representing consumer config
     */
    buildConsumerContext(options) {
        let data;
        const opts = options || {};

        switch (opts.eventType) {
        case 'systemInfo':
            data = this.deepCopy(systemPollerData);
            break;
        case 'AVR':
            data = this.deepCopy(avrData);
            break;
        default:
            data = {};
        }
        const context = {
            config: opts.config || {},
            event: {
                data,
                type: opts.eventType || ''
            },
            logger: {
                error: () => { },
                debug: () => { }
            }
        };
        return context;
    }
};
