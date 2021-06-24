/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

// updated to use 'statsd-client' (supports tcp+udp, and works on node 4.x) instead of 'node-statsd'
// note: considering the statsd protocol is just a simple key/value/type format over
// udp/tcp it might be simpler to just implement net module directly for this use case

const StatsD = require('statsd-client');
const net = require('net');

const constants = require('../../constants');
const deepCopy = require('../../utils/misc').deepCopy;


const FLOAT_REGEXP = /^-?\d+(?:[.,]\d*?)?$/;
const ISO_DATE_REGEXP = /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]+)?(Z)?$/;
const TS_METRIC_KEYS_TO_IGNORE = [
    'name'
];
const TS_TAG_KEYS_TO_IGNORE = [
    'Capacity'
];

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    // statsd does not process just any data - focus on metrics
    // so only process system poller info
    if (context.event.type !== constants.EVENT_TYPES.SYSTEM_POLLER) {
        context.logger.debug('Event is not systemInfo, skipping');
        return Promise.resolve();
    }
    const host = context.config.host;
    const port = context.config.port;
    const protocol = context.config.protocol;
    const useTcp = protocol === 'tcp';
    const collectTags = context.config.addTags && context.config.addTags.method === 'sibling';

    const tcpCheck = new Promise((resolve, reject) => {
        if (useTcp) {
            const socket = net.Socket({ type: 'tcp4' });
            socket.on('error', (err) => {
                socket.destroy();
                reject(err);
            });
            socket.connect(port, host, () => {
                socket.end();
                resolve();
            });
        } else {
            resolve();
        }
    });

    return tcpCheck
        .then(() => {
            const data = deepCopy(context.event.data);
            // collect individual metrics, to trace full 'payload' of data
            const tracePayload = [];

            // add prefixes to support multiple BIG-IP(s) in a single statsd instance
            const basePrefix = 'f5telemetry';
            let hostnamePrefix = constants.DEFAULT_HOSTNAME;
            try {
                // if this consumer processes other events besides system info
                // in the future, this will always fail
                hostnamePrefix = data.system.hostname;
            } catch (error) {
                context.logger.error(error);
            }
            const metricPrefix = makePath([basePrefix, hostnamePrefix]);

            // instantiate client
            const client = new StatsD({ host, port, tcp: useTcp });
            findMetrics(data, collectTags, (metricValue, metricPath, metricTags) => {
                const metricName = `${metricPrefix}.${makePath(metricPath)}`;
                if (context.tracer) {
                    tracePayload.push([`${metricName}: ${metricValue}`, metricTags]);
                }
                client.gauge(
                    metricName,
                    metricValue,
                    metricTags
                );
            });

            if (context.tracer) {
                context.tracer.write(tracePayload);
            }

            // Force a close(), which will force buffer to flush (aka: send metrics)
            client.close();
            context.logger.debug('success');
        })
        .catch(err => context.logger.exception('Unable to forward to statsd client', err));
};

/**
 * Convert array of strings to valid path for statsd metric
 * @param {Array<string>} paths - path to metric
 * @returns {string} path to statsd metric
 */
function makePath(paths) {
    return paths.map(i => i.replace(/\.|\/|:/g, '-')).join('.');
}

/**
 * @param {object} tsData - system poller's data
 * @param {function} cb - callback
 */
function findMetrics(tsData, collectTags, cb) {
    (function inner(data, stack) {
        const tags = collectTags ? {} : undefined;

        // convert strings to numbers and collect tags (if needed) on first iteration
        Object.keys(data).forEach((itemKey) => {
            const itemData = data[itemKey];
            if (typeof itemData === 'string' && TS_METRIC_KEYS_TO_IGNORE.indexOf(itemKey) === -1) {
                const parsedVal = parseNumber(itemData);
                if (parsedVal !== false) {
                    data[itemKey] = parsedVal;
                    return; // early return, metric was found and converted
                }
            }
            if (collectTags && TS_TAG_KEYS_TO_IGNORE.indexOf(itemKey) === -1 && canBeTag(itemData)) {
                tags[itemKey] = itemData;
            }
        });

        // traversing object and reporting metrics (and tags) on second iteration
        Object.keys(data).forEach((itemKey) => {
            const itemData = data[itemKey];
            if (typeof itemData === 'object') {
                stack.push(itemKey);
                inner(itemData, stack);
                stack.pop();
            } else if (Number.isFinite(itemData)) {
                cb(itemData, stack.concat(itemKey), tags);
            }
        });
    }(tsData, []));
}

/**
 * @param {any} val - value
 * @returns {boolean} true if value can be used as tag
 */
function canBeTag(val) {
    return (typeof val === 'string' && val.trim() && !ISO_DATE_REGEXP.test(val)) || typeof val === 'boolean';
}

/**
 * Parse string to integer or float
 *
 * @param {string} val - string to parse
 *
 * @returns {number | boolean} parsed number or false if unable to parse it
 */
function parseNumber(val) {
    if (FLOAT_REGEXP.test(val)) {
        val = parseFloat(val);
        if (typeof val === 'number' && Number.isFinite(val)) {
            return val;
        }
    }
    return false;
}
