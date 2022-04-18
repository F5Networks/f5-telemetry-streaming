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
const promiseUtil = require('../../utils/promise');
const util = require('../../utils/misc');
const rootCerts = require('./awsRootCerts');

const METRICS_BATCH_SIZE = 20;

/**
 * Cache for events used by PutLogEvents command of AWS Logs.
 * That allows to send multiple events with a single command.
 * Each AWS Logs stream has its own cache (array), which is identified by the corresponding consumer Id.
 * A single event has two properties: message and timestamp.
 */
class EventCache {
    constructor() {
        this.events = {};
    }

    /**
     * Adds a new event to the array associated with the stream.
     *
     * @param {String} consumerId Unique id associated with the stream (consumer)
     * @param {String} message    Message to be sent to AWS Logs
     * @param {Number} timestamp  Timestamp associated with the message
     */
    addEvent(consumerId, message, timestamp) {
        if (!this.events[consumerId]) {
            this.events[consumerId] = [];
        }

        const record = {
            message,
            timestamp
        };
        this.events[consumerId].push(record);
    }

    /**
     * Adds multiple events to the array associated with the stream.
     *
     * @param {String} consumerId         Unique id associated with the stream (consumer)
     * @param {Array}  events             Array of messages to be added
     * @param {String} events[].message   Message to be sent to AWS Logs
     * @param {Number} events[].timestamp Timestamp associated with the message
     */
    addMultipleEvents(consumerId, events) {
        if (!this.events[consumerId]) {
            this.events[consumerId] = [];
        }

        events.forEach((currentEvent) => {
            this.events[consumerId].push(currentEvent);
        });
    }

    /**
     * Removes multiple events from the array associated with the stream and returns them.
     *
     * @param {String} consumerId Unique id associated with the stream (consumer)
     * @param {Number} maxEvents  Maximum number of events to be removed from the cache
     *
     * @returns {Array} Array of removed events.
     */
    removeEvents(consumerId, maxEvents) {
        if (!this.events[consumerId]) {
            return [];
        }

        const eventsToRemove = [];
        const eventsForAnotherBatch = [];
        let overallLength = 0;
        let earliestTimestamp;
        let latestTimestamp;
        const currentTime = new Date().getTime();
        /* remove events one at a time in order to check the overall batch size calculated according to the
           PutLogEvents specs */
        for (let i = 0; i < maxEvents; i += 1) {
            let stopFormingTheBatch = false;
            // go through the cache until one suitable event is found
            while (this.getLength(consumerId)) {
                const cachedEventArray = this.events[consumerId].splice(-1, 1);
                if (cachedEventArray.length) {
                    const cachedEventTimestamp = cachedEventArray[0].timestamp;
                    const cachedEventLength = Buffer.byteLength(cachedEventArray[0].message, 'utf8') + 26;
                    /* Check that the event message is not in the far future, not too old or too big.
                       All other messages are dropped (this is unlikely).
                       The following limits are dictated by PutLogEvents specs. */
                    const twoHours = 2 * 60 * 60 * 1000;
                    const twoWeeks = 14 * 24 * 60 * 60 * 1000;
                    const maxBatchSize = 1048576;
                    if (cachedEventTimestamp - currentTime < twoHours
                        && currentTime - cachedEventTimestamp < twoWeeks
                        && cachedEventLength < maxBatchSize) {
                        if (earliestTimestamp === undefined || latestTimestamp === undefined) {
                            // the first message in the batch
                            earliestTimestamp = cachedEventTimestamp;
                            latestTimestamp = cachedEventTimestamp;
                            overallLength = cachedEventLength;
                            eventsToRemove.push(cachedEventArray[0]);
                            break;
                        } else if ((overallLength + cachedEventLength) <= 1048576) {
                            // the batch is not empty and will not be too large
                            const oneDayWindow = 24 * 60 * 60 * 1000;
                            // check in the message and the current batch are within 24h window
                            if (cachedEventTimestamp >= earliestTimestamp && cachedEventTimestamp <= latestTimestamp) {
                                overallLength += cachedEventLength;
                                eventsToRemove.push(cachedEventArray[0]);
                                break;
                            } else if (cachedEventTimestamp < earliestTimestamp
                                       && latestTimestamp - cachedEventTimestamp < oneDayWindow) {
                                earliestTimestamp = cachedEventTimestamp;
                                overallLength += cachedEventLength;
                                eventsToRemove.push(cachedEventArray[0]);
                                break;
                            } else if (cachedEventTimestamp > latestTimestamp
                                       && cachedEventTimestamp - earliestTimestamp < oneDayWindow) {
                                latestTimestamp = cachedEventTimestamp;
                                overallLength += cachedEventLength;
                                eventsToRemove.push(cachedEventArray[0]);
                                break;
                            }
                            // the event is out of the batch 24h window
                            eventsForAnotherBatch.push(cachedEventArray[0]);
                        } else {
                            // the batch size plus the event size surpassed the limit
                            eventsForAnotherBatch.push(cachedEventArray[0]);
                            /* the batch size might be close to the limit even without the current record,
                               do not waste cycles, send the batch as is */
                            stopFormingTheBatch = true;
                        }
                    }
                }
            }
            if (stopFormingTheBatch) {
                break;
            }
        }
        // readd the postponed events back to the cache
        addMultipleEventsToCache(consumerId, eventsForAnotherBatch);
        eventsToRemove.sort((a, b) => a.timestamp - b.timestamp);
        return eventsToRemove;
    }

