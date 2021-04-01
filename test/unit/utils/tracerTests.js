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
const fs = require('fs');
const os = require('os');
const path = require('path');
const sinon = require('sinon');

const configWorker = require('../../../src/lib/config');
const constants = require('../../../src/lib/constants');
const deviceUtil = require('../../../src/lib/utils/device');
const logger = require('../../../src/lib/logger');
const persistentStorage = require('../../../src/lib/persistentStorage');
const stubs = require('../shared/stubs');
const teemReporter = require('../../../src/lib/teemReporter');
const testAssert = require('../shared/assert');
const testUtil = require('../shared/util');
const tracer = require('../../../src/lib/utils/tracer');
const utilMisc = require('../../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Tracer Util', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('Tracer', () => {
        const tracerDir = `${os.tmpdir()}/telemetry`; // os.tmpdir for windows + linux
        const tracerFile = `${tracerDir}/tracerTest`;
        const fakeDate = new Date();
        let clock;
        let config;
        let coreStub;
        let tracerInst;

        const readTraceFile = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const emptyDir = (dirPath) => {
            fs.readdirSync(dirPath).forEach((item) => {
                item = path.join(dirPath, item);
                if (fs.statSync(item).isDirectory()) {
                    emptyDir(item);
                    fs.rmdirSync(item);
                } else {
                    fs.unlinkSync(item);
                }
            });
        };
        const removeDir = (dirPath) => {
            if (fs.existsSync(dirPath)) {
                emptyDir(dirPath);
                fs.rmdirSync(dirPath);
            }
        };
        const addTimestamps = data => data.map(item => ({ data: item, timestamp: new Date().toISOString() }));

        beforeEach(() => {
            coreStub = stubs.coreStub({
                logger
            });

            if (fs.existsSync(tracerDir)) {
                emptyDir(tracerDir);
            }
            config = {
                class: 'class',
                traceName: 'obj',
                trace: tracerFile
            };
            tracerInst = tracer.fromConfig(config);
            clock = sinon.useFakeTimers(fakeDate);
        });

        afterEach(() => tracer.unregisterAll()
            .then(() => {
                clock.restore();
            }));

        after(() => {
            removeDir(tracerDir);
        });

        it('should create tracer using default location and write data to it', () => {
            sinon.stub(constants.TRACER, 'DIR').value(tracerDir);
            tracerInst = tracer.fromConfig({ class: 'class2', traceName: 'obj2', trace: true });
            return tracerInst.write('foobar')
                .then(() => {
                    assert.deepStrictEqual(
                        readTraceFile(`${tracerDir}/class2.obj2`),
                        addTimestamps(['foobar'])
                    );
                });
        });

        it('should try to create parent directory', () => {
            sinon.stub(constants.TRACER, 'DIR').value('/test/inaccessible/directory');
            sinon.stub(utilMisc.fs, 'mkdir').resolves();
            tracerInst = tracer.fromConfig({ class: 'class2', traceName: 'obj2', trace: true });
            return tracerInst.write('foobar')
                .then(() => {
                    assert.isAbove(utilMisc.fs.mkdir.callCount, 0, 'should call utilMisc.fs.mkdir');
                    assert.strictEqual(utilMisc.fs.mkdir.args[0][0], '/test/inaccessible/directory');
                });
        });

        it('should not try to create parent directory if exist already (concurrent requests)', () => {
            sinon.stub(constants.TRACER, 'DIR').value('/test/inaccessible/directory');
            sinon.stub(utilMisc.fs, 'access').rejects(new Error('access error'));
            sinon.stub(utilMisc.fs, 'mkdir').callsFake(() => {
                const error = new Error('folder exists');
                error.code = 'EEXIST';
                return Promise.reject(error);
            });
            tracerInst = tracer.fromConfig({ class: 'class2', traceName: 'obj2', trace: true });
            return tracerInst.write('foobar')
                .then(() => {
                    testAssert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /folder exists/,
                        'should ignore mkdir EEXIST error'
                    );
                });
        });

        it('should not reject when unable to create parent directory', () => {
            sinon.stub(constants.TRACER, 'DIR').value('/test/inaccessible/directory');
            sinon.stub(utilMisc.fs, 'mkdir').rejects(new Error('mkdir error'));
            tracerInst = tracer.fromConfig({ class: 'class2', traceName: 'obj2', trace: true });
            return tracerInst.write('foobar')
                .then(() => {
                    testAssert.includeMatch(
                        coreStub.logger.messages.debug,
                        /mkdir error/,
                        'should log mkdir error'
                    );
                });
        });

        it(`should write max ${constants.TRACER.LIST_SIZE} items`, () => {
            let totalRecords = 0;
            let allWrittenData = [];

            const writeNumbersToTracer = (num) => {
                const promises = [];
                const writtenData = [];
                for (let i = 0; i < num; i += 1) {
                    totalRecords += 1;
                    promises.push(tracerInst.write(totalRecords));
                    writtenData.push(totalRecords);
                }
                return Promise.all(promises).then(() => writtenData);
            };
            const getExpectedData = data => addTimestamps(data.slice(data.length - constants.TRACER.LIST_SIZE));
            const validateTracerData = (writtenData) => {
                allWrittenData = allWrittenData.concat(writtenData);
                const data = readTraceFile(tracerFile);
                assert.lengthOf(data, constants.TRACER.LIST_SIZE);
                assert.deepStrictEqual(data, getExpectedData(allWrittenData));
            };

            return writeNumbersToTracer(constants.TRACER.LIST_SIZE * 2)
                .then((writtenData) => {
                    validateTracerData(writtenData);
                    return writeNumbersToTracer(Math.floor(constants.TRACER.LIST_SIZE / 2));
                })
                .then((writtenData) => {
                    validateTracerData(writtenData);
                    return writeNumbersToTracer(Math.floor(constants.TRACER.LIST_SIZE));
                })
                .then((writtenData) => {
                    validateTracerData(writtenData);
                });
        });

        it('should make copy of data', () => {
            const data = [1, 2, 3];
            const writePromise = tracerInst.write(data);
            data.push(4);
            return writePromise.then(() => {
                assert.deepStrictEqual(
                    readTraceFile(tracerFile),
                    addTimestamps([[1, 2, 3]])
                );
            });
        });

        it('should merge new data with existing data', () => tracerInst.write('item1')
            .then(() => {
                assert.deepStrictEqual(
                    readTraceFile(tracerFile),
                    addTimestamps(['item1'])
                );
                return tracerInst.write('item2');
            })
            .then(() => {
                assert.deepStrictEqual(
                    readTraceFile(tracerFile),
                    addTimestamps(['item1', 'item2'])
                );
            }));

        it('should not fail if unable to parse existing data', () => tracerInst.write('item1')
            .then(() => {
                fs.truncateSync(tracerFile, 0);
                fs.writeFileSync(tracerFile, '{test');
                return tracerInst.write('item1');
            })
            .then(() => {
                assert.deepStrictEqual(
                    readTraceFile(tracerFile),
                    addTimestamps(['item1'])
                );
            }));

        it('should write not more data when disabled', () => tracerInst.write('item1')
            .then(() => tracerInst.stop())
            .then(() => tracerInst.write('item2'))
            .then(() => {
                assert.deepStrictEqual(
                    readTraceFile(tracerFile),
                    addTimestamps(['item1'])
                );
            }));

        it('should complete scheduled operations before stop', () => {
            tracerInst.write('item1');
            return tracerInst.stop()
                .then(() => {
                    assert.deepStrictEqual(
                        readTraceFile(tracerFile),
                        addTimestamps(['item1'])
                    );
                });
        });

        it('should write object to tracer', () => {
            const expectedObject = {
                test: 'test'
            };
            return tracerInst.write(testUtil.deepCopy(expectedObject))
                .then(() => {
                    assert.deepStrictEqual(
                        readTraceFile(tracerFile),
                        addTimestamps([expectedObject])
                    );
                });
        });

        it('should return registered tracers', () => {
            const tracerInst2 = tracer.fromConfig({ class: 'class', traceName: 'tracer2', trace: true });
            const tracerInst3 = tracer.fromConfig({ class: 'class', traceName: 'tracer3', trace: true });
            const registered = tracer.registered();

            assert.lengthOf(registered, 3, 'should register 3 tracers');
            assert.include(registered, tracerInst, 'should register tracer');
            assert.include(registered, tracerInst2, 'should register tracer');
            assert.include(registered, tracerInst3, 'should register tracer');
        });

        it('should unregister tracer', () => tracer.unregister(tracerInst)
            .then(() => {
                assert.notInclude(tracer.registered(), tracerInst, 'should unregister tracer');
                assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
            }));

        it('should unregister all tracers', () => {
            const tracerInst2 = tracer.fromConfig({ class: 'class', traceName: 'tracer2', trace: true });
            const tracerInst3 = tracer.fromConfig({ class: 'class', traceName: 'tracer3', trace: true });
            assert.lengthOf(tracer.registered(), 3, 'should register 3 tracers');
            return tracer.unregisterAll()
                .then(() => {
                    assert.lengthOf(tracer.registered(), 0, 'should have no registered tracers');
                    assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
                    assert.isTrue(tracerInst2.disabled, 'should be disabled once unregistered');
                    assert.isTrue(tracerInst3.disabled, 'should be disabled once unregistered');
                });
        });

        it('should get existing tracer using similar config', () => {
            let sameTracer;
            return tracerInst.write('somethings')
                .then(() => {
                    sameTracer = tracer.fromConfig({ class: 'class', traceName: 'obj', trace: tracerFile });
                    return sameTracer.write('something3');
                })
                .then(() => {
                    assert.notStrictEqual(sameTracer.fd, undefined, 'should set fd');
                    assert.strictEqual(sameTracer.fd, tracerInst.fd, 'fd should be the same');
                });
        });

        it('should not create trace when component or/and trace disabled', () => {
            assert.isNull(tracer.fromConfig({
                class: 'class', traceName: 'obj', trace: tracerFile, enable: false
            }));
            assert.isNull(tracer.fromConfig({
                class: 'class', traceName: 'obj', trace: false, enable: false
            }));
            assert.isNull(tracer.fromConfig({
                class: 'class', traceName: 'obj', trace: true, enable: false
            }));
            assert.isNull(tracer.fromConfig({
                class: 'class', traceName: 'obj', trace: false, enable: true
            }));
        });

        it('should stop and create tracer using similar config when path changed', () => {
            let newTracer;
            return tracerInst.write('somethings')
                .then(() => {
                    newTracer = tracer.fromConfig({ class: 'class', traceName: 'obj', trace: `${tracerFile}new` });
                    return newTracer.write('something3');
                })
                .then(() => {
                    assert.notDeepEqual(tracerInst, newTracer, 'should return different instance');
                    assert.notStrictEqual(tracerInst.path, newTracer.path, 'should use different paths');

                    const registered = tracer.registered();
                    assert.notInclude(registered, tracerInst, 'should unregister pre-existing tracer');
                    assert.include(registered, newTracer, 'should register new tracer');
                });
        });

        it('should not fail when unable to close file using descriptor', () => {
            sinon.stub(utilMisc.fs, 'close').rejects(new Error('close error'));
            coreStub.logger.messages.debug = [];
            return tracerInst.write('test')
                .then(() => tracerInst.stop())
                .then(() => {
                    testAssert.includeMatch(
                        coreStub.logger.messages.debug,
                        /close error/,
                        'should log debug message with error'
                    );
                });
        });

        it('should not fail when no tracer passed to .unregister', () => assert.isFulfilled(tracer.unregister()));

        it('should catch rejection on attempt to unregister', () => {
            sinon.stub(tracer.Tracer.prototype, 'stop').rejects(new Error('stop error'));
            return tracer.unregister(tracerInst, true)
                .then(() => {
                    testAssert.includeMatch(
                        coreStub.logger.messages.debug,
                        /stop error/,
                        'should log debug message with error'
                    );
                });
        });

        it('should mask secrets', () => {
            const data = {
                text: 'passphrase: { cipherText: \'test_passphrase\' }\n'
                    + '"passphrase": {\ncipherText: "test_passphrase"\n}'
                    + '\'passphrase": "test_passphrase"',
                passphrase: 'test_passphrase',
                passphrase2: {
                    cipherText: 'test_passphrase'
                }
            };
            return tracerInst.write(data)
                .then(() => {
                    const traceData = readTraceFile(tracerFile);
                    assert.deepStrictEqual(
                        traceData,
                        addTimestamps([{
                            passphrase: '*********',
                            passphrase2: {
                                cipherText: '*********'
                            },
                            text: 'passphrase: {*********}\n'
                            + '"passphrase": {*********}'
                            + '\'passphrase": "*********"'
                        }])
                    );
                    return tracerInst.write(traceData[0].data);
                })
                .then(() => {
                    assert.deepStrictEqual(
                        readTraceFile(tracerFile),
                        addTimestamps([{
                            passphrase: '*********',
                            passphrase2: {
                                cipherText: '*********'
                            },
                            text: 'passphrase: {*********}\n'
                            + '"passphrase": {*********}'
                            + '\'passphrase": "*********"'
                        },
                        {
                            passphrase: '*********',
                            passphrase2: {
                                cipherText: '*********'
                            },
                            text: 'passphrase: {*********}\n'
                            + '"passphrase": {*********}'
                            + '\'passphrase": "*********"'
                        }], 'should modify message when secrets masked already')
                    );
                    return tracerInst.write(data[0]);
                });
        });
    });

    describe('config "on change" event', () => {
        beforeEach(() => {
            stubs.coreStub({
                configWorker,
                deviceUtil,
                persistentStorage,
                teemReporter,
                tracer,
                utilMisc
            });

            return configWorker.processDeclaration({ class: 'Telemetry' })
                .then(() => {
                    assert.deepStrictEqual(tracer.registered(), [], 'should have no registered tracers');
                });
        });

        it('should register enabled tracers and then unregister all when removed from config', () => configWorker.processDeclaration({
            class: 'Telemetry',
            My_Consumer: {
                class: 'Telemetry_Consumer',
                type: 'default',
                trace: true
            },
            My_Listener: {
                class: 'Telemetry_Listener',
                trace: 'listener'
            },
            My_Disabled_Listener: {
                class: 'Telemetry_Listener',
                trace: 'listener2',
                enable: false
            },
            My_Enabled_Poller_With_Disabled_Trace: {
                class: 'Telemetry_System_Poller',
                enable: true,
                trace: false
            }
        })
            .then(() => {
                const registered = tracer.registered();
                assert.sameDeepMembers(
                    registered.map(t => t.name),
                    ['Telemetry_Consumer.My_Consumer', 'Telemetry_Listener.My_Listener'],
                    'should have 2 registered tracers'
                );
                assert.sameDeepMembers(
                    registered.map(t => t.path),
                    ['/var/tmp/telemetry/Telemetry_Consumer.My_Consumer', 'listener'],
                    'should configure destination as expected'
                );
                return configWorker.processDeclaration({ class: 'Telemetry' })
                    .then(() => registered);
            })
            .then((registeredBefore) => {
                assert.deepStrictEqual(tracer.registered(), [], 'should have no registered tracers');
                registeredBefore.forEach((tracerInst) => {
                    assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
                });
            }));

        it('should register enabled tracers and then unregister disabled', () => configWorker.processDeclaration({
            class: 'Telemetry',
            My_Consumer: {
                class: 'Telemetry_Consumer',
                type: 'default',
                trace: true
            },
            My_Listener: {
                class: 'Telemetry_Listener',
                trace: 'listener'
            },
            My_Disabled_Listener: {
                class: 'Telemetry_Listener',
                trace: 'listener2',
                enable: false
            },
            My_Enabled_Poller_With_Disabled_Trace: {
                class: 'Telemetry_System_Poller',
                enable: true,
                trace: false
            }
        })
            .then(() => {
                const registered = tracer.registered();
                assert.sameDeepMembers(
                    registered.map(t => t.name),
                    ['Telemetry_Consumer.My_Consumer', 'Telemetry_Listener.My_Listener'],
                    'should have 2 registered tracers'
                );
                assert.sameDeepMembers(
                    registered.map(t => t.path),
                    ['/var/tmp/telemetry/Telemetry_Consumer.My_Consumer', 'listener'],
                    'should configure destination as expected'
                );
                return configWorker.processDeclaration({
                    class: 'Telemetry',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        trace: false
                    },
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: 'listener',
                        enable: false
                    },
                    My_Disabled_Listener: {
                        class: 'Telemetry_Listener',
                        trace: 'listener2'
                    },
                    My_Enabled_Poller_With_Disabled_Trace: {
                        class: 'Telemetry_System_Poller',
                        trace: true
                    }
                })
                    .then(() => registered);
            })
            .then((registeredBefore) => {
                registeredBefore.forEach((tracerInst) => {
                    assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
                });
                assert.sameDeepMembers(
                    tracer.registered().map(t => t.name),
                    [
                        'Telemetry_Listener.My_Disabled_Listener',
                        'Telemetry_System_Poller.My_Enabled_Poller_With_Disabled_Trace::My_Enabled_Poller_With_Disabled_Trace'
                    ],
                    'should have 2 registered tracers'
                );
                assert.sameDeepMembers(
                    tracer.registered().map(t => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_System_Poller.My_Enabled_Poller_With_Disabled_Trace::My_Enabled_Poller_With_Disabled_Trace',
                        'listener2'
                    ],
                    'should configure destination as expected'
                );
            }));

        /**
         * Idea of the test below is to be sure that pre-existing instances were not disabled/re-created and etc. -
         * in other words those instances should survive all config updates
         */
        it('should keep pre-existing tracers untouched when processing a new namespace declaration', () => configWorker.processDeclaration({
            class: 'Telemetry',
            My_Consumer: {
                class: 'Telemetry_Consumer',
                type: 'default',
                trace: true
            },
            My_Listener: {
                class: 'Telemetry_Listener',
                trace: 'listener'
            },
            My_Disabled_Listener: {
                class: 'Telemetry_Listener',
                trace: 'listener2',
                enable: false
            },
            My_Enabled_Poller_With_Disabled_Trace: {
                class: 'Telemetry_System_Poller',
                enable: true,
                trace: false
            }
        })
            .then(() => {
                const registered = tracer.registered(); // remember those instances - should survive all updates
                assert.sameDeepMembers(
                    registered.map(t => t.name),
                    ['Telemetry_Consumer.My_Consumer', 'Telemetry_Listener.My_Listener'],
                    'should have 2 registered tracers'
                );
                assert.sameDeepMembers(
                    registered.map(t => t.path),
                    ['/var/tmp/telemetry/Telemetry_Consumer.My_Consumer', 'listener'],
                    'should configure destination as expected'
                );
                return configWorker.processNamespaceDeclaration({
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        trace: true
                    },
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: 'listener2',
                        enable: true
                    }
                }, 'Namespace')
                    .then(() => registered);
            })
            .then((registeredBefore) => {
                registeredBefore.forEach((tracerInst) => {
                    assert.isFalse(tracerInst.disabled, 'should not disable pre-existing tracers');
                });
                assert.sameDeepMembers(
                    tracer.registered().map(t => t.name),
                    [
                        'Telemetry_Consumer.My_Consumer',
                        'Telemetry_Listener.My_Listener',
                        'Telemetry_Consumer.Namespace::My_Consumer',
                        'Telemetry_Listener.Namespace::My_Listener'
                    ],
                    'should have 4 registered tracers'
                );
                assert.sameDeepMembers(
                    tracer.registered().map(t => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_Consumer.My_Consumer',
                        'listener',
                        '/var/tmp/telemetry/Telemetry_Consumer.Namespace::My_Consumer',
                        'listener2'
                    ],
                    'should configure destination as expected'
                );
                return configWorker.processNamespaceDeclaration({
                    class: 'Telemetry_Namespace',
                    My_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    My_Listener: {
                        class: 'Telemetry_Listener',
                        trace: 'listener2',
                        enable: true
                    }
                }, 'Namespace')
                    .then(() => registeredBefore);
            })
            .then((registeredBefore) => {
                registeredBefore.forEach((tracerInst) => {
                    assert.isFalse(tracerInst.disabled, 'should not disable pre-existing tracers');
                });
                assert.sameDeepMembers(
                    tracer.registered().map(t => t.name),
                    [
                        'Telemetry_Consumer.My_Consumer',
                        'Telemetry_Listener.My_Listener',
                        'Telemetry_Listener.Namespace::My_Listener'
                    ],
                    'should have 3 registered tracers'
                );
                assert.sameDeepMembers(
                    tracer.registered().map(t => t.path),
                    [
                        '/var/tmp/telemetry/Telemetry_Consumer.My_Consumer',
                        'listener',
                        'listener2'
                    ],
                    'should configure destination as expected'
                );
                return configWorker.processNamespaceDeclaration({
                    class: 'Telemetry_Namespace'
                }, 'Namespace')
                    .then(() => registeredBefore);
            })
            .then((registeredBefore) => {
                registeredBefore.forEach((tracerInst) => {
                    assert.isFalse(tracerInst.disabled, 'should not disable pre-existing tracers');
                });
                assert.sameDeepMembers(
                    tracer.registered().map(t => t.name),
                    ['Telemetry_Consumer.My_Consumer', 'Telemetry_Listener.My_Listener'],
                    'should have 2 registered tracers'
                );
                assert.sameDeepMembers(
                    tracer.registered().map(t => t.path),
                    ['/var/tmp/telemetry/Telemetry_Consumer.My_Consumer', 'listener'],
                    'should configure destination as expected'
                );
            }));
    });
});
