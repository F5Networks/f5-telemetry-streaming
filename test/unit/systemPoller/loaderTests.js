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

/* eslint-disable import/order, no-loop-func, no-plusplus, no-restricted-syntax */
const moduleCache = require('../shared/restoreCache')();

const HttpAgent = require('http').Agent;
const HttpsAgent = require('https').Agent;
const querystring = require('querystring');
const sinon = require('sinon');

const assert = require('../shared/assert');
const BigIpApiMock = require('../shared/bigipAPIMock');
const bigipConnTests = require('../shared/tests/bigipConn');
const bigipCredsTest = require('../shared/tests/bigipCreds');
const loaderTestsData = require('./data/loaderTestsData');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const Loader = sourceCode('src/lib/systemPoller/loader');

moduleCache.remember();

describe('System Poller / Endpoint Loader', () => {
    const defaultUser = 'admin';
    const localhost = 'localhost';
    const remotehost = 'remote.hostname.remote.domain';
    let coreStub;
    let logger;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({ logger: true });
        logger = coreStub.logger.logger;
    });

    afterEach(() => {
        testUtil.checkNockActiveMocks();
        testUtil.nockCleanup();
        sinon.restore();
    });

    describe('constructor', () => {
        it('invalid args', () => {
            assert.throws(() => new Loader(), 'target host should be a string');
            assert.throws(() => new Loader(''), 'target host should be a non-empty collection');
            assert.throws(() => new Loader(localhost), 'logger should be an instance of Logger');
            assert.throws(() => new Loader(localhost, {
                logger,
                chunkSize: 0
            }), 'chunkSize should be >= 1, got 0');
            assert.throws(() => new Loader(localhost, {
                logger,
                chunkSize: Number.MAX_VALUE
            }), 'chunkSize should be a safe number');
            assert.throws(() => new Loader(localhost, {
                logger,
                workers: 0
            }), 'workers should be >= 1, got 0');
            assert.throws(() => new Loader(localhost, {
                logger,
                workers: Number.MAX_VALUE
            }), 'workers should be a safe number');

            const hosts = [
                localhost,
                remotehost
            ];
            for (const host of hosts) {
                const credsTests = bigipCredsTest(host);
                for (const testData of credsTests) {
                    assert.throws(() => new Loader(host, {
                        credentials: testData.value,
                        logger
                    }), testData.error);
                }

                const connTests = bigipConnTests();
                for (const testData of connTests) {
                    assert.throws(() => new Loader(host, {
                        connection: testData.value,
                        credentials: { token: 'token' },
                        logger
                    }), testData.error);
                }
            }
        });

        it('should set defaults (localhost)', () => {
            const eLoader = new Loader(localhost, { logger });
            assert.deepStrictEqual(eLoader.chunkSize, 30);
            assert.deepStrictEqual(eLoader.connection, undefined);
            assert.deepStrictEqual(eLoader.credentials, {});
            assert.deepStrictEqual(eLoader.host, localhost);
        });

        it('should set defaults (remotehost)', () => {
            const eLoader = new Loader(remotehost, {
                credentials: {
                    username: 'test_username_1',
                    passphrase: 'test_passphrase_1'
                },
                logger
            });
            assert.deepStrictEqual(eLoader.chunkSize, 30);
            assert.deepStrictEqual(eLoader.connection, undefined);
            assert.deepStrictEqual(eLoader.credentials, {
                username: 'test_username_1',
                passphrase: 'test_passphrase_1'
            });
            assert.deepStrictEqual(eLoader.host, remotehost);
        });
    });

    const combinations = testUtil.product(
        // host config
        testUtil.smokeTests.filter([
            {
                name: localhost,
                value: localhost
            },
            {
                name: remotehost,
                value: remotehost
            }
        ]),
        // credentials config
        testUtil.smokeTests.filter([
            {
                name: 'default',
                value: undefined
            },
            {
                name: 'admin with passphrase',
                value: { username: defaultUser, passphrase: 'test_passphrase_1' }
            },
            testUtil.smokeTests.ignore({
                name: 'non-default user',
                value: { username: 'test_user_1', passphrase: 'test_passphrase_2' }
            }),
            testUtil.smokeTests.ignore({
                name: 'non-default passwordless user',
                value: { username: 'test_user_1' }
            }),
            {
                name: 'existing token',
                value: { token: 'auto' }
            }
        ]),
        // connection config
        testUtil.smokeTests.filter([
            {
                name: 'default',
                value: undefined
            },
            {
                name: 'non default',
                value: { port: 8105, protocol: 'https', allowSelfSignedCert: true }
            }
        ])
    );

    combinations.forEach(([hostConf, credentialsConf, connectionConf]) => {
        if (hostConf.value === remotehost && !(credentialsConf.value && credentialsConf.value.passphrase)) {
            // password-less user does not work with remote host
            return;
        }

        describe(`host = ${hostConf.name}, user = ${credentialsConf.name}, connection = ${connectionConf.name}`, () => {
            let bigip;
            let connection;
            let credentials;
            let host;
            let loader;
            let requestSpies;

            beforeEach(async () => {
                requestSpies = testUtil.requestSpies();

                connection = testUtil.deepCopy(connectionConf.value);
                credentials = testUtil.deepCopy(credentialsConf.value);
                host = hostConf.value;

                bigip = new BigIpApiMock(host, {
                    port: (connection && connection.port) || undefined,
                    protocol: (connection && connection.protocol) || undefined
                });

                if (credentials && credentials.token) {
                    bigip.addAuthToken(credentials.token);
                } else if (host === remotehost && credentials) {
                    assert.allOfAssertions(
                        () => assert.isDefined(credentials.username, 'username should be defined for remote host'),
                        () => assert.isDefined(credentials.passphrase, 'passphrase should be defined for remote host')
                    );
                    bigip.mockAuth(credentials.username, credentials.passphrase);
                } else if (host === localhost) {
                    bigip.addPasswordlessUser(
                        (credentials && credentials.username)
                            ? credentials.username
                            : defaultUser
                    );
                }

                loader = new Loader(host, { connection, credentials, logger });
            });

            afterEach(() => {
                let strictSSL = true;
                if (connectionConf.value && typeof connectionConf.value.allowSelfSignedCert === 'boolean') {
                    strictSSL = !connectionConf.value.allowSelfSignedCert;
                }
                testUtil.checkRequestSpies(requestSpies, { strictSSL });
            });

            describe('.setEndpoints()', () => {
                beforeEach(() => {
                    testUtil.nockCleanup();
                });

                it('should set endpoints', () => {
                    const expected = {
                        foo: {
                            name: 'foo',
                            body: 'bar',
                            path: 'test'
                        },
                        '/hello/world': {
                            path: '/hello/world',
                            body: 'Hello World!'
                        }
                    };
                    loader.setEndpoints([
                        {
                            name: 'foo',
                            body: 'bar',
                            path: 'test'
                        },
                        {
                            path: '/hello/world',
                            body: 'Hello World!'
                        }
                    ]);
                    assert.deepStrictEqual(loader._endpoints, expected);
                });

                it('should overwrite endpoints', () => {
                    const expected = {
                        bar: { name: 'bar', path: 'test' }
                    };
                    loader._endpoints = {
                        foo: {}
                    };
                    loader.setEndpoints([
                        {
                            name: 'bar',
                            path: 'test'
                        }
                    ]);
                    assert.deepStrictEqual(loader._endpoints, expected);
                });

                it('should log message when endpoint exists', () => {
                    const expected = {
                        bar: { name: 'bar', path: 'test2' }
                    };
                    loader._endpoints = {
                        foo: {}
                    };
                    loader.setEndpoints([
                        {
                            name: 'bar',
                            path: 'test'
                        },
                        {
                            name: 'bar',
                            path: 'test2'
                        }
                    ]);
                    assert.deepStrictEqual(loader._endpoints, expected);

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /Endpoint with key "bar" exists already!/
                    );
                });
            });

            [
                {
                    name: 'object',
                    value: {
                        command: 'run',
                        utilCmdArgs: '-c \'tmctl $tmctlArgs\''
                    }
                },
                {
                    name: 'string',
                    value: JSON.stringify({
                        command: 'run',
                        utilCmdArgs: '-c \'tmctl $tmctlArgs\''
                    })
                }
            ].forEach((testConf) => it(`should replace variable in the request body (${testConf.name})`, async () => {
                const path = '/endpoint/path';

                const mock = bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'POST',
                    path,
                    replyTimes: 2,
                    response: () => [200, { message: 'OK' }]
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path,
                    ignoreCached: true,
                    body: testConf.value
                }]);
                await loader.auth();

                await assert.becomes(loader.loadEndpoint('myEndpoint', {
                    replaceStrings: {
                        '\\$tmctlArgs': 'my-args'
                    }
                }), {
                    name: 'myEndpoint',
                    data: { message: 'OK' }
                });

                await assert.becomes(loader.loadEndpoint('myEndpoint', {
                    replaceStrings: {
                        '\\$tmctlArgs': 'my-args2'
                    }
                }), {
                    name: 'myEndpoint',
                    data: { message: 'OK' }
                });

                assert.deepStrictEqual(JSON.parse(mock.stub.args[0][1]), {
                    command: 'run',
                    utilCmdArgs: '-c \'tmctl my-args\''
                }, 'should replace variables');

                assert.deepStrictEqual(JSON.parse(mock.stub.args[1][1]), {
                    command: 'run',
                    utilCmdArgs: '-c \'tmctl my-args2\''
                }, 'should replace variables');
            }));

            [
                {
                    name: 'default chunk size',
                    value: undefined
                },
                {
                    name: 'custom chunk size',
                    value: 50
                }
            ].forEach((sizeConf) => {
                it(`should use chunk size - ${sizeConf.name}`, async () => {
                    const path = '/my/endpoint';
                    const encodedPath = `${path}?%24top=${sizeConf.value || loader.chunkSize}`;
                    const mock = bigip.mockArbitraryEndpoint({
                        authCheck: true,
                        method: 'GET',
                        path: encodedPath,
                        replyTimes: 1,
                        response: () => [200, { message: 'OK' }]
                    });

                    loader = new Loader(host, {
                        chunkSize: sizeConf.value,
                        connection,
                        credentials,
                        logger
                    });
                    loader.setEndpoints([{
                        name: 'myEndpoint',
                        pagination: true,
                        path
                    }]);

                    await loader.auth();
                    await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                        name: 'myEndpoint',
                        data: { message: 'OK' }
                    });

                    assert.deepStrictEqual(
                        mock.stub.args[0][0],
                        encodedPath
                    );
                });

                it(`should encode custom query params (chunk size = ${sizeConf.name}`, async () => {
                    const path = '/my/endpoint';
                    const mock = bigip.mockArbitraryEndpoint({
                        authCheck: true,
                        method: 'GET',
                        path: new RegExp(`${path}?`),
                        replyTimes: 1,
                        response: () => [200, { message: 'OK' }]
                    });

                    loader = new Loader(host, {
                        chunkSize: sizeConf.value,
                        connection,
                        credentials,
                        logger
                    });
                    loader.setEndpoints([{
                        name: 'myEndpoint',
                        pagination: true,
                        path,
                        query: {
                            $filter: '$filter',
                            $select: 'name,field$',
                            $skip: '$skip',
                            $non_default: 'some$value'
                        }
                    }]);

                    await loader.auth();
                    await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                        name: 'myEndpoint',
                        data: { message: 'OK' }
                    });
                    const expected = {
                        $top: `${sizeConf.value || loader.chunkSize}`,
                        $filter: '%24filter',
                        $select: 'name%2Cfield%24',
                        $skip: '%24skip',
                        $non_default: 'some%24value'
                    };
                    Object.entries(expected).forEach(([key, value]) => {
                        delete expected[key];
                        expected[querystring.escape(key)] = value;
                    });

                    assert.deepStrictEqual(
                        querystring.parse(mock.stub.args[0][0].split('?')[1], '&', '=', {
                            decodeURIComponent: (s) => s
                        }),
                        expected
                    );
                });
            });

            it('should error if endpoint is not defined', async () => {
                testUtil.nockCleanup();
                await assert.isRejected(
                    loader.loadEndpoint('badEndpoint'),
                    /endpointObj should not be undefined/
                );
            });

            it('should fail when unable to get data', async () => {
                loader.setEndpoints([{ name: 'path', path: '/test' }]);
                await loader.auth();
                await assert.isRejected(
                    loader.loadEndpoint('path'),
                    /Unable to get response from endpoint "path": HTTP Error:/
                );
            });

            it('should reply with cached response', async () => {
                const path = '/endpoint/path';
                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 1,
                    response: () => [200, { message: 'OK' }]
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path
                }]);
                await loader.auth();
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK' }
                });
                // should reply with cached data
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK' }
                });
            });

            it('should reply with cached response (slow request)', async () => {
                const path = '/endpoint/path';
                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 1,
                    response: async () => {
                        await testUtil.sleep(500);
                        return [200, { message: 'OK' }];
                    }
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path
                }]);
                await loader.auth();
                await Promise.all([
                    assert.becomes(loader.loadEndpoint('myEndpoint'), {
                        name: 'myEndpoint',
                        data: { message: 'OK' }
                    }),
                    // should use existing request promise
                    assert.becomes(loader.loadEndpoint('myEndpoint'), {
                        name: 'myEndpoint',
                        data: { message: 'OK' }
                    })
                ]);
            });

            it('should reply with cached response (slow request error)', async () => {
                const path = '/endpoint/path';
                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 3, // number of retries
                    response: async () => {
                        await testUtil.sleep(500);
                        return [404, 'Not Found'];
                    }
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path
                }]);
                await loader.auth();
                await Promise.all([
                    assert.isRejected(
                        loader.loadEndpoint('myEndpoint'),
                        /Unable to get response from endpoint "myEndpoint": Bad status code: 404/
                    ),
                    assert.isRejected(
                        loader.loadEndpoint('myEndpoint'),
                        /Unable to get response from endpoint "myEndpoint": Bad status code: 404/
                    )
                ]);
            });

            it('should ignore cached response (ignoreCached = true)', async () => {
                const path = '/endpoint/path';
                let i = 0;

                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 2,
                    response: () => [200, { message: 'OK', num: i++ }]
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path,
                    ignoreCached: true
                }]);
                await loader.auth();
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 0 }
                });
                // should reply with cached data
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 1 }
                });
            });

            it('should ignore cached response (request with body)', async () => {
                const path = '/endpoint/path';
                let i = 0;

                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'POST',
                    path,
                    replyTimes: 2,
                    reqBody: {
                        test: true
                    },
                    response: () => [200, { message: 'OK', num: i++ }]
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path,
                    body: {
                        test: true
                    }
                }]);
                await loader.auth();
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 0 }
                });
                // should reply with cached data
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 1 }
                });
            });

            it('should ignore cached response (pagination = true)', async () => {
                const path = '/endpoint/path';
                let i = 0;

                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path: `${path}?%24top=${loader.chunkSize}`,
                    replyTimes: 2,
                    response: () => [200, { message: 'OK', num: i++ }]
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path,
                    pagination: true
                }]);
                await loader.auth();
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 0 }
                });
                // should reply with cached data
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 1 }
                });
            });

            it('should ignore cached response (error response)', async () => {
                const path = '/endpoint/path';
                let i = 0;

                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path: `${path}?%24top=${loader.chunkSize}`,
                    replyTimes: 4,
                    response: () => {
                        i += 1;
                        if (i <= 3) {
                            return [404, 'Not Found'];
                        }
                        return [200, { message: 'OK', num: i }];
                    }
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path,
                    pagination: true
                }]);
                await loader.auth();
                await assert.isRejected(
                    loader.loadEndpoint('myEndpoint'),
                    /Unable to get response from endpoint "myEndpoint": Bad status code: 404/
                );
                // should reply with cached data
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 4 }
                });
            });

            it('should ignore cached response when query params a different', async () => {
                const path = '/endpoint/path';

                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 1,
                    response: () => [200, { message: 'OK', num: 1 }]
                });

                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path: `${path}?test=true`,
                    replyTimes: 1,
                    response: () => [200, { message: 'OK', num: 2 }]
                });

                loader.setEndpoints([
                    {
                        name: 'myEndpoint',
                        path
                    },
                    {
                        name: 'myEndpoint2',
                        path,
                        query: { test: true }
                    }
                ]);

                await loader.auth();
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 1 }
                });
                // should reply with cached data
                await assert.becomes(loader.loadEndpoint('myEndpoint2'), {
                    name: 'myEndpoint2',
                    data: { message: 'OK', num: 2 }
                });
            });

            it('should ignore cached response when request failed', async () => {
                const path = '/endpoint/path';

                let i = 0;

                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 6, // 3 * 2 re-tries
                    response: () => {
                        i += 1;
                        if (i > 3) {
                            return [400, 'Bad request'];
                        }
                        return [404, 'Not found'];
                    }
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path
                }]);
                await loader.auth();
                await assert.isRejected(
                    loader.loadEndpoint('myEndpoint'),
                    /Unable to get response from endpoint "myEndpoint": Bad status code: 404/
                );
                await assert.isRejected(
                    loader.loadEndpoint('myEndpoint'),
                    /Unable to get response from endpoint "myEndpoint": Bad status code: 400/
                );
            });

            it('should reload data when cach erased', async () => {
                const path = '/endpoint/path';
                let i = 0;

                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 2,
                    response: () => [200, { message: 'OK', num: i++ }]
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path
                }]);
                await loader.auth();
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 0 }
                });

                loader.eraseCache();
                // should reply with cached data
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 1 }
                });
            });

            it('should re-try request', async () => {
                const path = '/endpoint/path';
                let i = 0;

                const mock = bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 2,
                    response: () => [200, { message: 'OK', num: i++ }]
                });

                mock.stub.onFirstCall()
                    .returns([404, 'Not Found'])
                    .callThrough();

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path
                }]);
                await loader.auth();
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK', num: 0 }
                });
            });

            it('should fail when exceeded number of re-try attempts', async () => {
                const path = '/endpoint/path';
                let i = 0;

                const mock = bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 3,
                    response: () => [200, { message: 'OK', num: i++ }]
                });

                mock.stub.returns([404, 'Not Found']);

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path
                }]);
                await loader.auth();
                await assert.isRejected(
                    loader.loadEndpoint('myEndpoint'),
                    /Unable to get response from endpoint "myEndpoint": Bad status code: 404/
                );
            });

            it('should allow conversion of duplicate JSON keys (parseDuplicateKeys = true)', async () => {
                const path = '/endpoint/path';
                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 1,
                    response: () => [200, '{"dupKey": "hello", "dupKey": "from nock", "notADup": "unique"}']
                });
                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path,
                    parseDuplicateKeys: true
                }]);
                await loader.auth();
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: {
                        dupKey: ['hello', 'from nock'],
                        notADup: 'unique'
                    }
                });
            });

            it('should use JSON.parse by default', async () => {
                const path = '/endpoint/path';
                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'GET',
                    path,
                    replyTimes: 1,
                    response: () => [200, '{"dupKey": "hello", "dupKey": "from nock", "notADup": "unique"}']
                });
                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path
                }]);
                await loader.auth();
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: {
                        dupKey: 'from nock',
                        notADup: 'unique'
                    }
                });
            });

            it('should use signle worker', async () => {
                const path = '/endpoint/path';

                loader = new Loader(host, {
                    connection,
                    credentials,
                    logger,
                    workers: 1
                });

                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'POST',
                    path,
                    replyTimes: 2,
                    response: async () => {
                        const ret = [200, { message: 'OK', time: Date.now() }];
                        await testUtil.sleep(500);
                        return ret;
                    }
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path,
                    body: 'replace-me',
                    ignoreCached: true
                }]);

                await loader.auth();
                const p = loader.loadEndpoint('myEndpoint', { replaceStrings: { 'replace-me': 'reqID=1' } })
                    .then((data) => ({
                        data,
                        time: Date.now()
                    }));
                // should be enough to send the first request
                await testUtil.sleep(100);
                // the second one should wait in the queue
                const res2 = await loader.loadEndpoint('myEndpoint', { replaceStrings: { 'replace-me': 'reqID=2' } })
                    .then((data) => ({
                        data,
                        time: Date.now()
                    }));
                const res1 = await p;

                assert.isAbove(res2.data.data.time, res1.data.data.time);
                assert.isAbove(res2.time, res1.time);
            });

            it('should use multiple worker', async () => {
                const path = '/endpoint/path';
                const response = () => [200, { message: 'OK', time: Date.now() }];

                loader = new Loader(host, {
                    connection,
                    credentials,
                    logger,
                    workers: 3
                });

                const mock = bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'POST',
                    path,
                    replyTimes: 2,
                    response
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path,
                    body: 'replace-me',
                    ignoreCached: true
                }]);

                mock.stub.onFirstCall()
                    .callsFake(async () => {
                        const ret = response();
                        await testUtil.sleep(900);
                        return ret;
                    })
                    .onSecondCall()
                    .callsFake(async () => {
                        const ret = response();
                        await testUtil.sleep(400);
                        return ret;
                    })
                    .callThrough();

                await loader.auth();
                const p1 = loader.loadEndpoint('myEndpoint', { replaceStrings: { 'replace-me': 'reqID=1' } })
                    .then((data) => ({
                        data,
                        time: Date.now()
                    }));
                // should be enough to send the first request
                await testUtil.sleep(100);

                const p2 = loader.loadEndpoint('myEndpoint', { replaceStrings: { 'replace-me': 'reqID=2' } })
                    .then((data) => ({
                        data,
                        time: Date.now()
                    }));
                // should be enough to send the second request
                await testUtil.sleep(100);

                const res3 = await loader.loadEndpoint('myEndpoint', { replaceStrings: { 'replace-me': 'reqID=3' } })
                    .then((data) => ({
                        data,
                        time: Date.now()
                    }));

                const res1 = await p1;
                const res2 = await p2;

                assert.isAbove(res3.data.data.time, res2.data.data.time, 'request #3 should be the last one');
                assert.isAbove(res2.data.data.time, res1.data.data.time, 'request #2 should be the second');
                assert.isAbove(res1.time, res2.time, 'request #1 should be the last one to finish');
                assert.isAbove(res2.time, res3.time, 'request #2 should be the second one to finish');
            });

            it('should use HTTP agent', async () => {
                const path = '/endpoint/path';
                const agent = new ((connection && connection.protocol === 'https') ? HttpsAgent : HttpAgent)();

                loader = new Loader(host, {
                    agent,
                    connection,
                    credentials,
                    logger
                });

                bigip.mockArbitraryEndpoint({
                    authCheck: true,
                    method: 'POST',
                    path,
                    replyTimes: 1,
                    response: async () => [200, { message: 'OK' }]
                });

                loader.setEndpoints([{
                    name: 'myEndpoint',
                    path,
                    body: 'replace-me',
                    ignoreCached: true
                }]);

                await loader.auth();
                await assert.becomes(loader.loadEndpoint('myEndpoint'), {
                    name: 'myEndpoint',
                    data: { message: 'OK' }
                });

                testUtil.checkRequestSpies(requestSpies, {
                    agent
                });
            });

            describe('data tests', () => {
                const checkResponse = (endpointMock, response) => {
                    if (!response.kind) {
                        throw new Error(`Endpoint '${endpointMock.path}' has no property 'kind' in response`);
                    }
                };

                loaderTestsData.forEach((testConf) => {
                    testUtil.getCallableIt(testConf)(testConf.name, async () => {
                        testConf.endpoints.forEach((endpoint) => {
                            bigip.mockArbitraryEndpoint({
                                authCheck: true,
                                method: 'GET',
                                path: endpoint.endpoint,
                                replyTimes: Infinity,
                                response: () => {
                                    checkResponse(endpoint.endpoint, endpoint.response);
                                    return [200, endpoint.response];
                                }
                            });
                        });
                        loader.setEndpoints([testConf.endpointObj]);

                        await loader.auth();
                        await assert.becomes(
                            loader.loadEndpoint(testConf.endpointObj.path),
                            testConf.expectedData
                        );
                    });
                });
            });
        });
    });
});
