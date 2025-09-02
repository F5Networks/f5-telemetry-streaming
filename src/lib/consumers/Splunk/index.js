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

/* eslint-disable no-cond-assign, no-unused-expressions */

const pako = require('pako');

const API = require('../api');
const { CircularLinkedList } = require('../../utils/structures');
const dataMapping = require('./dataMapping');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;
const httpUtil = require('../../utils/http');
const memConverter = require('./multiMetricEventConverter');
const TaskQueue = require('../../utils/taskQueue');
const util = require('../../utils/misc');

const MAX_PAYLOAD_SIZE = 99000;
const MAX_WORKERS = 30;
const HEC_EVENTS_URI = '/services/collector/event';
const HEC_METRICS_URI = '/services/collector';
const DATA_FORMATS = {
    DEFAULT: 'default',
    LEGACY: 'legacy',
    METRICS: 'multiMetric'
};

/**
 * @module consumers/Splunk
 *
 * @typedef {import('../api').ConsumerCallback} ConsumerCallback
 * @typedef {import('../api').ConsumerConfig} ConsumerConfig
 * @typedef {import('../api').ConsumerInterface} ConsumerInterface
 * @typedef {import('../api').ConsumerModuleInterface} ConsumerModuleInterface
 * @typedef {import('../../dataPipeline').DataEventCtxV2} DataCtx
 */

/**
 * Telemetry Streaming Splunk Push Consumer
 *
 * @implements {ConsumerInterface}
 */
class SplunkConsumer extends API.Consumer {
    /** @inheritdoc */
    get allowsPull() {
        return false;
    }

    /** @inheritdoc */
    get allowsPush() {
        return true;
    }

    /** @inheritdoc */
    onData(dataCtx) {
        this.ingressDataQueue.push(dataCtx);
        this.processNewData(true);
    }

    /** @inheritdoc */
    async onLoad(config) {
        await super.onLoad(config);

        let dataProcessor = legacyDataProcessor;
        if (this.originConfig.format === DATA_FORMATS.METRICS) {
            dataProcessor = multiMetricDataProcessor;
        } else if (this.originConfig.format !== DATA_FORMATS.LEGACY) {
            dataProcessor = defaultDataProcessor;
        }

        let allowSelfSignedCert = this.originConfig.allowSelfSignedCert;
        if (!util.isObjectEmpty(this.originConfig.proxy)
            && typeof this.originConfig.proxy.allowSelfSignedCert !== 'undefined') {
            allowSelfSignedCert = this.originConfig.proxy.allowSelfSignedCert;
        }

        const headers = { Authorization: `Splunk ${this.originConfig.passphrase}` };
        const httpAgent = httpUtil.getAgent(
            Object.assign({ connection: { protocol: this.originConfig.protocol } }, this.originConfig)
        ).agent;
        const useGzip = this.originConfig.compressionType === 'gzip';
        if (useGzip) {
            headers['Content-Encoding'] = 'gzip';
        }

        Object.defineProperties(this, {
            egressQueue: {
                value: new TaskQueue(async (task, done) => {
                    try {
                        await this.dataForwarder(task);
                    } catch (err) {
                        this.logger.exception('Uncaught error on attempt to send data', err);
                    } finally {
                        done();
                    }
                }, {
                    concurency: getMaxWorkers(this.originConfig),
                    logger: this.logger.getChild('EgressQueue'),
                    maxSize: 100000,
                    name: 'EgressQueue',
                    usePriority: false
                })
            },
            dataForwarder: {
                value: forwardData.bind(this, useGzip)
            },
            dataProcessor: {
                value: dataProcessor.bind(this)
            },
            ingressDataQueue: {
                value: new CircularLinkedList()
            },
            maxEgressWorkers: {
                value: getMaxWorkers(this.originConfig)
            },
            processNewData: {
                value: processNewData.bind(this)
            },
            requestOptions: {
                get() {
                    return {
                        agent: httpAgent,
                        allowSelfSignedCert,
                        headers: Object.assign({}, headers),
                        hosts: [this.originConfig.host],
                        json: false,
                        logger: this.logger,
                        method: 'POST',
                        port: this.originConfig.port,
                        protocol: this.originConfig.protocol,
                        proxy: this.originConfig.proxy,
                        uri: this.originConfig.format === DATA_FORMATS.METRICS
                            ? HEC_METRICS_URI
                            : HEC_EVENTS_URI
                    };
                }
            }
        });
    }
}

/**
 * Telemetry Streaming Splunk Consumer Module
 *
 * @implements {ConsumerModuleInterface}
 */
class SplunkConsumerModule extends API.ConsumerModule {
    /** @inheritdoc */
    async createConsumer() {
        return new SplunkConsumer();
    }
}

/**
 * Add transformed data
 *
 * @param {Object} ctx - context object
 * @param {Object} newData - transformed data
 */
function appendData(ctx, newData) {
    const results = ctx.results;
    newData = JSON.stringify(newData);

    results.currentChunkLength += newData.length;
    results.dataLength += newData.length;

    if (results.currentChunkLength >= MAX_PAYLOAD_SIZE) {
        results.currentChunkLength = 0;
        results.numberOfRequests += 1;
    }
    results.translatedData.push(newData);
}

