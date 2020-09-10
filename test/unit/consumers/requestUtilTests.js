/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const nock = require('nock');
const util = require('../../../src/lib/util');
const testUtil = require('../shared/util');
const requestUtil = require('./../../../src/lib/consumers/shared/requestUtil');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Request Util Tests', () => {
    afterEach(() => {
        testUtil.checkNockActiveMocks(nock);
        nock.cleanAll();
    });

    describe('.processHeaders', () => {
        it('should convert headers array to object', () => {
            const headers = [
                {
                    name: 'foo',
                    value: 'foo'
                },
                {
                    name: 'bar',
                    value: 'baz'
                }
            ];
            assert.deepStrictEqual(
                requestUtil.processHeaders(headers),
                {
                    foo: 'foo',
                    bar: 'baz'
                }
            );
        });

        it('should not fail on malformed input', () => {
            const input = 'name:foo,value:bar';
            assert.deepStrictEqual(requestUtil.processHeaders(input), {});
        });
    });

    describe('.sendToConsumer', () => {
        const buildDefaultConfig = (options) => {
            const opts = options || {};
            const defaultConfig = {
                body: '',
                hosts: ['localhost'],
                headers: {},
                logger: new testUtil.MockLogger(),
                method: 'POST',
                port: ':80',
                protocol: 'https',
                strictSSL: false,
                uri: '/'
            };
            return util.assignDefaults(opts, defaultConfig);
        };

        it('should be able to perform a basic POST', () => {
            nock('https://localhost:80').post('/').reply(200);
            return requestUtil.sendToConsumer(buildDefaultConfig());
        });

        it('should be able to POST a JSON string', () => {
            const config = buildDefaultConfig({
                body: JSON.stringify({
                    myKey: 'myValue',
                    key2: 'forFun'
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            nock('https://localhost:80')
                .post('/')
                .reply(200, (_, body) => {
                    assert.deepStrictEqual(body, {
                        key2: 'forFun',
                        myKey: 'myValue'
                    });
                });
            return requestUtil.sendToConsumer(config);
        });

        it('should properly format the URL', () => {
            const config = buildDefaultConfig({
                protocol: 'http',
                hosts: ['192.0.0.1'],
                port: ':8080',
                uri: '/path/to/resource'
            });
            nock('http://192.0.0.1:8080')
                .post('/path/to/resource')
                .reply(200);
            return requestUtil.sendToConsumer(config);
        });

        describe('HTTP code handling', () => {
            describe('success codes', () => {
                [200, 201, 202].forEach((statusCode) => {
                    it(`should treat an HTTP ${statusCode} status code as a success`, () => {
                        const config = buildDefaultConfig();
                        nock('https://localhost:80').post('/').reply(statusCode);
                        return requestUtil.sendToConsumer(config)
                            .then(() => {
                                assert.deepStrictEqual(config.logger.debug.firstCall.args, ['success']);
                                assert.strictEqual(config.logger.error.callCount, 0);
                            });
                    });
                });
            });

            it('should log an error if error is present in HTTP response', () => {
                const config = buildDefaultConfig();
                nock('https://localhost:80').post('/').replyWithError({
                    message: 'expectedError'
                });
                return requestUtil.sendToConsumer(config)
                    .then(() => {
                        assert.deepStrictEqual(config.logger.error.firstCall.args, ['error: expectedError']);
                        assert.notStrictEqual(config.logger.error.callCount, 0);
                    });
            });

            it('should handle HTTP codes that are not success or failures', () => {
                const config = buildDefaultConfig();
                nock('https://localhost:80')
                    .post('/')
                    .reply(401, 'Auth required');
                return requestUtil.sendToConsumer(config)
                    .then(() => {
                        assert.strictEqual(config.logger.error.callCount, 0);
                        assert.deepStrictEqual(config.logger.info.args, [
                            ['response: 401 null'],
                            ['response body: Auth required']
                        ]);
                    });
            });
        });
    });
});
