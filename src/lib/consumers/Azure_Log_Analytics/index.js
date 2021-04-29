/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const util = require('../../utils/misc');
const azureUtil = require('./../shared/azureUtil');
const requestsUtil = require('../../utils/requests');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const fullURI = azureUtil.getApiUrl(context, 'opinsights');
    const workspaceId = context.config.workspaceId;
    const sharedKey = context.config.passphrase;
    const logType = context.config.logType || 'F5Telemetry';

    // for event types other than systemInfo, let's not chunk
    // so simply format according to what the chunking code expects
    if (context.event.type !== EVENT_TYPES.SYSTEM_POLLER) {
        const copyData = JSON.parse(JSON.stringify(context.event.data));
        context.event.data = {};
        context.event.data[context.event.type] = copyData;
    }

    return Promise.resolve()
        .then(() => (sharedKey ? Promise.resolve(sharedKey) : azureUtil.getSharedKey(context)))
        .then((keyToUse) => {
            const promises = [];
            const tracerMsg = [];
            Object.keys(context.event.data).forEach((type) => {
                let data = context.event.data[type];
                if (typeof data !== 'object') {
                    data = { value: data }; // make data an object
                }
                // rename/prefix certain reserved keywords, this is necessary because Azure LA
                // will accept messages and then silently drop them in post-processing if
                // they contain certain top-level keys such as 'tenant'
                const reserved = ['tenant'];
                reserved.forEach((item) => {
                    if (Object.keys(data).indexOf(item) !== -1) {
                        data[`f5${item}`] = data[item];
                        delete data[item];
                    }
                });

                const date = new Date().toUTCString();
                data = [data]; // place in array per API spec
                const bodyString = JSON.stringify(data);
                const signedKey = azureUtil.signSharedKey(keyToUse, date, bodyString);

                const requestOptions = {
                    method: 'POST',
                    fullURI,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': date,
                        'Log-Type': `${logType}_${type}`,
                        Authorization: `SharedKey ${workspaceId}:${signedKey}`
                    },
                    body: data,
                    allowSelfSignedCert: context.config.allowSelfSignedCert
                };


                if (context.metadata && context.metadata.compute && context.metadata.compute.resourceId) {
                    requestOptions.headers['x-ms-AzureResourceId'] = context.metadata.compute.resourceId;
                }

                if (context.tracer) {
                    // deep copy and parse body, otherwise it will be stringified again
                    const requestOptionsCopy = util.deepCopy(requestOptions);
                    // redact secrets in Authorization header
                    requestOptionsCopy.headers.Authorization = '*****';
                    tracerMsg.push(requestOptionsCopy);
                }

                promises.push(requestsUtil.makeRequest(requestOptions));
            });

            if (context.tracer) {
                context.tracer.write(tracerMsg);
            }
            return Promise.all(promises);
        })
        .then(() => {
            context.logger.debug('success');
        })
        .catch((error) => {
            context.logger.exception('Unable to forward to Azure Log Analytics consumer.', error);
        });
};
