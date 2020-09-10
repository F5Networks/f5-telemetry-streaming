/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const requestUtil = require('./../shared/requestUtil');
const util = require('../../util');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;

/**
 * Returns the appropriate http URI, given the consumer's context.
 * NOTE: This function does not conform to ElasticSearch 7 REST APIs.
 *
 * @param {Object} config - Consumer configuration
 *
 * @returns {String}    URI to use in ElasticSearch REST call
 */
const formatURI = (config) => {
    const path = util.trimString(config.path || '', '/');
    const index = util.trimString(config.index, '/');
    return `/${path.length ? `${path}/` : ''}${index}/${config.dataType}`;
};

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const config = context.config;
    const host = config.host;
    const port = `:${config.port}`;
    const protocol = config.protocol;
    const method = 'POST';
    const strictSSL = !config.allowSelfSignedCert;
    const headers = {
        'Content-Type': 'application/json'
    };
    const uri = formatURI(config);

    // Handle Basic Auth
    if (config.username && config.passphrase) {
        const auth = Buffer.from(`${config.username}:${config.passphrase}`).toString('base64');
        headers.Authorization = `Basic ${auth}`;
    }

    util.renameKeys(context.event.data, /([.])+\1/g, '.'); // remove consecutive periods from TMOS names
    let payload;
    if (context.event.type === EVENT_TYPES.SYSTEM_POLLER || context.event.type === EVENT_TYPES.IHEALTH_POLLER) {
        payload = context.event.data;
    } else {
        payload = {
            data: context.event.data,
            telemetryEventCategory: context.event.type
        };
        delete payload.data.telemetryEventCategory;
    }

    if (context.tracer) {
        let tracedHeaders = headers;
        // redact Basic Auth passphrase, if provided
        if (Object.keys(headers).indexOf('Authorization') > -1) {
            tracedHeaders = JSON.parse(JSON.stringify(headers));
            tracedHeaders.Authorization = '*****';
        }
        context.tracer.write(JSON.stringify({
            body: payload,
            host,
            headers: tracedHeaders,
            method,
            port,
            protocol,
            strictSSL,
            uri
        }, null, 4));
    }

    return requestUtil.sendToConsumer({
        body: JSON.stringify(payload),
        hosts: [host], // Do not yet use fallback with ElasticSearch
        headers,
        logger: context.logger,
        method,
        port,
        protocol,
        strictSSL,
        uri
    }).catch((err) => {
        context.logger.exception(`Unexpected error: ${err}`, err);
    });
};
