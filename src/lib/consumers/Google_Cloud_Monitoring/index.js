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

const gcpUtil = require('../shared/gcpUtil');

const EVENT_TYPES = require('../../constants').EVENT_TYPES;
const promiseUtil = require('../../utils/promise');
const requestsUtil = require('../../utils/requests');

const BASE_GCM_URI = 'https://monitoring.googleapis.com/v3/projects';

function checkMetricDescriptors(data, descriptors, currentPath, metrics) {
    Object.keys(data).forEach((key) => {
        if (key === 'diskStorage') {
            return;
        }
        const path = `${currentPath}/${key}`;
        if (typeof data[key] === 'object') {
            checkMetricDescriptors(data[key], descriptors, path, metrics);
        }
        if (typeof data[key] === 'number') {
            const metric = {
                key,
                value: data[key],
                path,
                new: descriptors.findIndex((element) => element.type.includes(path)) === -1
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

    const projectMonitoringUri = `${BASE_GCM_URI}/${context.config.projectId}`;
    const options = {};
    const serviceAccount = {
        serviceEmail: context.config.serviceEmail,
        privateKeyId: context.config.privateKeyId,
        privateKey: context.config.privateKey,
        useServiceAccountToken: context.config.useServiceAccountToken
    };

    let Authorization;

    return gcpUtil.getAccessToken(serviceAccount)
        .then((accessToken) => {
            Authorization = `Bearer ${accessToken}`;
            options.headers = {
                Authorization
            };
            options.method = 'GET';
            options.fullURI = `${projectMonitoringUri}/metricDescriptors`;
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
                        fullURI: `${projectMonitoringUri}/metricDescriptors`,
                        headers: {
                            Authorization
                        }
                    };
                    const promise = Promise.resolve()
                        .then(() => requestsUtil.makeRequest(promiseOptions));
                    promises.push(promise);
                }
            });

            return promiseUtil.allSettled(promises)
                .then((innerResults) => {
                    promiseUtil.getValues(innerResults); // throws error if found it
                    return metricData;
                })
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

                // Attaches time-series metrics to a 'resource' - label resource as best as we can
                const resource = {};
                if (context.config.reportInstanceMetadata
                    && context.metadata
                    && context.metadata.id
                    && context.metadata.zone) {
                    // Get zone name from full zone string: projects/<id>/zones/<zone>
                    const zone = context.metadata.zone.split('/').pop();
                    resource.type = 'gce_instance';
                    resource.labels = {
                        instance_id: context.metadata.id.toString(),
                        zone
                    };
                } else {
                    resource.type = 'generic_node';
                    resource.labels = {
                        namespace: context.event.data.system.hostname,
                        node_id: context.event.data.system.machineId,
                        location: 'global'
                    };
                }
                timeSeries.timeSeries.push({ metric, points, resource });
            });

            if (context.tracer) {
                context.tracer.write(timeSeries);
            }

            options.fullURI = `${projectMonitoringUri}/timeSeries`;
            options.body = timeSeries;
            options.method = 'POST';
            return requestsUtil.makeRequest(options);
        })
        .then(() => context.logger.verbose('success'))
        .catch((err) => {
            if (err.message && err.message.indexOf('Bad status code: 401') > -1) {
                gcpUtil.invalidateToken(serviceAccount);
            }
            context.logger.error(`error: ${err.message ? err.message : err}`);
        });
};
