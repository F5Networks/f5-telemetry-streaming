/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();
require('./shared/disableAjv');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const urllib = require('url');

const baseSchema = require('../../src/schema/latest/base_schema.json');
const constants = require('../../src/lib/constants');
const config = require('../../src/lib/config');
const iHealthPoller = require('../../src/lib/ihealth');
const RestWorker = require('../../src/nodejs/restWorker');
const systemPoller = require('../../src/lib/systemPoller');
const util = require('../../src/lib/util');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('restWorker', () => {
    let restWorker;
    let loadConfigStub;

    let parseURL;
    if (process.versions.node.startsWith('4.')) {
        parseURL = urllib.parse;
    } else {
        parseURL = url => new urllib.URL(url);
    }

    const baseState = {
        _data_: {
            config: {
                raw: {},
                parsed: {}
            }
        }
    };

    before(() => {
        RestWorker.prototype.loadState = function (first, cb) {
            cb(null, testUtil.deepCopy(baseState));
        };
        RestWorker.prototype.saveState = function (first, state, cb) {
            cb(null);
        };
    });

    beforeEach(() => {
        restWorker = new RestWorker();
        // remove all existing listeners as consumers, systemPoller and
        // prev instances of RestWorker
        config.removeAllListeners();
        loadConfigStub = sinon.stub(config, 'loadConfig');
        loadConfigStub.resolves();
    });

    afterEach(() => {
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

        it('should call failure callback if unable to start application when promise chain failed', () => {
            loadConfigStub.rejects(new Error('loadConfig error'));
            return new Promise((resolve, reject) => {
                restWorker.onStartCompleted(
                    () => reject(new Error('should not call success callback')),
                    () => resolve()
                );
            })
                .then(() => {
                    assert.notStrictEqual(loadConfigStub.callCount, 0);
                });
        });
    });

    describe('.configChangeHandler()', () => {
        beforeEach(() => {
            sinon.stub(systemPoller, 'processClientRequest').callsFake((restOperation) => {
                restOperation.setBody('replyBody');
            });
            return new Promise((resolve, reject) => {
                restWorker.onStartCompleted(resolve, msg => reject(new Error(msg || 'no message provided')));
            });
        });

        it('should not allow to access debug endpoints by default', () => {
            config.emit('change', {});
            const requestMock = new testUtil.MockRestOperation({ method: 'GET' });
            requestMock.uri = parseURL('http://localhost/shared/telemetry/systempoller');

            restWorker.onGet(requestMock);
            assert.ok(/Bad URL/.test(requestMock.getBody()), 'should be Bad URL message');
        });

        it('should enable debug endpoints', () => {
            config.emit('change', { Controls: { controls: { debug: true } } });
            const requestMock = new testUtil.MockRestOperation({ method: 'GET' });
            requestMock.uri = parseURL('http://localhost/shared/telemetry/systempoller');

            restWorker.onGet(requestMock);
            assert.strictEqual(requestMock.getBody(), 'replyBody');
        });

        it('should disable debug endpoints', () => {
            config.emit('change', { Controls: { controls: { debug: true } } });
            config.emit('change', { });
            const requestMock = new testUtil.MockRestOperation({ method: 'GET' });
            requestMock.uri = parseURL('http://localhost/shared/telemetry/systempoller');

            restWorker.onGet(requestMock);
            assert.ok(/Bad URL/.test(requestMock.getBody()), 'should be Bad URL message');
        });
    });

    describe('requests processing', () => {
        beforeEach(() => {
            sinon.stub(systemPoller, 'processClientRequest').callsFake((restOperation) => {
                util.restOperationResponder(restOperation, 200, 'systemPollerReplyBody');
            });
            sinon.stub(iHealthPoller, 'processClientRequest').callsFake((restOperation) => {
                util.restOperationResponder(restOperation, 200, 'iHealthPollerReplyBody');
            });
            sinon.stub(config, 'processClientRequest').callsFake((restOperation) => {
                util.restOperationResponder(restOperation, 200, 'configReplyBody');
            });
            return new Promise((resolve, reject) => {
                restWorker.onStartCompleted(resolve, msg => reject(new Error(msg || 'no message provided')));
            });
        });

        it('should return HTTP 405 when method not allowed', (done) => {
            const requestMock = new testUtil.MockRestOperation({ method: 'POST' });
            requestMock.uri = parseURL('http://localhost/shared/telemetry/info');
            requestMock.complete = () => {
                const responseBody = requestMock.getBody();
                assert.strictEqual(requestMock.statusCode, 405);
                assert.strictEqual(responseBody.code, 405);
                assert.strictEqual(responseBody.message, 'Method Not Allowed');
                assert.deepStrictEqual(responseBody.allow, ['GET']);
                done();
            };
            restWorker.onGet(requestMock);
        });

        it('should return HTTP 415 when request has invalid content-type ', (done) => {
            const requestMock = new testUtil.MockRestOperation({ method: 'POST' });
            requestMock.uri = parseURL('http://localhost/shared/telemetry/info');
            requestMock.body = 'body';
            requestMock.getContentType = () => '';
            requestMock.complete = () => {
                const responseBody = requestMock.getBody();
                assert.strictEqual(requestMock.statusCode, 415);
                assert.strictEqual(responseBody.code, 415);
                assert.strictEqual(responseBody.message, 'Unsupported Media Type');
                assert.deepStrictEqual(responseBody.accept, ['application/json']);
                done();
            };
            restWorker.onGet(requestMock);
        });

        it('should return HTTP 500 when failed to process request', (done) => {
            const requestMock = new testUtil.MockRestOperation({ method: 'POST' });
            requestMock.uri = parseURL('http://localhost/shared/telemetry/info');
            requestMock.complete = () => {
                if (requestMock.statusCode !== 500) {
                    throw new Error('expected error');
                }
                const responseBody = requestMock.getBody();
                assert.strictEqual(requestMock.statusCode, 500);
                assert.strictEqual(responseBody.code, 500);
                assert.strictEqual(responseBody.message, 'Internal Server Error');
                done();
            };
            restWorker.onGet(requestMock);
        });

        const schemaVersionEnum = testUtil.deepCopy(baseSchema.properties.schemaVersion.enum);
        const testDataArray = [
            {
                endpoint: '/info',
                allowedMethods: ['GET'],
                expectedResponse: {
                    nodeVersion: process.version,
                    version: constants.VERSION,
                    release: constants.RELEASE,
                    schemaCurrent: schemaVersionEnum[0],
                    schemaMinimum: schemaVersionEnum[schemaVersionEnum.length - 1]
                }
            },
            {
                endpoint: '/declare',
                allowedMethods: ['GET', 'POST'],
                expectedResponse: 'configReplyBody'
            },
            {
                endpoint: '/systempoller',
                allowedMethods: ['GET'],
                expectedResponse: 'systemPollerReplyBody'
            },
            {
                endpoint: '/ihealthpoller',
                allowedMethods: ['GET'],
                expectedResponse: 'iHealthPollerReplyBody'
            }
        ];

        testDataArray.forEach((testData) => {
            describe(`endpoint ${testData.endpoint}`, () => {
                testData.allowedMethods.forEach((allowedMethod) => {
                    it(`should process ${allowedMethod} request`, (done) => {
                        const requestMock = new testUtil.MockRestOperation({ method: allowedMethod });
                        requestMock.uri = parseURL(`http://localhost/shared/telemetry${testData.endpoint}`);
                        requestMock.complete = () => {
                            assert.deepStrictEqual(requestMock.getBody(), testData.expectedResponse);
                            done();
                        };

                        config.emit('change', { Controls: { controls: { debug: true } } });
                        restWorker.onGet(requestMock);
                    });
                });
            });
        });
    });
});
