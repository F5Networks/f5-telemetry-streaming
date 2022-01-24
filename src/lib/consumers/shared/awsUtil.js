/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const AWS = require('aws-sdk');
const https = require('https');
const util = require('../../utils/misc');
const rootCerts = require('./awsRootCerts');

const METRICS_BATCH_SIZE = 20;
/**
 * Configures the aws sdk global settings
 *
 * @param {Object} context Consumer context containing config and data
 *      See {@link ../../README.md#context}
 * @param {Object} [options] Consumer options
 * @param {Object} [options.httpAgent]  Custom HTTP(s) agent to pass to AWS config
 *
 * @returns {Promise} resolved upon completion
 */
function initializeConfig(context, options) {
    const awsConfig = { region: context.config.region };
    if (context.config.username && context.config.passphrase) {
        awsConfig.credentials = new AWS.Credentials({
            accessKeyId: context.config.username,
            secretAccessKey: context.config.passphrase
        });
    }

    let agent;
    // Accept consumer specific HTTPs agents
    if (options && options.httpAgent) {
        agent = options.httpAgent;
    } else {
        // Use defaults in the aws-sdk, but with a subset of CA Certs
        agent = new https.Agent({
            rejectUnauthorized: true,
            keepAlive: false,
            maxSockets: 50,
            ca: getAWSRootCerts()
        });
    }

    awsConfig.httpOptions = {
        agent
    };

    return Promise.resolve()
        .then(() => {
            AWS.config.update(awsConfig);
        });
}

/**
 * Gets Amazon Root Certificates
 *
 * @returns {Array} Array of certificate strings
 */
function getAWSRootCerts() {
    return rootCerts;
}

/**
 * Sends data to CloudWatch Logs
 *
 * @param {Object} context Consumer context containing config and data
 *      See {@link ../../README.md#context}
 *
 * @returns {Promise} resolved upon completion
 */
function sendLogs(context) {
    let cloudWatchLogs;
    let params;
    return Promise.resolve()
        .then(() => {
            const clientProperties = { apiVersion: '2014-03-28' };
            if (context.config.endpointUrl) {
                clientProperties.endpoint = new AWS.Endpoint(context.config.endpointUrl);
            }
            cloudWatchLogs = new AWS.CloudWatchLogs(clientProperties);
            const logGroup = context.config.logGroup;
            const logStream = context.config.logStream;
            const epochDate = new Date().getTime();
            params = {
                logGroupName: logGroup,
                logStreamName: logStream,
                logEvents: [
                    {
                        message: JSON.stringify(context.event.data),
                        timestamp: epochDate
                    }
                ],
                sequenceToken: undefined
            };
            if (context.tracer) {
                context.tracer.write(params);
            }
            const describeParams = {
                logGroupName: logGroup,
                limit: 1,
                logStreamNamePrefix: logStream,
                orderBy: 'LogStreamName'
            };
            // have to get a sequence token first
            return cloudWatchLogs.describeLogStreams(describeParams).promise();
        })
        .then((data) => {
            const logStreamData = data.logStreams[0]; // there should only be one item
            const token = logStreamData ? logStreamData.uploadSequenceToken : null;
            // if token exists update putLogEvents params, otherwise leave as undefined
            if (token) {
                params.sequenceToken = token;
            }
            return cloudWatchLogs.putLogEvents(params).promise();
        });
}
/**
 *
 *
 * @param {Object} data Object containing system poller data
 *
 * @returns {Array} Array of key value pairs to use as default dimensions
 *      Those with empty values are excluded
 *      e.g. [ { Name: 'hostname', Value: 'myhost.test.com' } ]
 */
function getDefaultDimensions(data) {
    // Each metric can have max of 10 dimension and is part of unique identifier for the metric
    // Initialize with the default dimensions - basic system info
    let dimensions = [];
    const sysData = data.system;
    if (sysData) {
        dimensions = [
            { Name: 'hostname', Value: sysData.hostname },
            { Name: 'machineId', Value: sysData.machineId },
            { Name: 'version', Value: sysData.version },
            { Name: 'versionBuild', Value: sysData.versionBuild },
            { Name: 'platformId', Value: sysData.platformId },
            { Name: 'chassisId', Value: sysData.chassisId },
            { Name: 'baseMac', Value: sysData.baseMac }
        ];
    }
    return dimensions.filter((d) => d.Value);
}

function buildMetric(key, value, dimensions) {
    let dims;
    // if metric is on pool level, remove redundant dimension poolName
    const nameDim = dimensions.find((d) => d.Name === 'name');
    const poolNameDim = dimensions.find((d) => d.Name === 'poolName');
    if (poolNameDim && (nameDim.Value === poolNameDim.Value)) {
        dims = dimensions.filter((d) => d.Name !== 'poolName');
    }
    return {
        // Metric Name must be max 255 and ASCII chars
        MetricName: `F5_${key}`,
        // type double - see limits in AWS sdk doc
        Value: value,
        Dimensions: dims || dimensions,
        // sdk implies epoch is accepted, but API returns error that it needs to be ISO
        // documentation seems to be inaccurate
        // https://github.com/aws/aws-sdk-js/issues/1922
        Timestamp: new Date().toISOString()
    };
}

/**
 * Converts a data object into an array of metric data.
 * AWS term for each metric item is "MetricDatum".
 * Non numeric values are skipped.
 * Names will be in the format F5_{keyLevel1}_{keyLevel2}...{propName}.
 *
 * For arrays:
 *   if item contains a name prop, it will be used as key,
 *   otherwise, index will be used
 *
 * For pools and pool members:
 *   special handling is performed since members are returned with no name
 *
 * @param {Object} data The data to convert into metrics format
 * @param {Object} dimensions An object of key value pair to add to metric
 * @param {String} key The key for the current data
 * @param {Array} metrics The array containing transformed data
 *
 * @returns {Array} Metric data array, e.g.:
 *    [ { MetricName: 'someName', Timestamp: 'isodate', Value: 123, Dimensions: [ {Name: 'dim1': Value: 'anything'}] } ]
 */
