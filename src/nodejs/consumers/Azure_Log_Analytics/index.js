/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const request = require('request');
const crypto = require('crypto');

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const workspaceId = context.config.workspaceId;
    const sharedKey = context.config.passphrase.text;

    const apiVersion = '2016-04-01';
    const date = new Date().toUTCString();
    const httpBody = JSON.stringify(context.event.data);

    const contentLength = Buffer.byteLength(httpBody, 'utf8');
    const stringToSign = `POST\n${contentLength}\napplication/json\nx-ms-date:${date}\n/api/logs`;
    const signature = crypto.createHmac('sha256', new Buffer(sharedKey, 'base64')).update(stringToSign, 'utf-8').digest('base64');
    const authorization = `SharedKey ${workspaceId}:${signature}`;

    // simply ignore context.config.protocol as log analytics only supports https anyways
    const url = `https://${workspaceId}.ods.opinsights.azure.com/api/logs?api-version=${apiVersion}`;
    const httpHeaders = {
        'content-type': 'application/json',
        Authorization: authorization,
        'Log-Type': context.config.logType || 'F5Telemetry',
        'x-ms-date': date
    };
    const requestOptions = {
        url,
        headers: httpHeaders,
        body: httpBody
    };
    if (context.tracer) {
        context.tracer.write(JSON.stringify({ url, headers: httpHeaders, body: JSON.parse(httpBody) }, null, 4));
    }

    // eslint-disable-next-line no-unused-vars
    request.post(requestOptions, (error, response, body) => {
        if (error) {
            context.logger.error(`error: ${error.message ? error.message : error}`);
        } else if (response.statusCode === 200) {
            context.logger.debug('success');
        } else {
            context.logger.info(`response: ${response.statusCode} ${response.statusMessage}`);
        }
    });
};
