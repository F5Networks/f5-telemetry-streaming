/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const configWorker = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/deviceUtil');
const systemPoller = require('../../src/lib/systemPoller');
const SystemStats = require('../../src/lib/systemStats');
const util = require('../../src/lib/util');

const systemPollerConfigTestsData = require('./systemPollerTestsData');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('System Poller', () => {
    const validateAndFormat = function (declaration) {
        return configWorker.validate(declaration)
            .then(validated => Promise.resolve(util.formatConfig(validated)))
            .then(validated => deviceUtil.decryptAllSecrets(validated));
    };

    beforeEach(() => {
        sinon.stub(deviceUtil, 'encryptSecret').resolvesArg(0);
        sinon.stub(deviceUtil, 'decryptSecret').resolvesArg(0);
        sinon.stub(deviceUtil, 'getDeviceType').resolves(constants.DEVICE_TYPE.BIG_IP);
        sinon.stub(util, 'networkCheck').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('.safeProcess()', () => {
        let config;
        let returnCtx;
        let sinonClock;

        beforeEach(() => {
            sinonClock = sinon.useFakeTimers();
            config = {
                dataOpts: {
                    actions: []
                },
                interval: 100
            };
            returnCtx = null;

            sinon.stub(SystemStats.prototype, 'collect').callsFake(() => {
                if (typeof returnCtx === 'object') {
                    return Promise.resolve(util.deepCopy(returnCtx));
                }
                return returnCtx();
            });
        });

        afterEach(() => {
            sinonClock.restore();
        });

        it('should fail when .process rejects promise (requestFromUser)', () => {
            returnCtx = () => Promise.reject(new Error('some error'));
            return assert.isRejected(
                systemPoller.safeProcess(config, { requestFromUser: true }),
                /some error/
            );
        });

        it('should not fail when .process rejects promise (background process)', () => {
            returnCtx = () => Promise.reject(new Error('some error'));
            return assert.isFulfilled(systemPoller.safeProcess(config));
        });

        it('should fail when .process throws error (requestFromUser)', () => {
            sinon.stub(systemPoller, 'process').throws(new Error('some error'));
            return assert.isRejected(
                systemPoller.safeProcess(config, { requestFromUser: true }),
                /systemPoller:safeProcess unhandled exception.*some error/
            );
        });

        it('should not fail when .process throws error (background process)', () => {
            sinon.stub(systemPoller, 'process').throws(new Error('some error'));
            return assert.isFulfilled(systemPoller.safeProcess(config));
        });

        it('should resolve with data', () => {
            // thanks to fakeTimers - Date returns the same data
            const dataString = (new Date()).toISOString();
            returnCtx = () => Promise.resolve({ data: 'data' });
            return assert.becomes(
                systemPoller.safeProcess(config, { requestFromUser: true }),
                {
                    data: {
                        data: 'data',
                        telemetryEventCategory: 'systemInfo',
                        telemetryServiceInfo: {
                            cycleStart: dataString,
                            cycleEnd: dataString,
                            pollingInterval: 100
                        }
                    },
                    isCustom: undefined,
                    type: 'systemInfo'
                }
            );
        });
    });

    describe('.processClientRequest()', () => {
        let declaration;
        let returnCtx;

        beforeEach(() => {
            returnCtx = null;

            sinon.stub(configWorker, 'getConfig').callsFake(() => configWorker.validate(declaration)
                .then(validated => Promise.resolve(util.formatConfig(validated)))
                .then(validated => Promise.resolve({ parsed: validated })));

            sinon.stub(systemPoller, 'process').callsFake((config) => {
                if (returnCtx) {
                    return returnCtx();
                }
                return Promise.resolve({ data: { poller: config.name } });
            });
        });
        /* eslint-disable implicit-arrow-linebreak */
        systemPollerConfigTestsData.processClientRequest.forEach(testConf =>
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                declaration = testConf.declaration;
                const restOpMock = new testUtil.MockRestOperation(testConf.requestOpts);

                if (typeof testConf.returnCtx !== 'undefined') {
                    returnCtx = testConf.returnCtx;
                }
                return new Promise((resolve) => {
                    restOpMock.complete = function () {
                        resolve();
                    };
                    systemPoller.processClientRequest(restOpMock);
                })
                    .then(() => {
                        assert.deepStrictEqual(
                            { body: restOpMock.body, code: restOpMock.statusCode },
                            testConf.expectedResponse
                        );
                    });
            }));
    });

    describe('.getTraceValue()', () => {
        it('should preserve trace config', () => {
            const matrix = systemPollerConfigTestsData.getTraceValue;
            const systemTraceValues = matrix[0];

            for (let i = 1; i < matrix.length; i += 1) {
                const pollerTrace = matrix[i][0];

                for (let j = 1; j < systemTraceValues.length; j += 1) {
                    const systemTrace = systemTraceValues[j];
                    const expectedTrace = matrix[i][j];
                    assert.strictEqual(
                        systemPoller.getTraceValue(systemTrace, pollerTrace),
                        expectedTrace,
                        `Expected to be ${expectedTrace} when systemTrace=${systemTrace} and pollerTrace=${pollerTrace}`
                    );
                }
            }
        });
    });

    describe('config "on change" event', () => {
        const defaultDeclaration = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                trace: true,
                systemPoller: {
                    interval: 180
                }
            }
        };
        let activeTracersStub;
        let allTracersStub;
        let pollerTimers;
        let utilStub;

        beforeEach(() => {
            activeTracersStub = [];
            allTracersStub = [];
            pollerTimers = {};
            utilStub = { start: [], stop: [], update: [] };

            sinon.stub(util, 'start').callsFake((func, args, interval) => {
                utilStub.start.push({ args, interval });
                return interval;
            });
            sinon.stub(util, 'update').callsFake((id, func, args, interval) => {
                utilStub.update.push({ args, interval });
                return interval;
            });
            sinon.stub(util, 'stop').callsFake((arg) => {
                utilStub.stop.push({ arg });
            });
            sinon.stub(util.tracer, 'createFromConfig').callsFake((className, objName, config) => {
                allTracersStub.push(objName);
                if (config.trace) {
                    activeTracersStub.push(objName);
                }
                return null;
            });
            sinon.stub(systemPoller, 'getPollerTimers').returns(pollerTimers);

            return validateAndFormat(defaultDeclaration)
                .then((config) => {
                    // expecting the code responsible for 'change' event to be synchronous
                    configWorker.emit('change', config);
                    assert.strictEqual(pollerTimers['My_System::SystemPoller_1'], 180);
                    assert.strictEqual(allTracersStub.length, 1);
                    assert.strictEqual(activeTracersStub.length, 1);
                    assert.strictEqual(utilStub.start.length, 1);
                    assert.strictEqual(utilStub.update.length, 0);
                    assert.strictEqual(utilStub.stop.length, 0);

                    utilStub = { start: [], stop: [], update: [] };
                    allTracersStub = [];
                    activeTracersStub = [];
                });
        });

        it('should stop existing poller(s)', () => {
            // expecting the code responsible for 'change' event to be synchronous
            configWorker.emit('change', {});
            assert.deepStrictEqual(pollerTimers, {});
            assert.strictEqual(allTracersStub.length, 0);
            assert.strictEqual(activeTracersStub.length, 0);
            assert.strictEqual(utilStub.start.length, 0);
            assert.strictEqual(utilStub.update.length, 0);
            assert.strictEqual(utilStub.stop.length, 1);
        });

        it('should update existing poller(s)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System.systemPoller.interval = 500;
            newDeclaration.My_System.systemPoller.trace = true;
            return validateAndFormat(newDeclaration)
                .then((config) => {
                    // expecting the code responsible for 'change' event to be synchronous
                    configWorker.emit('change', config);
                    assert.strictEqual(allTracersStub.length, 1);
                    assert.strictEqual(activeTracersStub.length, 1);
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                    assert.deepStrictEqual(pollerTimers, { 'My_System::SystemPoller_1': 500 });
                    assert.deepStrictEqual(utilStub.update[0].args, {
                        name: 'My_System::SystemPoller_1',
                        enable: true,
                        interval: 500,
                        trace: true,
                        tracer: null,
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http'
                        },
                        dataOpts: {
                            noTMStats: true,
                            tags: undefined,
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ]
                        },
                        endpointList: undefined
                    });
                });
        });

        it('should ignore disabled pollers (existing poller)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System.enable = false;
            return validateAndFormat(newDeclaration)
                .then((config) => {
                    // expecting the code responsible for 'change' event to be synchronous
                    configWorker.emit('change', config);
                    assert.deepStrictEqual(pollerTimers, {});
                    assert.strictEqual(allTracersStub.length, 0);
                    assert.strictEqual(activeTracersStub.length, 0);
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 0);
                    assert.strictEqual(utilStub.stop.length, 1);
                });
        });

        it('should ignore disabled pollers (non-existing poller)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
            newDeclaration.My_System_New.enable = false;
            return validateAndFormat(newDeclaration)
                .then((config) => {
                    // expecting the code responsible for 'change' event to be synchronous
                    configWorker.emit('change', config);
                    assert.deepStrictEqual(pollerTimers, { 'My_System::SystemPoller_1': 180 });
                    assert.strictEqual(allTracersStub.length, 1);
                    assert.strictEqual(activeTracersStub.length, 1);
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                });
        });

        it('should ignore System without poller (existing poller)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            delete newDeclaration.My_System.systemPoller;
            return validateAndFormat(newDeclaration)
                .then((config) => {
                    // expecting the code responsible for 'change' event to be synchronous
                    configWorker.emit('change', config);
                    assert.deepStrictEqual(pollerTimers, {});
                    assert.strictEqual(allTracersStub.length, 0);
                    assert.strictEqual(activeTracersStub.length, 0);
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 0);
                    assert.strictEqual(utilStub.stop.length, 1);
                });
        });

        it('should ignore System without poller (non-existing poller)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
            delete newDeclaration.My_System_New.systemPoller;
            return validateAndFormat(newDeclaration)
                .then((config) => {
                    // expecting the code responsible for 'change' event to be synchronous
                    configWorker.emit('change', config);
                    assert.deepStrictEqual(pollerTimers, { 'My_System::SystemPoller_1': 180 });
                    assert.strictEqual(allTracersStub.length, 1);
                    assert.strictEqual(activeTracersStub.length, 1);
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                });
        });

        it('should start new poller (non-existing poller, inline declaration)', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
            newDeclaration.My_System_New.trace = false;
            newDeclaration.My_System_New.systemPoller.interval = 500;
            return validateAndFormat(newDeclaration)
                .then((config) => {
                    // expecting the code responsible for 'change' event to be synchronous
                    configWorker.emit('change', config);
                    assert.deepStrictEqual(pollerTimers, {
                        'My_System::SystemPoller_1': 180,
                        'My_System_New::SystemPoller_1': 500
                    });
                    assert.strictEqual(allTracersStub.length, 2);
                    assert.strictEqual(activeTracersStub.length, 1);
                    assert.strictEqual(utilStub.start.length, 1);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                });
        });

        it('should handle multiple pollers per system', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            newDeclaration.My_System_New = testUtil.deepCopy(newDeclaration.My_System);
            newDeclaration.My_System_New.systemPoller = [
                {
                    interval: 10,
                    endpointList: {
                        basePath: 'mgmt/',
                        items: {
                            endpoint1: {
                                path: 'ltm/pool'
                            }
                        }
                    }
                },
                'My_Poller'
            ];
            newDeclaration.My_Poller = {
                class: 'Telemetry_System_Poller',
                trace: true,
                interval: 500
            };
            return validateAndFormat(newDeclaration)
                .then((config) => {
                    // expecting the code responsible for 'change' event to be synchronous
                    configWorker.emit('change', config);
                    assert.deepStrictEqual(pollerTimers, {
                        'My_System::SystemPoller_1': 180,
                        'My_System_New::SystemPoller_1': 10,
                        'My_System_New::My_Poller': 500
                    });
                    assert.strictEqual(allTracersStub.length, 3);
                    assert.strictEqual(activeTracersStub.length, 3);
                    assert.strictEqual(utilStub.start.length, 2);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                    assert.deepStrictEqual(utilStub.start[0].args, {
                        name: 'My_System_New::SystemPoller_1',
                        enable: true,
                        interval: 10,
                        trace: true,
                        tracer: null,
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http'
                        },
                        dataOpts: {
                            noTMStats: true,
                            tags: undefined,
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ]
                        },
                        endpointList: {
                            endpoint1: {
                                enable: true,
                                name: 'endpoint1',
                                path: '/mgmt/ltm/pool'
                            }
                        }
                    });
                    assert.deepStrictEqual(utilStub.start[1].args, {
                        name: 'My_System_New::My_Poller',
                        enable: true,
                        interval: 500,
                        trace: true,
                        tracer: null,
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        },
                        connection: {
                            allowSelfSignedCert: false,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http'
                        },
                        dataOpts: {
                            noTMStats: true,
                            tags: undefined,
                            actions: [
                                {
                                    enable: true,
                                    setTag: {
                                        application: '`A`',
                                        tenant: '`T`'
                                    }
                                }
                            ]
                        },
                        endpointList: undefined
                    });
                });
        });
    });
});
