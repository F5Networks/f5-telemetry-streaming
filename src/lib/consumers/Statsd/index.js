/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const metricUtils = require('../shared/metricsUtil');

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
    const boolsToMetrics = context.config.convertBooleansToMetrics || false;

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
            // should  be a copy already, see 'forwarder.js', search for 'filter.apply'
            const data = context.event.data;
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
            metricUtils.findMetricsAndTags(data, {
                collectTags,
                parseMetrics: true,
                boolsToMetrics,
                onMetric: (metricPath, metricValue, metricTags) => {
                    const metricName = `${metricPrefix}.${makePath(metricPath)}`;
                    let sanitizedTags;
                    if (metricTags) {
                        sanitizedTags = {};
                        Object.keys(metricTags).forEach((tag) => {
                            sanitizedTags[sanitizeString(tag)] = sanitizeString(metricTags[tag]);
                        });
                    }

                    if (context.tracer) {
                        tracePayload.push([`${metricName}: ${metricValue}`, sanitizedTags]);
                    }

                    client.gauge(
                        metricName,
                        metricValue,
                        sanitizedTags
                    );
                }
            });

            if (context.tracer) {
                context.tracer.write(tracePayload);
            }

            // Force a close(), which will force buffer to flush (aka: send metrics)
            client.close();
            context.logger.debug('success');
        })
        .catch((err) => context.logger.exception('Unable to forward to statsd client', err));
};

/**
 * Convert array of strings to valid path for statsd metric
 * @param {Array<string>} paths - path to metric
 * @returns {string} path to statsd metric
 */
function makePath(paths) {
    return paths.map(
        (i) => sanitizeString(i.replace(/\.|\/|:/g, '-'))
    ).join('.');
}

/**
 * Sanitize a string value into an acceptable StatsD string
 * Uses regexes from Statsd project:
 *  https://github.com/statsd/statsd/blob/v0.9.0/stats.js#L166-L168
 * @param {any} raw   - raw value (boolean, integer, string) to sanitize
 * @returns {string}    sanitized value as a string
 */
function sanitizeString(raw) {
    return raw.toString()
        .replace(/\s+/g, '_')
        .replace(/\//g, '-')
        // eslint-disable-next-line no-useless-escape
        .replace(/[^a-zA-Z_\-0-9\.;=]/g, '');
}
