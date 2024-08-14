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

const mergeObjectArray = require('../../utils/misc').mergeObjectArray;
const deepCopy = require('../../utils/misc').deepCopy;

/**
 * @module consumers/prometheus/utils
 *
 * @typedef {import('../../../dataPipeline').DataEventCtxV2} DataCtx
 */

const KEYS_TO_HOIST = {
    system: [
        'diskStorage',
        'diskLatency',
        'networkInterfaces'
    ]
};

const KEYS_FOR_LABELLING = [
    'virtualServers',
    'diskStorage',
    'diskLatency',
    'networkInterfaces',
    'pools',
    'httpProfiles',
    'clientSslProfiles',
    'serverSslProfiles',
    'sslCerts',
    'networkTunnels',
    'iRules',
    'aPools',
    'aaaaPools',
    'cnamePools',
    'mxPools',
    'naptrPools',
    'srvPools',
    'ltmPolicies',
    'naptrWideIps',
    'aWideIps',
    'aaaaWideIps',
    'cnameWideIps',
    'mxWideIps',
    'naptrWideIps',
    'srvWideIps'
];

/**
 * Traverse the event data, collecting metric data, and any associated metadata.
 * If the SystemPoller is collecting custom data, function will fallback to metric-name formatting.
 *
 * @param {DataCtx[]} event - data collected from the consumer's System Pollers
 *
 * @returns {object} object containing metrics, metric values and any associated metadata
 */
function collectMetrics(events) {
    const metrics = [];
    events.forEach((eventObj) => {
        // If this is custom data (isCustom=true), do NOT use label-formatting - TS doesn't know the metric structure
        if (!eventObj.isCustom) {
            // Hoist and get 'dataToLabel' early in processing to make the getMetrics() processing simpler
            hoistSubKeys(eventObj.data, KEYS_TO_HOIST);
            const dataToLabel = getDataFromKeys(eventObj.data, KEYS_FOR_LABELLING);
            metrics.push(getMetrics(dataToLabel, { pathAsArray: true }));
        }

        metrics.push(getMetrics(eventObj.data, { pathAsArray: false }));
    });
    return mergeObjectArray(metrics);
}

/**
 * Prioritizes metrics by the number of transformations that were required to convert a metric name
 *  into a valid Prometheus metric name.
 *
 * @param {object} collectedMetrics - metrics collection
 *
 * @returns {object} prioritized object with required data for Prometheus formatted metrics.
 *  Example object:
 *  {
 *      0: [
 *          {
 *              metricName,
 *              originalMetricName,
 *              labelNames,
 *              labels
 *          }, ...
 *      ],
 *      1: [...],
 *      ...
 *  }
 */
function prioritizeCollectedMetrics(collectedMetrics) {
    const prioritizedMetrics = {};

    Object.keys(collectedMetrics).forEach((originalMetricName) => {
        const formattedMetric = toPrometheusMetricFormat(originalMetricName);
        const labelNames = Array.from(collectedMetrics[originalMetricName].labels || []);

        if (typeof prioritizedMetrics[formattedMetric.transformCount] === 'undefined') {
            prioritizedMetrics[formattedMetric.transformCount] = [];
        }
        prioritizedMetrics[formattedMetric.transformCount].push({
            metricName: formattedMetric.metricName,
            originalMetricName,
            labelNames,
            labels: collectedMetrics[originalMetricName].values.map((valueObj) => {
                const gaugeLabels = (typeof valueObj.labels === 'undefined') ? {} : valueObj.labels;
                return { labels: gaugeLabels, value: valueObj.value };
            })
        });
    });

    return prioritizedMetrics;
}

/**
 * Generates a Prometheus formatted metric name from a provided string.
 * Optionally replaces invalid metric name characters with hex code values
 *
 * @param {string}  name - original metric name
 * @param {boolean} useHexFormatting - whether to replace invalid characters with hex codes (default=false)
 *
 * @returns {object} object with the Prometheus formatted metric name, and the number of character blocks
 *  that were replaced
 */
