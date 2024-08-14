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

const pathUtil = require('path');
const sinon = require('sinon');
const { v4: uuidv4 } = require('uuid');

const assert = require('../../shared/assert');
const BigIpApiMock = require('../../shared/bigipAPIMock');
const {
    mockHttpEndpoint,
    wrapMockNock,
    wrapMockNockSet
} = require('../../shared/httpMock');
const qkviewDiagData = require('./qkviewDiagnostics.json');
const testUtil = require('../../shared/util');

/**
 * @typedef {import('../../shared/bigipAPIMock').Connection} Connection
 * @typedef {import('../../shared/bigipAPIMock').MockNockStubBase} MockNockStubBase
 */

/**
 * Device API Mock
 */
class DeviceApiMock {
    /**
     * @param {BigIpApiMock} bigip
     */
    constructor(bigip) {
        assert.instanceOf(bigip, BigIpApiMock, `bigip should be an instnace of ${BigIpApiMock.name}`);
        this.bigip = bigip;
    }

    /**
     * Mock DeviceAPI.prototype.createQkview
     *
     * @property {string} [qkviewName = '']
     * @property {NockMockOptions} [options]
     * @property {string} [options.dir]
     *
     * @returns {{dacli: Object<string, MockNockStubBase>}} stubs
     */
    mockCreateQkview(qkviewName = '', options = {}) {
        assert.isString(qkviewName, 'qkviewName');

        let dir = '/shared/tmp';
        if (options.dir) {
            assert.isString(options.dir, 'directory');
            dir = options.dir;
        }

        const dacliCmd = new RegExp(`/usr/bin/qkview -C -f ../..${dir}/${qkviewName}`);
        const createQkviewStub = {
            dacli: this.bigip.mockDACLI(dacliCmd, Object.assign({}, testUtil.deepCopy(options), { scriptName: /qkview/ }))
        };
        createQkviewStub.dacli.updateScript.remove();

        wrapMockNockSet(createQkviewStub);
        return createQkviewStub;
    }

    /**
     * Mock DeviceAPI.prototype.downloadFile
     *
     * @property {string} srcPath
     * @property {NockMockOptions} [options]
     *
     * @returns {{
    *      downloadownloadFiledStub: MockNockStubBase,
    *      downloadPathExist: MockNockStubBase,
    *      remotePathExist: MockNockStubBase,
    *      removeDownloadPath: MockNockStubBase,
    *      symlinkStub: MockNockStubBase,
    * }} stubs
    */
    mockDownloadFile(srcPath, options = {}) {
        const downloadURI = new RegExp(`/mgmt/shared/file-transfer/bulk/${pathUtil.basename(srcPath)}`);
        const remoteFilePath = new RegExp(`/var/config/rest/bulk/${pathUtil.basename(srcPath)}`);
        const symlinkCmd = new RegExp(`ln -s \\\\"${srcPath}\\\\" \\\\"/var/config/rest/bulk/${pathUtil.basename(srcPath)}\\\\"`);

        const downloadFileStub = {};

        downloadFileStub.downloadFile = this.bigip.mockDownloadFileFromDevice(downloadURI, testUtil.deepCopy(options));
        downloadFileStub.downloadFile.stub.callsFake(() => {
            const data = Buffer.from('qkview');
            return [200, data, { start: 0, end: data.length - 1, size: data.length }];
        });
        downloadFileStub.downloadPathExist = this.bigip.mockPathExists(remoteFilePath, testUtil.deepCopy(options));
        downloadFileStub.downloadPathExist.stub.callsFake((pathArg) => [200, pathArg]);
        downloadFileStub.remotePathExist = this.bigip.mockPathExists(new RegExp(srcPath), testUtil.deepCopy(options));
        downloadFileStub.remotePathExist.stub.callsFake((pathArg) => [200, pathArg]);
        downloadFileStub.removeDownloadPath = this.bigip.mockRemovePath(remoteFilePath, testUtil.deepCopy(options));
        downloadFileStub.symlinkStub = this.bigip.mockExecuteShellCommandOnDevice(
            symlinkCmd, testUtil.deepCopy(options)
        );

        wrapMockNockSet(downloadFileStub);
        return downloadFileStub;
    }

    /**
     * Mock DeviceAPI.prototype.getDeviceInfo
     *
     * @property {NockMockOptions} [options]
     *
     * @returns {{deviceInfo: MockNockStubBase}} stubs
     */
    mockGetDeviceInfo(options = {}) {
        const deviceInfoStub = {
            deviceInfo: this.bigip.mockDeviceInfo(undefined, testUtil.deepCopy(options))
        };
        return deviceInfoStub;
    }

