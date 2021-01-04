/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const jwt = require('jsonwebtoken');

const EVENT_TYPES = require('../../constants').EVENT_TYPES;
const requestsUtil = require('../../utils/requests');

function checkMetricDescriptors(data, descriptors, currentPath, metrics) {
    Object.keys(data).forEach((key) => {
        const path = `${currentPath}/${key}`;
        if (typeof data[key] === 'object') {
            checkMetricDescriptors(data[key], descriptors, path, metrics);
        }
        if (typeof data[key] === 'number') {
            const metric = {
                key,
                value: data[key],
                path,
                new: descriptors.findIndex(element => element.type.includes(path)) === -1
            };
            metrics.push(metric);
        }
    });
}

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    if (context.event.type !== EVENT_TYPES.SYSTEM_POLLER) {
        return Promise.resolve();
    }

    const baseUri = 'https://monitoring.googleapis.com/v3/projects';
    const projectId = context.config.projectId;
    const options = {};
    let Authorization;
    const newJwt = jwt.sign(
        {
            iss: context.config.serviceEmail,
            scope: 'https://www.googleapis.com/auth/monitoring',
            aud: 'https://oauth2.googleapis.com/token',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        },
        context.config.privateKey,
        {
            algorithm: 'RS256',
            header: {
                kid: context.config.privateKeyId,
                typ: 'JWT',
                alg: 'RS256'
            }
        }
    );
    options.method = 'POST';
    options.headers = {};
    options.fullURI = 'https://oauth2.googleapis.com/token';
    options.form = {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: newJwt
    };
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';

    return requestsUtil.makeRequest(options)
        .then((result) => {
            delete options.headers['Content-Type'];
            delete options.form;
            Authorization = `Bearer ${result.access_token}`;
            options.headers.Authorization = Authorization;
            options.method = 'GET';
            options.fullURI = `${baseUri}/${projectId}/metricDescriptors`;
            return requestsUtil.makeRequest(options);
        })
        .then((results) => {
            // Got a list of MetricDescriptors
            const metricData = [];
            const promises = [];

            // Need to get the metrics and see if new descriptors need created
            checkMetricDescriptors(context.event.data.system, results.metricDescriptors, '/system', metricData);
            // Create array of Promises for creating descriptors
            metricData.forEach((metric) => {
                if (metric.new) {
                    const metricDescriptor = {
                        type: `custom.googleapis.com${metric.path}`,
                        metricKind: 'GAUGE',
                        valueType: 'INT64'
                    };
                    const promiseOptions = {
                        body: metricDescriptor,
                        method: 'POST',
                        fullURI: `${baseUri}/${projectId}/metricDescriptors`,
                        headers: {
                            Authorization
                        }
                    };
                    const promise = Promise.resolve()
                        .then(() => requestsUtil.makeRequest(promiseOptions));
                    promises.push(promise);
                }
            });

            return Promise.all(promises)
                .then(() => Promise.resolve(metricData))
                .catch((err) => {
                    context.logger.error(`error: ${err.message ? err.message : err}`);
                    throw err;
                });
        })
        .then((metrics) => {
            const timeSeries = {
                timeSeries: []
            };

            // Build the TimeSeries data
            metrics.forEach((met) => {
                const metric = {
                    type: `custom.googleapis.com${met.path}`
                };
                const points = [
                    {
                        value: {
                            int64Value: met.value
                        },
                        interval: {
                            endTime: {
                                seconds: Math.round(Date.now() / 1000)
                            }
                        }
                    }
                ];
                const resource = {
                    type: 'generic_node',
                    labels: {
                        namespace: context.event.data.system.hostname,
                        node_id: context.event.data.system.machineId,
                        location: 'global'
                    }
                };
                timeSeries.timeSeries.push({ metric, points, resource });
            });

            options.fullURI = `${baseUri}/${projectId}/timeSeries`;
            options.body = timeSeries;
            options.method = 'POST';
            return requestsUtil.makeRequest(options);
        })
        .then(() => Promise.resolve())
        .catch((err) => {
            context.logger.error(`error: ${err.message ? err.message : err}`);
        });
};
