/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const actionProcessor = require('./actionProcessor');
const constants = require('./constants');
const consumersHandler = require('./consumers');
const EVENT_TYPES = require('./constants').EVENT_TYPES;
const forwarder = require('./forwarder');
const logger = require('./logger');
const monitor = require('./utils/monitor');
const util = require('./utils/misc');

const EVENT_CUSTOM_TIMESTAMP_KEY = constants.EVENT_CUSTOM_TIMESTAMP_KEY;
const APP_THRESHOLDS = constants.APP_THRESHOLDS;

let processingEnabled = true;

/**
 * Check if dataPipeline is running
 * Toggled by monitor checks
 *
 * @returns {Boolean} - whether or not processing is enabled
 */
function isEnabled() {
    return processingEnabled;
}

/**
 * Build log entry for data that we do not process and include details to help users troubleshoot
 *
 * @param {Object} dataCtx - the data context
 * @returns {String} - the assembled log entry
 */
function buildSkippedDataLog(dataCtx) {
    let timestampInfo = '';
    // best effort to log some known timestamp obj/fields
    const timestampKeys = ['telemetryServiceInfo', EVENT_CUSTOM_TIMESTAMP_KEY, 'EOCTimestamp', 'event_timestamp'];
    // need just one field to match
    timestampKeys.some((key) => {
        if (dataCtx.data[key]) {
            timestampInfo = `"${key}": ${JSON.stringify(dataCtx.data[key])}`;
            return true;
        }
        return false;
    });

    const consumers = consumersHandler.getConsumers()
        .filter(c => dataCtx.destinationIds.indexOf(c.id) > -1)
        .map(c => c.name);
    return `Skipped Data - Category: "${dataCtx.data.telemetryEventCategory}" | Consumers: ${JSON.stringify(consumers)} | Addtl Info: ${timestampInfo}`;
}


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
        logger.warning(buildSkippedDataLog(dataCtx));
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
                logger.debug('Pipeline received empty object - no data to process, skip it (might be the result of the actions chain execution).');
            } else {
                promise = promise.then(() => {
                    // detach forwarding process from here
                    forwarder.forward(dataCtx)
                        .catch(err => logger.exception('Error on attempt to forward data to consumers', err));
                });
            }
        }
        promise.then(() => {
            logger.debug(`Pipeline processed data of type: ${dataCtx.type}`);
            resolve(dataCtx);
        });
    });
}

monitor.on('check', status => new Promise((resolve) => {
    const monitorChecksOk = status === APP_THRESHOLDS.MEMORY.OK;
    // only log on status change to minimize entries
    if (processingEnabled !== monitorChecksOk) {
        logger.warning(`${status}. ${monitorChecksOk ? 'Resuming data pipeline processing.' : 'Incoming data will not be forwarded.'}`);
    }
    processingEnabled = monitorChecksOk;
    resolve();
}).catch((err) => {
    logger.exception('Unexpected error in data pipeline (monitor check handler).', err);
}));

module.exports = {
    process,
    isEnabled
};
