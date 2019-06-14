/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const ESClient = require('elasticsearch').Client;


function elasticLogger(logger, tracer) {
    return function () {
        const childLogger = logger.getChild('lib');
        this.error = childLogger.error.bind(childLogger);
        this.warning = childLogger.info.bind(childLogger);
        this.info = childLogger.info.bind(childLogger);
        this.debug = childLogger.debug.bind(childLogger);
        this.close = function () {};
        this.trace = function (method, requestUrl, body, responseBody, responseStatus) {
            if (tracer) {
                tracer.write(JSON.stringify({
                    method,
                    requestUrl,
                    body,
                    responseBody,
                    responseStatus
                }, null, 4));
            }
        };
    };
}


/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const config = context.config;
    const clientConfig = {
        host: {
            log: elasticLogger(context.logger, context.tracer),
            host: config.host,
            protocol: config.protocol,
            port: config.port,
            path: config.path
        },
        ssl: {
            rejectUnauthorized: config.allowSelfSignedCert
        }
    };
    if (config.username) {
        clientConfig.httpAuth = config.username;
        if (config.password) {
            clientConfig.httpAuth = `${clientConfig.httpAuth}:${config.password}`;
        }
    }
    if (config.apiVersion) {
        clientConfig.apiVersion = config.apiVersion;
    }
    const payload = {
        index: config.index,
        type: config.dataType
    };
    if (context.event.data.telemetryEventCategory === 'systemInfo'
        || context.event.data.telemetryEventCategory === 'ihealthInfo') {
        payload.body = context.event.data;
    } else {
        payload.body = {
            data: {}
        };
        Object.keys(context.event.data).forEach((key) => {
            if (key === 'telemetryEventCategory') {
                payload.body[key] = context.event.data[key];
            } else {
                payload.body.data[key] = context.event.data[key];
            }
        });
    }
    if (context.tracer) {
        context.tracer.write(JSON.stringify(payload, null, 4));
    }
    const client = new ESClient(clientConfig);
    client.index(payload)
        .then(() => {
            context.logger.debug('success');
        })
        .catch((error) => {
            context.logger.error(`error: ${error.message ? error.message : error}`);
        });
};
