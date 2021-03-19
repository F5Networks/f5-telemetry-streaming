/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const net = require('net');
const configWorker = require('../config');
const logger = require('../logger');
const configUtil = require('../utils/config');
const util = require('../utils/misc');
const errors = require('../errors');

class NoListenerError extends errors.ConfigLookupError {}

/**
 * Sends data to the specified Event Listener.
 * Event Listener may be in the 'default' namespace, or a user-defined namespace
 *
 * @param {String|Object}   data                - data to send to specified event listenter
 * @param {String}          listenerName        - event listener name
 * @param {Object}          [options]           - optional values
 * @param {String}          [options.namespace] - namespace name
 *
 * @returns {Promise<Object>} promise resolved when data has been sent to Event Listener socket
 */
function sendDataToListener(data, listenerName, options) {
    const opts = options || {};
    return configWorker.getConfig()
        .then((config) => {
            const eventListener = configUtil.getTelemetryListeners(config.normalized, opts.namespace)
                .find(el => el.name === listenerName);

            let error;
            const namespaceSuffix = `${opts.namespace ? ` in Namespace: ${opts.namespace}` : ''}.`;
            const errorMsgPrefix = `Unable to send debugging message to EventListener: ${listenerName}${namespaceSuffix}`;
            // If an Event Listener is not found, reject
            if (util.isObjectEmpty(eventListener)) {
                error = `${errorMsgPrefix} Event Listener is not found`;
            }

            // If Event Listener is disabled, reject
            if (eventListener && eventListener.enable === false) {
                error = `${errorMsgPrefix} Event Listener is disabled`;
            }

            if (error) {
                return Promise.reject(new NoListenerError(error));
            }

            // client.write only accepts String/Buffer; not object
            // Note: Currently the endpoint only accepts JSON data,
            //  but keeping this check in-place in case we expand the supported formats
            if (!(typeof dataToSend === 'string')) {
                data = JSON.stringify(data);
            }
            return new Promise((resolve, reject) => {
                const client = net.createConnection({ port: eventListener.port });
                client.on('connect', () => {
                    // client.write() may emit an error, or throw an exception - wrap in try/catch also
                    try {
                        client.write(data, () => client.end());
                    } catch (err) {
                        logger.error(`${errorMsgPrefix}\n${err}`);
                        reject(err);
                    }
                });
                client.on('end', () => {
                    logger.debug(`Debugging message sent to EventListener: ${listenerName}${namespaceSuffix}`);
                    resolve();
                });
                client.on('error', (err) => {
                    logger.error(`${errorMsgPrefix}\n${err}`);
                    // destory() to forcefully cleanup sockets
                    client.destroy();
                    reject(err);
                });
            });
        })
        .catch(error => Promise.reject(error));
}

module.exports = {
    sendDataToListener
};
