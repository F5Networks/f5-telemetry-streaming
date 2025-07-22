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

/* eslint-disable import/order, no-restricted-syntax */
const moduleCache = require('../../shared/restoreCache')();

const pathUtil = require('path');
const sinon = require('sinon');

const assert = require('../../shared/assert');
const httpProxyTests = require('../../shared/tests/httpProxy');
const ihealthCredsTests = require('../../shared/tests/ihealthCreds');
const { IHealthApiMock } = require('./mocks');
const qkviewDiagData = require('./qkviewDiagnostics.json');
const sourceCode = require('../../shared/sourceCode');
const stubs = require('../../shared/stubs');
const testUtil = require('../../shared/util');

const IHealthAPI = sourceCode('src/lib/ihealth/api/ihealth');
const logger = sourceCode('src/lib/logger');
const { SERVICE_API } = sourceCode('src/lib/constants').IHEALTH;

moduleCache.remember();

describe('iHealth / API / IHealth', () => {
    const credentials = {
        username: 'test_user_1',
        passphrase: 'test_passphrase_1'
    };
    let fakeClock;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        fakeClock = null;
    });

    afterEach(() => {
        if (fakeClock) {
            fakeClock.stub.restore();
        }

        testUtil.nockCleanup();
        sinon.restore();
    });

    describe('constructor', () => {
        it('invalid arguments', () => {
            const ihealthCreds = ihealthCredsTests();
            for (const testData of ihealthCreds) {
                assert.throws(() => new IHealthAPI(testData.value), testData.error);
            }

            const proxyTests = httpProxyTests();
            for (const testData of proxyTests) {
                assert.throws(() => new IHealthAPI(credentials, { logger, proxy: testData.value }), testData.error);
            }
        });
    });

    describe('main tests', () => {
        const qkviewFilePath = __filename;
        let ihealthApiMock;
        let ihealth;
        let requestSpies;
        let uploadStub;

        const proxyTests = [
            {
                name: 'no proxy',
                value: undefined,
                expectedProxy: undefined
            },
            {
                name: 'host only',
                value: { connection: { host: 'proxyhost' } },
                expectedProxy: 'http://proxyhost'
            },
            {
                name: 'host, port, protocol, allowSelfSignedCert',
                value: {
                    connection: {
                        host: 'proxyhost',
                        port: 5555,
                        protocol: 'https',
                        allowSelfSignedCert: true
                    }
                },
                expectedProxy: 'https://proxyhost:5555'
            },
            {
                name: 'with username',
                value: {
                    connection: {
                        host: 'proxyhost',
                        port: 5555,
                        protocol: 'https',
                        allowSelfSignedCert: true
                    },
                    credentials: {
                        username: 'test_user_1'
                    }
                },
                expectedProxy: 'https://test_user_1@proxyhost:5555'
            },
            {
                name: 'with username and passphrase',
                value: {
                    connection: {
                        host: 'proxyhost',
                        port: 5555,
                        protocol: 'https',
                        allowSelfSignedCert: true
                    },
                    credentials: {
                        username: 'test_user_1',
                        passphrase: 'test_passphrase_1'
                    }
                },
                expectedProxy: 'https://test_user_1:test_passphrase_1@proxyhost:5555' // #gitleaks:allow
            }
        ];

        proxyTests.forEach((proxyTest) => describe(`proxy - ${proxyTest.name}`, () => {
            let authStub;

            beforeEach(() => {
                requestSpies = testUtil.requestSpies();
                stubs.default.coreStub({ logger: true });

                ihealthApiMock = new IHealthApiMock();
                authStub = ihealthApiMock.mockAuth(credentials.username, credentials.passphrase);

                ihealth = new IHealthAPI(credentials, { logger, proxy: proxyTest.value });
                uploadStub = ihealthApiMock.mockQkviewUpload(pathUtil.basename(__filename));
            });

            afterEach(() => {
                let strictSSL = true;
                if (proxyTest.value && typeof proxyTest.value.connection.allowSelfSignedCert === 'boolean') {
                    strictSSL = !proxyTest.value.connection.allowSelfSignedCert;
                }
                testUtil.checkRequestSpies(requestSpies, { strictSSL, proxy: proxyTest.expectedProxy });
            });

            describe('.uploadQkview()', () => {
                it('should upload qkview', async () => {
                    const qkviewURI = await ihealth.uploadQkview(qkviewFilePath);
                    assert.deepStrictEqual(uploadStub.stub.callCount, 1);
                    assert.isTrue(qkviewURI.startsWith(SERVICE_API.UPLOAD));
                });

                const responseTests = [
                    {
                        name: 'invalid JSON',
                        value: '{something}',
                        error: /unable to parse response body/
                    },
                    {
                        name: 'invalid response type',
                        value: 10,
                        error: /response should be an object/
                    },
                    {
                        name: 'invalid response structure',
                        value: { data: true },
                        error: /response.result should be a string/
                    },
                    {
                        name: 'invalid response.result type',
                        value: { result: 10 },
                        error: /response.result should be a string/
                    },
                    {
                        name: 'invalid response.result value',
                        value: { result: 'FAIL' },
                        error: /response.result should be "OK"/
                    },
                    {
                        name: 'invalid response.result value (empty string)',
                        value: { result: '' },
                        error: /response.result should be a non-empty collection/
                    },
                    {
                        name: 'invalid response.location value (empty string)',
                        value: { result: 'OK', location: '' },
                        error: /response.location should be a non-empty collection/
                    },
                    {
                        name: 'invalid response.location type',
                        value: { result: 'OK', location: 10 },
                        error: /response.location should be a string/
                    }
                ];

                responseTests.forEach((testData) => {
                    it(`should fail when unable to process response - ${testData.name}`, async () => {
                        uploadStub.stub.returns([303, testData.value]);
                        await assert.isRejected(
                            ihealth.uploadQkview(qkviewFilePath),
                            testData.error
                        );
                    });
                });
            });

            describe('.fetchQkviewDiagnostics()', () => {
                let diagnosticsStub;
                let reportStub;

                beforeEach(() => {
                    diagnosticsStub = ihealthApiMock.mockQkviewDiagnostics();
                    reportStub = ihealthApiMock.mockQkviewReport();
                });

                it('should fetch diagnostics data', async () => {
                    const qkviewURI = await ihealth.uploadQkview(qkviewFilePath);
                    const report = await ihealth.fetchQkviewDiagnostics(qkviewURI);

                    assert.deepStrictEqual(
                        report.qkviewURI, qkviewURI
                    );
                    assert.deepStrictEqual(
                        report.status,
                        {
                            done: true,
                            error: false
                        }
                    );
                    assert.isTrue(report.diagnosticsURI.startsWith(SERVICE_API.UPLOAD));
                    assert.isTrue(report.diagnosticsURI.endsWith('/diagnostics'));
                    assert.deepStrictEqual(report.diagnostics, qkviewDiagData);
                });

                const reportTests = [
                    {
                        name: 'invalid JSON',
                        value: '{something}',
                        error: /Unable to parse Qkview report response/
                    },
                    {
                        name: 'invalid report type',
                        value: 10,
                        error: /report should be an object/
                    },
                    {
                        name: 'invalid report structure',
                        value: { data: true },
                        error: /report.processing_status should be a string/
                    },
                    {
                        name: 'invalid report.processing_status type',
                        value: { processing_status: 10 },
                        error: /report.processing_status should be a string/
                    },
                    {
                        name: 'invalid report.processing_status value',
                        value: { processing_status: '' },
                        error: /report.processing_status should be a non-empty collection/
                    },
                    {
                        name: 'invalid report.diagnostics type',
                        value: { processing_status: 'COMPLETE', diagnostics: 10 },
                        error: /report.diagnostics should be a string/
                    },
                    {
                        name: 'invalid report.diagnostics value',
                        value: { processing_status: 'COMPLETE', diagnostics: '' },
                        error: /report.diagnostics should be a non-empty collection/
                    }
                ];

                reportTests.forEach((testData) => {
                    it(`should fail when unable to process report response - ${testData.name}`, async () => {
                        diagnosticsStub.remove();
                        reportStub.stub.returns([200, testData.value]);

                        const qkviewURI = await ihealth.uploadQkview(qkviewFilePath);

                        await assert.isRejected(
                            ihealth.fetchQkviewDiagnostics(qkviewURI),
                            testData.error
                        );
                    });
                });

                const diagnosticsTests = [
                    {
                        name: 'invalid JSON',
                        value: '{something}',
                        error: /Unable to parse Qkview diagnostics response/
                    },
                    {
                        name: 'invalid report type',
                        value: 10,
                        error: /response should be an object/
                    },
                    {
                        name: 'invalid report structure',
                        value: { data: true },
                        error: /response.diagnostics should be an object/
                    },
                    {
                        name: 'invalid report structure',
                        value: { diagnostics: true },
                        error: /response.diagnostics should be an object/
                    },
                    {
                        name: 'invalid report structure',
                        value: { diagnostics: 10 },
                        error: /response.diagnostics should be an object/
                    },
                    {
                        name: 'invalid report structure',
                        value: { diagnostics: {} },
                        error: /response.diagnostics should be a non-empty collection/
                    }
                ];

                diagnosticsTests.forEach((testData) => {
                    it(`should fail when unable to process diagnostics response - ${testData.name}`, async () => {
                        diagnosticsStub.stub.returns([200, testData.value]);

                        const qkviewURI = await ihealth.uploadQkview(qkviewFilePath);

                        await assert.isRejected(
                            ihealth.fetchQkviewDiagnostics(qkviewURI),
                            testData.error
                        );
                    });
                });

                it('should be able to process "RUNNING" report status', async () => {
                    diagnosticsStub.remove();
                    reportStub.stub.callsFake((qkviewID, template) => [
                        200,
                        {
                            processing_status: 'RUNNING',
                            diagnostics: template.diagnostics
                        }
                    ]);

                    const qkviewURI = await ihealth.uploadQkview(qkviewFilePath);
                    const report = await ihealth.fetchQkviewDiagnostics(qkviewURI);

                    assert.deepStrictEqual(report, {
                        qkviewURI,
                        status: {
                            done: false,
                            error: false
                        }
                    });
                });

                it('should be able to process "ERROR" report status', async () => {
                    diagnosticsStub.remove();
                    reportStub.stub.callsFake((qkviewID, template) => [
                        200,
                        {
                            processing_messages: 'expected error',
                            processing_status: 'ERROR',
                            diagnostics: template.diagnostics
                        }
                    ]);

                    const qkviewURI = await ihealth.uploadQkview(qkviewFilePath);
                    const report = await ihealth.fetchQkviewDiagnostics(qkviewURI);

                    assert.deepStrictEqual(report, {
                        qkviewURI,
                        status: {
                            done: true,
                            error: true,
                            errorMessage: 'expected error'
                        }
                    });
                });

                it('should be able to process "OTHER" report status', async () => {
                    diagnosticsStub.remove();
                    reportStub.stub.callsFake((qkviewID, template) => [
                        200,
                        {
                            processing_status: 'OTHER',
                            diagnostics: template.diagnostics
                        }
                    ]);

                    const qkviewURI = await ihealth.uploadQkview(qkviewFilePath);
                    const report = await ihealth.fetchQkviewDiagnostics(qkviewURI);

                    assert.deepStrictEqual(report, {
                        qkviewURI,
                        status: {
                            done: false,
                            error: false
                        }
                    });
                });

                it('should re-auth when token expired', async () => {
                    authStub.interceptor.times(2);
                    uploadStub.interceptor.times(2);

                    let qkviewURI = await ihealth.uploadQkview(qkviewFilePath);
                    assert.isTrue(qkviewURI.startsWith(SERVICE_API.UPLOAD));

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    await fakeClock.clockForward(2000 * 10000, { repeat: 1, promisify: true, delay: 1 });

                    qkviewURI = null;
                    await Promise.all([
                        (async () => {
                            qkviewURI = await ihealth.uploadQkview(qkviewFilePath);
                        })(),
                        (async () => {
                            while (!qkviewURI) {
                                await fakeClock.clockForward(100, { repeat: 1, promisify: true, delay: 1 });
                            }
                            fakeClock.stub.restore();
                        })()
                    ]);

                    assert.isTrue(qkviewURI.startsWith(SERVICE_API.UPLOAD));
                    assert.deepStrictEqual(authStub.stub.callCount, 2);
                });
            });
        }));
    });
});