    /**
     * Returns length of the array associated with the stream.
     *
     * @param {String} consumerId Unique id associated with the stream (consumer)
     *
     * @returns {Number} length of the corresponding array
     */
    getLength(consumerId) {
        if (!this.events[consumerId]) {
            return 0;
        }
        return this.events[consumerId].length;
    }
}

const eventCache = new EventCache();

/**
 * Wrapper function for eventCache.addEvent
 */
function addEventToCache(consumerId, message, timestamp) {
    return eventCache.addEvent(consumerId, message, timestamp);
}

/**
 * Wrapper function for eventCache.addMultipleEvents
 */
function addMultipleEventsToCache(consumerId, events) {
    return eventCache.addMultipleEvents(consumerId, events);
}

/**
 * Wrapper function for eventCache.removeEvents
 */
function removeEventsFromCache(consumerId, maxEvents) {
    return eventCache.removeEvents(consumerId, maxEvents);
}

/**
 * Wrapper function for eventCache.getLength
 */
// might be useful for debugging
// eslint-disable-next-line no-unused-vars
function getCacheLength(consumerId) {
    return eventCache.getLength(consumerId);
}

class SequenceTokenCache {
    constructor() {
        this.tokens = {};
    }

    /**
     * Gets the sequence token of the stream.
     *
     * @param {String} consumerId Unique id associated with the stream (consumer)
     *
     * @returns {String} the sequence token
     */
    getToken(consumerId) {
        if (!this.tokens[consumerId]) {
            return null;
        }
        return this.tokens[consumerId];
    }

    /**
     * Sets the sequence token of the stream.
     *
     * @param {String} consumerId Unique id associated with the stream (consumer)
     * @param {String} newToken   the sequence token to be used by the next command
     */
    setToken(consumerId, newToken) {
        this.tokens[consumerId] = newToken;
    }
}

const sequenceTokenCache = new SequenceTokenCache();

/**
 * Wrapper function sequenceTokenCache.getToken
 */
function getSequenceToken(consumerId) {
    return sequenceTokenCache.getToken(consumerId);
}

/**
 * Wrapper function for sequenceTokenCache.setToken
 */
function setSequenceToken(consumerId, newToken) {
    sequenceTokenCache.setToken(consumerId, newToken);
}

class PutLogEventsTimestampCache {
    constructor() {
        this.timestamps = {};
    }

    /**
     * Gets the timestamp when the last PutLogEvents command was issued.
     *
     * @param {String} consumerId Unique id associated with the stream (consumer)
     *
     * @returns {String} the timestamp
     */
    getTimestamp(consumerId) {
        if (!this.timestamps[consumerId]) {
            return 0;
        }
        return this.timestamps[consumerId];
    }

    /**
     * Sets the current timestamp (when the last PutLogEvents command was issued).
     *
     * @param {String} consumerId Unique id associated with the stream (consumer)
     */
    setTimestamp(consumerId) {
        const timestamp = new Date().getTime();
        this.timestamps[consumerId] = timestamp;
    }
}

const putLogEventsTimestampCache = new PutLogEventsTimestampCache();

/**
 * Wrapper function PutLogEventsTimestampCache.getTimestamp
 */
function getPutLogEventsTimestamp(consumerId) {
    return putLogEventsTimestampCache.getTimestamp(consumerId);
}

/**
 * Wrapper function for PutLogEventsTimestampCache.setTimestamp
 */
