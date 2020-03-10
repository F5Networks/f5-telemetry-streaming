/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

// hot-shots fork is preferred to node-statsd, but it only supports node 6.x+
// node-statsd does not support tcp, only udp - which is default statsd protocol
// node-statsd client.close() does not wait for events to be sent
// note: considering the statsd protocol is just a simple key/value/type format over
// udp/tcp it might be simpler to just implement net module directly for this use case
const StatsD = require('node-statsd');
const deepDiff = require('deep-diff');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;

const stripMetrics = (data) => {
    Object.keys(data).forEach((item) => {
        if (Number.isInteger(data[item])) {
            delete data[item];
        } else if (typeof data[item] === 'object') {
            stripMetrics(data[item]);
        }
    });
};

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const data = context.event.data;
    const host = context.config.host;
    const port = context.config.port;

    // statsd does not process just any data - focus on metrics
    // so only process system poller info
    if (context.event.type !== EVENT_TYPES.SYSTEM_POLLER) {
        context.logger.debug('Event is not systemInfo, skipping');
        return Promise.resolve();
    }

    // instantiate client
    const client = new StatsD(host, port);
    // handle socket errors
    client.socket.on('error', (error) => {
        const msg = error && error.message ? error.message : error;
        context.logger.error(msg);
    });
    // copy, strip, diff - returns list of metrics and nested path
    const copyData = JSON.parse(JSON.stringify(data));
    stripMetrics(copyData);
    const diff = deepDiff(copyData, data) || [];

    // add prefixes to support multiple BIG-IP(s) in a single statsd instance
    const basePrefix = 'f5telemetry';
    let hostnamePrefix = 'base.bigip.com';
    try {
        // if this consumer processes other events besides system info
        // in the future, this will always fail
        hostnamePrefix = data.system.hostname;
    } catch (error) {
        context.logger.error(error);
    }
    const promises = [];
    diff.forEach((item) => {
        // account for item in path having '.' or '/'
        const path = [basePrefix, hostnamePrefix].concat(item.path).map(i => i.replace(/\.|\/|:/g, '-'));
        const metricName = path.join('.');
        const metricValue = item.rhs;
        promises.push(new Promise((resolve, reject) => {
            if (context.tracer) {
                context.tracer.write(`${metricName}: ${metricValue}\n`);
            }
            // eslint-disable-next-line no-unused-vars
            client.gauge(metricName, metricValue, (error, bytes) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        }));
    });

    return Promise.all(promises)
        .then(() => {
            // now close socket
            client.close();
            context.logger.debug('success');
        })
        .catch((error) => {
            context.logger.error(`error: ${error.message || error}`);
        });
};
