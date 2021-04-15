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

const EventListenerHandler = require('../../../src/lib/requestHandlers/eventListenerHandler');
const EventListenerPublisher = require('../../../src/lib/eventListener/dataPublisher');
const requestRouter = require('../../../src/lib/requestHandlers/router');
const testUtil = require('../shared/util');
const ErrorHandler = require('../../../src/lib/requestHandlers/errorHandler');
const errors = require('../../../src/lib/errors');

chai.use(chaiAsPromised);
const assert = chai.assert;


describe('EventListenerHandler', () => {
    const buildRequestHandler = (opts) => {
        opts = opts || {};
        const restOpMock = new testUtil.MockRestOperation({ method: 'POST' });
        restOpMock.uri = opts.uri || 'http://localhost:8100/mgmt/shared/telemetry/eventListener/My_Listener';
        restOpMock.body = opts.body || { data: 'testData' };
        return new EventListenerHandler(restOpMock, opts.handlerOpts || { eventListener: 'My_Listener' });
    };

    afterEach(() => {
        sinon.restore();
    });

    it('should return 200 on POST (no namespace)', () => {
        const requestHandler = buildRequestHandler();
        const sendDataStub = sinon.stub(EventListenerPublisher, 'sendDataToListener').resolves();

        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(),
                    { data: { data: 'testData' }, message: 'success' }, 'should return expected body');
                assert.strictEqual(sendDataStub.callCount, 1, 'should be called once');
                assert.deepStrictEqual(sendDataStub.firstCall.args,
                    [{ data: 'testData' }, 'My_Listener', { namespace: undefined }], 'should be called once');
            });
    });

    it('should return 200 on POST (in namespace)', () => {
        const requestHandler = buildRequestHandler({
            uri: 'http://localhost:8100/mgmt/shared/telemetry/namespace/My_Namespace/eventListener/My_Listener',
            body: { data: 'testData' },
            handlerOpts: { namespace: 'My_Namespace', eventListener: 'My_Listener' }
        });
        const sendDataStub = sinon.stub(EventListenerPublisher, 'sendDataToListener').resolves();

        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(),
                    { data: { data: 'testData' }, message: 'success' }, 'should return expected body');
                assert.strictEqual(sendDataStub.callCount, 1, 'should be called once');
                assert.deepStrictEqual(sendDataStub.firstCall.args,
                    [{ data: 'testData' }, 'My_Listener', { namespace: 'My_Namespace' }], 'should be called once');
            });
    });

    it('should return 404 if Event Listener is not found', () => {
        const requestHandler = buildRequestHandler();
        sinon.stub(EventListenerPublisher, 'sendDataToListener').rejects(new errors.ConfigLookupError('listener not found'));
        return requestHandler.process()
            .then((handler) => {
                assert.isTrue(handler instanceof ErrorHandler, 'should return a reference to error handler');
                assert.strictEqual(handler.getCode(), 404, 'should return expected code');
                assert.deepStrictEqual(handler.getBody(), {
                    code: 404,
                    message: 'listener not found'
                }, 'should return expected body');
            });
    });

    it('should register endpoints when debug=true', () => {
        const spy = sinon.spy();
        requestRouter.on('register', spy);
        requestRouter.removeAllHandlers();
        requestRouter.registerAllHandlers(true);
        const routePaths = spy.firstCall.args[0].router.routes.map(r => r.path);

        assert.isTrue(routePaths.indexOf('/eventListener/:eventListener') > -1);
        assert.isTrue(routePaths.indexOf('/namespace/:namespace/eventListener/:eventListener') > -1);
    });

    it('should not register endpoints when debug=false', () => {
        const spy = sinon.spy();
        requestRouter.on('register', spy);
        requestRouter.removeAllHandlers();
        requestRouter.registerAllHandlers();
        const routePaths = spy.firstCall.args[0].router.routes.map(r => r.path);

        assert.strictEqual(routePaths.indexOf('/eventListener/:eventListener'), -1);
        assert.strictEqual(routePaths.indexOf('/namespace/:namespace/eventListener/:eventListener'), -1);
    });

    it('should reject when caught unknown error', () => {
        const requestHandler = buildRequestHandler();
        sinon.stub(EventListenerPublisher, 'sendDataToListener').rejects(new Error('unexpectedError'));
        return assert.isRejected(requestHandler.process(), 'unexpectedError');
    });
});