function setPutLogEventsTimestamp(consumerId) {
    putLogEventsTimestampCache.setTimestamp(consumerId);
}

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
 * PutLogEvents requires a sequence token, get it from the responses to previous commands
 * or issue describeLogStreams
 *
 * @param {Object} context        Consumer context containing config and data
 *      See {@link ../../README.md#context}
 * @param {Object} cloudWatchLogs Client of AWS.CloudWatchLogs
 *
 * @returns {String} sequence token to be used by PutLogEvents
 */
function produceSequenceToken(context, cloudWatchLogs) {
    const consumerId = context.config.id;
    return Promise.resolve()
        .then(() => {
            // parameters for describeLogStreams command
            const describeParams = {
                logGroupName: context.config.logGroup,
                limit: 1,
                logStreamNamePrefix: context.config.logStream,
                orderBy: 'LogStreamName'
            };
            if (!getSequenceToken(consumerId)) {
                // expected to happen for the first call of the stream only
                context.logger.debug('there is no token, calling describeLogStreams');
                return cloudWatchLogs.describeLogStreams(describeParams).promise();
            }
            return Promise.resolve();
        })
        .then((streams) => {
            let token;
            if (streams) {
                const logStreamData = streams.logStreams[0]; // there should be only one item
                token = logStreamData ? logStreamData.uploadSequenceToken : null;
            } else {
                token = getSequenceToken(consumerId);
            }
            return token;
        });
}

/**
 * Recursive function that issues PutLogEvents (and optionally describeLogStreams)
 * until events cache is empty.
 * It does not access context.event.data, that should happen before this function is called.
 *
 * @param {Object} context        Consumer context containing config and data
 *      See {@link ../../README.md#context}
 * @param {Object} cloudWatchLogs Client of AWS.CloudWatchLogs
 */
function sendLogsEngine(context, cloudWatchLogs) {
    let params;
    const consumerId = context.config.id;
    let putLogEventsWasIssued = false;
    const putLogEventsCoolOff = 5000; // delay to avoid competing PutLogEvents commands

    return Promise.resolve()
        .then(() => produceSequenceToken(context, cloudWatchLogs))
        .then((token) => {
            // parameters for putLogEvents command
            params = {
                logGroupName: context.config.logGroup,
                logStreamName: context.config.logStream,
                sequenceToken: token
            };

            // get events from the cache and sent them to AWS only if there are enough events for the full batch
            params.logEvents = removeEventsFromCache(consumerId, context.config.maxAwsLogBatchSize);
            if (params.logEvents && params.logEvents.length) {
                const oldTimestamp = getPutLogEventsTimestamp(consumerId);
                const newTimestamp = new Date().getTime();
                /* The chances of failure in sending two PutLogEvents within 500ms is relatively high, avoid it.
                   If last response to PutLogEvents came more than 5s ago,
                   most likely all those commands already processed. */
                if ((params.logEvents && params.logEvents.length === context.config.maxAwsLogBatchSize
                        && (newTimestamp - oldTimestamp) > 500)
                        || ((newTimestamp - oldTimestamp) > putLogEventsCoolOff)) {
                    putLogEventsWasIssued = true;
                    if (context.tracer) {
                        context.tracer.write(params);
                    }
                    setPutLogEventsTimestamp(consumerId);
                    return cloudWatchLogs.putLogEvents(params).promise();
                }
                // cannot send events yet, readd them back to the cache
                addMultipleEventsToCache(consumerId, params.logEvents);
            }
            // it is ok not to have any unprocessed events, they could have been picked up in a batch of another event
            return Promise.resolve();
        })
        .then((putLogEventsResponse) => {
            if (putLogEventsWasIssued) {
                context.logger.debug(`success ${params.logEvents.length} messages were sent`);
                // store the sequence token for the future commands
                setSequenceToken(consumerId, putLogEventsResponse.nextSequenceToken);
                /* buffer might be not empty, so retry is helpful
                   delay retry by a random interval in order to spread out simultaneous commands
                   it should be larger than putLogEventsCoolOff */
                const rndInt = Math.floor(Math.random() * 1000) + putLogEventsCoolOff;
                setTimeout(() => sendLogsEngine(context, cloudWatchLogs), rndInt);
            }
            // it is ok not to have any unprocessed events, they could have been picked up in a batch of another event
        })
        .catch((error) => {
            // InvalidSequenceTokenException is possible, especially under high volume load
            if (error.code === 'InvalidSequenceTokenException') {
                // store the sequence token for the future commands
                const words = error.message.split(' ');
                const token = words[words.length - 1];
                if (/^\d+$/.test(token)) {
                    setSequenceToken(consumerId, token);
                } else {
                    setSequenceToken(consumerId, undefined);
                }
                // readd events that failed to be sent to AWS
                if (putLogEventsWasIssued) {
                    addMultipleEventsToCache(consumerId, params.logEvents);
                }
                context.logger.debug('Some messages will be resent later,'
                   + ' consider increasing value of "maxAwsLogBatchSize" parameter');
            } else {
                context.logger.exception('Unable to forward to AWS CloudWatch consumer', error);
            }
        });
}

/**
 * Sends data to CloudWatch Logs
 *
 * @param {Object} context     Consumer context containing config and data
 *      See {@link ../../README.md#context}
 */
function sendLogs(context) {
    // timestamp the message and add it to the cache
    const epochDate = new Date().getTime();
    addEventToCache(context.config.id, JSON.stringify(context.event.data), epochDate);

    const clientProperties = { apiVersion: '2014-03-28' };
    if (context.config.endpointUrl) {
        clientProperties.endpoint = new AWS.Endpoint(context.config.endpointUrl);
    }
    const cloudWatchLogs = new AWS.CloudWatchLogs(clientProperties);

    // call the potentially recursive engine
    return sendLogsEngine(context, cloudWatchLogs);
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
                putPromises.push(cloudWatchMetrics.putMetricData(params).promise());
            }
            return promiseUtil.allSettled(putPromises);
        })
        .then((results) => {
            let errorEncountered = false;
            results.forEach((result) => {
                if (typeof result.reason !== 'undefined') {
                    context.logger.exception('Error: AWS CloudWatch (Metrics)', result.reason);
                    errorEncountered = true;
                }
            });
            if (errorEncountered) {
                return Promise.reject(new Error('At least one batch encountered an error while sending metrics data'));
            }
            return Promise.resolve(`: processed total batch(es): ${results.length}`);
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
