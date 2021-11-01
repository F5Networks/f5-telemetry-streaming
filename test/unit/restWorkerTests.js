/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const config = require('../../src/lib/config');
const deviceUtil = require('../../src/lib/utils/device');
const RestWorker = require('../../src/nodejs/restWorker');
const requestRouter = require('../../src/lib/requestHandlers/router');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('restWorker', () => {
    let restWorker;
    let loadConfigStub;
    let gatherHostDeviceInfoStub;

    const baseState = {
        _data_: {
            config: {
                raw: {},
                normalized: {}
            }
        }
    };

    before(() => {
        moduleCache.restore();

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
        loadConfigStub = sinon.stub(config, 'load');
        loadConfigStub.resolves();
        gatherHostDeviceInfoStub = sinon.stub(deviceUtil, 'gatherHostDeviceInfo');
        gatherHostDeviceInfoStub.resolves();
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

        it('should gather host device info', () => new Promise((resolve, reject) => {
            restWorker.onStartCompleted(resolve, msg => reject(new Error(msg || 'no message provided')));
        })
            .then(() => new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        // should be 1 because gatherHostDeviceInfo resolves on first attempt
                        assert.strictEqual(gatherHostDeviceInfoStub.callCount, 1);
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                }, 200);
            })));

        it('should not fail when unable to gather host device info', () => {
            gatherHostDeviceInfoStub.rejects(new Error('expected error'));
            return new Promise((resolve, reject) => {
                restWorker.onStartCompleted(resolve, msg => reject(new Error(msg || 'no message provided')));
            });
        });
    });

    describe('requests processing', () => {
        let requestsProcessStub;
        beforeEach(() => {
            requestsProcessStub = sinon.stub(requestRouter, 'processRestOperation');
            requestsProcessStub.callsFake();
        });

        const httpMethodsMapping = {
            DELETE: 'onDelete',
            GET: 'onGet',
            POST: 'onPost'
        };
        Object.keys(httpMethodsMapping).forEach((httpMethod) => {
            it(`should pass ${httpMethod} request to requests router`, () => new Promise((resolve, reject) => {
                restWorker.onStartCompleted(resolve, msg => reject(new Error(msg || 'no message provided')));
            })
                .then(() => {
                    assert.notOk(requestsProcessStub.called, 'should not be called yet');
                    restWorker[httpMethodsMapping[httpMethod]]({});
                    assert.ok(requestsProcessStub.called, 'should pass request to router');
                }));
        });
    });
});
