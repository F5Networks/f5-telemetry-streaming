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
const consumersHndlr = require('./consumers');
const logger = require('./logger'); // eslint-disable-line no-unused-vars
const promiseUtil = require('./utils/promise');

/**
* Forward data to consumer
*
* @param {Object} dataCtx      - data context
* @param {Object} dataCtx.data - actual data to forward
* @param {string} dataCtx.type - type of data to forward
*
* @returns {Void} Promise object resolved with undefined
*/
function forwardData(dataCtx) {
    let consumers = consumersHndlr.getConsumers();
    if (!Array.isArray(consumers)) {
        return Promise.resolve();
    }
    consumers = consumers.filter((c) => dataCtx.destinationIds.indexOf(c.id) > -1);
    // don't rely on plugins' code, wrap consumer's call to Promise
    // eslint-disable-next-line
    return promiseUtil.allSettled(consumers.map((consumer) => {
        return new Promise((resolve) => {
            // standard context
            const context = {
                event: consumer.filter.apply(dataCtx),
                config: consumer.config,
                tracer: consumer.tracer,
                logger: logger.getChild(`${consumer.config.type}.${consumer.config.traceName}`),
                metadata: consumer.metadata
            };

            try {
                // Apply actions to the event - event is already deep copied in consumer.filter.apply() call
                actionProcessor.processActions(context.event, consumer.config.actions);
            } catch (err) {
                // Catch the error, but do not exit
                context.logger.exception('Error on attempt to process actions on consumer', err);
            }

            // forwarding not guaranteed to succeed, but we will not throw error if attempt failed
            try {
                consumer.consumer(context);
            } catch (err) {
                context.logger.exception('Error on attempt to forward data to consumer', err);
            } finally {
                resolve();
            }
        });
    }));
}

module.exports = {
    forward: forwardData
};
