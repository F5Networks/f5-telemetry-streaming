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

const zlib = require('zlib');

const httpUtil = require('../../utils/http');
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

const httpAgentsMap = {};

const getHttpAgent = (config) => {
    const agentFromConf = httpUtil.getAgent(config);
    if (!httpAgentsMap[config.id] || httpAgentsMap[config.id].key !== agentFromConf.agentKey) {
        httpAgentsMap[config.id] = {
            key: agentFromConf.agentKey,
            agent: agentFromConf.agent
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
            agent: getHttpAgent(Object.assign({ connection: { protocol } }, context.config)),
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
