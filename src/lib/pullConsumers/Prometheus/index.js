/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const client = require('prom-client');
const mergeObjectArray = require('../../utils/misc').mergeObjectArray;
const deepCopy = require('../../utils/misc').deepCopy;

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
 * Apply consumer-specific formatting, and return the reformatted data
 *
 * @param {Object} context                                      - complete context object
 * @param {Object} context.config                               - consumer's config from declaration
 * @param {Object} context.logger                               - logger instance
 * @param {function(string):void} context.logger.info           - log info message
 * @param {function(string):void} context.logger.error          - log error message
 * @param {function(string):void} context.logger.debug          - log debug message
 * @param {function(string, err):void} context.logger.exception - log error message with error's traceback
 * @param {Array} context.event                                 - array of events to process
 * @param {Object} context.event[].data                         - actual data object to process
 * @param {Object|undefined} context.tracer                     - tracer object
 * @param {function(string):void} context.tracer.write          - write data to tracer
 *
 * @returns {Promise} Promise resolved with the consumer-specific formatting applied,
 *                      or rejected if no events are provided
 */
module.exports = function (context) {
    const logger = context.logger;
    const event = context.event;
    const tracer = context.tracer;

    return new Promise((resolve, reject) => {
        if (!Array.isArray(event)) {
            const msg = 'No event data to process';
            logger.error(msg);
            reject(new Error(msg));
        }

        const metricCollection = collectMetricData(event);
        // Create a custom metric registry each time, as the default registry will persist across API calls
        const registry = new client.Registry();

        // create prometheus metrics for all collected metrics
        applyPrometheusFormatting(metricCollection, registry);

        // Return metrics from the registry
        const output = registry.metrics();
        logger.debug('success');
        if (tracer) {
            // pretty JSON dump
            tracer.write(output);
        }

        resolve(output);
    });
};

/**
 * Traverse the event data, collecting metric data, and any associated metadata.
 * If the SystemPoller is collecting custom data, function will fallback to metric-name formatting.
 *
 * @param {Array.<Object>} event - Array of Data Objects collected from the consumer's System Pollers
 *
 * @returns {Object} Returns an Object containing metrics, metric values and any associated metadata
 */
function collectMetricData(event) {
    const filteredEvents = event
        .filter(d => (typeof d !== 'undefined' && Object.keys(d).indexOf('data') !== -1));

    const metrics = [];
    filteredEvents.forEach((eventObj) => {
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
 * Apply Prometheus formatting to the provided metrics collection.
 * Will rename metric names to comply with Prometheus naming rules, create a Prometheus Gauge,
 *  and set the gauge value for each metric.
 *
 * @param {Object}      data     - Data to format according to Prometheus spec
 * @param {Registry}    registry - Prometheus 'Registry' to register each Metric to
 */
function applyPrometheusFormatting(data, registry) {
    Object.keys(data).forEach((metricName) => {
        const labelNames = Array.from(data[metricName].labels || []);

        const gauge = new client.Gauge({
            name: `f5_${formatPrometheusName(metricName)}`, // Prefix metric names with 'f5' to differentiate F5 metrics
            help: metricName,
            registers: [registry],
            labelNames
        });
        data[metricName].values.forEach((valueObj) => {
            // Pass labels Object or Empty Object (prom-client has logic to handle empty objects) to gauge
            const gaugeLabels = (typeof valueObj.labels === 'undefined') ? {} : valueObj.labels;
            gauge.set(gaugeLabels, valueObj.value);
        });
    });
}

/**
 *
 * @param {String} name - string to reformat to match Prometheus requirements
 *
 * @returns {String} Returns string with unsupported characters replaced
 */
function formatPrometheusName(name) {
    const prometheusNameRegex = /[^a-zA-Z0-9_:]+/g;
    return name.replace(prometheusNameRegex, '_');
}

/**
 * 'Hoist' specified sub-keys to the root-level of the 'input' object.
 * Note: Function 'spoils' the provided 'inputData'
 * Note: Currently only 'hoists' data from level=root-1 to level=root.
 *
 * @param {Object} inputData    - Contains the System Poller data
 * @param {Object} subKeys      - Contains the sub-key and sub-key hierarchy to hoist
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
 * @param {Object}  inputData   - Data to transfer the keys and key data from
 * @param {Array}   keys        - The keys to remove from inputData
 *
 * @returns {Object} Object containing the keys and key-values
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
 * @param {Array|String}    pathOrKey   - Either the 'path' to a metric as an Array, or the metricName as a String
 * @param {Integer}         metricValue - Numeric value to store as a metric point
 * @param {Object}          metrics     - Container of all metrics
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
            labelKeys.forEach(l => metricPointer.labels.add(l));
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
 * @param {Array} pathItems - An array representing the 'path' to a metric
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
                labels[formatPrometheusName(pathItems[i])] = pathItems[i + 1];
            }
        }
    }
    return labels;
}

/**
 * Gets the metrics (any numeric value) (and the path to those metrics in the JSON structure) from the data.
 *
 * @param {*}               data                    - [Object, string, number, array] to parse for metrics
 * @param {Object}          [options]               - Optional values
 * @param {String|Array}    [options.pathOrKey]     - The path to the metric, as a string or array. Default=''
 * @param {Object}          [options.metrics]       - 'Container' of any existing metrics. Default={}
 * @param {Boolean}         [options.pathAsArray]   - Whether to store metric path as an array. Default=false
 *
 * @returns {Object} Object containing the metrics, and associated metadata
 */
function getMetrics(data, options) {
    const metrics = options.metrics || {};
    const pathAsArray = !!options.pathAsArray; // default=false
    options.pathOrKey = (typeof options.pathOrKey === 'undefined') ? '' : options.pathOrKey;

    if (typeof data === 'number') {
        storeMetric(options.pathOrKey, data, metrics);
    } else if (typeof data === 'string') {
        const numData = Number(data);
        if (!Number.isNaN(numData)) {
            storeMetric(options.pathOrKey, numData, metrics);
        }
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
