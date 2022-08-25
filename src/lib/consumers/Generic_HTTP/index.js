/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const http = require('http');
const https = require('https');
const zlib = require('zlib');

const httpUtil = require('../shared/httpUtil');
const util = require('../../utils/misc');

/**
 * Compress data
 *
 * @param {string} zlibMethod - method name from 'zlib'
 * @param {string} data - data to compress
 *
 * @returns {Promise<Buffer>} resolved with compressed data
 */
const compressData = (zlibMethod, data) => new Promise((resolve, reject) => {
    zlib[zlibMethod](data, (err, buffer) => {
        if (err) {
            reject(err);
        } else {
            resolve(buffer);
        }
    });
});

/**
 * Compress data if need
 *
 * @param {string} compression - compression type
 * @param {string} data - data to compress
 *
 * @returns {Promise<Buffer | string>} resolved with data or compressed data
 */
const maybeCompress = (compression, data) => {
    if (compression === 'none') {
        return Promise.resolve(data);
    }
    data = typeof data !== 'string' ? JSON.stringify(data) : data;
    return compressData(compression, data);
};

/**
 * Fetch custom options for HTTP transport from config
 *
 * @param {Array} customOpts - options from config
 *
 * @returns {Object}
 */
const fetchHttpCustomOpts = (customOpts) => {
    const allowedKeys = [
        'keepAlive',
        'keepAliveMsecs',
        'maxSockets',
        'maxFreeSockets'
    ];
    const ret = {};
    customOpts.filter((opt) => allowedKeys.indexOf(opt.name) !== -1)
        .forEach((opt) => {
            ret[opt.name] = opt.value;
        });
    return ret;
};

const httpAgentsMap = {};
const createHttpAgentOptsKey = (opts) => {
    const keys = Object.keys(opts);
    keys.sort();
    return JSON.stringify(keys.map((k) => [k, opts[k]]));
};

const getHttpAgent = (config) => {
    const customOpts = fetchHttpCustomOpts(config.customOpts || []);
    const optsKey = createHttpAgentOptsKey(customOpts);
    if (!httpAgentsMap[config.id] || httpAgentsMap[config.id].key !== optsKey) {
        httpAgentsMap[config.id] = {
            agent: new (config.protocol === 'https' ? https.Agent : http.Agent)(Object.assign({}, customOpts)),
            key: optsKey
        };
    }
    return httpAgentsMap[config.id].agent;
};

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const outputMode = context.config.outputMode;
    const body = (outputMode === 'raw') ? context.event.data.originalRawData : context.event.data;
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
    const compressionType = context.config.compressionType || 'none';

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
            compressionType,
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

    let maybeJson = outputMode !== 'raw'; // for 'body' processing
    if (compressionType !== 'none') {
        headers['Content-Encoding'] = compressionType;
        maybeJson = false;
    }

    return maybeCompress(compressionType, body)
        .then((data) => httpUtil.sendToConsumer({
            agent: getHttpAgent(context.config),
            allowSelfSignedCert,
            body: data,
            hosts: [host].concat(fallbackHosts),
            headers,
            json: maybeJson,
            logger: context.logger,
            method,
            port,
            protocol,
            proxy,
            uri,
            key,
            cert,
            ca
        }))
        .catch((err) => {
            context.logger.exception(`Unexpected error: ${err}`, err);
        });
};
