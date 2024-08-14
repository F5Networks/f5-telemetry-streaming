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
const moduleCache = require('./shared/restoreCache')();

const sinon = require('sinon');

const assert = require('./shared/assert');
const restUtils = require('./restAPI/utils');
const sourceCode = require('./shared/sourceCode');
const stubs = require('./shared/stubs');
const testUtil = require('./shared/util');

const RestWorker = sourceCode('src/nodejs/restWorker');
const SafeEventEmitter = sourceCode('src/lib/utils/eventEmitter');

moduleCache.remember();

describe('restWorker', () => {
    let appEvents;
    let configWorker;
    let coreStub;
    let deviceVersionStub;
    let restWorker;

    const baseState = {
        _data_: {
            config: {
                raw: {},
                normalized: {}
            }
        }
    };
    const declarationTracerFile = '/var/log/restnoded/telemetryDeclarationHistory';

    before(() => {
        moduleCache.restore();

        RestWorker.prototype.loadState = sinon.stub();
        RestWorker.prototype.saveState = sinon.stub();
        RestWorker.prototype.loadState.callsFake((first, cb) => {
            cb(null, testUtil.deepCopy(baseState));
        });
        RestWorker.prototype.saveState.callsFake((first, state, cb) => {
            cb(null);
        });
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({
            appEvents: true,
            configWorker: true,
            tracer: true,
            utilMisc: true
        });
        coreStub.utilMisc.generateUuid.numbersOnly = false;

        configWorker = coreStub.configWorker.configWorker;
        configWorker.removeAllListeners();

        coreStub.localhostBigIp.mockDeviceType();
        deviceVersionStub = coreStub.localhostBigIp.mockDeviceVersion();

        appEvents = coreStub.appEvents.appEvents;

        restWorker = new RestWorker();
        restWorker.initialize(appEvents);
    });

    afterEach(async () => {
        await restWorker.tsDestroy();

        testUtil.nockCleanup();
        sinon.restore();
    });

    describe('constructor', () => {
        it('should set WORKER_URI_PATH to shared/telemetry', () => {
            assert.strictEqual(restWorker.WORKER_URI_PATH, 'shared/telemetry');
        });
    });

    describe('.onStart()', () => {
        it('should call success callback', () => {
            const fakeSuccess = sinon.fake();
            const fakeFailure = sinon.fake();
            restWorker.onStart(fakeSuccess, fakeFailure);

            assert.strictEqual(fakeSuccess.callCount, 1);
            assert.strictEqual(fakeFailure.callCount, 0);
        });
    });

    describe('.onStartCompleted()', () => {
        it('should call failure callback if unable to start application', () => {
            sinon.stub(restWorker, '_initializeApplication').throws(new Error('test error'));
            const fakeSuccess = sinon.fake();
            const fakeFailure = sinon.spy();

            restWorker.onStartCompleted(fakeSuccess, fakeFailure);
            assert.strictEqual(fakeSuccess.callCount, 0);
            assert.strictEqual(fakeFailure.callCount, 1);
            assert.ok(/onStartCompleted error/.test(fakeFailure.args[0][0]));
        });

        it('should call failure callback if unable to start application when promise chain failed', async () => {
            const loadConfigStub = sinon.stub(configWorker, 'load');
            loadConfigStub.rejects(new Error('loadConfig error'));

            await new Promise((resolve, reject) => {
                restWorker.onStartCompleted(
                    () => reject(new Error('should not call success callback')),
                    () => resolve()
                );
            });

            assert.notStrictEqual(loadConfigStub.callCount, 0);
        });

        it('should gather host device info', async () => {
            await new Promise((resolve, reject) => {
                restWorker.onStartCompleted(resolve, (msg) => reject(new Error(msg || 'no message provided')));
            });

            await testUtil.sleep(200);
            assert.strictEqual(deviceVersionStub.stub.callCount, 1);
        });

        it('should not fail when unable to gather host device info', async () => {
            deviceVersionStub.stub.returns([404, '', 'Not Found']);

            await new Promise((resolve, reject) => {
                restWorker.onStartCompleted(resolve, (msg) => reject(new Error(msg || 'no message provided')));
            });
        });

        it('should start activity recorder', async () => {
            baseState._data_ = { config: { raw: { class: 'Telemetry_Test' } } };

            await new Promise((resolve, reject) => {
                restWorker.onStartCompleted(resolve, reject);
            });
            await testUtil.sleep(100);
            await coreStub.tracer.waitForData();

            const data = coreStub.tracer.data[declarationTracerFile];
            assert.lengthOf(data, 4, 'should write 4 events');
            assert.sameDeepMembers(
                data.map((d) => d.data.event),
                ['config.received', 'config.received', 'config.validationSucceed', 'config.validationFailed']
            );
        });
    });

    describe('requests processing', () => {
        let ee;
        let requestHandler;
        let unregHandler;

        function sendRequest() {
            return restUtils.waitRequestComplete(
                restWorker,
                restUtils.buildRequest.apply(restUtils, arguments)
            );
        }

        beforeEach(() => {
            unregHandler = null;
            ee = new SafeEventEmitter();

            appEvents.register(ee, 'example', [
                'requestHandler.created'
            ]);

            ee.emit('requestHandler.created', async (restOp) => {
                await requestHandler(restOp);
            }, (unreg) => {
                unregHandler = unreg;
            });
        });

        afterEach(() => unregHandler());

        [
            'DELETE',
            'GET',
            'POST'
        ].forEach((method) => describe(method, () => {
            it('should response with 503 on request when no request handlers', async () => {
                unregHandler();
                const restOp = await sendRequest({ method });

                assert.deepStrictEqual(restOp.statusCode, 503);
                assert.deepStrictEqual(restOp.contentType, 'application/json');
                assert.deepStrictEqual(restOp.body, {
                    code: 503,
                    message: 'Service Unavailable'
                });
            });

            it('should forward request to handlers', async () => {
                requestHandler = sinon.spy(async (restOp) => {
                    assert.deepStrictEqual(restOp.getMethod(), method);
                    restOp.setStatusCode(200);
                    restOp.setContentType('test');
                    restOp.setBody({ data: true });
                    restOp.complete();
                });
                const restOp = await sendRequest({ method });

                assert.deepStrictEqual(requestHandler.callCount, 1);
                assert.deepStrictEqual(restOp.statusCode, 200);
                assert.deepStrictEqual(restOp.contentType, 'test');
                assert.deepStrictEqual(restOp.body, {
                    data: true
                });
            });

            it('should return 500 on error', async () => {
                requestHandler = sinon.spy(async () => {
                    throw new Error('test');
                });
                const restOp = await sendRequest({ method });

                assert.deepStrictEqual(requestHandler.callCount, 1);
                assert.deepStrictEqual(restOp.statusCode, 500);
                assert.deepStrictEqual(restOp.contentType, 'application/json');
                assert.deepStrictEqual(restOp.body, {
                    code: 500,
                    message: 'Internal Server Error'
                });
            });

            it('should process multiple requests at a time', async () => {
                let code = 200;
                requestHandler = sinon.spy(async (restOp) => {
                    await testUtil.sleep(10);

                    if (code === 203) {
                        throw new Error('expected error');
                    }

                    restOp.setStatusCode(code);
                    restOp.setContentType(`test${code}`);
                    restOp.setBody({ code, path: restOp.getUri().pathname });
                    restOp.complete();

                    code += 1;
                });

                const results = await Promise.all([
                    sendRequest({ path: '/1', method }),
                    sendRequest({ path: '/2', method }),
                    sendRequest({ path: '/3', method }),
                    sendRequest({ path: '/4', method })
                ]);

                assert.deepStrictEqual(requestHandler.callCount, 4);
                assert.sameMembers(
                    results.map((r) => r.statusCode),
                    [200, 201, 202, 500]
                );
                assert.sameMembers(
                    results.map((r) => r.contentType),
                    ['test200', 'test201', 'test202', 'application/json']
                );
                assert.sameDeepMembers(
                    results.map((r) => r.body),
                    [
                        { code: 200, path: '/mgmt/shared/telemetry/1' },
                        { code: 201, path: '/mgmt/shared/telemetry/2' },
                        { code: 202, path: '/mgmt/shared/telemetry/3' },
                        { code: 500, message: 'Internal Server Error' }
                    ]
                );
            });
        }));

        it('should process multiple requests at a time', async () => {
            let code = 200;

            requestHandler = sinon.spy(async (restOp) => {
                await testUtil.sleep(10);

                if (code === 203) {
                    throw new Error('expected error');
                }

                restOp.setStatusCode(code);
                restOp.setContentType(`test${code}`);
                restOp.setBody({
                    code,
                    method: restOp.getMethod(),
                    path: restOp.getUri().pathname
                });
                restOp.complete();

                code += 1;
            });

            const results = await Promise.all([
                sendRequest({ path: '/1', method: 'DELETE' }),
                sendRequest({ path: '/2', method: 'GET' }),
                sendRequest({ path: '/3', method: 'POST' }),
                sendRequest({ path: '/4', method: 'GET' })
            ]);

            assert.deepStrictEqual(requestHandler.callCount, 4);
            assert.sameMembers(
                results.map((r) => r.statusCode),
                [200, 201, 202, 500]
            );
            assert.sameMembers(
                results.map((r) => r.contentType),
                ['test200', 'test201', 'test202', 'application/json']
            );
            assert.sameDeepMembers(
                results.map((r) => r.body),
                [
                    { code: 200, method: 'DELETE', path: '/mgmt/shared/telemetry/1' },
                    { code: 201, method: 'GET', path: '/mgmt/shared/telemetry/2' },
                    { code: 202, method: 'POST', path: '/mgmt/shared/telemetry/3' },
                    { code: 500, message: 'Internal Server Error' }
                ]
            );
        });

        it('should not rotate request handlers when failed', async () => {
            const primaryHandler = sinon.spy(async (restOp) => {
                if (primaryHandler.callCount === 1) {
                    throw new Error('expected error');
                }

                restOp.setStatusCode(200);
                restOp.setContentType('test200');
                restOp.setBody({
                    code: 200,
                    method: restOp.getMethod(),
                    path: restOp.getUri().pathname
                });
                restOp.complete();
            });
            ee.emit('requestHandler.created', primaryHandler);

            requestHandler = sinon.spy(async (restOp) => {
                restOp.setStatusCode(404);
                restOp.setContentType('test404');
                restOp.setBody({
                    code: 404,
                    method: restOp.getMethod(),
                    path: restOp.getUri().pathname
                });
                restOp.complete();
            });

            let restOp = await sendRequest({ path: '/1', method: 'DELETE' });

            assert.deepStrictEqual(restOp.statusCode, 500);
            assert.deepStrictEqual(restOp.contentType, 'application/json');
            assert.deepStrictEqual(restOp.body, {
                code: 500,
                message: 'Internal Server Error'
            });

            assert.deepStrictEqual(primaryHandler.callCount, 1);
            assert.deepStrictEqual(requestHandler.callCount, 0);

            restOp = await sendRequest({ path: '/1', method: 'DELETE' });

            assert.deepStrictEqual(restOp.statusCode, 200);
            assert.deepStrictEqual(restOp.contentType, 'test200');
            assert.deepStrictEqual(restOp.body, {
                code: 200,
                method: 'DELETE',
                path: '/mgmt/shared/telemetry/1'
            });
        });

        it('should fallback to next handler from the list', async () => {
            let unregPrimary = null;
            const primaryHandler = sinon.spy(async (restOp) => {
                restOp.setStatusCode(200);
                restOp.setContentType('test200');
                restOp.setBody({
                    code: 200,
                    method: restOp.getMethod(),
                    path: restOp.getUri().pathname
                });
                restOp.complete();
            });
            ee.emit('requestHandler.created', primaryHandler, (unreg) => {
                unregPrimary = unreg;
            });

            requestHandler = sinon.spy(async (restOp) => {
                restOp.setStatusCode(404);
                restOp.setContentType('test404');
                restOp.setBody({
                    code: 404,
                    method: restOp.getMethod(),
                    path: restOp.getUri().pathname
                });
                restOp.complete();
            });

            let restOp = await sendRequest({ path: '/1', method: 'DELETE' });

            assert.deepStrictEqual(restOp.statusCode, 200);
            assert.deepStrictEqual(restOp.contentType, 'test200');
            assert.deepStrictEqual(restOp.body, {
                code: 200,
                method: 'DELETE',
                path: '/mgmt/shared/telemetry/1'
            });

            assert.deepStrictEqual(primaryHandler.callCount, 1);
            assert.deepStrictEqual(requestHandler.callCount, 0);

            unregPrimary();

            restOp = await sendRequest({ path: '/1', method: 'DELETE' });

            assert.deepStrictEqual(restOp.statusCode, 404);
            assert.deepStrictEqual(restOp.contentType, 'test404');
            assert.deepStrictEqual(restOp.body, {
                code: 404,
                method: 'DELETE',
                path: '/mgmt/shared/telemetry/1'
            });

            unregHandler();

            restOp = await sendRequest({ path: '/1', method: 'DELETE' });

            assert.deepStrictEqual(restOp.statusCode, 503);
            assert.deepStrictEqual(restOp.contentType, 'application/json');
            assert.deepStrictEqual(restOp.body, {
                code: 503,
                message: 'Service Unavailable'
            });
        });
    });
});
