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

const assert = require('../../utils/assert');
const constants = require('../../constants');
const defaultLogger = require('../../logger');
const requestUtil = require('../../utils/requests');
const util = require('../../utils/misc');

/**
 * @module ihealth/api/ihealth
 *
 * @typedef {import('../../logger').Logger} Logger
 * @typedef {import('../../utils/config').Credentials} Credentials
 * @typedef {import('../../utils/config').Proxy} Proxy
 */

/**
 * F5 iHealth API class
 *
 * @private
 */
class IHealthAPI {
    /**
     * Constructor
     *
     * @param {Credentials} credentials - F5 iHealth Service credentials
     * @param {object} options - other options
     * @param {Logger} options.logger - parent logger instance
     * @param {Proxy} [options.proxy] - proxy settings for F5 iHealth Service connection
     */
    constructor(credentials, {
        logger = undefined,
        proxy = undefined
    } = {}) {
        assert.ihealth.credentials(credentials, 'credentials');
        assert.instanceOf(logger, defaultLogger.constructor, 'logger');

        if (typeof proxy === 'object') {
            assert.http.proxy(proxy, 'proxy');

            proxy = util.deepCopy(proxy);
            if (typeof proxy.connection.allowSelfSignedCert === 'undefined') {
                proxy.connection.allowSelfSignedCert = false;
            }

            proxy = util.deepFreeze(proxy);
        } else {
            proxy = null;
        }

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            credentials: {
                value: util.deepFreeze(util.deepCopy(credentials))
            },
            logger: {
                value: logger.getChild('iHealthAPI')
            },
            proxy: {
                value: proxy
            }
        });
    }

    /**
     * Authenticates to F5 iHealth Service with provided credentials
     *
     * @returns {void} once got HTTP 200 OK
     */
    async authenticate() {
        if (this._token && Date.now() <= this._token.expires_in) {
            // still valid token
            return;
        }

        this._token = null;

        this.logger.debug('Authenticating to F5 iHealth Service');

        const auth = Buffer.from(`${this.credentials.username}:${this.credentials.passphrase}`).toString('base64');
        const requestOptions = this.getDefaultRequestOptions();
        requestOptions.fullURI = constants.IHEALTH.SERVICE_API.LOGIN;
        requestOptions.body = 'grant_type=client_credentials&scope=ihealth';
        requestOptions.json = false;
        requestOptions.method = 'POST';
        Object.assign(requestOptions.headers, {
            Accept: 'application/json',
            Authorization: `Basic ${auth}`,
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded'
        });
        requestOptions.expectedResponseCode = 200;

        const response = await requestUtil.makeRequest(requestOptions);
        assert.ihealth.response.auth(response, 'response');

        this._token = response;
        // adjust by 2 minutes to avoid issues with expiration
        this._token.expires_in = Date.now() + (this._token.expires_in - 2 * 60) * 1000;
        // freeze to avoid accidental changes
        util.deepFreeze(this._token);
    }

    /**
     * Fetches Qkview diagnostics data from F5 iHealth Service
     *
     * @property {string} qkviewURI - Qkview diagnostics URI
     *
     * @returns {object} Qkview diagnostics data
     */
    async fetchQkviewDiagnostics(qkviewURI) {
        this.logger.debug(`Fetching Qkview diagnostics from "${qkviewURI}"`);

        const requestOptions = this.getDefaultRequestOptions();
        requestOptions.fullURI = qkviewURI;
        requestOptions.method = 'GET';
        requestOptions.headers.Accept = 'application/vnd.f5.ihealth.api.v1.0+json';
        requestOptions.continueOnErrorCode = true;
        requestOptions.includeResponseObject = true;
        requestOptions.rawResponseBody = true;

        const res = await requestUtil.makeRequest(requestOptions);
        const respObj = res[1];
        let body = res[0];

        this.logger.verbose(`Qkview diagnostics: ${body}`);

        try {
            body = JSON.parse(body);
        } catch (parseErr) {
            throw new Error(`Unable to parse Qkview diagnostics response to F5 iHealth server: responseCode = ${respObj.statusCode} responseBody = ${body}`);
        }

        assert.ihealth.response.diagnostics(body, 'response');
        return body;
    }

    /**
     * Fetches Qkview Report status
     *
     * @property {string} qkviewURI - Qkview URI (returned after Qkview upload)
     *
     * @returns {Report} Qkview report
     */
    async fetchQkviewReportStatus(qkviewURI) {
        await this.authenticate();

        this.logger.debug(`Fetching Qkview report from "${qkviewURI}"`);

        const requestOptions = this.getDefaultRequestOptions();
        requestOptions.fullURI = qkviewURI;
        requestOptions.method = 'GET';
        requestOptions.headers.Accept = 'application/vnd.f5.ihealth.api.v1.0+json';
        requestOptions.continueOnErrorCode = true;
        requestOptions.includeResponseObject = true;
        requestOptions.rawResponseBody = true;

        const res = await requestUtil.makeRequest(requestOptions);
        const respObj = res[1];
        let body = res[0];

        this.logger.verbose(`Qkview report: ${body}`);

        try {
            body = JSON.parse(body);
        } catch (parseErr) {
            throw new Error(`Unable to parse Qkview report response to F5 iHealth server: responseCode = ${respObj.statusCode} responseBody = ${body}`);
        }

        assert.ihealth.response.report(body, 'report');

        const ret = {
            qkviewURI,
            status: {
                done: body.processing_status === 'COMPLETE',
                error: body.processing_status === 'ERROR'
            }
        };

        if (ret.status.error) {
            ret.status.done = true;
            ret.status.errorMessage = body.processing_messages;
        }
        if (ret.status.done && !ret.status.error) {
            ret.diagnosticsURI = body.diagnostics;
        }

        return ret;
    }

    /**
     * Makes default options for 'request' library
     *
     * @returns {object} default 'request' options
     */
    getDefaultRequestOptions() {
        const options = {
            headers: {
                'User-Agent': constants.USER_AGENT
            },
            allowSelfSignedCert: this.getAllowSelfSignedCertFlag()
        };

        if (this.proxy) {
            options.proxy = this.getProxy();
        }

        if (this._token) {
            options.headers.Authorization = `Bearer ${this._token.access_token}`;
        }

        return options;
    }

    /**
     * Makes proxy config
     *
     * @returns {object} proxy config
     */
    getProxy() {
        const proxy = {
            host: this.proxy.connection.host
        };
        if (typeof this.proxy.connection.port !== 'undefined') {
            proxy.port = this.proxy.connection.port;
        }
        if (typeof this.proxy.connection.protocol !== 'undefined') {
            proxy.protocol = this.proxy.connection.protocol;
        }
        if (this.proxy.credentials) {
            proxy.username = this.proxy.credentials.username;
            if (typeof this.proxy.credentials.passphrase !== 'undefined') {
                proxy.passphrase = this.proxy.credentials.passphrase;
            }
        }
        return proxy;
    }

    /**
     * Gets value for strict SSL options
     *
     * @returns {boolean}
     */
    getAllowSelfSignedCertFlag() {
        let allowSelfSignedCert = false; // by default, because connecting to F5 API
        if (this.proxy && typeof this.proxy.connection.allowSelfSignedCert === 'boolean') {
            allowSelfSignedCert = this.proxy.connection.allowSelfSignedCert;
        }
        return allowSelfSignedCert;
    }

    /**
     * Uploads Qkview file to F5 iHealth Service
     *
     * @param {string} qkviewFile - path to Qkview file
     *
     * @returns {string} URI of the Qkview uploaded to F5 iHealth service
     */
    async uploadQkview(qkviewFile) {
        await this.authenticate();

        this.logger.debug(`Uploading Qkview "${qkviewFile}" to F5 iHealth Service`);

        const requestOptions = this.getDefaultRequestOptions();
        requestOptions.fullURI = constants.IHEALTH.SERVICE_API.UPLOAD;
        requestOptions.method = 'POST';
        requestOptions.headers.Accept = 'application/vnd.f5.ihealth.api.v1.0+json';
        requestOptions.formData = {
            qkview: util.fs.createReadStream(qkviewFile),
            visible_in_gui: 'True'
        };
        requestOptions.continueOnErrorCode = true;
        requestOptions.includeResponseObject = true;
        requestOptions.rawResponseBody = true;

        const res = await requestUtil.makeRequest(requestOptions);
        const respObj = res[1];
        let body = res[0];

        this.logger.verbose(`Qkview uploaded: ${body}`);

        try {
            body = JSON.parse(body);
        } catch (parseErr) {
            throw new Error(`Unable to upload Qkview to F5 iHealth server - unable to parse response body: responseCode = ${respObj.statusCode} responseBody = ${body}`);
        }

        assert.ihealth.response.upload(body, 'response');
        this.logger.debug('Qkview uploaded to F5 iHealth service');
        return body.location;
    }
}

