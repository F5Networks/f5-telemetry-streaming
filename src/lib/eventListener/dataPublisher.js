/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
    return Promise.resolve()
        .then(() => {
            const eventListener = configUtil.getTelemetryListeners(configWorker.currentConfig, opts.namespace)
                .find((el) => el.name === listenerName);

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
        .catch((error) => Promise.reject(error));
}

module.exports = {
    sendDataToListener
};
