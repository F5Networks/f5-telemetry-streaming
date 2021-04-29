/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const httpUtil = require('./../shared/httpUtil');
const util = require('../../utils/misc');

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const body = context.event.data;
    const method = context.config.method || 'POST';
    const protocol = context.config.protocol || 'https';
    const port = context.config.port || '';
    const uri = context.config.path || '/';
    const host = context.config.host;
    const fallbackHosts = context.config.fallbackHosts || [];
    const headers = httpUtil.processHeaders(context.config.headers); // no defaults - provide all headers needed
    const key = context.config.privateKey || undefined;
    const cert = context.config.clientCertificate || undefined;
    const ca = context.config.rootCertificate || undefined;

    let allowSelfSignedCert = context.config.allowSelfSignedCert;
    if (!util.isObjectEmpty(context.config.proxy) && typeof context.config.proxy.allowSelfSignedCert !== 'undefined') {
        allowSelfSignedCert = context.config.proxy.allowSelfSignedCert;
    }

    // If authenticating with certificates, do not allow self signed certs
    if (!util.isObjectEmpty(cert) || !util.isObjectEmpty(ca)) {
        allowSelfSignedCert = false;
    }

    const proxy = context.config.proxy;

    if (context.tracer) {
        const redactString = '*****';
        let tracedHeaders = headers;
        // redact Basic Auth passphrase, if provided
        if (tracedHeaders.Authorization) {
            tracedHeaders = util.deepCopy(tracedHeaders);
            tracedHeaders.Authorization = redactString;
        }

        let tracedProxy;
        if (!util.isObjectEmpty(proxy)) {
            tracedProxy = util.deepCopy(proxy);
            tracedProxy.passphrase = redactString;
        }

        context.tracer.write({
            allowSelfSignedCert,
            body,
            host,
            fallbackHosts,
            headers: tracedHeaders,
            method,
            port,
            protocol,
            proxy: tracedProxy,
            uri,
            privateKey: util.isObjectEmpty(key) ? undefined : redactString,
            clientCertificate: util.isObjectEmpty(cert) ? undefined : redactString,
            rootCertificate: util.isObjectEmpty(ca) ? undefined : redactString
        });
    }
    return httpUtil.sendToConsumer({
        allowSelfSignedCert,
        body,
        hosts: [host].concat(fallbackHosts),
        headers,
        json: true, // for 'body' processing
        logger: context.logger,
        method,
        port,
        protocol,
        proxy,
        uri,
        key,
        cert,
        ca
    }).catch((err) => {
        context.logger.exception(`Unexpected error: ${err}`, err);
    });
};
