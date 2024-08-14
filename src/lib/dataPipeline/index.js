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

/* eslint-disable no-unused-expressions */

const actionProcessor = require('./actionProcessor');
const { DATA_PIPELINE, EVENT_TYPES } = require('../constants');
const makeForwarder = require('./forwarder');
const Service = require('../utils/service');
const util = require('../utils/misc');

/**
 * @module dataPipeline
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../utils/config').ConsumerComponent} ConsumerComponent
 * @typedef {import('../consumers').GetConsumers} GetConsumers
 * @typedef {import('../logger').Logger} Logger
 * @typedef {import('../resourceMonitor').PStateBuilder} PStateBuilder
 * @typedef {import('../utils/tracer').Tracer} Tracer
 */

const EE_NAMESPACE = 'datapipeline'; // namespace for global events
let instance = null; // temp solution until

/** Data Pipeline Service Class */
class DataPipelineService extends Service {
    /** @returns {boolean} true when data processing enabled */
    get processingEnabled() {
        return this._pstate ? this._pstate.enabled : true;
    }

    /** @inheritdoc */
    _onStart() {
        instance = this; // temp code
        this._forwarders = {};
        this._pstate = null;

        this._registerEvents();
    }

    /** @inheritdoc */
    _onStop() {
        this._eventListeners.forEach((listener) => listener.off());
        this._eventListeners = null;

        if (this._pstate && this._pstate.destroyed === false) {
            this._pstate.destroy();
        }

        // stop public events
        this._offMyEvents.off();
        this._offMyEvents = null;

        instance = null; // temp code
        this._forwarders = null;
        this._pstate = null;
    }

    /** @param {ApplicationEvents} appEvents - global event emitter */
    initialize(appEvents) {
        // function to register subscribers
        this._registerEvents = () => {
            this._eventListeners = [
                appEvents.on('consumers.change', onConsumersChange.bind(this), { objectify: true }),
                appEvents.on('resmon.pstate', initializeProcessingState.bind(this), { objectify: true })
            ];
            this.logger.debug('Subscribed to Consumers updates.');
            this.logger.debug('Subscribed to Resource Monitor updates.');

            this._offMyEvents = appEvents.register(this.ee, EE_NAMESPACE, [
                { change: 'change' },
                { 'config.applied': 'config.done' }
            ]);
        };
    }

    /**
     * Process data
     *
     * @param {DataEventCtx} dataCtx - wrapper with data to process
     * @param {object} [options] - options
     * @param {object}[options.actions] - actions to apply to data (e.g. filters, tags)
     * @param {boolean} [options.catchErrors] - catch errors
     * @param {object} [options.deviceContext] - optional addtl context about device
     * @param {Tracer} [options.tracer] - tracer instance (from data source)
     *
     * @returns {Promise} resolved with data if options.returnData === true otherwise will be resolved
     *       once data will be forwarded to consumers
     */
    process(dataCtx, event = DATA_PIPELINE.PUSH_EVENT, callback = null, options = {}) {
        const p = new Promise((resolve) => {
            const ids = dataCtx.destinationIds;

            if (this.processingEnabled === true) {
                // add telemetryEventCategory to data, fairly verbose name to avoid conflicts
                if (typeof dataCtx.data === 'object' && typeof dataCtx.data.telemetryEventCategory === 'undefined') {
                    dataCtx.data.telemetryEventCategory = dataCtx.type;
                }
                // iHealthPoller doesn't support actions (filtering and tagging)
                // raw events also should not go through any processing
                if (!(dataCtx.type === EVENT_TYPES.IHEALTH_POLLER
                        || dataCtx.type === EVENT_TYPES.RAW_EVENT
                        || util.isObjectEmpty(options.actions)
                )) {
                    actionProcessor.processActions(dataCtx, options.actions, options.deviceContext);
                }

                options.tracer && options.tracer.write(dataCtx);

                if (Array.isArray(ids) && ids.length > 0 && !util.isObjectEmpty(dataCtx.data)) {
                    ids.forEach((idx) => {
                        this._forwarders[idx] && this._forwarders[idx].process(dataCtx, event, callback);
                    });
                }
            }
            resolve();
        });
        return (options.catchErrors
            ? p.catch((error) => this.logger.exception('Uncaught error on attempt to forward data', error))
            : p).then(() => dataCtx);
    }
}

/**
 * @this DataPipelineService
 *
 * @param {GetConsumers} getConsumers
 */
function onConsumersChange(getConsumers) {
    Promise.resolve()
        .then(() => {
            this.logger.debug('Consumers "change" event');

            getConsumers().forEach((consumerCtx) => {
                const fwd = makeForwarder(consumerCtx);
                this._forwarders[fwd.id] = fwd;
            });

            this.ee.safeEmitAsync('config.applied', {
                numberOfForwarders: Object.keys(this._forwarders).length
            });
        });
}

/**
 * Initialize Processing State handling
 *
 * @this DataPipelineService
 *
 * @param {PStateBuilder} makePState
 */
function initializeProcessingState(makePState) {
    this._pstate = makePState(
        // on enable
        () => this.logger.warning('Resuming data pipeline processing.'),
        // on disable
        () => this.logger.warning('Incoming data will not be forwarded.')
    );
}

module.exports = DataPipelineService;
module.exports.process = function () {
    return instance.process.apply(instance, arguments);
};

/**
 * @typedef {object} DataEventCtxV2
 * @property {any} data
 * @property {string} type
 * @property {boolean} [isCustom]
 */

/**
 * @typedef DataEventCtx
 * @type {DataEventCtxV2}
 * @property {string} sourceId
 * @property {string[]} [destinationIds]
 */
/**
 * @typedef DataEventCtxV1
 * @type {object}
 * @property {DataEventCtxV2 | DataEventCtxV2[]} event
 * @property {ConsumerComponent} config
 * @property {null | Tracer} tracer
 * @property {Logger} logger
 * @property {null | object} metadata
 */
