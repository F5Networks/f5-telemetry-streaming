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

const actionProcessor = require('./actionProcessor');
const EVENT_TYPES = require('./constants').EVENT_TYPES;
const forwarder = require('./forwarder');
const logger = require('./logger');
const util = require('./utils/misc');

/**
* Pipeline to process data
*
* @param {Object}  dataCtx                     - wrapper with data to process
* @param {Object}  dataCtx.data                - data to process
* @param {String}  dataCtx.type                - type of data to process
* @param {Object}  [options]                   - options
* @param {module:util~Tracer} [options.tracer] - tracer instance
* @param {Object}  [options.actions]           - actions to apply to data (e.g. filters, tags)
* @param {Boolean} [options.noConsumers]       - don't send data to consumers, instead just return it
* @param {Object} [options.deviceContext]      - optional addtl context about device
* @returns {Promise} resolved with data if options.returnData === true otherwise will be resolved
*       once data will be forwarded to consumers
*/
function process(dataCtx, options) {
    if (!isEnabled()) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        options = options || {};
        // add telemetryEventCategory to data, fairly verbose name to avoid conflicts
        if (typeof dataCtx.data.telemetryEventCategory === 'undefined') {
            dataCtx.data.telemetryEventCategory = dataCtx.type;
        }
        // iHealthPoller doesn't support actions (filtering and tagging)
        // raw events also should not go through any processing
        if (dataCtx.type !== EVENT_TYPES.IHEALTH_POLLER && dataCtx.type !== EVENT_TYPES.RAW_EVENT
                && !util.isObjectEmpty(options.actions)) {
            actionProcessor.processActions(dataCtx, options.actions, options.deviceContext);
        }
        if (options.tracer) {
            options.tracer.write(dataCtx);
        }
        let promise = Promise.resolve();
        if (!options.noConsumers) {
            if (util.isObjectEmpty(dataCtx.data)) {
                logger.verbose('Pipeline received empty object - no data to process, skip it (might be the result of the actions chain execution).');
            } else {
                promise = promise.then(() => {
                    // detach forwarding process from here
                    forwarder.forward(dataCtx)
                        .catch((err) => logger.exception('Error on attempt to forward data to consumers', err));
                });
            }
        }
        promise.then(() => {
            // logger.debug(`Pipeline processed data of type: ${dataCtx.type}`);
            resolve(dataCtx);
        });
    });
}

/**
 * TEMP BLOCK OF CODE, REMOVE AFTER REFACTORING
 */
let processingEnabled = true;
let processingState = null;

/** @param {restWorker.ApplicationContext} appCtx - application context */
function initialize(appCtx) {
    if (appCtx.resourceMonitor) {
        if (processingState) {
            logger.debug('Destroying existing ProcessingState instance');
            processingState.destroy();
        }
        processingState = appCtx.resourceMonitor.initializePState(
            onResourceMonitorUpdate.bind(null, true),
            onResourceMonitorUpdate.bind(null, false)
        );
        processingEnabled = processingState.enabled;
        onResourceMonitorUpdate(processingEnabled);
    } else {
        logger.error('Unable to subscribe to Resource Monitor updates!');
    }
}

/** @param {boolean} enabled - true if processing enabled otherwise false */
function onResourceMonitorUpdate(enabled) {
    processingEnabled = enabled;
    if (enabled) {
        logger.warning('Resuming data pipeline processing.');
    } else {
        logger.warning('Incoming data will not be forwarded.');
    }
}

/**
 * Check if systemPoller(s) are running
 * Toggled by monitor checks
 *
 * @returns {Boolean} - whether or not processing is enabled
 */

function isEnabled() {
    return processingEnabled;
}
/**
 * TEMP BLOCK OF CODE END
 */

module.exports = {
    process,
    initialize,
    isEnabled
};
