/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js');
const forwarder = require('./forwarder.js');
const dataTagging = require('./dataTagging.js');
const dataFilter = require('./dataFilter.js');
const util = require('./util.js');
const EVENT_TYPES = require('./constants.js').EVENT_TYPES;


/**
 * Process actions like filtering or tagging
 *
 * @param {Object}  dataCtx               - wrapper with data to process
 * @param {Object}  dataCtx.data          - data to process
 * @param {String}  dataCtx.type          - type of data to process
 * @param {Object}  [actions]             - actions to apply to data (e.g. filters, tags)
 * @param {Boolean} [actions.enable]      - whether or not to enable the given action
 * @param {Object}  [actions.setTag]      - apply tag
 * @param {Object}  [actions.includeData] - include data
 * @param {Object}  [actions.excludeData] - exclude data
 * @param {Object}  deviceCtx             - device context
 */

function processActions(dataCtx, actions, deviceCtx) {
    actions.forEach((actionCtx) => {
        if (!actionCtx.enable) {
            return;
        }
        let handler = null;
        if (actionCtx.setTag) {
            handler = dataTagging;
        } else if (actionCtx.includeData || actionCtx.excludeData) {
            handler = dataFilter;
        }
        if (!handler) {
            const errMsg = `dataPipeline:processActions error: unknown action - ${JSON.stringify(actionCtx)}`;
            logger.error(errMsg);
            throw new Error(errMsg);
        }
        handler.handleAction(dataCtx, actionCtx, deviceCtx);
    });
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
    return new Promise((resolve) => {
        options = options || {};
        // add telemetryEventCategory to data, fairly verbose name to avoid conflicts
        if (typeof dataCtx.data.telemetryEventCategory === 'undefined') {
            dataCtx.data.telemetryEventCategory = dataCtx.type;
        }
        // iHealthPoller doesn't support actions (filtering and tagging)
        if (dataCtx.type !== EVENT_TYPES.IHEALTH_POLLER && !util.isObjectEmpty(options.actions)) {
            processActions(dataCtx, options.actions, options.deviceContext);
        }
        if (options.tracer) {
            options.tracer.write(JSON.stringify(dataCtx, null, 4));
        }
        let promise = Promise.resolve();
        if (!options.noConsumers) {
            if (util.isObjectEmpty(dataCtx.data)) {
                logger.debug('Pipeline received empty object - no data to process, skip it (might be the result of the actions chain execution).');
            } else {
                promise = promise.then(() => {
                    // detach forwarding process from here
                    forwarder.forward(dataCtx)
                        .catch(err => logger.exception(`Error on attempt to forward data to consumers: ${err}`, err));
                });
            }
        }
        promise.then(() => {
            logger.debug(`Pipeline processed data of type: ${dataCtx.type}`);
            resolve(dataCtx);
        });
    });
}

module.exports = {
    process
};