    /**
     * Mock DeviceAPI.prototype.getMD5sum
     *
     * @property {string} filePath
     * @property {NockMockOptions} [options]
     *
     * @returns {{
     *      dacli: Object<string, MockNockStubBase>,
     *      removePath: MockNockStubBase,
     *      shell: MockNockStubBase
     * }} stubs
     */
    mockGetMD5sum(filePath, options = {}) {
        const dacliCmd = new RegExp(`md5sum "${filePath}" > "${wrapMD5(filePath)}"`);
        const shellCmd = new RegExp(`cat \\\\"${wrapMD5(filePath)}\\\\"`);

        const getMD5sumStub = {};
        getMD5sumStub.dacli = this.bigip.mockDACLI(dacliCmd, Object.assign({}, testUtil.deepCopy(options), { scriptName: /md5/ }));
        getMD5sumStub.dacli.updateScript.remove();

        getMD5sumStub.removePath = this.bigip.mockRemovePath(new RegExp(wrapMD5(filePath)), testUtil.deepCopy(options));
        getMD5sumStub.shell = this.bigip.mockExecuteShellCommandOnDevice(shellCmd, testUtil.deepCopy(options));
        getMD5sumStub.shell.stub.returns([200, `${filePath}_md5sum ${filePath}`]);

        wrapMockNockSet(getMD5sumStub);
        return getMD5sumStub;
    }

    /**
     * Mock DeviceAPI.prototype.removeFile
     *
     * @property {RegExp | string} filePath
     * @property {NockMockOptions} [options]
     *
     * @returns {{removePath: MockNockStubBase}} stubs
     */
    mockRemoveFile(filePath, options = {}) {
        const removeFileStub = {
            removePath: this.bigip.mockRemovePath(new RegExp(filePath), testUtil.deepCopy(options))
        };

        wrapMockNockSet(removeFileStub);
        return removeFileStub;
    }
}

class IHealthApiMock {
    constructor() {
        Object.defineProperties(this, {
            apiOrigin: {
                value: 'https://ihealth2-api.f5.com'
            },
            identityOrigin: {
                value: 'https://identity.account.f5.com'
            }
        });
        this.authTokens = [];
        this.qkviews = {};
    }

    /**
     * @param {{access_token: string}} token
     */
    addAuthToken(token) {
        assert.allOfAssertions(
            () => assert.allOfAssertions(
                () => assert.isObject(token, 'token'),
                () => assert.isNotEmpty(token, 'token'),
                'token should be a non-emtpy object'
            ),
            () => assert.allOfAssertions(
                () => assert.isString(token.access_token, 'token.access_token'),
                () => assert.isNotEmpty(token.access_token, 'token.access_token'),
                'token.access_token should be a string'
            )
        );
        this.authTokens.push(token.access_token);
    }

    /**
     * @param {string} header - authorization header value
     *
     * @returns {boolean} true if auth token is valid
     */
    checkAuth(header) {
        return this.authTokens.some((token) => header.includes(`Bearer ${token}`));
    }

