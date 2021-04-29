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
const fs = require('fs');
const os = require('os');
const path = require('path');
const sinon = require('sinon');

const configWorker = require('../../../src/lib/config');
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
        const tracerEncoding = 'utf8';
        const tracerFile = `${tracerDir}/tracerTest`;
        const tracerName = 'tracerName';
        const fakeDate = new Date();
        let config;
        let coreStub;
        let tracerInst;

        const readTraceFile = (filePath, encoding) => JSON.parse(fs.readFileSync(filePath, encoding || tracerEncoding));
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
            stubs.clock({ fakeTimersOpts: fakeDate });

            if (fs.existsSync(tracerDir)) {
                emptyDir(tracerDir);
            }

            config = {
                name: tracerName,
                path: tracerFile
            };
            tracerInst = tracer.fromConfig(config);
        });

        afterEach(() => tracer.unregisterAll());

        after(() => {
            removeDir(tracerDir);
        });

        describe('.fromConfig()', () => {
            it('should create tracer using provided location and write data to it', () => {
                tracerInst = tracer.fromConfig({
                    name: tracerName,
                    path: tracerFile
                });
                assert.deepStrictEqual(tracerInst.name, tracerName, 'should set name');
                assert.deepStrictEqual(tracerInst.path, tracerFile, 'should set path');
                assert.deepStrictEqual(tracerInst.encoding, 'utf8', 'should set default encoding');
                assert.deepStrictEqual(tracerInst.maxRecords, 10, 'should set default maxRecords');
                assert.deepStrictEqual(tracerInst.disabled, false, 'should not be disabled');
                assert.notExists(tracerInst.fd, 'should have no fd');

                return tracerInst.write('foobar')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile),
                            addTimestamps(['foobar'])
                        );
                    });
            });

            it('should create tracer using provided location and options and write data to it', () => {
                tracerInst = tracer.fromConfig({
                    enable: true,
                    encoding: 'ascii',
                    maxRecords: 1,
                    name: tracerName,
                    path: tracerFile
                });
                assert.deepStrictEqual(tracerInst.name, tracerName, 'should set name');
                assert.deepStrictEqual(tracerInst.path, tracerFile, 'should set path');
                assert.deepStrictEqual(tracerInst.encoding, 'ascii', 'should set custom encoding');
                assert.deepStrictEqual(tracerInst.maxRecords, 1, 'should set custom maxRecords');
                assert.deepStrictEqual(tracerInst.disabled, false, 'should not be disabled');
                assert.notExists(tracerInst.fd, 'should have no fd');

                return tracerInst.write('foobar')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile),
                            addTimestamps(['foobar'])
                        );
                    });
            });

            it('should return existing tracer', () => {
                let sameTracerInst;
                tracerInst = tracer.fromConfig({
                    name: 'newTracerName',
                    path: tracerFile,
                    options: {
                        encoding: 'ascii',
                        maxRecords: 1
                    }
                });
                return tracerInst.write('foobar')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile),
                            addTimestamps(['foobar'])
                        );
                        sameTracerInst = tracer.fromConfig({
                            name: 'newTracerName',
                            path: tracerFile,
                            options: {
                                encoding: 'ascii',
                                maxRecords: 1
                            }
                        });
                        return sameTracerInst.write('foobar');
                    })
                    .then(() => {
                        assert.isTrue(tracerInst === sameTracerInst, 'should return same instance');
                        assert.deepStrictEqual(tracerInst, sameTracerInst, 'should return same instance');
                        assert.exists(sameTracerInst.fd, 'should set fd');
                        assert.strictEqual(sameTracerInst.fd, tracerInst.fd, 'fd should be the same');
                        testAssert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Creating new tracer instance - 'newTracerName'/,
                            'should not log debug message'
                        );
                        testAssert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Updating tracer instance - 'tracerName'/,
                            'should not log debug message'
                        );
                    });
            });

            it('should not create tracer when disabled', () => {
                tracer.unregister(tracerInst);
                assert.lengthOf(tracer.registered(), 0, 'should have not tracers registered');

                tracerInst = tracer.fromConfig({
                    enable: false,
                    encoding: 'ascii',
                    maxRecords: 1,
                    name: tracerName,
                    path: tracerFile
                });
                assert.notExists(tracerInst, 'should not create Tracer when disabled');
                assert.lengthOf(tracer.registered(), 0, 'should have not tracers registered');
            });

            it('should stop and create new tracer when path changed', () => {
                let newTracer;
                tracerInst = tracer.fromConfig({
                    name: tracerName,
                    path: tracerFile
                });
                return tracerInst.write('somethings')
                    .then(() => {
                        newTracer = tracer.fromConfig({
                            name: tracerName,
                            path: `${tracerFile}New`
                        });
                        return newTracer.write('something3');
                    })
                    .then(() => {
                        assert.notDeepEqual(tracerInst, newTracer, 'should return different instance');
                        assert.notDeepEqual(tracerInst.path, newTracer.path, 'should use different paths');

                        const registered = tracer.registered();
                        assert.notInclude(registered, tracerInst, 'should unregister pre-existing tracer');
                        assert.include(registered, newTracer, 'should register new tracer');
                        assert.isTrue(tracerInst.disabled, 'should disabled old instance');
                        testAssert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Updating tracer instance - 'tracerName'/,
                            'should log debug message'
                        );
                    });
            });

            it('should stop and create new tracer when maxRecords changed', () => {
                let newTracer;
                tracerInst = tracer.fromConfig({
                    name: tracerName,
                    path: tracerFile
                });
                return tracerInst.write('somethings')
                    .then(() => {
                        newTracer = tracer.fromConfig({
                            name: tracerName,
                            path: tracerFile,
                            maxRecords: 100
                        });
                        return newTracer.write('something3');
                    })
                    .then(() => {
                        assert.notDeepEqual(tracerInst, newTracer, 'should return different instance');
                        assert.notDeepEqual(tracerInst.maxRecords, newTracer.maxRecords, 'should use different maxRecords');

                        const registered = tracer.registered();
                        assert.notInclude(registered, tracerInst, 'should unregister pre-existing tracer');
                        assert.include(registered, newTracer, 'should register new tracer');
                        assert.isTrue(tracerInst.disabled, 'should disabled old instance');
                        testAssert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Updating tracer instance - 'tracerName'/,
                            'should log debug message'
                        );
                    });
            });

            it('should stop and create new tracer when encoding changed', () => {
                let newTracer;
                tracerInst = tracer.fromConfig({
                    name: tracerName,
                    path: tracerFile
                });
                return tracerInst.write('somethings')
                    .then(() => {
                        newTracer = tracer.fromConfig({
                            name: tracerName,
                            path: tracerFile,
                            encoding: 'ascii'
                        });
                        return newTracer.write('something3');
                    })
                    .then(() => {
                        assert.notDeepEqual(tracerInst, newTracer, 'should return different instance');
                        assert.notDeepEqual(tracerInst.encoding, newTracer.encoding, 'should use different paths');

                        const registered = tracer.registered();
                        assert.notInclude(registered, tracerInst, 'should unregister pre-existing tracer');
                        assert.include(registered, newTracer, 'should register new tracer');
                        assert.isTrue(tracerInst.disabled, 'should disabled old instance');
                        testAssert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Updating tracer instance - 'tracerName'/,
                            'should log debug message'
                        );
                    });
            });
        });

        describe('.registered()', () => {
            it('should return registered tracers', () => {
                const tracerInst2 = tracer.fromConfig({ name: 'tracer2' });
                const tracerInst3 = tracer.fromConfig({ name: 'tracer3' });
                const registered = tracer.registered();

                assert.lengthOf(registered, 3, 'should register 3 tracers');
                assert.include(registered, tracerInst, 'should register tracer');
                assert.include(registered, tracerInst2, 'should register tracer');
                assert.include(registered, tracerInst3, 'should register tracer');
            });
        });

        describe('.unregister()', () => {
            it('should unregister tracer', () => tracer.unregister(tracerInst)
                .then(() => {
                    assert.notInclude(tracer.registered(), tracerInst, 'should unregister tracer');
                    assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
                }));

            it('should unregister all tracers', () => {
                const tracerInst2 = tracer.fromConfig({ name: 'tracer2' });
                const tracerInst3 = tracer.fromConfig({ name: 'tracer3' });
                assert.lengthOf(tracer.registered(), 3, 'should register 3 tracers');
                return tracer.unregisterAll()
                    .then(() => {
                        assert.isEmpty(tracer.registered(), 'should have no registered tracers');
                        assert.isTrue(tracerInst.disabled, 'should be disabled once unregistered');
                        assert.isTrue(tracerInst2.disabled, 'should be disabled once unregistered');
                        assert.isTrue(tracerInst3.disabled, 'should be disabled once unregistered');
                    });
            });

            it('should not fail when no tracer passed to .unregister', () => assert.isFulfilled(tracer.unregister()));

            it('should catch rejection on attempt to unregister', () => {
                sinon.stub(tracer.Tracer.prototype, 'stop').rejects(new Error('stop error'));
                return tracer.unregister(tracerInst, true)
                    .then(() => {
                        testAssert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Uncaught error on attempt to unregister tracer[\s\S]*stop error/gm,
                            'should log debug message with error'
                        );
                    });
            });
        });

        describe('constructor', () => {
            it('should create tracer using provided location and write data to it', () => {
                tracerInst = new tracer.Tracer('tracerName', tracerFile);
                assert.deepStrictEqual(tracerInst.name, 'tracerName', 'should set name');
                assert.deepStrictEqual(tracerInst.path, tracerFile, 'should set path');
                assert.deepStrictEqual(tracerInst.encoding, 'utf8', 'should set default encoding');
                assert.deepStrictEqual(tracerInst.maxRecords, 10, 'should set default maxRecords');
                assert.deepStrictEqual(tracerInst.disabled, false, 'should not be disabled');
                assert.notExists(tracerInst.fd, 'should have no fd');

                return tracerInst.write('foobar-Ӂ-unicode')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile),
                            addTimestamps(['foobar-Ӂ-unicode'])
                        );
                    });
            });

            it('should create tracer using provided location and options and write data to it', () => {
                tracerInst = new tracer.Tracer('tracerName', tracerFile, {
                    encoding: 'ascii',
                    maxRecords: 1
                });
                assert.deepStrictEqual(tracerInst.name, 'tracerName', 'should set name');
                assert.deepStrictEqual(tracerInst.path, tracerFile, 'should set path');
                assert.deepStrictEqual(tracerInst.encoding, 'ascii', 'should set default encoding');
                assert.deepStrictEqual(tracerInst.maxRecords, 1, 'should set default maxRecords');
                assert.deepStrictEqual(tracerInst.disabled, false, 'should not be disabled');
                assert.notExists(tracerInst.fd, 'should have no fd');

                return tracerInst.write('foobar')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile, 'ascii'),
                            addTimestamps(['foobar'])
                        );
                    });
            });
        });

        describe('.write()', () => {
            it('should try to create parent directory', () => {
                sinon.stub(utilMisc.fs, 'mkdir').resolves();
                tracerInst = tracer.fromConfig({
                    name: tracerName,
                    path: '/test/inaccessible/directory/file'
                });
                return tracerInst.write('foobar')
                    .then(() => {
                        assert.isAbove(utilMisc.fs.mkdir.callCount, 0, 'should call utilMisc.fs.mkdir');
                        assert.strictEqual(utilMisc.fs.mkdir.args[0][0], '/test/inaccessible/directory');
                        testAssert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Creating dir '\/test\/inaccessible\/directory'/,
                            'should log debug message'
                        );
                    });
            });

            it('should not try to create parent directory if exist already (concurrent requests)', () => {
                sinon.stub(utilMisc.fs, 'access').rejects(new Error('access error'));
                sinon.stub(utilMisc.fs, 'mkdir').callsFake(() => {
                    const error = new Error('folder exists');
                    error.code = 'EEXIST';
                    return Promise.reject(error);
                });
                tracerInst = tracer.fromConfig({
                    name: tracerName,
                    path: '/test/inaccessible/directory/file'
                });
                return tracerInst.write('foobar')
                    .then(() => {
                        testAssert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Unable to write data[\s\S]*folder exists/gm,
                            'should ignore mkdir EEXIST error'
                        );
                    });
            });

            it('should not reject when unable to create parent directory', () => {
                sinon.stub(utilMisc.fs, 'mkdir').rejects(new Error('mkdir error'));
                tracerInst = tracer.fromConfig({
                    name: tracerName,
                    path: '/test/inaccessible/directory/file'
                });
                return tracerInst.write('foobar')
                    .then(() => {
                        testAssert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Unable to write data[\s\S]*mkdir error/gm,
                            'should log mkdir error'
                        );
                    });
            });

            [
                0,
                1,
                10,
                100
            ].forEach(maxRecords => it(`should write max ${maxRecords} records`, () => {
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
                const getExpectedData = data => addTimestamps(data.slice(data.length - maxRecords));
                const validateTracerData = (writtenData) => {
                    allWrittenData = allWrittenData.concat(writtenData);
                    const data = readTraceFile(tracerFile);
                    assert.lengthOf(data, maxRecords);
                    assert.deepStrictEqual(data, getExpectedData(allWrittenData));
                };

                tracerInst = tracer.fromConfig({
                    name: 'class.obj',
                    path: tracerFile,
                    maxRecords
                });
                assert.deepStrictEqual(tracerInst.maxRecords, maxRecords, 'should set value for maxRecords');

                return writeNumbersToTracer(maxRecords * 2 + 2)
                    .then((writtenData) => {
                        validateTracerData(writtenData);
                        return writeNumbersToTracer(Math.floor(maxRecords / 2));
                    })
                    .then((writtenData) => {
                        validateTracerData(writtenData);
                        return writeNumbersToTracer(Math.floor(maxRecords) + 2);
                    })
                    .then((writtenData) => {
                        validateTracerData(writtenData);
                    });
            }));

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

            it('should not fail when unable to make copy of data', () => {
                sinon.stub(utilMisc, 'deepCopy').throws(new Error('expected copy error'));
                const data = [1, 2, 3];
                return tracerInst.write(data)
                    .then(() => {
                        testAssert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Unable to make copy of data[\s\S]*expected copy error/gm,
                            'should log debug message with error'
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

            it('should create new write request when current one in progress already', () => {
                const dataHistory = [];
                const fsWriteStub = sinon.stub(utilMisc.fs, 'write');
                let writePromise;

                fsWriteStub.callsFake(function () {
                    // see args list in docs
                    dataHistory.push(arguments[1]);
                    if (!writePromise) {
                        writePromise = tracerInst.write('delayed record');
                    }
                    return fsWriteStub.wrappedMethod.apply(utilMisc.fs, arguments);
                });
                return tracerInst.write('first record')
                    .then(() => writePromise)
                    .then(() => {
                        assert.match(dataHistory[0], /first record/, 'should include first record');
                        assert.notMatch(dataHistory[0], /delayed record/, 'should not include delayed record');
                        assert.match(dataHistory[1], /first record/, 'should include first record');
                        assert.match(dataHistory[1], /delayed record/, 'should include delayed record');
                    });
            });

            it('should not create new write request when tracer stopped', () => {
                const dataHistory = [];
                const fsWriteStub = sinon.stub(utilMisc.fs, 'write');
                let writePromise;

                fsWriteStub.callsFake(function () {
                    // see args list in docs
                    dataHistory.push(arguments[1]);
                    if (!writePromise) {
                        // should create new delayed write operation
                        writePromise = tracerInst.write('delayed record');
                    }
                    tracerInst.stop(); // stop it to set 'disabled' to true
                    return fsWriteStub.wrappedMethod.apply(utilMisc.fs, arguments);
                });
                return tracerInst.write('first record')
                    .then(() => writePromise)
                    .then(() => {
                        assert.lengthOf(dataHistory, 1, 'should not try to write data once stopped');
                        assert.match(dataHistory[0], /first record/, 'should include first record');
                        assert.notMatch(dataHistory[0], /delayed record/, 'should not include delayed record');
                    });
            });
        });

        describe('.stop()', () => {
            it('should not fail when unable to close file using descriptor', () => {
                sinon.stub(utilMisc.fs, 'close').rejects(new Error('close error'));
                coreStub.logger.messages.debug = [];
                return tracerInst.write('test')
                    .then(() => tracerInst.stop())
                    .then(() => {
                        testAssert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Unable to close file[\s\S]*close error/gm,
                            'should log debug message with error'
                        );
                    });
            });

            it('should stop tracer', () => tracerInst.write('test')
                .then(() => {
                    assert.deepStrictEqual(
                        readTraceFile(tracerFile),
                        addTimestamps(['test'])
                    );
                    return tracerInst.stop();
                })
                .then(() => {
                    assert.isTrue(tracerInst.disabled, 'should disabled tracer once stopped');
                    assert.notExists(tracerInst.fd, 'should have not fd once stopped');
                    return tracerInst.write('test2');
                })
                .then(() => {
                    assert.deepStrictEqual(
                        readTraceFile(tracerFile),
                        addTimestamps(['test'])
                    );
                    assert.isTrue(tracerInst.disabled, 'should disabled tracer once stopped');
                    assert.notExists(tracerInst.fd, 'should have not fd once stopped');
                }));
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
