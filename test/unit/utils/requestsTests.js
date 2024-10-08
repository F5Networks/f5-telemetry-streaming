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

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const http = require('http');
const nock = require('nock');
const request = require('request');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const requestsUtil = sourceCode('src/lib/utils/requests');

moduleCache.remember();

describe('Requests Util', () => {
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    describe('.makeRequest()', () => {
        beforeEach(() => {
            coreStub = stubs.default.coreStub({
                logger: true,
                utilMisc: true
            }, {
                logger: {
                    setToVerbose: true,
                    ignoreLevelChange: false
                }
            });
        });

        afterEach(() => {
            testUtil.checkNockActiveMocks();
            testUtil.nockCleanup();
            sinon.restore();
        });

        it('should make request with non-defaults', async () => {
            nock('https://example.com:443', {
                reqheaders: {
                    'User-Agent': /f5-telemetry/,
                    CustomHeader: 'CustomValue'
                }
            })
                .post('/')
                .times(2)
                .reply(200, { key: 'value' });

            const originGet = request.get;
            sinon.stub(request, 'get').callsFake((opts, cb) => {
                assert.strictEqual(opts.strictSSL, false);
                originGet(opts, cb);
            });

            const opts = {
                agent: new http.Agent(),
                port: 443,
                protocol: 'https',
                method: 'POST',
                headers: {
                    CustomHeader: 'CustomValue'
                },
                allowSelfSignedCert: true
            };
            await assert.becomes(
                requestsUtil.makeRequest('example.com', testUtil.deepCopy(opts)),
                { key: 'value' }
            );

            const messages = coreStub.logger.messages.verbose
                .filter((msg) => msg.includes('reqID'))
                .map((msg) => JSON.parse(msg.slice(msg.indexOf('{'))));

            assert.lengthOf(messages, 2);
            assert.deepStrictEqual(
                messages[0].reqID,
                messages[1].reqID
            );
            assert.isTrue(messages[0].options.agent);
            assert.isAbove(messages[0].timestamp, 0);
            assert.isAbove(messages[1].duration, 0);

            coreStub.logger.logger.setLogLevel('info');
            coreStub.logger.removeAllMessages();

            assert.isEmpty(coreStub.logger.messages.all);

            await assert.becomes(
                requestsUtil.makeRequest('example.com', opts),
                { key: 'value' }
            );

            assert.isEmpty(coreStub.logger.messages.verbose
                .filter((msg) => msg.includes('reqID'))
                .map((msg) => JSON.parse(msg.slice(msg.indexOf('{')))));
        });

        it('should make request with defaults (response code 200)', () => {
            nock('http://example.com', {
                reqheaders: {
                    'User-Agent': /f5-telemetry/
                }
            })
                .get('/')
                .reply(200, { key: 'value' });

            const originGet = request.get;
            sinon.stub(request, 'get').callsFake((opts, cb) => {
                assert.strictEqual(opts.strictSSL, true);
                originGet(opts, cb);
            });
            return assert.becomes(
                requestsUtil.makeRequest('example.com'),
                { key: 'value' }
            );
        });

        it('should make request (response code 400)', () => {
            nock('http://example.com')
                .get('/')
                .reply(400, { key: 'value' });

            return assert.becomes(
                requestsUtil.makeRequest('example.com', { expectedResponseCode: 400 }),
                { key: 'value' }
            );
        });

        it('should fail on response with code 400', () => {
            nock('http://example.com')
                .get('/')
                .reply(400, { key: 'value' });

            return assert.isRejected(
                requestsUtil.makeRequest('example.com'),
                /Bad status code/
            );
        });

        it('should continue on response with code 400 (expected 200 by default)', () => {
            nock('http://example.com')
                .get('/')
                .reply(400, { key: 'value' });

            return assert.becomes(
                requestsUtil.makeRequest('example.com', { continueOnErrorCode: true }),
                { key: 'value' }
            );
        });

        it('should fail request with error', () => {
            nock('http://example.com')
                .get('/')
                .replyWithError('error message');

            return assert.isRejected(
                requestsUtil.makeRequest('example.com'),
                /HTTP Error: error message/
            );
        });

        it('should return non-JSON body', () => {
            nock('http://example.com')
                .get('/')
                .reply(200, '{someInvalidJSONData');

            return assert.becomes(
                requestsUtil.makeRequest('example.com'),
                '{someInvalidJSONData'
            );
        });

        it('should return raw response data (as Buffer)', () => {
            nock('http://example.com')
                .get('/')
                .reply(200, '{"someValidJSONData": 1}');

            return assert.becomes(
                requestsUtil.makeRequest('example.com', { rawResponseBody: true }),
                Buffer.from('{"someValidJSONData": 1}')
            );
        });

        it('should return parsed data', () => {
            nock('http://example.com')
                .get('/')
                .reply(200, '{"someValidJSONData": 1}');

            return assert.becomes(
                requestsUtil.makeRequest('example.com'),
                { someValidJSONData: 1 }
            );
        });

        it('should convert request data to string', () => {
            sinon.stub(request, 'get').callsFake((opts, cb) => {
                assert.strictEqual(typeof opts.body, 'string');
                cb(null, { statusCode: 200, statusMessage: 'message' }, {});
            });
            return assert.isFulfilled(requestsUtil.makeRequest('example.com', { body: { key: 'value' } }));
        });

        it('should return data and response object', () => {
            nock('http://example.com')
                .get('/')
                .reply(200, '{"someValidJSONData": 1}');

            return assert.isFulfilled(
                requestsUtil.makeRequest('example.com', { includeResponseObject: true })
                    .then((resp) => {
                        assert.lengthOf(resp, 2, 'should return array of 2');
                        assert.deepStrictEqual(resp[0], { someValidJSONData: 1 });
                    })
            );
        });

        it('should fail when unable to build URI', () => {
            assert.throws(
                () => requestsUtil.makeRequest({}),
                /makeRequest: no fullURI or host provided/
            );
        });

        it('should fail when no arguments passed to function', () => {
            assert.throws(
                () => requestsUtil.makeRequest(),
                /makeRequest: no arguments were passed to function/
            );
        });

        it('should have no custom TS options in request options', () => {
            const tsReqOptions = [
                'allowSelfSignedCert',
                'continueOnErrorCode',
                'expectedResponseCode',
                'fullURI',
                'includeResponseObject',
                'json',
                'port',
                'protocol',
                'rawResponseBody'
            ];
            sinon.stub(request, 'get').callsFake((opts, cb) => {
                const optsKeys = Object.keys(opts);
                tsReqOptions.forEach((tsOptKey) => {
                    assert.ok(optsKeys.indexOf(tsOptKey) === -1, `Found '${tsOptKey}' in request options`);
                });
                cb(null, { statusCode: 200, statusMessage: 'message' }, {});
            });

            return assert.isFulfilled(
                requestsUtil.makeRequest('host', { protocol: 'http', port: 456, continueOnErrorCode: true })
            );
        });

        [
            {
                name: 'fullURI only',
                args: [{ fullURI: 'someproto://somehost:someport/someuri' }],
                expected: 'someproto://somehost:someport/someuri'
            },
            {
                name: 'host, uri, protocol and port',
                args: ['somehost', '/someuri', { protocol: 'someproto', port: 'someport' }],
                expected: 'someproto://somehost:someport/someuri'
            },
            {
                name: 'host, protocol and port',
                args: ['somehost', { protocol: 'someproto', port: 'someport' }],
                expected: 'someproto://somehost:someport'
            },
            {
                name: 'host only',
                args: ['somehost'],
                expected: 'http://somehost:80'
            }
        ].forEach((testConf) => {
            it(`should correctly process set of args: ${testConf.name}`, () => {
                sinon.stub(request, 'get').callsFake((opts, cb) => {
                    assert.strictEqual(opts.uri, testConf.expected);
                    cb(null, { statusCode: 200, statusMessage: 'message' }, {});
                });
                return assert.isFulfilled(requestsUtil.makeRequest.apply(requestsUtil, testConf.args));
            });
        });

        [
            {
                name: 'timeout',
                options: { timeout: 100 },
                expected: { timeout: 100 }
            }
        ].forEach((testConf) => {
            it(`should pass through any pass-through options: ${testConf.name}`, () => {
                let passedOpts;
                sinon.stub(request, 'get').callsFake((opts, cb) => {
                    passedOpts = opts;
                    cb(null, { statusCode: 200, statusMessage: '' }, {});
                });
                return requestsUtil.makeRequest('host', testConf.options)
                    .then(() => {
                        assert.include(passedOpts, testConf.expected);
                    });
            });
        });

        describe('proxy options', () => {
            // it is impossible to test proxy options via nock, so lets just mock request.get
            [
                {
                    name: 'should use proxy when specified (as string)',
                    options: {
                        proxy: 'http://proxy.example.com'
                    },
                    expected: {
                        proxy: 'http://proxy.example.com'
                    }
                },
                {
                    name: 'should use proxy when specified (as object)',
                    options: {
                        proxy: {
                            host: 'proxy.example.com'
                        }
                    },
                    expected: {
                        proxy: 'http://proxy.example.com'
                    }
                },
                {
                    name: 'should use proxy when specified with other options and auth (username only)',
                    options: {
                        proxy: {
                            host: 'test_host_1',
                            protocol: 'https',
                            port: '8888',
                            username: 'test_user_1'
                        }
                    },
                    expected: {
                        proxy: 'https://test_user_1@test_host_1:8888'
                    }
                },
                {
                    name: 'should use proxy when specified with all available options',
                    options: {
                        proxy: {
                            host: 'test_host_1',
                            protocol: 'https',
                            port: '8888',
                            username: 'test_user_1',
                            passphrase: 'test_passphrase_1'
                        }
                    },
                    expected: {
                        proxy: `https://${'test_user_1'}:${'test_passphrase_1'}@${'test_host_1'}:8888`
                    }
                },
                {
                    name: 'should set to undefined when invalid option passed to the function',
                    options: {
                        proxy: ''
                    },
                    expected: {
                        proxy: undefined
                    }
                }
            ].forEach((testConf) => {
                it(testConf.name, () => {
                    let passedOpts;
                    sinon.stub(request, 'get').callsFake((opts, cb) => {
                        passedOpts = opts;
                        cb(null, { statusCode: 200, statusMessage: '' }, {});
                    });
                    return requestsUtil.makeRequest('host', testConf.options)
                        .then(() => {
                            if (testConf.notExpected) {
                                assert.doesNotHaveAnyKeys(passedOpts, testConf.notExpected);
                            } else {
                                assert.include(passedOpts, testConf.expected);
                            }
                        });
                });
            });
        });
    });
});
