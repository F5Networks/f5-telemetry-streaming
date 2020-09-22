/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const deepDiff = require('deep-diff');
const net = require('net');
const constants = require('../../constants');

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
    const protocol = context.config.protocol;
    const useTcp = protocol === 'tcp';

    // statsd does not process just any data - focus on metrics
    // so only process system poller info
    if (context.event.type !== constants.EVENT_TYPES.SYSTEM_POLLER) {
        context.logger.debug('Event is not systemInfo, skipping');
        return Promise.resolve();
    }

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
            // copy, strip, diff - returns list of metrics and nested path
            const copyData = JSON.parse(JSON.stringify(data));
            stripMetrics(copyData);
            const diff = deepDiff(copyData, data) || [];

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

            // instantiate client
            const client = new StatsD({ host, port, tcp: useTcp });
            diff.forEach((item) => {
                // account for item in path having '.' or '/'
                const path = [basePrefix, hostnamePrefix].concat(item.path).map(i => i.replace(/\.|\/|:/g, '-'));
                const metricName = path.join('.');
                const metricValue = item.rhs;

                if (context.tracer) {
                    context.tracer.write(`${metricName}: ${metricValue}\n`);
                }
                client.gauge(metricName, metricValue);
            });

            // Force a close(), which will force buffer to flush (aka: send metrics)
            client.close();
            context.logger.debug('success');
        })
        .catch(err => context.logger.exception('Unable to forward to statsd client', err));
};