function getMetrics(data, dimensions, key, metrics) {
    metrics = metrics || [];

    if (typeof data === 'number') {
        metrics.push(buildMetric(key, data, dimensions));
    }

    if (typeof data === 'string') {
        const numData = Number(data);
        if (!Number.isNaN(numData)) {
            metrics.push(buildMetric(key, numData, dimensions));
        }
    }

    if (typeof data === 'object') {
        let newKey;
        let newDims = util.deepCopy(dimensions);
        let nameDim = newDims.find((d) => d.Name === 'name');
        if (!nameDim) {
            newDims.push({ Name: 'name' });
            nameDim = newDims[newDims.length - 1];
        }

        if (Array.isArray(data)) {
            data.forEach((d, index) => {
                // use index if no name for array item
                nameDim.Value = d.name ? `${d.name}` : `${index}`;
                newKey = key;
                getMetrics(d, newDims, newKey, metrics);
            });
        } else if (key === 'pools_members' && typeof data[Object.keys(data)[0]] === 'object') {
            // handle poolMembers - they don't have name prop
            //   { { Common/pool1: { name: 'Common/pool1', serverside.bitsIn: 300,
            //        members: 'Common/10.1.1.10:80': { serverside.bitsIn: 1111 } } } }
            // MetricDatum1 becomes:
            // { Name: 'F5_pools_serverside.bitsIn',
            //   Value: 300,
            //   Dimensions: [ hostname: 'bigip1.test', name: 'Common/pool1' }
            // }
            // MetricDatum2 becomes:
            // { Name: 'F5_pools_members_serverside.bitsIn',
            //   Value: 1111,
            //   Dimensions: [ hostname: 'bigip1.test', name: 'Common/10.1.1.10:80', poolName: 'Common/pool1' }
            // }
            Object.keys(data).forEach((memberKey) => {
                nameDim.Value = memberKey;
                newKey = key;
                getMetrics(data[memberKey], newDims, newKey, metrics);
            });
        } else {
            Object.keys(data).forEach((dataKey) => {
                // if there is a name, use it as dimension
                //   { pools: { Common/pool1: { name: 'Common/pool1', serverside.bitsIn: 300 } } }
                // MetricDatum becomes:
                // { Name: 'F5_pools_serverside.bitsIn',
                //   Value: 300,
                //   Dimensions: [ hostname: 'bigip1.test', name: 'Common/pool1' }
                // }
                if (data[dataKey].name) {
                    nameDim.Value = data[dataKey].name;
                    newKey = key || dataKey;
                    if (key === 'pools') {
                        const poolDim = newDims.find((d) => d.Name === 'poolName');
                        if (poolDim) {
                            poolDim.Value = data[dataKey].name;
                        } else {
                            newDims.push({ Name: 'poolName', Value: data[dataKey].name });
                        }
                    }
                } else {
                    // if no name prop:
                    //   { system: { "tmmTraffic": { "clientSideTraffic.bitsIn": 640 } } }
                    // MetricDatum becomes:
                    // {  Name: 'F5_system_tmmTraffic_clientsideTraffic.bitsIn',
                    //    Value: 640,
                    //    Dimensions: [ hostname: 'bigip1.test' }
                    // }
                    newKey = key ? `${key}_${dataKey}` : dataKey;
                }
                newDims = newDims.filter((d) => d.Value);
                getMetrics(data[dataKey], newDims, newKey, metrics);
            });
        }
    }

    return metrics;
}

/**
 * Sends metrics data to CloudWatch
 * Data is sent in batches of 20 to comply with api limits
 *
 * @param {Object} context Consumer context containing config and data
 *      See {@link ../../README.md#context}
 * @param {Array} metrics An array of metric data to send
 *
 * @returns {Promise} Promise with optional debug message
 */
function sendMetrics(context, metrics) {
    let errorEncountered;
    let totalBatches = 0;

    return Promise.resolve()
        .then(() => {
            const clientProperties = { apiVersion: '2010-08-01' };
            if (context.config.endpointUrl) {
                clientProperties.endpoint = new AWS.Endpoint(context.config.endpointUrl);
            }
            const cloudWatchMetrics = new AWS.CloudWatch(clientProperties);
            const putPromises = [];
            for (let i = 0; i < metrics.length; i += METRICS_BATCH_SIZE) {
                const metricsBatch = metrics.slice(i, i + METRICS_BATCH_SIZE);
                const params = {
                    MetricData: metricsBatch,
                    Namespace: context.config.metricNamespace
                };
                const putPromise = cloudWatchMetrics.putMetricData(params)
                    .promise()
                    // eslint-disable-next-line no-loop-func
                    .catch((err) => {
                        context.logger.exception('Error: AWS CloudWatch (Metrics)', err);
                        errorEncountered = true;
                        return Promise.resolve();
                    });
                putPromises.push(putPromise);
                totalBatches += 1;
            }
            return Promise.all(putPromises);
        })
        .then(() => {
            if (errorEncountered) {
                return Promise.reject(new Error('At least one batch encountered an error while sending metrics data'));
            }
            return Promise.resolve(`: processed total batch(es): ${totalBatches}`);
        });
}

module.exports = {
    initializeConfig,
    sendLogs,
    getDefaultDimensions,
    getMetrics,
    sendMetrics,
    getAWSRootCerts
};
