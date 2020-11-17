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
    let restOpMock;
    let requestHandler;

    beforeEach(() => {
        restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
        restOpMock.uri = testUtil.parseURL('http://localhost:8100/mgmt/shared/telemetry/declare');
        requestHandler = new DeclareHandler(restOpMock);
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

    it('should reject when caught unknown error', () => {
        sinon.stub(configWorker, 'getRawConfig').rejects(new Error('expectedError'));
        return assert.isRejected(requestHandler.process(), 'expectedError');
    });
});
