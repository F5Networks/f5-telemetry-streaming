/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const BaseRequestHandler = sourceCode('src/lib/requestHandlers/baseHandler');
const configWorker = sourceCode('src/lib/config');
const httpErrors = sourceCode('src/lib/requestHandlers/httpErrors');
const requestRouter = sourceCode('src/lib/requestHandlers/router');

moduleCache.remember();

class CustomRequestHandler extends BaseRequestHandler {
    constructor(restOperation, params) {
        super(restOperation, params);
        this.code = 999;
        this.body = 'body';
    }

    getCode() {
        return this.code;
    }

    setCode(code) {
        this.code = code;
    }

    getBody() {
        return this.body;
    }

    setBody(body) {
        this.body = body;
    }

    process() {
        return Promise.resolve(this);
    }
}

describe('Requests Router', () => {
    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        stubs.default.coreStub({
            configWorker: true,
            persistentStorage: true,
            teemReporter: true
        });
        requestRouter.removeAllHandlers();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should process rest operation', () => {
        requestRouter.register('GET', '/test', CustomRequestHandler);
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 999, 'should set code to 999');
                assert.deepStrictEqual(restOp.body, 'body', 'should set body');
            });
    });

    it('should process rest operation with custom contentType', () => {
        class CustomContentTypeHandler extends CustomRequestHandler {
            getContentType() {
                return 'Custom Content Type';
            }
        }
        requestRouter.register('GET', '/test', CustomContentTypeHandler);
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 999, 'should set code to 999');
                assert.strictEqual(restOp.contentType, 'Custom Content Type', 'should set contentType');
                assert.deepStrictEqual(restOp.body, 'body', 'should set body');
            });
    });

    it('should pass matched params to handler', () => {
        requestRouter.register('GET', '/test/:param1/:param2', CustomRequestHandler);
        sinon.stub(CustomRequestHandler.prototype, 'getBody').callsFake(function () {
            return this.params;
        });
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test/system/poller');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 999, 'should set code to 999');
                assert.deepStrictEqual(restOp.body, {
                    param1: 'system',
                    param2: 'poller'
                }, 'should set body');
            });
    });

    it('should pass matched params to handler (optional param not set)', () => {
        requestRouter.register('GET', '/test/:param1/:param2?', CustomRequestHandler);
        sinon.stub(CustomRequestHandler.prototype, 'getBody').callsFake(function () {
            return this.params;
        });
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test/system');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 999, 'should set code to 999');
                assert.deepStrictEqual(restOp.body, {
                    param1: 'system'
                }, 'should set body');
            });
    });

    it('should pass matched params to handler (optional param set)', () => {
        requestRouter.register('GET', '/test/:param1/:param2?', CustomRequestHandler);
        sinon.stub(CustomRequestHandler.prototype, 'getBody').callsFake(function () {
            return this.params;
        });
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test/system/poller');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 999, 'should set code to 999');
                assert.deepStrictEqual(restOp.body, {
                    param1: 'system',
                    param2: 'poller'
                }, 'should set body');
            });
    });

    it('should return bad url error when URI does not match', () => {
        requestRouter.register('GET', '/test/:param1/:param2', CustomRequestHandler);
        sinon.stub(CustomRequestHandler.prototype, 'getBody').callsFake(function () {
            return this.params;
        });
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test/system');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 400, 'should set code to 400');
                assert.deepStrictEqual(restOp.body, 'Bad URL: /test/system', 'should set body');
            });
    });

    it('should process rest operation (with URI prefix)', () => {
        requestRouter.register('GET', '/test', CustomRequestHandler);
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/prefix/test');

        return requestRouter.processRestOperation(restOp, 'prefix')
            .then(() => {
                assert.strictEqual(restOp.statusCode, 999, 'should set code to 999');
                assert.deepStrictEqual(restOp.body, 'body', 'should set body');
            });
    });

    it('should process rest operation (with URI prefix, leading /)', () => {
        requestRouter.register('GET', '/test', CustomRequestHandler);
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/prefix/test');

        return requestRouter.processRestOperation(restOp, '/prefix')
            .then(() => {
                assert.strictEqual(restOp.statusCode, 999, 'should set code to 999');
                assert.deepStrictEqual(restOp.body, 'body', 'should set body');
            });
    });

    it('should process rest operation when URI prefix does not match', () => {
        requestRouter.register('GET', '/test', CustomRequestHandler);
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test');

        return requestRouter.processRestOperation(restOp, '/anotherPrefix')
            .then(() => {
                assert.strictEqual(restOp.statusCode, 999, 'should set code to 999');
                assert.deepStrictEqual(restOp.body, 'body', 'should set body');
            });
    });

    it('should register handler for multiple HTTP methods', () => {
        requestRouter.register(['GET', 'POST'], '/test', CustomRequestHandler);
        const getRestOp = new testUtil.MockRestOperation({ method: 'GET' });
        getRestOp.uri = testUtil.parseURL('http://localhost/test');
        const postRestOp = new testUtil.MockRestOperation({ method: 'POST' });
        postRestOp.uri = testUtil.parseURL('http://localhost/test');

        const promises = [
            requestRouter.processRestOperation(getRestOp)
                .then(() => {
                    assert.strictEqual(getRestOp.statusCode, 999, 'should set code to 999');
                    assert.deepStrictEqual(getRestOp.body, 'body', 'should set body');
                }),
            requestRouter.processRestOperation(postRestOp)
                .then(() => {
                    assert.strictEqual(postRestOp.statusCode, 999, 'should set code to 999');
                    assert.deepStrictEqual(postRestOp.body, 'body', 'should set body');
                })
        ];
        return Promise.all(promises);
    });

    it('should return unsupported media type error', () => {
        requestRouter.register('GET', '/test', CustomRequestHandler);
        const restOp = new testUtil.MockRestOperation({ method: 'GET', body: 'requestBody' });
        restOp.uri = testUtil.parseURL('http://localhost/test');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 415, 'should set code to 415');
                assert.deepStrictEqual(restOp.body, {
                    code: 415,
                    message: 'Unsupported Media Type',
                    accept: ['application/json']
                }, 'should set expected body');
            });
    });

    it('should return bad url error', () => {
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 400, 'should set code to 400');
                assert.deepStrictEqual(restOp.body, 'Bad URL: /test', 'should set expected body');
            });
    });

    it('should return method not allowed error', () => {
        requestRouter.register(['GET', 'POST'], '/test', CustomRequestHandler);
        const restOp = new testUtil.MockRestOperation({ method: 'DELETE' });
        restOp.uri = testUtil.parseURL('http://localhost/test');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 405, 'should set code to 405');
                assert.deepStrictEqual(restOp.body, {
                    code: 405,
                    message: 'Method Not Allowed',
                    allow: ['GET', 'POST']
                }, 'should set expected body');
            });
    });

    it('should return server internal error when error thrown in sync part of the code', () => {
        requestRouter.register(['GET', 'POST'], '/test', CustomRequestHandler);
        sinon.stub(CustomRequestHandler.prototype, 'process').throws(new Error('expectedError'));
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 500, 'should set code to 500');
                assert.deepStrictEqual(restOp.body, {
                    code: 500,
                    message: 'Internal Server Error'
                }, 'should set expected body');
            });
    });

    it('should return server internal error when error thrown in async part of the code', () => {
        requestRouter.register(['GET', 'POST'], '/test', CustomRequestHandler);
        sinon.stub(CustomRequestHandler.prototype, 'process').rejects(new Error('expectedError'));
        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 500, 'should set code to 500');
                assert.deepStrictEqual(restOp.body, {
                    code: 500,
                    message: 'Internal Server Error'
                }, 'should set expected body');
            });
    });

    it('should return hardcoded \'internal server error\' when error handler fails', () => {
        requestRouter.register(['GET', 'POST'], '/test', CustomRequestHandler);
        sinon.stub(CustomRequestHandler.prototype, 'process').rejects(new Error('expectedError'));
        sinon.stub(httpErrors.InternalServerError.prototype, 'getBody').throws(new Error('ISE_Error'));

        const restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/test');

        return requestRouter.processRestOperation(restOp)
            .then(() => {
                assert.strictEqual(restOp.statusCode, 500, 'should set code to 500');
                assert.deepStrictEqual(restOp.body, 'Internal Server Error', 'should set expected body');
            });
    });

    it('should unregister all handlers', () => {
        requestRouter.register('GET', '/test', CustomRequestHandler);
        let restOp = new testUtil.MockRestOperation({ method: 'GET' });
        restOp.uri = testUtil.parseURL('http://localhost/prefix/test');

        return requestRouter.processRestOperation(restOp, 'prefix')
            .then(() => {
                assert.strictEqual(restOp.statusCode, 999, 'should set code to 999');
                assert.deepStrictEqual(restOp.body, 'body', 'should set body');
                requestRouter.removeAllHandlers();

                restOp = new testUtil.MockRestOperation({ method: 'GET' });
                restOp.uri = testUtil.parseURL('http://localhost/prefix/test');
                return requestRouter.processRestOperation(restOp, 'prefix');
            })
            .then(() => {
                assert.strictEqual(restOp.statusCode, 400, 'should set code to 400');
                assert.deepStrictEqual(restOp.body, 'Bad URL: /prefix/test', 'should set expected body');
            });
    });

    it('should emit register event', () => {
        const spy = sinon.spy();
        requestRouter.on('register', spy);
        requestRouter.registerAllHandlers();
        requestRouter.registerAllHandlers();
        assert.strictEqual(spy.callCount, 2, 'should call registered listener');
    });

    it('should register handlers on config change event', () => {
        const spy = sinon.spy();
        requestRouter.on('register', spy);
        return configWorker.processDeclaration({
            class: 'Telemetry',
            controls: {
                class: 'Controls',
                debug: true
            }
        })
            .then(() => {
                assert.ok(spy.args[0][0] === requestRouter, 'should pass router instance');
                assert.strictEqual(spy.args[0][1], true, 'should pass debug state');
                return configWorker.processDeclaration({
                    class: 'Telemetry',
                    controls: {
                        class: 'Controls'
                    }
                });
            })
            .then(() => {
                assert.ok(spy.args[1][0] === requestRouter, 'should pass router instance');
                assert.strictEqual(spy.args[1][1], false, 'should pass debug state');
            });
    });
});
