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
const requestsUtil = require('../../utils/requests');

const CLOUD_LOGGING_WRITE_URL = 'https://logging.googleapis.com/v2/entries:write';

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const config = context.config;
    const serviceAccount = {
        serviceEmail: config.serviceEmail,
        privateKeyId: config.privateKeyId,
        privateKey: config.privateKey,
        useServiceAccountToken: config.useServiceAccountToken
    };

    // Should be in format projects/[PROJECT_ID]/logs/[LOG_ID]
    const logName = `${config.logScope}/${config.logScopeId}/logs/${config.logId}`;

    return gcpUtil.getAccessToken(serviceAccount)
        .then((accessToken) => {
            const entries = [];
            const eventData = context.event.data;
            /*
                If entry data is JSON object, send as JSON object. This is the preferred method.
                If entry is not JSON object, send as string in textPayload
            */
            let nodeId;
            if (typeof eventData === 'object') {
                entries.push({ jsonPayload: eventData });
                // search for hostname in various payload types, or undefined if not found
                nodeId = (eventData.system || {}).hostname || eventData.hostname;
            } else {
                entries.push({ textPayload: eventData.toString() });
            }

            // Attaches log entries to a 'resource' - label resource as best as we can
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
                    node_id: nodeId,
                    location: 'global'
                };
            }

            const body = {
                logName,
                resource,
                entries
            };
            const options = {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                method: 'POST',
                fullURI: CLOUD_LOGGING_WRITE_URL,
                body
            };
            if (context.tracer) {
                context.tracer.write(body);
            }

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
