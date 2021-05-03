/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const nock = require('nock');
const request = require('request');

const testUtil = require('../shared/util');
const requestsUtil = require('../../../src/lib/utils/requests');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Requests Util', () => {
    describe('.makeRequest()', () => {
        afterEach(() => {
            testUtil.checkNockActiveMocks(nock);
            sinon.restore();
            nock.cleanAll();
        });

        it('should make request with non-defaults', () => {
            nock('https://example.com:443', {
                reqheaders: {
                    'User-Agent': /f5-telemetry/,
                    CustomHeader: 'CustomValue'
                }
            })
                .post('/')
                .reply(200, { key: 'value' });

            const originGet = request.get;
            sinon.stub(request, 'get').callsFake((opts, cb) => {
                assert.strictEqual(opts.strictSSL, false);
                originGet(opts, cb);
            });

            const opts = {
                port: 443,
                protocol: 'https',
                method: 'POST',
                headers: {
                    CustomHeader: 'CustomValue'
                },
                allowSelfSignedCert: true
            };
            return assert.becomes(
                requestsUtil.makeRequest('example.com', opts),
                { key: 'value' }
            );
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
                /HTTP error:.*error message.*/
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