function toPrometheusMetricFormat(name, useHexFormatting) {
    const prometheusNameRegex = /[^a-zA-Z0-9_:]+/g;
    let newName;
    let transformCount = 0;

    if (useHexFormatting) {
        newName = name.replace(/[^a-zA-Z0-9_]+/g, (match) => {
            transformCount += 1;
            return `__x${Buffer.from(match).toString('hex').toUpperCase()}__`;
        });
    } else {
        newName = name.replace(prometheusNameRegex, () => {
            transformCount += 1;
            return '_';
        });
    }
    return {
        metricName: newName,
        transformCount
    };
}

/**
 * 'Hoist' specified sub-keys to the root-level of the 'input' object.
 * Note: Function 'spoils' the provided 'inputData'
 * Note: Currently only 'hoists' data from level=root-1 to level=root.
 *
 * @param {object} inputData - contains the System Poller data
 * @param {object} subKeys - contains the sub-key and sub-key hierarchy to hoist
 */
function hoistSubKeys(inputData, subKeys) {
    Object.keys(subKeys).forEach((tKey) => {
        subKeys[tKey].forEach((sKey) => {
            if (inputData[tKey] && typeof inputData[tKey][sKey] !== 'undefined') {
                inputData[sKey] = inputData[tKey][sKey];
                delete inputData[tKey][sKey];
            }
        });
    });
}

/**
 * Transfers the key-values from 'inputData' into a new, returned Object.
 * Note: Currently only removes top-level keys from 'inputData'
 * Note: Function 'spoils' the provided 'inputData'
 *
 * @param {object} inputData - Data to transfer the keys and key data from
 * @param {string[]} keys - The keys to remove from inputData
 *
 * @returns {object} Object containing the keys and key-values
 */
function getDataFromKeys(inputData, keys) {
    const resp = {};
    keys.forEach((tKey) => {
        resp[tKey] = inputData[tKey];
        delete inputData[tKey];
    });
    return resp;
}

/**
 * Pushes the given metric value into our collection of metrics.
 * Note: 'metrics' parameter is an "out" parameter - metrics are pushed into this object
 *
 * @param {string | string[]} pathOrKey - either the 'path' to a metric as an Array, or the metricName as a String
 * @param {integer} metricValue - numeric value to store as a metric point
 * @param {object} metrics - container of all metrics
 *
 * "Metrics" data structure:
 *  {
 *      metricName: {
 *          labels: Set([<String>])
 *          values: [{
 *              labels: { <String>: <String> }
 *              value: <Integer>
 *          }]
 *      }
 *  }
 */
function storeMetric(pathOrKey, metricValue, metrics) {
    let labels = {};
    let labelKeys = [];

    const pathIsArray = Array.isArray(pathOrKey);
    const metricName = pathIsArray ? pathOrKey.pop() : pathOrKey;

    // If using an Array to store 'path' to metric, then fetch paths as labels.
    if (pathIsArray) {
        labels = getMetricLabels(pathOrKey);
        labelKeys = Object.keys(labels);
    }

    const metricPointer = metrics[metricName];
    if (metricPointer) { // If Metric already exists, add any new Labels and Values to the existing Metric
        const newMetricValue = { value: metricValue };

        if (labelKeys.length !== 0) {
            // If a given Metric's value was unlabeled, but now has label, ensure 'labels' Set is init'd
            if (typeof metricPointer.labels === 'undefined') {
                metricPointer.labels = new Set();
            }
            labelKeys.forEach((l) => metricPointer.labels.add(l));
            newMetricValue.labels = labels;
        }
        metricPointer.values.push(newMetricValue);
    } else { // If new Metric, add metric to metrics collection
        const newMetric = {
            values: [{ value: metricValue }]
        };
        if (labelKeys.length !== 0) {
            newMetric.labels = new Set(labelKeys);
            newMetric.values[0].labels = labels;
        }
        metrics[metricName] = newMetric;
    }
}