    /**
     * @param {string} username
     * @param {string} password
     * @property {NockMockOptions} [options]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function(authData: {user_id: string, user_secret: string}) {
     *     return [statusCode, 'token', 'error message' || null];
     * }
     */
    mockAuth(username, password, { optionally = false, replyTimes = 1 } = {}) {
        Object.entries({ username, password }).forEach(([key, value]) => assert.oneOfAssertions(
            () => assert.instanceOf(value, RegExp, key),
            () => assert.allOfAssertions(
                () => assert.isString(value, key),
                () => assert.isNotEmpty(value, key)
            ),
            `${key} should be a RegExp or a string`
        ));

        function testStr(expected, actual) {
            if (typeof expected === 'string') {
                return expected === actual;
            }

            expected.lastIndex = 0;
            return expected.test(actual);
        }

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.identityOrigin, {
                method: 'POST',
                optionally,
                path: '/oauth2/ausp95ykc80HOU7SQ357/v1/token',
                reqBody: 'grant_type=client_credentials&scope=ihealth',
                reqHeaders: {
                    Accept: 'application/json',
                    Authorization: /Basic\s+.{1,}/,
                    'Cache-Control': 'no-cache',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                replyTimes,
                response: async (uri, reqBody, req) => {
                    const authHeader = req.headers.authorization || '';
                    if (this.checkAuth(authHeader)) {
                        return [500, 'Invalid cookies'];
                    }

                    const creds = Buffer.from(
                        authHeader.trim().split(/\s+/)[1], 'base64'
                    )
                        .toString()
                        .split(':');

                    if (!(creds.length === 2 && testStr(username, creds[0] || '') && testStr(password, creds[1] || ''))) {
                        return [401, 'Unauthorized'];
                    }

                    const [code, token, errorMsg] = ret.stub(reqBody);
                    if (token) {
                        this.addAuthToken(token);
                    }
                    return [
                        code,
                        errorMsg || token
                    ];
                }
            }),
            stub: sinon.stub()
        });
        ret.stub.callsFake(() => [
            200,
            {
                access_token: uuidv4(),
                expires_in: 1800,
                scope: 'ihealth',
                token_type: 'Bearer'
            }
        ]);

        return ret;
    }

    /**
     * @param {object} diagData
     * @param {object} [options]
     * @property {NockMockOptions} [options]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function(qkviewID: string, template: object) {
     *     return [statusCode, template, 'error message' || null];
     * }
     */
    mockQkviewDiagnostics(diagData, { optionally = false, replyTimes = 1 } = {}) {
        const qkviewURI = '/qkview-analyzer/api/qkviews/';
        const uriSuffix = '/diagnostics';

        function fetchQkviewIdFromURI(uri) {
            if (uri.startsWith(qkviewURI) && uri.endsWith(uriSuffix)) {
                return uri.slice(qkviewURI.length, uri.length - uriSuffix.length);
            }
            return '';
        }

        diagData = testUtil.deepCopy(diagData || qkviewDiagData);

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.apiOrigin, {
                method: 'GET',
                optionally,
                path: (uri) => !!this.qkviews[fetchQkviewIdFromURI(uri)],
                reqHeaders: {
                    Accept: 'application/vnd.f5.ihealth.api.v1.0+json',
                    Authorization: /Bearer\s+.{1,}/
                },
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!this.checkAuth(req.headers.authorization || '')) {
                        return [401, 'Unauthorized'];
                    }

                    const [code, data, errorMsg] = ret.stub(fetchQkviewIdFromURI(uri), testUtil.deepCopy(ret.diagData));
                    return [
                        code,
                        errorMsg || data
                    ];
                }
            }),
            diagData,
            stub: sinon.stub()
        });
        ret.stub.callsFake((qkviewID, template) => [200, template]);

        return ret;
    }

    /**
     * @param {object} [options]
     * @property {NockMockOptions} [options]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function(qkviewID: string, template: object) {
     *     return [statusCode, template, 'error message' || null];
     * }
     */
    mockQkviewReport({ optionally = false, replyTimes = 1 } = {}) {
        const qkviewURI = '/qkview-analyzer/api/qkviews/';

        function fetchQkviewIdFromURI(uri) {
            if (uri.startsWith(qkviewURI)) {
                return uri.slice(qkviewURI.length);
            }
            return '';
        }

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.apiOrigin, {
                method: 'GET',
                optionally,
                path: (uri) => !!this.qkviews[fetchQkviewIdFromURI(uri)],
                reqHeaders: {
                    Accept: 'application/vnd.f5.ihealth.api.v1.0+json',
                    Authorization: /Bearer\s+.{1,}/
                },
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!this.checkAuth(req.headers.authorization || '')) {
                        return [401, 'Unauthorized'];
                    }

                    const qkviewID = fetchQkviewIdFromURI(uri);
                    const template = {
                        processing_status: 'COMPLETE',
                        processing_messages: null,
                        diagnostics: `${this.qkviews[qkviewID].location}/diagnostics`
                    };

                    const [code, data, errorMsg] = ret.stub(qkviewID, template);
                    return [
                        code,
                        errorMsg || data
                    ];
                }
            }),
            stub: sinon.stub()
        });
        ret.stub.callsFake((qkviewID, template) => [200, template]);

        return ret;
    }

    /**
     * @param {string} qkviewFilename
     * @property {NockMockOptions} [options]
     *
     * @returns {MockNockStubBase} stub that has following signature:
     *
     * function(data: string, responseTemplate: object) {
     *     return [statusCode, responseTemplate, 'error message' || null];
     * }
     */
    mockQkviewUpload(qkviewFilename, { optionally = false, replyTimes = 1 } = {}) {
        assert.allOfAssertions(
            () => assert.isString(qkviewFilename, 'qkviewFilename'),
            () => assert.isNotEmpty(qkviewFilename, 'qkviewFilename'),
            'qkviewFilename should be a string'
        );

        const fnameRegExp = new RegExp(`filename=\\"${qkviewFilename}\\"`, 'gm');

        const ret = wrapMockNock({
            ...mockHttpEndpoint(this.apiOrigin, {
                method: 'POST',
                optionally,
                path: '/qkview-analyzer/api/qkviews',
                reqBody(reqBody) {
                    fnameRegExp.lastIndex = 0;
                    return fnameRegExp.test(reqBody);
                },
                reqHeaders: {
                    Accept: 'application/vnd.f5.ihealth.api.v1.0+json',
                    Authorization: /Bearer\s+.{1,}/
                },
                replyTimes,
                response: async (uri, reqBody, req) => {
                    if (!this.checkAuth(req.headers.authorization || '')) {
                        return [401, 'Unauthorized'];
                    }

                    const reqID = Date.now();
                    const template = {
                        expiration_date: Date.now() + 300 * 1000,
                        id: reqID,
                        location: `${this.apiOrigin}/qkview-analyzer/api/qkviews/${reqID}`,
                        result: 'OK'
                    };

                    const [code, data, errorMsg] = ret.stub(reqBody, template);
                    if (!errorMsg) {
                        this.qkviews[reqID] = {
                            id: reqID,
                            fileData: reqBody,
                            location: template.location
                        };
                    }
                    return [
                        code,
                        errorMsg || data
                    ];
                }
            }),
            stub: sinon.stub()
        });
        ret.stub.callsFake((data, template) => [303, template]);

        return ret;
    }
}