/**
 * Transform data using provided callback
 *
 * @this {SplunkConsumer}
 *
 * @param {function(object):object} cb - callback function to transform data
 * @param {object} ctx - context object
 */
function safeDataTransform(cb, ctx) {
    let data;
    try {
        data = cb(ctx);
    } catch (err) {
        this.logger.exception('Splunk.safeDataTransform error', err);
    }
    if (data) {
        if (Array.isArray(data)) {
            data.forEach((part) => appendData(ctx, part));
        } else {
            appendData(ctx, data);
        }
    }
}

/**
 * Process incoming data and convert it to default format
 *
 * @this {SplunkConsumer}
 *
 * @param {DataCtx} dataCtx - data context
 *
 * @returns {string[]} transformed data
 */
function defaultDataProcessor(dataCtx) {
    return [JSON.stringify(dataMapping.defaultFormat(dataCtx.data))];
}

/**
 * Process incoming data and convert it to legacy format (Analytics iApp)
 *
 * @this {SplunkConsumer}
 *
 * @param {DataCtx} dataCtx - data context
 *
 * @returns {string[]} transformed data
 */
function legacyDataProcessor(dataCtx) {
    const requestCtx = {
        dataCtx,
        results: {
            dataLength: 0,
            currentChunkLength: 0,
            numberOfRequests: 1,
            translatedData: []
        },
        cache: {
            dataTimestamp: (new Date()).getTime()
        }
    };
    if (dataCtx.type === EVENT_TYPES.SYSTEM_POLLER && !dataCtx.isCustom) {
        requestCtx.cache.dataTimestamp = Date.parse(dataCtx.data.system.systemTimestamp);
        dataMapping.stats.map((func) => safeDataTransform.call(this, func, requestCtx));
        safeDataTransform.call(this, dataMapping.overall, requestCtx);
    } else if (dataCtx.type === EVENT_TYPES.IHEALTH_POLLER) {
        safeDataTransform.call(this, dataMapping.ihealth, requestCtx);
    }
    return requestCtx.results.translatedData;
}

/**
 * Process incoming data and convert it to multi metric format
 *
 * @this {SplunkConsumer}
 *
 * @param {DataCtx} dataCtx - data context
 *
 * @returns {string[]} transformed data
 */
function multiMetricDataProcessor(dataCtx) {
    if (dataCtx.type === EVENT_TYPES.SYSTEM_POLLER && !dataCtx.isCustom) {
        const events = [];
        memConverter(dataCtx.data, (event) => events.push(JSON.stringify(event)));
        return events;
    }
    return [];
}

/**
 * Forward data to consumer
 *
 * @this {SplunkConsumer}
 *
 * @param {string} dataChunk - data to send
 */
function forwardData(useGzip, dataChunk) {
    this.writeTraceData({
        dataChunk,
        requestOptions: this.requestOptions
    });

    const requestOpts = this.requestOptions;
    if (useGzip) {
        dataChunk = pako.gzip(dataChunk);
    }

    this.logger.verbose(`sending data - ${dataChunk.length} bytes`);
    requestOpts.headers['Content-Length'] = dataChunk.length;
    requestOpts.body = dataChunk;

    return httpUtil.sendToConsumer.call(this, requestOpts)
        .catch((error) => {
            this.logger.exception('Unable to send data chunk:', error);
        });
}

function getMaxWorkers(config) {
    const maxSockets = (config.customOpts || [])
        .find((opt) => opt.name === 'maxSockets');
    return maxSockets ? maxSockets.value : MAX_WORKERS;
}

function processNewData(detach) {
    if (typeof this._processNewDataTimeoutID === 'undefined') {
        this._processNewDataTimeoutID = setTimeout(this.processNewData, 100);
    }
    if (detach) {
        return;
    }

    this._processNewDataTimeoutID = undefined;

    let output = [];
    let totalLength = 0;

    let maxPayloadsToBuild = this.maxEgressWorkers * 2 - this.egressQueue.size();

    while (this.ingressDataQueue.length > 0 && maxPayloadsToBuild > 0) {
        const dataCtx = this.ingressDataQueue.pop();
        const chunks = this.dataProcessor(dataCtx);
        for (let i = 0; i < chunks.length; i += 1) {
            if (totalLength < MAX_PAYLOAD_SIZE) {
                if (chunks[i].length > 0) {
                    output.push(chunks[i]);
                    totalLength += chunks[i].length;
                }
            } else {
                this.logger.verbose(`Events in payload: ${output.length}. Total length: ${totalLength}`);
                this.egressQueue.push(output.join(''));
                output = [];
                totalLength = 0;
                maxPayloadsToBuild -= 1;
            }
        }
    }
    if (totalLength > 0) {
        this.logger.verbose(`Events in payload: ${output.length}`);
        this.egressQueue.push(output.join(''));
    }
    if (this.ingressDataQueue.length) {
        this.processNewData(true);
    }
}

/**
 * Load Telemetry Streaming Splunk Consumer module
 *
 * Note: called once only if not in memory yet
 *
 * @param {API.ModuleConfig} moduleConfig - module's config
 *
 * @return {API.ConsumerModuleInterface} module instance
 */
module.exports = {
    async load() {
        return new SplunkConsumerModule();
    }
};
