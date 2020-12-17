/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const configWorker = require('../../../src/lib/config');
const DeclareHandler = require('../../../src/lib/requestHandlers/declareHandler');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;


describe('DeclareHandler', () => {
    const uri = 'http://localhost:8100/mgmt/shared/telemetry/declare';
    let restOpMock;
    let requestHandler;

    function getRestOperation(method) {
        restOpMock = new testUtil.MockRestOperation({ method: method.toUpperCase() });
        restOpMock.uri = testUtil.parseURL(uri);
        return restOpMock;
    }

    beforeEach(() => {
        requestHandler = new DeclareHandler(getRestOperation('GET'));
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should get raw config on GET request', () => {
        const expectedConfig = { config: 'expected' };
        sinon.stub(configWorker, 'getRawConfig').resolves(testUtil.deepCopy(expectedConfig));
        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(), {
                    message: 'success',
                    declaration: expectedConfig
                }, 'should return expected body');
            });
    });

    it('should pass declaration to configWorker on POST request', () => {
        const expectedConfig = { config: 'validated' };

        restOpMock.method = 'POST';
        restOpMock.body = { class: 'Telemetry' };

        sinon.stub(configWorker, 'processDeclaration').resolves(testUtil.deepCopy(expectedConfig));
        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(), {
                    message: 'success',
                    declaration: expectedConfig
                }, 'should return expected body');
            });
    });

    it('should return 422 on attempt to POST invalid declaration', () => {
        restOpMock.method = 'POST';
        restOpMock.body = { class: 'Telemetry1' };

        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 422, 'should return expected code');
                assert.strictEqual(requestHandler.getBody().code, 422, 'should return expected code');
                assert.strictEqual(requestHandler.getBody().message, 'Unprocessable entity', 'should return expected message');
                assert.strictEqual(typeof requestHandler.getBody().error, 'string', 'should return error message');
            });
    });

    it('should return 503 on attempt to POST declaration while previous one is still in process', () => {
        const expectedConfig = { config: 'validated' };
        sinon.stub(configWorker, 'processDeclaration').callsFake(() => testUtil.sleep(50).then(() => testUtil.deepCopy(expectedConfig)));
        sinon.stub(configWorker, 'getRawConfig').callsFake(() => testUtil.sleep(50).then(() => testUtil.deepCopy(expectedConfig)));

        const fetchResponseInfo = handler => ({
            code: handler.getCode(),
            body: handler.getBody()
        });

        const expectedResponses = {
            GET: {
                code: 200,
                body: {
                    message: 'success',
                    declaration: expectedConfig
                }
            },
            POST: [
                {
                    code: 200,
                    body: {
                        message: 'success',
                        declaration: expectedConfig
                    }
                },
                {
                    code: 503,
                    body: {
                        code: 503,
                        message: 'Service Unavailable'
                    }
                }
            ]
        };

        return Promise.all([
            testUtil.sleep(10).then(() => new DeclareHandler(getRestOperation('POST')).process()), // should return 200 or 503
            testUtil.sleep(10).then(() => new DeclareHandler(getRestOperation('POST')).process()), // should return 503 or 200
            testUtil.sleep(20).then(() => new DeclareHandler(getRestOperation('GET')).process()) //   should return 200
        ])
            .then((handlers) => {
                assert.deepStrictEqual(fetchResponseInfo(handlers[2]), expectedResponses.GET, 'should match expected response for GET');
                assert.includeDeepMembers(handlers.slice(0, 2).map(fetchResponseInfo), expectedResponses.POST, 'should match expected responses for POST requests');
                // lock should be released already
                return new DeclareHandler(getRestOperation('POST')).process();
            })
            .then((handler) => {
                assert.deepStrictEqual(fetchResponseInfo(handler), expectedResponses.POST[0], 'should match expected response for POST 200');
            });
    });

    it('should reject when caught unknown error', () => {
        sinon.stub(configWorker, 'getRawConfig').rejects(new Error('expectedError'));
        return assert.isRejected(requestHandler.process(), 'expectedError');
    });
});
