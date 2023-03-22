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

const fs = require('fs');
const os = require('os');
const path = require('path');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const timers = sourceCode('src/lib/utils/timers');
const tracer = sourceCode('src/lib/utils/tracer');
const utilMisc = sourceCode('src/lib/utils/misc');

moduleCache.remember();

describe('Tracer', () => {
    const tracerDir = `${os.tmpdir()}/telemetry`; // os.tmpdir for windows + linux
    const tracerEncoding = 'utf8';
    const tracerFile = `${tracerDir}/tracerTest`;
    const fakeDate = new Date();
    let coreStub;
    let customFS;
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
    const addTimestamps = (data) => data.map((item) => ({ data: item, timestamp: new Date().toISOString() }));

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({ logger: true });
        stubs.clock({ fakeTimersOpts: fakeDate });

        if (fs.existsSync(tracerDir)) {
            emptyDir(tracerDir);
        }

        tracerInst = tracer.create(tracerFile);
        coreStub.logger.removeAllMessages();

        customFS = sinon.spy({
            R_OK: 1,
            access() { return Promise.reject(new Error('not exist')); },
            close() { return Promise.resolve(); },
            ftruncate() { return Promise.resolve(); },
            fstat() {
                return Promise.resolve([{
                    size: 2
                }]);
            },
            mkdir() { return Promise.resolve(); },
            open() { return Promise.resolve([1]); },
            read() { return Promise.resolve([2, Buffer.from('[]')]); },
            write() { return Promise.resolve(); }
        });
    });

    afterEach(() => (tracerInst ? tracerInst.stop() : Promise.resolve())
        .then(() => sinon.restore()));

    after(() => {
        removeDir(tracerDir);
    });

    describe('.create', () => {
        it('should create new Tracer instance', () => {
            tracerInst = tracer.create(tracerFile, { maxRecords: 20 });
            assert.match(tracerInst.name, /tracer_\d+/, 'should set name');
            assert.deepStrictEqual(tracerInst.path, tracerFile, 'should set path');
            assert.deepStrictEqual(tracerInst.encoding, 'utf8', 'should set default encoding');
            assert.deepStrictEqual(tracerInst.maxRecords, 20, 'should set custom maxRecords');
            assert.isFalse(tracerInst.disabled, 'should not be disabled');
            assert.isFalse(tracerInst.suspended, 'should not be suspended');
            assert.notExists(tracerInst.fd, 'should have no fd');

            return tracerInst.write('foobar-Ӂ-unicode')
                .then(() => {
                    assert.deepStrictEqual(
                        readTraceFile(tracerFile),
                        addTimestamps(['foobar-Ӂ-unicode'])
                    );
                });
        });
    });

    describe('.setTracerOptionsDefaults', () => {
        it('should set default options', () => {
            assert.deepStrictEqual(
                tracer.setTracerOptionsDefaults({}),
                {
                    encoding: 'utf8',
                    inactivityTimeout: 15 * 60,
                    maxRecords: 10
                },
                'should set default options'
            );
        });

        it('should preserve user-defined options', () => {
            assert.deepStrictEqual(
                tracer.setTracerOptionsDefaults({
                    encoding: 'ascii',
                    inactivityTimeout: 10,
                    maxRecords: 100
                }),
                {
                    encoding: 'ascii',
                    inactivityTimeout: 10,
                    maxRecords: 100
                },
                'should preserve user-defined options'
            );
        });
    });

    describe('Tracer', () => {
        describe('constructor', () => {
            it('should create tracer using provided location and write data to it', () => {
                tracerInst = new tracer.Tracer(tracerFile);
                assert.match(tracerInst.name, /tracer_\d+/, 'should set name');
                assert.deepStrictEqual(tracerInst.path, tracerFile, 'should set path');
                assert.deepStrictEqual(tracerInst.encoding, 'utf8', 'should set default encoding');
                assert.deepStrictEqual(tracerInst.maxRecords, 10, 'should set default maxRecords');
                assert.isFalse(tracerInst.disabled, 'should not be disabled');
                assert.isFalse(tracerInst.suspended, 'should not be suspended');
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
                tracerInst = new tracer.Tracer(tracerFile, {
                    encoding: 'ascii',
                    maxRecords: 1
                });
                assert.match(tracerInst.name, /tracer_\d+/, 'should set name');
                assert.deepStrictEqual(tracerInst.path, tracerFile, 'should set path');
                assert.deepStrictEqual(tracerInst.encoding, 'ascii', 'should set default encoding');
                assert.deepStrictEqual(tracerInst.maxRecords, 1, 'should set default maxRecords');
                assert.isFalse(tracerInst.disabled, 'should not be disabled');
                assert.isFalse(tracerInst.suspended, 'should not be suspended');
                assert.notExists(tracerInst.fd, 'should have no fd');

                return tracerInst.write('foobar')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile, 'ascii'),
                            addTimestamps(['foobar'])
                        );
                    });
            });

            it('should allow to specify custom FS module', () => {
                tracerInst = new tracer.Tracer('tracerFile', {
                    fs: customFS
                });
                return tracerInst.write('somethings')
                    .then(() => tracerInst.stop())
                    .then(() => {
                        assert.isAbove(customFS.access.callCount, 0, 'should call customFS.access');
                        assert.isAbove(customFS.close.callCount, 0, 'should call customFS.close');
                        assert.isAbove(customFS.fstat.callCount, 0, 'should call customFS.fstat');
                        assert.isAbove(customFS.mkdir.callCount, 0, 'should call customFS.mkdir');
                        assert.isAbove(customFS.open.callCount, 0, 'should call customFS.open');
                        assert.isAbove(customFS.read.callCount, 0, 'should call customFS.read');
                        assert.isAbove(customFS.write.callCount, 0, 'should call customFS.write');
                    });
            });

            it('should not set inactivity timeout when 0 passed', () => {
                const fakeClock = stubs.clock();

                tracerInst = new tracer.Tracer(tracerFile, {
                    inactivityTimeout: 0
                });
                assert.deepStrictEqual(tracerInst.inactivityTimeout, 0, 'should set custom inactivity timeout');
                return tracerInst.write('somethings')
                    .then(() => {
                        assert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Inactivity timeout set to/,
                            'should log debug message'
                        );
                        fakeClock.clockForward(60 * 1000, { repeat: 60, promisify: true });
                        return testUtil.sleep(60 * 60 * 1000);
                    })
                    .then(() => {
                        assert.isFalse(tracerInst.disabled, 'should not be disabled');
                        assert.isFalse(tracerInst.suspended, 'should not be suspended');
                    });
            });

            it('should set inactivity timeout to default value (15s)', () => {
                const fakeClock = stubs.clock();
                tracerInst = new tracer.Tracer(tracerFile);
                assert.deepStrictEqual(tracerInst.inactivityTimeout, 900, 'should set default inactivity timeout');
                return tracerInst.write('somethings')
                    .then(() => {
                        assert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Inactivity timeout set to/,
                            'should log debug message'
                        );
                        fakeClock.clockForward(60 * 1000, { repeat: 16, promisify: true });
                        return testUtil.sleep(16 * 60 * 1000);
                    })
                    .then(() => {
                        assert.isFalse(tracerInst.disabled, 'should not be disabled');
                        assert.isTrue(tracerInst.suspended, 'should be suspended');
                    });
            });

            it('should set inactivity timeout to correct value when invalid value provided (-15s)', () => {
                const fakeClock = stubs.clock();
                tracerInst = new tracer.Tracer(tracerFile, {
                    inactivityTimeout: -15
                });
                assert.deepStrictEqual(tracerInst.inactivityTimeout, 15, 'should set corrected inactivity timeout');
                return tracerInst.write('somethings')
                    .then(() => {
                        assert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Inactivity timeout set to/,
                            'should log debug message'
                        );
                        fakeClock.clockForward(60 * 1000, { repeat: 16, promisify: true });
                        return testUtil.sleep(16 * 60 * 1000);
                    })
                    .then(() => {
                        assert.isFalse(tracerInst.disabled, 'should not be disabled');
                        assert.isTrue(tracerInst.suspended, 'should be suspended');
                    });
            });

            it('should set inactivity timeout to custom value (30s)', () => {
                const fakeClock = stubs.clock();
                tracerInst = new tracer.Tracer(tracerFile, {
                    inactivityTimeout: 30
                });
                assert.deepStrictEqual(tracerInst.inactivityTimeout, 30, 'should set custom inactivity timeout');
                return tracerInst.write('somethings')
                    .then(() => {
                        assert.deepStrictEqual(tracerInst.inactivityTimeout, 30, 'should set custom inactivity timeout');
                        assert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Inactivity timeout set to/,
                            'should log debug message'
                        );
                        fakeClock.clockForward(1000, { repeat: 31, promisify: true });
                        return testUtil.sleep(31 * 1000);
                    })
                    .then(() => {
                        assert.isFalse(tracerInst.disabled, 'should not be disabled');
                        assert.isTrue(tracerInst.suspended, 'should be suspended');
                    });
            });
        });

        describe('.write()', () => {
            it('should try to create parent directory', () => {
                sinon.stub(utilMisc.fs, 'mkdir').resolves();
                tracerInst = tracer.create('/test/inaccessible/directory/file');
                return tracerInst.write('foobar')
                    .then(() => {
                        assert.isAbove(utilMisc.fs.mkdir.callCount, 0, 'should call utilMisc.fs.mkdir');
                        assert.strictEqual(utilMisc.fs.mkdir.args[0][0], '/test/inaccessible/directory');
                        assert.includeMatch(
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
                tracerInst = tracer.create('/test/inaccessible/directory/file');
                return tracerInst.write('foobar')
                    .then((err) => {
                        assert.isUndefined(err, 'should return no error');
                        assert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Unable to write data[\s\S]*folder exists/gm,
                            'should ignore mkdir EEXIST error'
                        );
                    });
            });

            it('should not reject when unable to create parent directory', () => {
                sinon.stub(utilMisc.fs, 'mkdir').rejects(new Error('mkdir error'));
                tracerInst = tracer.create('/test/inaccessible/directory/file');
                return tracerInst.write('foobar')
                    .then((err) => {
                        assert.isUndefined(err, 'should return no error');
                        assert.includeMatch(
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
            ].forEach((maxRecords) => it(`should write max ${maxRecords} records`, () => {
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
                const getExpectedData = (data) => addTimestamps(data.slice(data.length - maxRecords));
                const validateTracerData = (writtenData) => {
                    allWrittenData = allWrittenData.concat(writtenData);
                    const data = readTraceFile(tracerFile);
                    assert.lengthOf(data, maxRecords);
                    assert.deepStrictEqual(data, getExpectedData(allWrittenData));
                };

                tracerInst = tracer.create(tracerFile, { maxRecords });
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
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            new RegExp(`Writing last ${maxRecords}.*out of.*messages \\(limit = ${maxRecords} messages\\)`),
                            'should write debug message'
                        );
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
                    .then((err) => {
                        assert.isUndefined(err, 'should return no error');
                        assert.includeMatch(
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
                .then((err) => {
                    assert.isUndefined(err, 'should return no error');
                    fs.truncateSync(tracerFile, 0);
                    fs.writeFileSync(tracerFile, '{test');
                    return tracerInst.write('item1');
                })
                .then((err) => {
                    assert.isUndefined(err, 'should return no error');
                    assert.deepStrictEqual(
                        readTraceFile(tracerFile),
                        addTimestamps(['item1'])
                    );
                }));

            it('should not write more data when disabled', () => tracerInst.write('item1')
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
                const mask = '*********';
                const data = {
                    text: JSON.stringify({
                        cipherText: 'test_passphrase_1',
                        passphrase: 'test_passphrase_2',
                        passphrase1: { cipherText: 'test_passphrase_3' }
                    }),
                    passphrase: 'test_passphrase_4',
                    passphrase2: {
                        cipherText: 'test_passphrase_5'
                    },
                    anotherText: utilMisc.stringify({
                        object1: {
                            passphrase: 'test_passphrase_6'
                        },
                        passphrase: {
                            cipherText: 'test_passphrase_7'
                        }
                    }),
                    oneMoreText: utilMisc.stringify({
                        object1: {
                            passphrase: 'test_passphrase_6'
                        },
                        passphrase: {
                            cipherText: 'test_passphrase_7'
                        }
                    }, true)
                };
                return tracerInst.write(data)
                    .then(() => {
                        const traceData = readTraceFile(tracerFile);
                        assert.deepStrictEqual(
                            traceData,
                            addTimestamps([{
                                anotherText: `{"object1":{"passphrase":"${mask}"},"passphrase":{"cipherText":"${mask}"}}`,
                                oneMoreText: `{\n    "object1": {\n        "passphrase": "${mask}"\n    },\n    "passphrase": {\n        "cipherText": "${mask}"\n    }\n}`,
                                passphrase: mask,
                                passphrase2: {
                                    cipherText: mask
                                },
                                text: `{"cipherText":"${mask}",`
                                    + `"passphrase":"${mask}",`
                                    + `"passphrase1":{"cipherText":"${mask}"}`
                                    + '}'
                            }])
                        );
                        return tracerInst.write(traceData[0].data);
                    })
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile),
                            addTimestamps([{
                                anotherText: `{"object1":{"passphrase":"${mask}"},"passphrase":{"cipherText":"${mask}"}}`,
                                oneMoreText: `{\n    "object1": {\n        "passphrase": "${mask}"\n    },\n    "passphrase": {\n        "cipherText": "${mask}"\n    }\n}`,
                                passphrase: mask,
                                passphrase2: {
                                    cipherText: mask
                                },
                                text: `{"cipherText":"${mask}",`
                                    + `"passphrase":"${mask}",`
                                    + `"passphrase1":{"cipherText":"${mask}"}`
                                    + '}'
                            },
                            {
                                anotherText: `{"object1":{"passphrase":"${mask}"},"passphrase":{"cipherText":"${mask}"}}`,
                                oneMoreText: `{\n    "object1": {\n        "passphrase": "${mask}"\n    },\n    "passphrase": {\n        "cipherText": "${mask}"\n    }\n}`,
                                passphrase: mask,
                                passphrase2: {
                                    cipherText: mask
                                },
                                text: `{"cipherText":"${mask}",`
                                    + `"passphrase":"${mask}",`
                                    + `"passphrase1":{"cipherText":"${mask}"}`
                                    + '}'
                            }], 'should not modify message when secrets masked already')
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

            it('should break circular ref', () => {
                const root = { level1: {} };
                root.level1.ref = root;

                return tracerInst.write(root)
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile),
                            addTimestamps([{
                                level1: {
                                    ref: 'circularRefFound'
                                }
                            }])
                        );
                        assert.isTrue(root.level1.ref === root, 'should not modify original object');
                    });
            });

            it('should batch multiple .write attempts into one', () => {
                const readSpy = sinon.spy(fs, 'read');
                const writeSpy = sinon.spy(fs, 'write');

                const p1 = tracerInst.write('test1');
                tracerInst.write('test2');
                tracerInst.write('test3');
                tracerInst.write('test4');
                tracerInst.write('test5');
                tracerInst.write('test6');
                return p1.then(() => {
                    assert.sameDeepMembers(
                        readTraceFile(tracerFile).map((d) => d.data),
                        ['test1', 'test2', 'test3', 'test4', 'test5', 'test6'],
                        'should write data to file'
                    );
                    assert.lengthOf(
                        readSpy.args.filter((args) => args[0] === tracerInst.fd),
                        0,
                        'should not read file with 0 bytes'
                    );
                    assert.lengthOf(
                        writeSpy.args.filter((args) => args[0] === tracerInst.fd),
                        1,
                        'should write file just once'
                    );

                    const p2 = tracerInst.write('test1');
                    tracerInst.write('test2');
                    tracerInst.write('test3');
                    tracerInst.write('test4');
                    tracerInst.write('test5');
                    tracerInst.write('test6');

                    return p2;
                })
                    .then(() => {
                        assert.sameDeepMembers(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test3', 'test4', 'test5', 'test6', 'test1', 'test2', 'test3', 'test4', 'test5', 'test6'],
                            'should write data to file'
                        );
                        assert.lengthOf(
                            readSpy.args.filter((args) => args[0] === tracerInst.fd),
                            1,
                            'should read file just once (second attempt to write brach request)'
                        );
                        assert.lengthOf(
                            writeSpy.args.filter((args) => args[0] === tracerInst.fd),
                            2,
                            'should write file just once (second attempt to write brach request)'
                        );
                    });
            });
        });

        describe('.stop()', () => {
            it('should not fail when unable to close file using descriptor', () => {
                sinon.stub(utilMisc.fs, 'close').rejects(new Error('close error'));
                coreStub.logger.removeAllMessages();
                return tracerInst.write('test')
                    .then(() => tracerInst.stop())
                    .then((err) => {
                        assert.isUndefined(err, 'should return no error');
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Closing stream to file/gm,
                            'should log debug message on file closing'
                        );
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Unable to close file[\s\S]*close error/gm,
                            'should log debug message with error'
                        );
                        assert.isTrue(tracerInst.disabled, 'should be disabled');
                        assert.isFalse(tracerInst.suspended, 'should not be suspended');
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
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /Closing stream to file/gm,
                        'should log debug message on file closing'
                    );
                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /Stopping stream to file/g,
                        'should log debug message when stopped'
                    );
                    assert.isTrue(tracerInst.disabled, 'should disabled tracer once stopped');
                    assert.isFalse(tracerInst.suspended, 'should not be suspended');
                    assert.notExists(tracerInst.fd, 'should have not fd once stopped');
                    return tracerInst.write('test2');
                })
                .then(() => {
                    assert.deepStrictEqual(
                        readTraceFile(tracerFile),
                        addTimestamps(['test'])
                    );
                    assert.isTrue(tracerInst.disabled, 'should disabled tracer once stopped');
                    assert.isFalse(tracerInst.suspended, 'should not be suspended');
                    assert.notExists(tracerInst.fd, 'should have not fd once stopped');

                    coreStub.logger.removeAllMessages();
                    return tracerInst.stop();
                })
                .then(() => {
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /Stopping stream to file/g,
                        'should not log debug message when stopped already'
                    );
                    assert.notIncludeMatch(
                        coreStub.logger.messages.debug,
                        /Closing stream to file/gm,
                        'should not log debug message when closed already'
                    );
                }));

            it('should stop inactivity timer', () => {
                const fakeClock = stubs.clock();
                return tracerInst.write('test')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test'],
                            'should write data to file'
                        );
                        return tracerInst.stop();
                    })
                    .then(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Inactivity timer deactivated/gm,
                            'should log debug message on timer deactivation'
                        );
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Closing stream to file/gm,
                            'should log debug message on file closing'
                        );
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Stopping stream to file/g,
                            'should log debug message when stopped'
                        );
                        fakeClock.clockForward(1000, { repeat: 31, promisify: true });
                        return testUtil.sleep(31 * 1000);
                    })
                    .then(() => {
                        assert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Suspending stream to file/gm,
                            'should not log debug message when stopped already'
                        );
                        assert.isTrue(tracerInst.disabled, 'should be disabled');
                        assert.isFalse(tracerInst.suspended, 'should not be suspended');

                        return tracerInst.write('test-2');
                    })
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test'],
                            'should not write new data once closed'
                        );
                    });
            });
        });

        describe('.suspend', () => {
            it('should suspend and resume writing operations', () => {
                assert.isFalse(tracerInst.suspended, 'should not be suspended');
                return tracerInst.write('test')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test'],
                            'should write data to file'
                        );
                        return tracerInst.suspend();
                    })
                    .then(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Suspending stream to file.*suspend\(\)/gm,
                            'should log debug message on attempt to suspend tracer'
                        );
                        assert.isTrue(tracerInst.suspended, 'should be suspended');
                        return tracerInst.write('test2');
                    })
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test', 'test2'],
                            'should write data to file'
                        );
                        assert.isFalse(tracerInst.suspended, 'should not be suspended');
                    });
            });

            it('should not change state once disabled', () => {
                assert.isFalse(tracerInst.suspended, 'should not be suspended');
                assert.isFalse(tracerInst.disabled, 'should not be disabled');
                return tracerInst.write('test')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test'],
                            'should write data to file'
                        );
                        return tracerInst.stop();
                    })
                    .then(() => {
                        assert.isFalse(tracerInst.suspended, 'should not be suspended');
                        assert.isTrue(tracerInst.disabled, 'should be disabled');
                        return tracerInst.suspend();
                    })
                    .then(() => {
                        assert.isFalse(tracerInst.suspended, 'should not be suspended');
                        assert.isTrue(tracerInst.disabled, 'should be disabled');
                        return tracerInst.write('test2');
                    })
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test'],
                            'should not write new data to file'
                        );
                        assert.isFalse(tracerInst.suspended, 'should not be suspended');
                        assert.isTrue(tracerInst.disabled, 'should be disabled');
                    });
            });

            it('should behave write data in multi-call situation', () => {
                assert.isFalse(tracerInst.suspended, 'should not be suspended');
                return Promise.all([
                    tracerInst.write('test1'),
                    tracerInst.write('test2'),
                    tracerInst.write('test3'),
                    tracerInst.suspend(),
                    tracerInst.write('test4'),
                    tracerInst.write('test5'),
                    tracerInst.suspend(),
                    tracerInst.write('test6')
                ])
                    .then(() => {
                        assert.sameDeepMembers(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test1', 'test2', 'test3', 'test4', 'test5', 'test6'],
                            'should write data to file'
                        );
                    });
            });
        });

        describe('suspend due inactivity', () => {
            it('should suspend tracer due inactivity and resume it on attempt to write data', () => {
                const closeSpy = sinon.spy(utilMisc.fs, 'close');
                const fakeClock = stubs.clock();
                tracerInst = tracer.create(tracerFile);
                assert.deepStrictEqual(tracerInst.inactivityTimeout, 900, 'should set default inactivity timeout');
                return tracerInst.write('test-1')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test-1'],
                            'should write new data'
                        );
                        fakeClock.clockForward(60 * 1000, { repeat: 14, promisify: true });
                        return testUtil.sleep(14 * 60 * 1000);
                    })
                    .then(() => {
                        assert.deepStrictEqual(closeSpy.callCount, 0, 'should not call fs.close yet');
                        assert.isFalse(tracerInst.disabled, 'should not be disabled');
                        assert.isFalse(tracerInst.suspended, 'should not be suspended');
                        return tracerInst.write('test-2');
                    })
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test-1', 'test-2'],
                            'should write new data'
                        );
                        fakeClock.clockForward(60 * 1000, { repeat: 16, promisify: true });
                        return testUtil.sleep(16 * 60 * 1000);
                    })
                    .then(() => {
                        assert.deepStrictEqual(closeSpy.callCount, 1, 'should call fs.close');
                        assert.isFalse(tracerInst.disabled, 'should not be disabled');
                        assert.isTrue(tracerInst.suspended, 'should be suspended');

                        return tracerInst.write('test-3');
                    })
                    .then(() => {
                        assert.isFalse(tracerInst.disabled, 'should not be disabled');
                        assert.isFalse(tracerInst.suspended, 'should not be suspended');
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test-1', 'test-2', 'test-3'],
                            'should write new data'
                        );
                        fakeClock.clockForward(60 * 1000, { repeat: 16, promisify: true });
                        return testUtil.sleep(16 * 60 * 1000);
                    })
                    .then(() => {
                        assert.deepStrictEqual(closeSpy.callCount, 2, 'should call fs.close again');
                        assert.isFalse(tracerInst.disabled, 'should not be disabled');
                        assert.isTrue(tracerInst.suspended, 'should be suspended');

                        return tracerInst.stop();
                    })
                    .then(() => tracerInst.write('test-4'))
                    .then(() => {
                        assert.isTrue(tracerInst.disabled, 'should be disabled');
                        assert.isFalse(tracerInst.suspended, 'should not be suspended');
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test-1', 'test-2', 'test-3'],
                            'should not write new data once stopped'
                        );
                    });
            });

            it('should not fail when unable to start inactivity timer', () => {
                sinon.stub(timers.BasicTimer.prototype, 'start')
                    .callsFake(function () {
                        return timers.BasicTimer.prototype.start.wrappedMethod.call(this);
                    })
                    .onFirstCall()
                    .callsFake(() => Promise.reject(new Error('expected error')));

                const fakeClock = stubs.clock();

                return tracerInst.write('test-1')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test-1'],
                            'should write new data'
                        );
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Unable to start inactivity timer[\s\S]*expected error/g,
                            'should log debug message when failed'
                        );
                        coreStub.logger.removeAllMessages();
                        return tracerInst.write('test-2');
                    })
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test-1', 'test-2'],
                            'should write new data'
                        );
                        assert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Unable to start inactivity timer[\s\S]*expected error/g,
                            'should not log debug message'
                        );
                        fakeClock.clockForward(60 * 1000, { repeat: 16, promisify: true });
                        return testUtil.sleep(16 * 60 * 1000);
                    })
                    .then(() => {
                        assert.isFalse(tracerInst.disabled, 'should not be disabled');
                        assert.isTrue(tracerInst.suspended, 'should be suspended');
                    });
            });

            it('should not fail when unable to stop inactivity timer', () => {
                sinon.stub(timers.BasicTimer.prototype, 'stop')
                    .callsFake(function () {
                        return timers.BasicTimer.prototype.stop.wrappedMethod.call(this);
                    })
                    .onFirstCall()
                    .callsFake(() => Promise.reject(new Error('expected error')));

                const fakeClock = stubs.clock();

                return tracerInst.write('test-1')
                    .then(() => {
                        assert.deepStrictEqual(
                            readTraceFile(tracerFile).map((d) => d.data),
                            ['test-1'],
                            'should write new data'
                        );
                        fakeClock.clockForward(60 * 1000, { repeat: 16, promisify: true });
                        return testUtil.sleep(16 * 60 * 1000);
                    })
                    .then(() => {
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Error on attempt to deactivate the inactivity timer[\s\S]*expected error/g,
                            'should log debug message when failed'
                        );
                        coreStub.logger.removeAllMessages();
                        fakeClock.clockForward(60 * 1000, { repeat: 16, promisify: true });
                        return testUtil.sleep(16 * 60 * 1000);
                    })
                    .then(() => {
                        assert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Error on attempt to deactivate the inactivity timer[\s\S]*expected error/g,
                            'should have no error message'
                        );
                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Inactivity timer deactivated/g,
                            'should log debug message'
                        );
                        assert.isFalse(tracerInst.disabled, 'should not be disabled');
                        assert.isTrue(tracerInst.suspended, 'should be suspended');
                    });
            });
        });

        describe('data actions', () => {
            it('should add data actions and reset to default state', () => {
                const dataAction = (data) => {
                    data.changed = true;
                    return data;
                };
                tracerInst.addDataAction(dataAction);

                const mask = '*********';
                const data = {
                    text: JSON.stringify({ cipherText: 'test_passphrase_1' }),
                    passphrase: {
                        cipherText: 'test_passphrase_2'
                    }
                };
                return tracerInst.write(data)
                    .then(() => {
                        const traceData = readTraceFile(tracerFile);
                        assert.deepStrictEqual(
                            traceData,
                            addTimestamps([{
                                changed: true,
                                passphrase: mask,
                                text: `{"cipherText":"${mask}"}`
                            }]),
                            'should apply user-define data action'
                        );
                        tracerInst.resetDataActions();
                        return tracerInst.write(data);
                    })
                    .then(() => {
                        const traceData = readTraceFile(tracerFile);
                        assert.deepStrictEqual(
                            traceData,
                            addTimestamps([
                                {
                                    changed: true,
                                    passphrase: mask,
                                    text: `{"cipherText":"${mask}"}`
                                },
                                {
                                    passphrase: mask,
                                    text: `{"cipherText":"${mask}"}`
                                }
                            ]),
                            'should apply default actions after reset'
                        );
                    });
            });
        });
    });
});