/**
 * Converts an array into a key-value pair Object, and converts the Object key to follow Prometheus name
 * formatting requirements.
 *
 * @param {Array} pathItems - an array representing the 'path' to a metric
 *
 * The input array may contain multiple key-value pairs, representing a deeply-nested Metric
 * Example:
 *  pathItems: ['pools', 'poolName', 'members', 'poolMemberName']
 * Returns:
 *  {
 *      pools: poolName,
 *      members: poolMemberName
 *  }
 *
 * @returns {Object} Object containing key-value pairs to be used as Metric labels
 */
function getMetricLabels(pathItems) {
    const labels = {};
    if (Array.isArray(pathItems)) {
        // Iterate by +2 - code in loop will the index to locate the key and value of the key-value pair
        for (let i = 0; i < pathItems.length; i += 2) {
            if (typeof pathItems[i] !== 'undefined' && typeof pathItems[i + 1] !== 'undefined') {
                labels[toPrometheusMetricFormat(pathItems[i]).metricName] = pathItems[i + 1];
            }
        }
    }
    return labels;
}

/**
 * Gets the metrics (any numeric value) (and the path to those metrics in the JSON structure) from the data.
 *
 * @param {*} data - [object, string, number, array] to parse for metrics
 * @param {object} [options] - optional values
 * @param {string|Array} [options.pathOrKey] - the path to the metric, as a string or array. Default=''
 * @param {object} [options.metrics] - 'Container' of any existing metrics. Default={}
 * @param {boolean} [options.pathAsArray] - whether to store metric path as an array. Default=false
 *
 * @returns {object} object containing the metrics, and associated metadata
 */
function getMetrics(data, options) {
    const metrics = options.metrics || {};
    const pathAsArray = !!options.pathAsArray; // default=false
    options.pathOrKey = (typeof options.pathOrKey === 'undefined') ? '' : options.pathOrKey;

    if (typeof data === 'number') {
        if (!Number.isNaN(data)) {
            storeMetric(options.pathOrKey, data, metrics);
        }
    } else if (typeof data === 'string') {
        const numData = Number(data);
        if (!Number.isNaN(numData)) {
            storeMetric(options.pathOrKey, numData, metrics);
        }
    } else if (typeof data === 'boolean') {
        storeMetric(options.pathOrKey, Number(data), metrics);
    } else if (typeof data === 'object') {
        if (Array.isArray(data)) {
            data.forEach((d, index) => {
                let newKeyOrPath;
                if (options.pathAsArray) {
                    // Get a copy of the Path array, since it can be polluted from in the .forEach() iteration
                    newKeyOrPath = deepCopy(options.pathOrKey || []);
                    newKeyOrPath.push(d.name ? d.name : index);
                } else {
                    newKeyOrPath = d.name ? `${options.pathOrKey}_${d.name}` : `${options.pathOrKey}_${index}`;
                }
                getMetrics(d, { pathOrKey: newKeyOrPath, metrics, pathAsArray });
            });
        } else {
            Object.keys(data).forEach((dataKey) => {
                let newKeyOrPath;
                if (options.pathAsArray) {
                    // Get a copy of the Path array, since it can be polluted from in the .forEach() iteration
                    newKeyOrPath = deepCopy(options.pathOrKey || []);
                    newKeyOrPath.push(dataKey);
                } else {
                    newKeyOrPath = options.pathOrKey ? `${options.pathOrKey}_${dataKey}` : dataKey;
                }
                getMetrics(data[dataKey], { pathOrKey: newKeyOrPath, metrics, pathAsArray });
            });
        }
    }
    return metrics;
}

module.exports = {
    collectMetrics,
    prioritizeCollectedMetrics,
    toPrometheusMetricFormat
};