/**
 * Qkview Manager Mock
 */
class QkviewManagerMock {
    /**
     * @param {DeviceApiMock} localMock
     * @param {DeviceApiMock} remoteMock
     */
    constructor(localMock, remoteMock) {
        this.local = localMock;
        this.remote = remoteMock;
    }

    /**
     * Mock all methods that applicable for the local device
     *
     * @param {string} [qkviewName]
     * @property {NockMockOptions} [options]
     *
     * @returns {object} stubs
     */
    mockLocalCase(qkviewName = '.*qkview_telemetry_.*.tar.qkview', options = {}) {
        return {
            local: {
                createQkview: this.local.mockCreateQkview(qkviewName, testUtil.deepCopy(options)),
                deviceInfo: this.local.mockGetDeviceInfo(testUtil.deepCopy(options)),
                removeQkview: this.local.mockRemoveFile(qkviewName, testUtil.deepCopy(options))
            }
        };
    }

    /**
     * Mock all methods that applicable for the remote device
     *
     * @param {string} [qkviewName]
     * @property {NockMockOptions} [options]
     *
     * @returns {object} stubs
     */
    mockRemoteCase(qkviewName = '.*qkview_telemetry_.*.tar.qkview', options = {}) {
        const stubs = {
            local: {
                deviceInfo: this.local.mockGetDeviceInfo(testUtil.deepCopy(options)),
                getMD5sum: this.local.mockGetMD5sum(qkviewName, testUtil.deepCopy(options)),
                removeQkview: this.local.mockRemoveFile(qkviewName, testUtil.deepCopy(options))
            },
            remote: {
                createQkview: this.remote.mockCreateQkview(qkviewName, testUtil.deepCopy(options)),
                downloadQkview: this.remote.mockDownloadFile(qkviewName, testUtil.deepCopy(options)),
                deviceInfo: this.remote.mockGetDeviceInfo(testUtil.deepCopy(options)),
                getMD5sum: this.remote.mockGetMD5sum(qkviewName, testUtil.deepCopy(options)),
                removeQkview: this.remote.mockRemoveFile(qkviewName, testUtil.deepCopy(options))
            }
        };
        stubs.local.removeQkview.removePath.disable();
        return stubs;
    }
}

/** @returns {string} file name with .md5sum ext. */
function wrapMD5(fpath) {
    return `${fpath}.md5sum`;
}

module.exports = {
    DeviceApiMock,
    IHealthApiMock,
    QkviewManagerMock
};

/**
 * @typedef {object} Credentials
 * @property {string} username
 * @property {string} password
 * @property {string} token
 */
/**
 * @typedef {object} NockMockOptions
 * @property {boolean} [optionally = false]
 * @property {number} [replyTimes = 1]
 */
