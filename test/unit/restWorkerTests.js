/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const configWorker = require('../../src/lib/config');
const deviceUtil = require('../../src/lib/utils/device');
const logger = require('../../src/lib/logger');
const persistentStorage = require('../../src/lib/persistentStorage');
const RestWorker = require('../../src/nodejs/restWorker');
const requestRouter = require('../../src/lib/requestHandlers/router');
const stubs = require('./shared/stubs');
const teemReporter = require('../../src/lib/teemReporter');
const testUtil = require('./shared/util');
const tracer = require('../../src/lib/utils/tracer');
const utilMisc = require('../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('restWorker', () => {
    let coreStub;
    let restWorker;
    let gatherHostDeviceInfoStub;

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

        RestWorker.prototype.loadState = function (first, cb) {
            cb(null, testUtil.deepCopy(baseState));
        };
        RestWorker.prototype.saveState = function (first, state, cb) {
            cb(null);
        };

        // remove all existing listeners as consumers, systemPoller and
        // prev instances of RestWorker
        configWorker.removeAllListeners();
    });

    beforeEach(() => {
        coreStub = stubs.coreStub({
            configWorker,
            deviceUtil,
            logger,
            persistentStorage,
            teemReporter,
            tracer,
            utilMisc
        });
        coreStub.utilMisc.generateUuid.numbersOnly = false;

        restWorker = new RestWorker();
        gatherHostDeviceInfoStub = sinon.stub(deviceUtil, 'gatherHostDeviceInfo');
        gatherHostDeviceInfoStub.resolves();
    });

    afterEach(() => (restWorker.activityRecorder
        ? restWorker.activityRecorder.stop()
        : Promise.resolve())
        .then(() => sinon.restore()));

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
            const loadConfigStub = sinon.stub(configWorker, 'load');
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
            restWorker.onStartCompleted(resolve, (msg) => reject(new Error(msg || 'no message provided')));
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
                restWorker.onStartCompleted(resolve, (msg) => reject(new Error(msg || 'no message provided')));
            });
        });

        it('should start activity recorder', () => {
            coreStub.persistentStorage.loadData = { config: { raw: { class: 'Telemetry_Test' } } };
            return new Promise((resolve, reject) => {
                restWorker.onStartCompleted(resolve, reject);
            })
                .then(() => testUtil.sleep(100))
                .then(() => coreStub.tracer.waitForData())
                .then(() => {
                    const data = coreStub.tracer.data[declarationTracerFile];
                    assert.lengthOf(data, 4, 'should write 4 events');
                    assert.sameDeepMembers(
                        data.map((d) => d.data.event),
                        ['received', 'received', 'validationSucceed', 'validationFailed']
                    );
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
                restWorker.onStartCompleted(resolve, (msg) => reject(new Error(msg || 'no message provided')));
            })
                .then(() => {
                    assert.notOk(requestsProcessStub.called, 'should not be called yet');
                    restWorker[httpMethodsMapping[httpMethod]]({});
                    assert.ok(requestsProcessStub.called, 'should pass request to router');
                }));
        });
    });
});
