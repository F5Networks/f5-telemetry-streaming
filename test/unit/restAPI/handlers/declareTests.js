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
const moduleCache = require('../../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../../shared/assert');
const dummies = require('../../shared/dummies');
const restAPIUtils = require('../utils');
const sourceCode = require('../../shared/sourceCode');
const stubs = require('../../shared/stubs');
const testUtils = require('../../shared/util');

const RESTAPIService = sourceCode('src/lib/restAPI');
const RestWorker = sourceCode('src/nodejs/restWorker');

moduleCache.remember();

// TODO: update tests and the code to be events-driven once Config Worker changes commited to master

describe('REST API / "/declare" endpoint', () => {
    const dlURI = '/declare';
    let configWorker;
    let coreStub;
    let declaration;
    let restAPI;
    let restWorker;

    function sendRequest() {
        return restAPIUtils.waitRequestComplete(
            restWorker,
            restAPIUtils.buildRequest.apply(restAPIUtils, arguments)
        );
    }

    function processDeclaration(decl, waitFor = true) {
        return restAPIUtils.processDeclaration(configWorker, coreStub.appEvents.appEvents, decl, waitFor);
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = stubs.default.coreStub();
        configWorker = coreStub.configWorker.configWorker;

        restAPI = new RESTAPIService(restAPIUtils.TELEMETRY_URI_PREFIX);
        restWorker = new RestWorker();

        restAPI.initialize(coreStub.appEvents.appEvents);
        restWorker.initialize(coreStub.appEvents.appEvents);

        declaration = dummies.declaration.base.decrypted({
            listener: dummies.declaration.listener.minimal.decrypted(),
            My_Namespace: dummies.declaration.namespace.base.decrypted({
                listener2: dummies.declaration.listener.minimal.decrypted()
            })
        });

        await coreStub.startServices();
        await restAPI.start();

        assert.isTrue(restAPI.isRunning());

        await processDeclaration(testUtils.deepCopy(declaration));
    });

    afterEach(async () => {
        await processDeclaration(testUtils.deepCopy(dummies.declaration.base.decrypted()));

        await coreStub.destroyServices();
        await restAPI.destroy();

        assert.isTrue(restAPI.isDestroyed());
        sinon.restore();
    });

    [
        true,
        false
    ].forEach((useNamespace) => describe(useNamespace ? 'Custom namespace' : 'Default namespace', () => {
        const namespace = useNamespace ? 'My_Namespace' : undefined;
        const uriPrefix = useNamespace ? `/namespace/${namespace}` : '';

        it('should get current configuration', async () => {
            const restOp = await sendRequest({ path: `${uriPrefix}${dlURI}` });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

            if (useNamespace) {
                assert.deepStrictEqual(restOp.body.message, 'success');
                assert.isDefined(restOp.body.declaration);
                assert.deepStrictEqual(restOp.body.declaration.class, 'Telemetry_Namespace');
                assert.isDefined(restOp.body.declaration.listener2);
                assert.deepStrictEqual(restOp.body.declaration.listener2.class, 'Telemetry_Listener');
            } else {
                assert.isDefined(restOp.body.declaration);
                assert.deepStrictEqual(restOp.body.declaration.class, 'Telemetry');
                assert.isDefined(restOp.body.declaration.schemaVersion);
                assert.isDefined(restOp.body.declaration.listener);
                assert.deepStrictEqual(restOp.body.declaration.listener.class, 'Telemetry_Listener');
            }
        });

        it('should not be a debug endpoint', async () => {
            declaration.controls = dummies.declaration.controls.full.decrypted({ debug: true });
            await processDeclaration(testUtils.deepCopy(declaration));

            const restOp = await sendRequest({ path: `${uriPrefix}${dlURI}` });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

            if (useNamespace) {
                assert.deepStrictEqual(restOp.body.message, 'success');
                assert.isDefined(restOp.body.declaration);
                assert.deepStrictEqual(restOp.body.declaration.class, 'Telemetry_Namespace');
                assert.isDefined(restOp.body.declaration.listener2);
                assert.deepStrictEqual(restOp.body.declaration.listener2.class, 'Telemetry_Listener');
            } else {
                assert.isDefined(restOp.body.declaration);
                assert.deepStrictEqual(restOp.body.declaration.class, 'Telemetry');
                assert.isDefined(restOp.body.declaration.schemaVersion);
                assert.isDefined(restOp.body.declaration.listener);
                assert.deepStrictEqual(restOp.body.declaration.listener.class, 'Telemetry_Listener');
            }
        });

        if (!useNamespace) {
            it('should return 404 on GET non-existing namespace', async () => {
                const restOp = await sendRequest({ path: `/namespace/namespace${dlURI}` });

                assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND);
                assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
                assert.deepStrictEqual(restOp.body, {
                    code: 404,
                    error: 'Bad URL: /mgmt/shared/telemetry/namespace/namespace/declare',
                    message: 'Not Found'
                });
            });
        }

        it('should return 422 on POST invalid declaration', async () => {
            let restOp = await sendRequest({
                path: `${uriPrefix}${dlURI}`,
                method: 'POST',
                body: { data: 'invalid declaration' }
            });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.UNPROCESSABLE_ENTITY);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: 422,
                error: [{
                    dataPath: '/data',
                    keyword: 'type',
                    message: 'should be object',
                    params: {
                        type: 'object'
                    },
                    schemaPath: '#/type'
                }],
                message: 'Unprocessable entity'
            });

            restOp = await sendRequest({ path: `${uriPrefix}${dlURI}` });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

            if (useNamespace) {
                assert.deepStrictEqual(restOp.body.message, 'success');
                assert.isDefined(restOp.body.declaration);
                assert.deepStrictEqual(restOp.body.declaration.class, 'Telemetry_Namespace');
                assert.isDefined(restOp.body.declaration.listener2);
                assert.deepStrictEqual(restOp.body.declaration.listener2.class, 'Telemetry_Listener');
            } else {
                assert.isDefined(restOp.body.declaration);
                assert.deepStrictEqual(restOp.body.declaration.class, 'Telemetry');
                assert.isDefined(restOp.body.declaration.schemaVersion);
                assert.isDefined(restOp.body.declaration.listener);
                assert.deepStrictEqual(restOp.body.declaration.listener.class, 'Telemetry_Listener');
            }
        });

        it('should return 200 on POST valid declaration', async () => {
            let restOp = await sendRequest({
                path: `${uriPrefix}${dlURI}`,
                method: 'POST',
                body: useNamespace
                    ? dummies.declaration.namespace.base.decrypted()
                    : dummies.declaration.base.decrypted()
            });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

            if (useNamespace) {
                assert.deepStrictEqual(restOp.body.message, 'success');
                assert.isDefined(restOp.body.declaration);
                assert.deepStrictEqual(restOp.body.declaration.class, 'Telemetry_Namespace');
                assert.isUndefined(restOp.body.declaration.listener2);
            } else {
                assert.isDefined(restOp.body.declaration);
                assert.deepStrictEqual(restOp.body.declaration.class, 'Telemetry');
                assert.isDefined(restOp.body.declaration.schemaVersion);
                assert.isUndefined(restOp.body.declaration.listener);
            }

            restOp = await sendRequest({ path: `${uriPrefix}${dlURI}` });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

            if (useNamespace) {
                assert.deepStrictEqual(restOp.body.message, 'success');
                assert.isDefined(restOp.body.declaration);
                assert.deepStrictEqual(restOp.body.declaration.class, 'Telemetry_Namespace');
                assert.isUndefined(restOp.body.declaration.listener2);
            } else {
                assert.isDefined(restOp.body.declaration);
                assert.deepStrictEqual(restOp.body.declaration.class, 'Telemetry');
                assert.isDefined(restOp.body.declaration.schemaVersion);
                assert.isUndefined(restOp.body.declaration.listener);
            }
        });

        it('should response with 500 when caught error on attempt to GET declaration', async () => {
            sinon.stub(configWorker, 'getDeclaration').rejects(new Error('expected error'));
            const restOp = await sendRequest({ path: `${uriPrefix}${dlURI}` });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.INTERNAL_SERVER_ERROR);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: restAPIUtils.HTTP_CODES.INTERNAL_SERVER_ERROR,
                error: 'expected error',
                message: 'Internal Server Error'
            });
        });

        it('should response with 500 when caught error on attempt to POST declaration', async () => {
            const stub = sinon.stub(
                configWorker,
                useNamespace ? 'processNamespaceDeclaration' : 'processDeclaration'
            );
            stub.rejects(new Error('expected error'));

            const restOp = await sendRequest({
                path: `${uriPrefix}${dlURI}`,
                method: 'POST',
                body: testUtils.deepCopy(declaration)
            });

            stub.restore();

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.INTERNAL_SERVER_ERROR);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: restAPIUtils.HTTP_CODES.INTERNAL_SERVER_ERROR,
                error: 'expected error',
                message: 'Internal Server Error'
            });
        });

        it('should compute metadata for request', async () => {
            const spy = sinon.spy(
                configWorker,
                useNamespace ? 'processNamespaceDeclaration' : 'processDeclaration'
            );
            declaration = useNamespace
                ? dummies.declaration.namespace.base.decrypted()
                : dummies.declaration.base.decrypted();

            let restOp = await sendRequest({
                path: `${uriPrefix}${dlURI}`,
                method: 'POST',
                body: testUtils.deepCopy(declaration)
            });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

            let args = spy.lastCall.args;
            let metadata = args[args.length - 1].metadata;
            assert.deepStrictEqual(metadata.originDeclaration, declaration);
            assert.deepStrictEqual(metadata.message, 'Incoming declaration via REST API');
            assert.deepStrictEqual(metadata.namespace, namespace);
            assert.deepStrictEqual(metadata.sourceIP, 'unknown');

            restOp = await sendRequest({
                path: `${uriPrefix}${dlURI}`,
                method: 'POST',
                body: testUtils.deepCopy(declaration),
                headers: { 'X-Forwarded-For': 'localhost' }
            });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);

            args = spy.lastCall.args;
            metadata = args[args.length - 1].metadata;
            assert.deepStrictEqual(metadata.originDeclaration, declaration);
            assert.deepStrictEqual(metadata.message, 'Incoming declaration via REST API');
            assert.deepStrictEqual(metadata.namespace, namespace);
            assert.deepStrictEqual(metadata.sourceIP, 'localhost');
        });

        it('should return 503 on attempt to POST declaration while previous one is still in process', async () => {
            const stub = sinon.stub(
                configWorker,
                useNamespace ? 'processNamespaceDeclaration' : 'processDeclaration'
            );
            stub.onFirstCall().callsFake(function () {
                return testUtils.sleep(50)
                    .then(() => stub.wrappedMethod.apply(configWorker, arguments));
            });
            stub.callThrough();

            declaration = useNamespace
                ? dummies.declaration.namespace.base.decrypted()
                : dummies.declaration.base.decrypted();

            let id = 0;
            const postDeclaration = () => {
                const copy = testUtils.deepCopy(declaration);
                copy[`listener_${id}`] = dummies.declaration.listener.minimal.decrypted();
                id += 1;
                return sendRequest({
                    path: `${uriPrefix}${dlURI}`,
                    method: 'POST',
                    body: copy
                });
            };

            const results = await Promise.all([
                postDeclaration(),
                testUtils.sleep(10).then(postDeclaration),
                testUtils.sleep(10).then(postDeclaration),
                testUtils.sleep(10).then(postDeclaration)
            ]);

            assert.sameMembers(
                results.map((restOp) => restOp.statusCode),
                [200, 503, 503, 503]
            );
            const restOp = await sendRequest({ path: `${uriPrefix}${dlURI}` });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
            assert.isDefined(restOp.body.declaration.listener_0);
        });
    }));

    it('should return 503 on attempt to POST declaration while previous one is still in process (mixed)', async () => {
        const pdStub = sinon.stub(configWorker, 'processDeclaration');
        const pnStub = sinon.stub(configWorker, 'processNamespaceDeclaration');

        pdStub.onFirstCall().callsFake(function () {
            return testUtils.sleep(50)
                .then(() => pdStub.wrappedMethod.apply(configWorker, arguments));
        });
        pdStub.callThrough();
        pnStub.onFirstCall().callsFake(function () {
            return testUtils.sleep(50)
                .then(() => pnStub.wrappedMethod.apply(configWorker, arguments));
        });
        pnStub.callThrough();

        let id = 0;

        const postDeclaration = (namespace) => {
            const decl = namespace
                ? dummies.declaration.namespace.base.decrypted()
                : dummies.declaration.base.decrypted();

            decl[`listener_${id}`] = dummies.declaration.listener.minimal.decrypted();
            id += 1;

            const uriPrefix = namespace ? `/namespace/${namespace}` : '';

            return sendRequest({
                path: `${uriPrefix}${dlURI}`,
                method: 'POST',
                body: decl
            });
        };

        let results = await Promise.all([
            postDeclaration(),
            testUtils.sleep(10).then(postDeclaration),
            testUtils.sleep(10).then(() => postDeclaration('namespace1')),
            testUtils.sleep(10).then(() => postDeclaration('namespace2'))
        ]);

        assert.sameMembers(
            results.map((restOp) => restOp.statusCode),
            [200, 503, 503, 503]
        );
        let restOp = await sendRequest({ path: '/declare' });

        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
        assert.isDefined(restOp.body.declaration.listener_0);

        pdStub.resetHistory();
        pnStub.resetHistory();

        results = await Promise.all([
            postDeclaration('namespace1'),
            testUtils.sleep(10).then(postDeclaration),
            testUtils.sleep(10).then(() => postDeclaration('namespace3')),
            testUtils.sleep(10).then(postDeclaration)
        ]);

        assert.sameMembers(
            results.map((rop) => rop.statusCode),
            [200, 503, 503, 503]
        );

        restOp = await sendRequest({ path: '/declare' });

        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
        assert.isDefined(restOp.body.declaration.listener_0);
        assert.isDefined(restOp.body.declaration.namespace1);
        assert.isDefined(restOp.body.declaration.namespace1.listener_4);

        pdStub.resetHistory();
        pnStub.resetHistory();

        results = await Promise.all([
            postDeclaration('namespace3'),
            testUtils.sleep(10).then(postDeclaration),
            testUtils.sleep(10).then(() => postDeclaration('namespace1')),
            testUtils.sleep(10).then(postDeclaration)
        ]);

        assert.sameMembers(
            results.map((rop) => rop.statusCode),
            [200, 503, 503, 503]
        );

        restOp = await sendRequest({ path: '/declare' });

        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
        assert.isDefined(restOp.body.declaration.listener_0);
        assert.isDefined(restOp.body.declaration.namespace1);
        assert.isDefined(restOp.body.declaration.namespace1.listener_4);
        assert.isDefined(restOp.body.declaration.namespace3);
        assert.isDefined(restOp.body.declaration.namespace3.listener_8);

        pdStub.resetHistory();
        pnStub.resetHistory();

        results = await Promise.all([
            postDeclaration('namespace3'),
            testUtils.sleep(10).then(postDeclaration),
            testUtils.sleep(10).then(() => postDeclaration('namespace1')),
            testUtils.sleep(10).then(postDeclaration)
        ]);

        assert.sameMembers(
            results.map((rop) => rop.statusCode),
            [200, 503, 503, 503]
        );

        restOp = await sendRequest({ path: '/declare' });

        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
        assert.isDefined(restOp.body.declaration.listener_0);
        assert.isDefined(restOp.body.declaration.namespace1);
        assert.isDefined(restOp.body.declaration.namespace1.listener_4);
        assert.isDefined(restOp.body.declaration.namespace3);
        assert.isUndefined(restOp.body.declaration.namespace3.listener_8);
        assert.isDefined(restOp.body.declaration.namespace3.listener_12);

        pdStub.resetHistory();
        pnStub.resetHistory();

        results = await Promise.all([
            postDeclaration(),
            testUtils.sleep(10).then(() => postDeclaration('namespace3')),
            testUtils.sleep(10).then(() => postDeclaration('namespace1')),
            testUtils.sleep(10).then(postDeclaration)
        ]);

        assert.sameMembers(
            results.map((rop) => rop.statusCode),
            [200, 503, 503, 503]
        );
        restOp = await sendRequest({ path: '/declare' });

        assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
        assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
        assert.isUndefined(restOp.body.declaration.listener_0);
        assert.isDefined(restOp.body.declaration.listener_16);
        assert.isUndefined(restOp.body.declaration.namespace1);
        assert.isUndefined(restOp.body.declaration.namespace3);
    });
});
