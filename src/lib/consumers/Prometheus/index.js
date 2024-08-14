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

const promClient = require('prom-client');

const API = require('../api');
const utils = require('./utils');

/**
 * @module consumers/prometheus
 *
 * @typedef {import('../api').ConsumerCallback} ConsumerCallback
 * @typedef {import('../api').ConsumerConfig} ConsumerConfig
 * @typedef {import('../api').ConsumerInterface} ConsumerInterface
 * @typedef {import('../api').ConsumerModuleInterface} ConsumerModuleInterface
 * @typedef {import('../../dataPipeline').DataEventCtxV2} DataCtx
 */

/**
 * @param {DataCtx[]} dataCtx
 * @param {ConsumerCallback} callback
 */
function processData(dataCtxs, callback) {
    // Create a custom metric registry each time, as the default registry will persist across API calls
    const registry = new promClient.Registry();

    // Collect metrics from event
    const collectedMetrics = utils.collectMetrics(dataCtxs);
    const prioritizedMetrics = utils.prioritizeCollectedMetrics(collectedMetrics);

    const orderedPriorityKeys = Object.keys(prioritizedMetrics).sort((a, b) => a - b);

    orderedPriorityKeys.forEach((priorityKey) => {
        prioritizedMetrics[priorityKey].forEach((metricObject) => {
            let metricName = `f5_${metricObject.metricName}`;
            // Check if already registered
            if (typeof registry.getSingleMetric(metricName) !== 'undefined') {
                metricName = `f5_${utils.toPrometheusMetricFormat(metricObject.originalMetricName, true).metricName}`;
            }
            try {
                const gauge = new promClient.Gauge({
                    name: metricName,
                    help: metricObject.originalMetricName,
                    registers: [registry],
                    labelNames: metricObject.labelNames
                });
                metricObject.labels.forEach((labelObj) => {
                    gauge.set(labelObj.labels, labelObj.value);
                });
            } catch (err) {
                this.logger.exception(`Unable to register metric for: ${metricObject.originalMetricName}:`, err);
            }
        });
    });

    // Return metrics from the registry
    const output = registry.metrics();
    this.logger.verbose('success');

    this.writeTraceData(output);
    callback(null, {
        contentType: promClient.contentType,
        data: output
    });
}

/**
 * Telemetry Streaming Prometheus Pull Consumer
 *
 * @implements {ConsumerInterface}
 */
class PrometheusConsumer extends API.Consumer {
    /** @inheritdoc */
    get allowsPull() {
        return true;
    }

    /** @inheritdoc */
    get allowsPush() {
        return false;
    }

    /** @inheritdoc */
    onData(dataCtxs, emask, callback) {
        try {
            processData.call(this, dataCtxs, callback);
        } catch (error) {
            this.logger.exception('Uncaught error on attempt to process data', error);
            callback(error);
        }
    }
}

/**
 * Telemetry Streaming Prometheus Consumer Module
 *
 * @implements {ConsumerModuleInterface}
 */
class PrometheusConsumerModule extends API.ConsumerModule {
    /** @inheritdoc */
    async createConsumer() {
        return new PrometheusConsumer();
    }
}

/**
 * Load Telemetry Streaming Prometheus Consumer module
 *
 * Note: called once only if not in memory yet
 *
 * @param {API.ModuleConfig} moduleConfig - module's config
 *
 * @return {API.ConsumerModuleInterface} module instance
 */
module.exports = {
    async load() {
        return new PrometheusConsumerModule();
    }
};
