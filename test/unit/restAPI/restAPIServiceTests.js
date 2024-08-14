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

/* eslint-disable import/order, no-use-before-define */
const moduleCache = require('../shared/restoreCache')();

const pathUtil = require('path');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');
const restAPIUtils = require('./utils');

const RESTAPIService = sourceCode('src/lib/restAPI');
const RestWorker = sourceCode('src/nodejs/restWorker');

moduleCache.remember();

describe('REST API / REST API', () => {
    const CONTENT_TYPE = restAPIUtils.CONTENT_TYPE;
    const HTTP_CODES = restAPIUtils.HTTP_CODES;
    const testHandlers = pathUtil.join(__dirname, 'testHandlers');
    let appEvents;
    let configWorker;
    let coreStub;
    let defaultContentType;
    let restAPI;
    let restWorker;
    let uriPrefix = '/mgmt/shared/telemetry/';

    function getBaseURI() {
        const prefix = uriPrefix.startsWith('/')
            ? uriPrefix
            : `/${uriPrefix}`;
        return `http://localhost:8100${prefix}`;
    }

    function getContentType() {
        return defaultContentType;
    }

    function processDeclaration(decl, waitFor = true) {
        return restAPIUtils.processDeclaration(configWorker, appEvents, decl, waitFor);
    }

    function sendRequest({
        body = undefined,
        contentType = getContentType(),
        headers = undefined,
        method = undefined,
        params = undefined,
        path = undefined,
        rootURI = getBaseURI()
    }) {
        const request = restAPIUtils.buildRequest({
            path, method, params, body, contentType, headers, rootURI
        });
        return restAPIUtils.waitRequestComplete(restWorker, request);
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        defaultContentType = 'application/json';

        restAPI = new RESTAPIService(uriPrefix);
        restWorker = new RestWorker();

        coreStub = stubs.default.coreStub();
        appEvents = coreStub.appEvents.appEvents;
        configWorker = coreStub.configWorker.configWorker;

        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        await restAPI.destroy();

        assert.isTrue(restAPI.isDestroyed());
        sinon.restore();
    });

    describe('constructor', () => {
        it('should fail to load handlers', () => {
            assert.throws(
                () => new RESTAPIService(undefined, 'non-existing-handlers'),
                /Unable to load handlers from 'non-existing-handlers'/
            );
        });
    });

    describe('REST API endpoints', () => {
        beforeEach(async () => {
            uriPrefix = '/service';
            restAPI = new RESTAPIService(uriPrefix, testHandlers);

            restAPI.initialize(appEvents);
            restWorker.initialize(appEvents);

            await restAPI.start();
            assert.isTrue(restAPI.isRunning());

            await processDeclaration({ class: 'Telemetry' });
        });

        describe('error handling', () => {
            it('should not register invalid handlers', async () => {
                const restOp = await sendRequest({ path: '/badinterface', method: 'DELETE' });

                assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);
                assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
                assert.deepStrictEqual(restOp.body, {
                    code: HTTP_CODES.NOT_FOUND,
                    error: 'Bad URL: /service/badinterface',
                    message: 'Not Found'
                });
            });

            it('should return 415 when has body with invalid content type', async () => {
                let restOp = await sendRequest({
                    path: 'something',
                    method: 'POST',
                    body: { body: true },
                    contentType: 'application/something'
                });

                assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.UNSUPPORTED_MEDIA_TYPE);
                assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
                assert.deepStrictEqual(restOp.body, {
                    code: HTTP_CODES.UNSUPPORTED_MEDIA_TYPE,
                    error: 'Accepted Content-Type: application/json',
                    message: 'Unsupported Media Type'
                });

                restOp = await sendRequest({
                    path: '/regular',
                    method: 'POST',
                    body: { body: true },
                    contentType: CONTENT_TYPE.JSON
                });

                assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
                assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
                assert.deepStrictEqual(restOp.body, {
                    body: {
                        body: true
                    },
                    method: 'POST'
                });
            });

            it('should return 405 when request send with unsupported mehod', async () => {
                const restOp = await sendRequest({ path: '/regular/another', method: 'DELETE' });

                assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.METHOD_NOT_ALLOWED);
                assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
                assert.deepStrictEqual(restOp.body, {
                    code: HTTP_CODES.METHOD_NOT_ALLOWED,
                    error: 'Allowed methods: GET',
                    message: 'Method Not Allowed'
                });
            });
        });

        ['DELETE', 'GET', 'POST']
            .forEach((method) => it(`should register endpoint with multiple methods (${method})`,
                async () => {
                    const restOp = await sendRequest({ path: '/regular', method });

                    assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
                    assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
                    assert.deepStrictEqual(restOp.body, {
                        method
                    });
                }));

        [
            undefined, // use default value ''
            '',
            '/',
            'something',
            'something/',
            '/prefix/',
            '/prefix/path',
            '/prefix/path/'
        ].forEach((prefix) => it(`should be able to use custom URI prefix - '${prefix}'`, async () => {
            await restAPI.destroy();
            assert.isTrue(restAPI.isDestroyed());

            uriPrefix = prefix || '';
            restAPI = new RESTAPIService(prefix, testHandlers);
            restAPI.initialize(appEvents);

            await restAPI.start();
            assert.isTrue(restAPI.isRunning());

            let restOp = await sendRequest({ path: '/regular' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                method: 'GET'
            });

            restOp = await sendRequest({ path: 'noleadingslash' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                method: 'GET'
            });
        }));

        it('should catch and log errors on attempt to deregister handlers', async () => {
            await restAPI.destroy();
            assert.isTrue(restAPI.isDestroyed());

            restAPI = new RESTAPIService(uriPrefix, testHandlers);
            restAPI.initialize(appEvents);

            await restAPI.start();
            assert.isTrue(restAPI.isRunning());

            await restAPI.destroy();
            assert.isTrue(restAPI.isDestroyed());

            assert.includeMatch(
                coreStub.logger.messages.error,
                /expected sync destroy error/
            );
            assert.includeMatch(
                coreStub.logger.messages.error,
                /expected async destroy error/
            );
        });

        it('should pass configuration object to "register" callbacks', async () => {
            let restOp = await sendRequest({ path: '/debug', method: 'POST' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: HTTP_CODES.NOT_FOUND,
                error: 'Bad URL: /service/debug',
                message: 'Not Found'
            });

            restOp = await sendRequest({ path: '/regular/debug', method: 'POST' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.METHOD_NOT_ALLOWED);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: HTTP_CODES.METHOD_NOT_ALLOWED,
                error: 'Allowed methods: GET',
                message: 'Method Not Allowed'
            });

            restOp = await sendRequest({ path: '/regular/debug' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, '');
            assert.deepStrictEqual(restOp.body, {
                method: 'GET',
                debug: true
            });

            await processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    debug: true
                }
            });

            restOp = await sendRequest({ path: '/regular/debug', method: 'POST' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, '');
            assert.deepStrictEqual(restOp.body, {
                method: 'POST',
                debug: true
            });

            restOp = await sendRequest({ path: '/regular/debug' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, '');
            assert.deepStrictEqual(restOp.body, {
                method: 'GET',
                debug: true
            });

            restOp = await sendRequest({ path: '/debug?setcode=true', method: 'POST' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, '');
            assert.deepStrictEqual(restOp.body, undefined);

            await processDeclaration({
                class: 'Telemetry'
            });

            restOp = await sendRequest({ path: '/regular/debug' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, '');
            assert.deepStrictEqual(restOp.body, {
                method: 'GET',
                debug: true
            });

            restOp = await sendRequest({ path: '/regular/debug', method: 'POST' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.METHOD_NOT_ALLOWED);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: HTTP_CODES.METHOD_NOT_ALLOWED,
                error: 'Allowed methods: GET',
                message: 'Method Not Allowed'
            });

            restOp = await sendRequest({ path: '/debug', method: 'POST' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: HTTP_CODES.NOT_FOUND,
                error: 'Bad URL: /service/debug',
                message: 'Not Found'
            });

            await processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    debug: true
                }
            });

            restOp = await sendRequest({ path: '/regular/debug', method: 'POST' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, '');
            assert.deepStrictEqual(restOp.body, {
                method: 'POST',
                debug: true
            });

            restOp = await sendRequest({ path: '/regular/debug' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, '');
            assert.deepStrictEqual(restOp.body, {
                method: 'GET',
                debug: true
            });

            restOp = await sendRequest({ path: '/debug?setcode=true', method: 'POST' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, '');
            assert.deepStrictEqual(restOp.body, undefined);
        });

        it('should return 500 when response code not set', async () => {
            const restOp = await sendRequest({ path: '/regular?nocode=true' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.INTERNAL_SERVER_ERROR);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: HTTP_CODES.INTERNAL_SERVER_ERROR,
                message: 'Internal Server Error'
            });
        });

        it('should parse URI params', async () => {
            let restOp = await sendRequest({ path: '/regular/required' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: HTTP_CODES.NOT_FOUND,
                error: 'Bad URL: /service/regular/required',
                message: 'Not Found'
            });

            restOp = await sendRequest({ path: '/regular/required1/subpath/required2' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                params: {
                    required1: 'required1',
                    required2: 'required2'
                }
            });

            restOp = await sendRequest({ path: '/regular/required1/subpath/required2/optional' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                params: {
                    required1: 'required1',
                    required2: 'required2',
                    optional: 'optional'
                }
            });

            restOp = await sendRequest({ path: '/regular/required1/subpath/required2/optional1/optional2' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: HTTP_CODES.NOT_FOUND,
                error: 'Bad URL: /service/regular/required1/subpath/required2/optional1/optional2',
                message: 'Not Found'
            });
        });

        [
            'throw',
            'reject'
        ].forEach((faultyWay) => it('should response with 500 on unexpected error', async () => {
            const restOp = await sendRequest({ path: `/faulty?${faultyWay}=true`, method: 'DELETE' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.INTERNAL_SERVER_ERROR);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: HTTP_CODES.INTERNAL_SERVER_ERROR,
                message: 'Internal Server Error',
                error: `expected error - ${faultyWay}`
            });
        }));

        [
            205,
            300,
            490,
            540
        ].forEach((code) => it(`should set customer resposne code - ${code}`, async () => {
            const restOp = await sendRequest({ path: `/regular?code=${code}` });

            assert.deepStrictEqual(restOp.statusCode, code);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, { method: 'GET' });
        }));

        it('should read headers', async () => {
            const restOp = await sendRequest({ path: '/regular?headers=true', headers: { header: 'value' } });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                method: 'GET',
                headers: {
                    header: 'value'
                }
            });
        });

        it('should preserve configuration between on stop/restart', async () => {
            let restOp = await sendRequest({ path: '/debug', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);

            await restAPI.stop();
            assert.isFalse(restAPI.isRunning());

            await restAPI.start();
            assert.isTrue(restAPI.isRunning());

            restOp = await sendRequest({ path: '/debug', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);

            await restAPI.restart();
            assert.isTrue(restAPI.isRunning());

            restOp = await sendRequest({ path: '/debug', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);

            await processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    debug: true
                }
            });

            assert.isTrue(restAPI.isRunning());

            restOp = await sendRequest({ path: '/debug?setcode=true', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);

            await restAPI.stop();
            assert.isFalse(restAPI.isRunning());

            await restAPI.start();
            assert.isTrue(restAPI.isRunning());

            restOp = await sendRequest({ path: '/debug?setcode=true', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);

            await restAPI.restart();
            assert.isTrue(restAPI.isRunning());

            restOp = await sendRequest({ path: '/debug?setcode=true', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);

            await processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    debug: false
                }
            });

            assert.isTrue(restAPI.isRunning());

            restOp = await sendRequest({ path: '/debug', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);

            await restAPI.stop();
            assert.isFalse(restAPI.isRunning());

            await restAPI.start();
            assert.isTrue(restAPI.isRunning());

            restOp = await sendRequest({ path: '/debug', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);

            await restAPI.restart();
            assert.isTrue(restAPI.isRunning());

            restOp = await sendRequest({ path: '/debug', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);
        });

        it('should catch errors when applying configuaration', async () => {
            sinon.stub(restAPI, 'restart').rejects(new Error('expected restart error'));

            await processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    debug: true
                }
            });

            assert.includeMatch(coreStub.logger.messages.error, /Error caught on attempt to apply configuration to REST API Service/);
            assert.includeMatch(coreStub.logger.messages.error, /expected restart error/gm);
        });

        it('should reset configuration once destroyed', async () => {
            await processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    debug: true
                }
            });

            let restOp = await sendRequest({ path: '/debug?setcode=true', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);

            await restAPI.destroy();
            assert.isTrue(restAPI.isDestroyed());

            restOp = await sendRequest({ path: '/debug?setcode=true', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.SERVICE_UNAVAILABLE);

            restAPI.initialize(appEvents);
            await restAPI.restart();
            assert.isTrue(restAPI.isRunning());

            restOp = await sendRequest({ path: '/debug', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);
        });

        it('should not respond to config updates once destroyed', async () => {
            let restOp = await sendRequest({ path: '/debug?setcode=true', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.NOT_FOUND);

            await restAPI.destroy();
            assert.isTrue(restAPI.isDestroyed());

            await processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    debug: true
                }
            }, false);

            await testUtil.sleep(100);
            assert.isTrue(restAPI.isDestroyed());

            restOp = await sendRequest({ path: '/debug?setcode=true', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.SERVICE_UNAVAILABLE);
        });

        it('should not process a request more than once', async () => {
            const cloneRestAPI = new RESTAPIService(uriPrefix, testHandlers);
            cloneRestAPI.initialize(appEvents);

            await cloneRestAPI.start();
            assert.isTrue(cloneRestAPI.isRunning());
            assert.isTrue(restAPI.isRunning());

            const restOp = await sendRequest({ path: '/regular', method: 'POST' });

            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.complete.callCount, 1);
            assert.deepStrictEqual(restOp.setBody.callCount, 1);
            assert.deepStrictEqual(restOp.setContentType.callCount, 1);
            assert.deepStrictEqual(restOp.setStatusCode.callCount, 1);
        });

        it('should not process request when stopped', async () => {
            await restAPI.stop();
            assert.isFalse(restAPI.isRunning());

            const restOp = await sendRequest({ path: '/regular', method: 'POST' });
            assert.deepStrictEqual(restOp.statusCode, HTTP_CODES.SERVICE_UNAVAILABLE);
        });

        it('should process multiple request at a time', async () => {
            await processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    debug: true
                }
            });

            const results = await Promise.all([
                sendRequest({ path: '/regular?code=201&sleep=200', method: 'POST' }), // 0, total 150ms, startTs 0, endTs 200
                testUtil.sleep(30).then(() => sendRequest({ path: '/regular?code=205&sleep=70', method: 'POST' })), // 1, total 100ms, startTs 30, endTs 100
                testUtil.sleep(5).then(() => sendRequest({ path: '/debug?setcode=207&sleep=60', method: 'POST' })), // 2, total 55ms, startTs 5, endTs 65
                testUtil.sleep(10).then(() => sendRequest({ path: '/debug?setcode=208&sleep=30', method: 'POST' })) // 3, total 40ms, startTs 10, endTs 40
            ]);

            assert.sameMembers(
                results.map((res) => res.statusCode),
                [201, 205, 207, 208]
            );
            assert.isAtLeast(results[2].startTs, results[0].startTs);
            assert.isAtLeast(results[3].startTs, results[2].startTs);
            assert.isAtLeast(results[1].startTs, results[3].startTs);

            assert.isAbove(results[0].elapsed, results[3].elapsed);
            assert.isAbove(results[0].elapsed, results[2].elapsed);
            assert.isAbove(results[0].elapsed, results[1].elapsed);

            assert.isAbove(results[0].endTs, results[3].endTs);
            assert.isAbove(results[0].endTs, results[2].endTs);
            assert.isAbove(results[0].endTs, results[1].endTs);
        });

        it('should throw error on attempt to register endpoint when service is stopped', async () => {
            const register = [];

            const handler1 = {
                destroy: sinon.spy(),
                handle: sinon.spy((req, res) => {
                    res.body = {
                        message: 'success',
                        method: req.getMethod()
                    };
                    res.code = 200;
                })
            };

            appEvents.on('restapi.register', (reg) => {
                register.push(reg);
            });

            await restAPI.restart();
            assert.lengthOf(register, 1);

            await restAPI.stop();
            assert.isFalse(restAPI.isRunning());

            assert.throws(() => register[0](['DELETE', 'GET'], '/test', handler1));

            await restAPI.restart();
            assert.isTrue(restAPI.isRunning());
            assert.lengthOf(register, 2);

            assert.throws(() => register[0](['DELETE', 'GET'], '/test', handler1));
            assert.doesNotThrow(() => register[1](['DELETE', 'GET'], '/test', handler1));
        });

        it('should not deregister handler more than once', async () => {
            let destroy1;
            let destroy2;
            let register;

            const handler1 = {
                destroy: sinon.spy(),
                handle: sinon.spy((req, res) => {
                    res.body = {
                        message: 'success',
                        method: req.getMethod()
                    };
                    res.code = 200;
                })
            };
            const handler2 = {
                destroy: sinon.spy(),
                handle: sinon.spy((req, res) => {
                    res.body = {
                        message: 'success2',
                        method: req.getMethod()
                    };
                    res.code = 200;
                })
            };

            appEvents.on('restapi.register', (reg) => {
                register = reg;
            });

            await restAPI.restart();
            assert.isTrue(restAPI.isRunning());

            let results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' }),
                sendRequest({ path: '/test', method: 'POST' })
            ]);

            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(results[2].statusCode, HTTP_CODES.NOT_FOUND);

            destroy1 = register(['DELETE', 'GET'], '/test', handler1);

            results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' }),
                sendRequest({ path: '/test', method: 'POST' })
            ]);

            assert.deepStrictEqual(handler1.handle.callCount, 2);
            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[0].body, { message: 'success', method: 'DELETE' });
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[1].body, { message: 'success', method: 'GET' });
            assert.deepStrictEqual(results[2].statusCode, HTTP_CODES.METHOD_NOT_ALLOWED);

            destroy2 = register(['GET', 'POST'], '/test', handler2);

            results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' }),
                sendRequest({ path: '/test', method: 'POST' })
            ]);

            assert.deepStrictEqual(handler1.handle.callCount, 3);
            assert.deepStrictEqual(handler2.handle.callCount, 2);
            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[0].body, { message: 'success', method: 'DELETE' });
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[1].body, { message: 'success2', method: 'GET' });
            assert.deepStrictEqual(results[2].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[2].body, { message: 'success2', method: 'POST' });

            await destroy1();

            results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' }),
                sendRequest({ path: '/test', method: 'POST' })
            ]);

            assert.deepStrictEqual(handler1.handle.callCount, 3);
            assert.deepStrictEqual(handler2.handle.callCount, 4);
            assert.deepStrictEqual(handler1.destroy.callCount, 2, 'should call .destroy twice for every registered HTTP method');
            assert.sameDeepMembers(handler1.destroy.args, [
                ['DELETE', '/service/test'],
                ['GET', '/service/test']
            ]);

            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.METHOD_NOT_ALLOWED);
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[1].body, { message: 'success2', method: 'GET' });
            assert.deepStrictEqual(results[2].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[2].body, { message: 'success2', method: 'POST' });

            await destroy1();

            results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' }),
                sendRequest({ path: '/test', method: 'POST' })
            ]);

            assert.deepStrictEqual(handler1.handle.callCount, 3);
            assert.deepStrictEqual(handler2.handle.callCount, 6);
            assert.deepStrictEqual(handler1.destroy.callCount, 2, 'should not call .destroy once handler removed');

            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.METHOD_NOT_ALLOWED);
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[1].body, { message: 'success2', method: 'GET' });
            assert.deepStrictEqual(results[2].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[2].body, { message: 'success2', method: 'POST' });

            await destroy2();

            results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' }),
                sendRequest({ path: '/test', method: 'POST' })
            ]);

            assert.deepStrictEqual(handler1.handle.callCount, 3);
            assert.deepStrictEqual(handler2.handle.callCount, 6);
            assert.deepStrictEqual(handler1.destroy.callCount, 2, 'should not call .destroy once handler removed');
            assert.deepStrictEqual(handler2.destroy.callCount, 2, 'should call .destroy twice for every registered HTTP method');
            assert.sameDeepMembers(handler2.destroy.args, [
                ['GET', '/service/test'],
                ['POST', '/service/test']
            ]);

            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(results[2].statusCode, HTTP_CODES.NOT_FOUND);
            await destroy2();

            results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' }),
                sendRequest({ path: '/test', method: 'POST' })
            ]);

            assert.deepStrictEqual(handler1.handle.callCount, 3);
            assert.deepStrictEqual(handler2.handle.callCount, 6);
            assert.deepStrictEqual(handler1.destroy.callCount, 2, 'should not call .destroy once handler removed');
            assert.deepStrictEqual(handler2.destroy.callCount, 2, 'should not call .destroy once handler removed');

            handler1.handle.resetHistory();
            handler2.handle.resetHistory();
            handler1.destroy.resetHistory();
            handler2.destroy.resetHistory();

            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(results[2].statusCode, HTTP_CODES.NOT_FOUND);

            destroy1 = register(['DELETE', 'GET'], '/test', handler1);
            results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' })
            ]);

            assert.deepStrictEqual(handler1.handle.callCount, 2);
            assert.deepStrictEqual(handler2.handle.callCount, 0);
            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[0].body, { message: 'success', method: 'DELETE' });
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[1].body, { message: 'success', method: 'GET' });

            destroy2 = register(['DELETE', 'GET'], '/test', handler2);
            results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' })
            ]);

            assert.deepStrictEqual(handler1.handle.callCount, 2);
            assert.deepStrictEqual(handler2.handle.callCount, 2);
            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[0].body, { message: 'success2', method: 'DELETE' });
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.OK);
            assert.deepStrictEqual(results[1].body, { message: 'success2', method: 'GET' });

            await destroy2();

            results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' })
            ]);

            assert.deepStrictEqual(handler1.handle.callCount, 2);
            assert.deepStrictEqual(handler2.handle.callCount, 2);
            assert.deepStrictEqual(handler2.destroy.callCount, 2, 'should call .destroy twice for every registered HTTP method');
            assert.sameDeepMembers(handler2.destroy.args, [
                ['DELETE', '/service/test'],
                ['GET', '/service/test']
            ]);

            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.NOT_FOUND);

            await destroy1();

            results = await Promise.all([
                sendRequest({ path: '/test', method: 'DELETE' }),
                sendRequest({ path: '/test', method: 'GET' })
            ]);

            assert.deepStrictEqual(handler1.handle.callCount, 2);
            assert.deepStrictEqual(handler2.handle.callCount, 2);
            assert.deepStrictEqual(handler2.destroy.callCount, 2, 'should not call .destroy more than twice');
            assert.deepStrictEqual(handler1.destroy.callCount, 2, 'should call .destroy twice for every registered HTTP method');
            assert.sameDeepMembers(handler1.destroy.args, [
                ['DELETE', '/service/test'],
                ['GET', '/service/test']
            ]);

            assert.deepStrictEqual(results[0].statusCode, HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(results[1].statusCode, HTTP_CODES.NOT_FOUND);
        });
    });
});
