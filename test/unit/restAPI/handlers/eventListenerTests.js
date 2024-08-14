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
const restAPIUtils = require('../utils');
const sourceCode = require('../../shared/sourceCode');
const stubs = require('../../shared/stubs');

const errors = sourceCode('src/lib/errors');
const EventListenerPublisher = sourceCode('src/lib/eventListener/dataPublisher');
const RESTAPIService = sourceCode('src/lib/restAPI');
const RestWorker = sourceCode('src/nodejs/restWorker');

moduleCache.remember();

// TODO: update tests and the code to be events-driven once Event Listener changes commited to master

describe('REST API / "/eventListener" endpoint', () => {
    const elURI = '/eventListener';
    let configWorker;
    let coreStub;
    let restAPI;
    let restWorker;
    let sendDataStub;

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

        sendDataStub = sinon.stub(EventListenerPublisher, 'sendDataToListener').resolves();

        await coreStub.startServices();
        await restAPI.start();

        assert.isTrue(restAPI.isRunning());

        await processDeclaration({
            class: 'Telemetry',
            controls: {
                class: 'Controls',
                debug: true
            }
        });
    });

    afterEach(async () => {
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

        it('should send data to event listener', async () => {
            const restOp = await sendRequest({
                path: `${uriPrefix}${elURI}/My_Listener`,
                method: 'POST',
                body: { data: 'testData' }
            });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.OK);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                message: 'success',
                data: {
                    data: 'testData'
                }
            });
            assert.strictEqual(sendDataStub.callCount, 1, 'should be called once');
            assert.deepStrictEqual(
                sendDataStub.firstCall.args,
                [{ data: 'testData' }, 'My_Listener', { namespace }],
                'should be called once'
            );
        });

        it('should return 404 if event listener not found', async () => {
            sendDataStub.rejects(new errors.ConfigLookupError('listener not found'));
            const restOp = await sendRequest({
                path: `${uriPrefix}${elURI}/Non_Ex_Listener`,
                method: 'POST',
                body: { data: 'testData' }
            });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
            assert.deepStrictEqual(restOp.body, {
                code: restAPIUtils.HTTP_CODES.NOT_FOUND,
                message: 'Not Found',
                error: `Bad URL: /mgmt/shared/telemetry${uriPrefix}${elURI}/Non_Ex_Listener`
            });
        });

        it('should be a debug endpoint only', async () => {
            await processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    debug: false
                }
            });

            const restOp = await sendRequest({ path: `${uriPrefix}${elURI}/My_Listener` });

            assert.deepStrictEqual(restOp.statusCode, restAPIUtils.HTTP_CODES.NOT_FOUND);
            assert.deepStrictEqual(restOp.contentType, restAPIUtils.CONTENT_TYPE.JSON);
        });
    }));
});
