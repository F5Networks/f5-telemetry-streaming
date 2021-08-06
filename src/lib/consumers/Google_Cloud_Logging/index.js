/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const gcpUtil = require('./../shared/gcpUtil');
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
        privateKey: config.privateKey
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
        .then(() => context.logger.debug('success'))
        .catch((err) => {
            if (err.message && err.message.indexOf('Bad status code: 401') > -1) {
                gcpUtil.invalidateToken(serviceAccount);
            }
            context.logger.error(`error: ${err.message ? err.message : err}`);
        });
};