/**
 * iHealth Manager to upload Qkview and poll diagnostics from the local device
 *
 * @property {IHealthAPI} api - instance of IHealthAPI
 */
class IHealthManager {
    /**
     * Constructor
     *
     * @param {Credentials} credentials - F5 iHealth Service credentials
     * @param {object} options - function options
     * @param {Logger} options.logger - parent logger
     * @param {Proxy} [options.proxy] - proxy settings for F5 iHealth Service connection
     */
    constructor(credentials, options) {
        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            api: {
                value: new IHealthAPI(credentials, options)
            }
        });
    }

    /**
     * Retrieves diagnostics data from F5 iHealth service
     *
     * @param {string} qkviewURI - Qkview' URI on F5 iHealth
     *
     * @return {Report} Qkview report
     */
    async fetchQkviewDiagnostics(qkviewURI) {
        const report = await this.api.fetchQkviewReportStatus(qkviewURI);
        if (report.status.done && !report.status.error) {
            assert.string(report.diagnosticsURI, 'qkviewURI');
            report.diagnostics = await this.api.fetchQkviewDiagnostics(report.diagnosticsURI);
        }

        assert.ihealth.report(report, 'report');
        return report;
    }

    /**
     * Uploads Qkview to F5 iHealth service
     *
     * @param {string} qkviewFile - path to Qkview file on the device
     *
     * @return {string} URI of the Qkview uploaded to F5 iHealth service
     */
    async uploadQkview(qkviewFile) {
        assert.string(qkviewFile, 'qkviewFile');
        return this.api.uploadQkview(qkviewFile);
    }
}

module.exports = IHealthManager;

/**
 * @typedef {object} Report
 * @property {string} diagnosticsURI - iHealth Qkview Diagnostics URI
 * @property {object} diagnostics
 * @property {string} qkviewURI - iHealth Qkview URI
 * @property {object} status - report status
 * @property {boolean} status.done - is report done/succeed
 * @property {boolean} status.error - is report processing failed
 * @property {string} status.errorMessage - error message
 */
