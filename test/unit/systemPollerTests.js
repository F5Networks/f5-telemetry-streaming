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

    describe('buildPollerConfigs', () => {
        /* eslint-disable implicit-arrow-linebreak */
        systemPollerConfigTestsData.buildPollerConfigs.forEach(testConf =>
            testUtil.getCallableIt(testConf)(testConf.name, () =>
                validateAndFormat(testConf.declaration)
                    .then(configData =>
                        assert.deepEqual(systemPoller.buildPollerConfigs(configData), testConf.expected))));
    });

    describe('getExpandedConfWithNameRefs', () => {
        /* eslint-disable implicit-arrow-linebreak */
        systemPollerConfigTestsData.getExpandedConfWithNameRefs.forEach(testConf =>
            testUtil.getCallableIt(testConf)(testConf.name, () =>
                validateAndFormat(testConf.declaration)
                    .then((configData) => {
                        if (testConf.errorMessage) {
                            assert.throws(
                                () => systemPoller.getExpandedConfWithNameRefs(
                                    configData,
                                    testConf.sysOrPollerName,
                                    testConf.systemPollerName
                                ),
                                new RegExp(testConf.errorMessage)
                            );
                        } else {
                            assert.deepEqual(
                                systemPoller.getExpandedConfWithNameRefs(
                                    configData,
                                    testConf.sysOrPollerName,
                                    testConf.systemPollerName
                                ),
                                testConf.expected
                            );
                        }
                    })));
    });

    describe('processClientRequest', () => {
        let declaration;
        let returnCtx;

        beforeEach(() => {
            returnCtx = { data: { foo: 'bar' } };
            sinon.stub(configWorker, 'getConfig').callsFake(() => configWorker.validate(declaration)
                .then(validated => Promise.resolve(util.formatConfig(validated)))
                .then(validated => Promise.resolve({ parsed: validated })));

            sinon.stub(systemPoller, 'process').callsFake(() => {
                if (typeof returnCtx === 'object') {
                    return Promise.resolve(util.deepCopy(returnCtx));
                }
                return returnCtx();
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

    describe('process', () => {
        let returnCtx;
        const config = {
            enable: true,
            trace: false
        };

        beforeEach(() => {
            returnCtx = null;
            sinon.stub(SystemStats.prototype, 'collect').callsFake(() => {
                if (typeof returnCtx === 'object') {
                    return Promise.resolve(util.deepCopy(returnCtx));
                }
                return returnCtx();
            });
        });

        it('should fail when SystemStats.collected failed', () => {
            returnCtx = () => Promise.reject(new Error('some error'));
            return assert.isRejected(systemPoller.process(config, { requestFromUser: true }), /some error/);
        });
    });

    describe('config "on change" event', () => {
        // let config;
        let utilStub;

        const configToLoad = {
            Controls: {
                controls: {
                    class: 'Controls',
                    debug: true,
                    logLevel: 'debug'
                }
            },
            Telemetry_System: {
                My_System: {
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: {
                        enable: true,
                        interval: 180,
                        trace: false,
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ]
                    }
                }
            }
        };

        beforeEach(() => {
            utilStub = { start: [], stop: [], update: [] };
            sinon.stub(util, 'start').callsFake((func, args, interval) => {
                utilStub.start.push({
                    func, args, interval
                });
            });
            sinon.stub(util, 'update').callsFake((id, func, args, interval) => {
                utilStub.update.push({
                    id, func, args, interval
                });
            });
            sinon.stub(util, 'stop').callsFake((arg) => {
                utilStub.stop.push({ arg });
            });
        });

        afterEach(() => {
            util.start.restore();
            util.update.restore();
            util.stop.restore();
        });


        it('should start new poller', () => {
            configWorker.emit('change', configToLoad);
            return new Promise(resolve => setTimeout(() => { resolve(); }, 1500))
                .then(() => {
                    assert.strictEqual(utilStub.start.length, 1);
                    assert.strictEqual(utilStub.update.length, 0);
                    assert.strictEqual(utilStub.stop.length, 0);

                    const actualStart = utilStub.start[0];
                    const expectedArgs = {
                        enable: true,
                        trace: false,
                        interval: 180,
                        connection: {
                            allowSelfSignedCert: undefined, host: 'localhost', port: 8100, protocol: 'http'
                        },
                        credentials: {
                            passphrase: undefined, username: undefined
                        },
                        dataOpts: {
                            actions: [{ enable: true, setTag: { application: '`A`', tenant: '`T`' } }],
                            noTMStats: true,
                            tags: undefined
                        },
                        name: 'My_System',
                        tracer: null,
                        endpointList: undefined
                    };
                    assert.deepEqual(actualStart.args, expectedArgs);
                    assert.strictEqual(actualStart.interval, 180);
                });
        });

        it('should stop deleted poller', () => {
            sinon.stub(systemPoller, 'getPollerIDs').returns({ My_System_0: { timeout: 10101 } });
            configWorker.emit('change', {});
            return new Promise(resolve => setTimeout(() => { resolve(); }, 500))
                .then(() => {
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 0);
                    assert.strictEqual(utilStub.stop.length, 1);
                    assert.deepEqual(utilStub.stop[0].arg, { timeout: 10101 });
                });
        });

        it('should update already existing system poller', () => {
            sinon.stub(systemPoller, 'getPollerIDs').returns({ My_System: { timeout: 1111 } });
            configWorker.emit('change', configToLoad);
            const expectedArgs = {
                enable: true,
                trace: false,
                interval: 180,
                connection: {
                    allowSelfSignedCert: undefined, host: 'localhost', port: 8100, protocol: 'http'
                },
                credentials: {
                    passphrase: undefined, username: undefined
                },
                dataOpts: {
                    actions: [{ enable: true, setTag: { application: '`A`', tenant: '`T`' } }],
                    noTMStats: true,
                    tags: undefined
                },
                name: 'My_System',
                tracer: null,
                endpointList: undefined
            };
            return new Promise(resolve => setTimeout(() => { resolve(); }, 500))
                .then(() => {
                    assert.strictEqual(utilStub.start.length, 0);
                    assert.strictEqual(utilStub.update.length, 1);
                    assert.strictEqual(utilStub.stop.length, 0);
                    assert.deepEqual(utilStub.update[0].args, expectedArgs);
                    assert.strictEqual(utilStub.update[0].interval, 180);
                });
        });

        it('should handle multiple pollers per system', () => {
            sinon.stub(systemPoller, 'getPollerIDs').returns({});
            const multiPollerConfig = util.deepCopy(configToLoad);
            multiPollerConfig.Telemetry_System.My_System.systemPoller = [
                {
                    enable: true,
                    interval: 300,
                    trace: false,
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
                {
                    enable: true,
                    interval: 120,
                    trace: true,
                    actions: [
                        {
                            enable: true,
                            setTag: {
                                application: '`A`',
                                tenant: '`T`'
                            }
                        }
                    ]
                }
            ];
            const expectedArgs = [
                {
                    enable: true,
                    trace: false,
                    interval: 300,
                    connection: {
                        allowSelfSignedCert: undefined, host: 'localhost', port: 8100, protocol: 'http'
                    },
                    credentials: {
                        passphrase: undefined, username: undefined
                    },
                    dataOpts: {
                        actions: [{ enable: true, setTag: { application: '`A`', tenant: '`T`' } }],
                        noTMStats: true,
                        tags: undefined
                    },
                    name: 'My_System_0',
                    tracer: null,
                    endpointList: undefined
                },
                {
                    enable: true,
                    trace: false,
                    interval: 120,
                    connection: {
                        allowSelfSignedCert: undefined, host: 'localhost', port: 8100, protocol: 'http'
                    },
                    credentials: {
                        passphrase: undefined, username: undefined
                    },
                    dataOpts: {
                        actions: [{ enable: true, setTag: { application: '`A`', tenant: '`T`' } }],
                        noTMStats: true,
                        tags: undefined
                    },
                    name: 'My_System_1',
                    tracer: null,
                    endpointList: undefined
                }
            ];
            configWorker.emit('change', multiPollerConfig);
            return new Promise(resolve => setTimeout(() => { resolve(); }, 500))
                .then(() => {
                    assert.strictEqual(utilStub.start.length, 2);
                    assert.strictEqual(utilStub.update.length, 0);
                    assert.strictEqual(utilStub.stop.length, 0);
                    assert.deepEqual(utilStub.start[0].args, expectedArgs[0]);
                    assert.deepEqual(utilStub.start[1].args, expectedArgs[1]);
                });
        });
    });
});
