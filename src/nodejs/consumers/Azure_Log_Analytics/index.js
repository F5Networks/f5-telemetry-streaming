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

module.exports = function (context) {
    // context.logger.debug(`Azure_Log_Analytics: config ${JSON.stringify(context.config)}`);
    const workspaceId = context.config.api.token.workspaceId; // this will change
    const sharedKey = context.config.api.token.sharedKey; // this will change

    const apiVersion = '2016-04-01';
    const date = new Date().toUTCString();
    const httpBody = JSON.stringify(context.data);

    const contentLength = Buffer.byteLength(httpBody, 'utf8');
    const stringToSign = `POST\n${contentLength}\napplication/json\nx-ms-date:${date}\n/api/logs`;
    const signature = crypto.createHmac('sha256', new Buffer(sharedKey, 'base64')).update(stringToSign, 'utf-8').digest('base64');
    const authorization = `SharedKey ${workspaceId}:${signature}`;

    const url = `https://${workspaceId}.ods.opinsights.azure.com/api/logs?api-version=${apiVersion}`;
    const httpHeaders = {
        'content-type': 'application/json',
        Authorization: authorization,
        'Log-Type': 'F5Telemetry', // TODO: schema should allow this to be custom
        'x-ms-date': date
    };
    const requestOptions = {
        url,
        headers: httpHeaders,
        body: httpBody
    };

    // eslint-disable-next-line no-unused-vars
    request.post(requestOptions, (error, response, body) => {
        if (error) {
            context.logger.error(`Azure_Log_Analytics: error ${error}`);
        } else {
            context.logger.debug(`Azure_Log_Analytics: response ${response.statusCode} ${response.statusMessage}`);
        }
    });
};
