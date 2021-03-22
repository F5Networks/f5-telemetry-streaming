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

const constants = require('../../../src/lib/constants');
const util = require('../../../src/lib/utils/misc');
const tracers = require('../../../src/lib/utils/tracer');

chai.use(chaiAsPromised);
const assert = chai.assert;


describe('Tracer Util', () => {
    const tracerDir = `${os.tmpdir()}/telemetry`; // os.tmpdir for windows + linux
    const tracerFile = `${tracerDir}/tracerTest`;
    const fakeDate = new Date();
    let clock;
    let config;
    let tracer;

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
        if (fs.existsSync(tracerDir)) {
            emptyDir(tracerDir);
        }
        config = {
            class: 'class',
            traceName: 'obj',
            trace: tracerFile
        };
        tracer = tracers.fromConfig(config);
        clock = sinon.useFakeTimers(fakeDate);
    });

    afterEach(() => tracers.unregisterAll()
        .then(() => {
            sinon.restore();
            clock.restore();
        }));

    after(() => {
        removeDir(tracerDir);
    });

    it('should create tracer using default location and write data to it', () => {
        sinon.stub(constants.TRACER, 'DIR').value(tracerDir);
        tracer = tracers.fromConfig({ class: 'class2', traceName: 'obj2', trace: true });
        return tracer.write('foobar')
            .then(() => {
                assert.deepStrictEqual(
                    readTraceFile(`${tracerDir}/class2.obj2`),
                    addTimestamps(['foobar'])
                );
            });
    });

    it('should try to create parent directory', () => {
        sinon.stub(constants.TRACER, 'DIR').value('/test/inaccessible/directory');
        sinon.stub(util.fs, 'mkdir').resolves();
        tracer = tracers.fromConfig({ class: 'class2', traceName: 'obj2', trace: true });
        return tracer.write('foobar')
            .then(() => {
                assert.isAbove(util.fs.mkdir.callCount, 0, 'should call util.fs.mkdir');
                assert.strictEqual(util.fs.mkdir.args[0][0], '/test/inaccessible/directory');
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
                promises.push(tracer.write(totalRecords));
                writtenData.push(totalRecords);
            }
            return Promise.all(promises).then(() => writtenData);
        };
        const getExpectedData = data => addTimestamps(data.slice(data.length - constants.TRACER.LIST_SIZE));
        const validateTracerData = (writtenData) => {
            allWrittenData = allWrittenData.concat(writtenData);
            const data = readTraceFile(tracerFile);
            assert.strictEqual(data.length, constants.TRACER.LIST_SIZE);
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
        const writePromise = tracer.write(data);
        data.push(4);
        return writePromise.then(() => {
            assert.deepStrictEqual(
                readTraceFile(tracerFile),
                addTimestamps([[1, 2, 3]])
            );
        });
    });

    it('should merge new data with existing data', () => tracer.write('item1')
        .then(() => {
            assert.deepStrictEqual(
                readTraceFile(tracerFile),
                addTimestamps(['item1'])
            );
            return tracer.write('item2');
        })
        .then(() => {
            assert.deepStrictEqual(
                readTraceFile(tracerFile),
                addTimestamps(['item1', 'item2'])
            );
        }));

    it('should not fail if unable to parse existing data', () => tracer.write('item1')
        .then(() => {
            fs.truncateSync(tracerFile, 0);
            fs.writeFileSync(tracerFile, '{test');
            return tracer.write('item1');
        })
        .then(() => {
            assert.deepStrictEqual(
                readTraceFile(tracerFile),
                addTimestamps(['item1'])
            );
        }));

    it('should write not more data when disabled', () => tracer.write('item1')
        .then(() => tracer.stop())
        .then(() => tracer.write('item2'))
        .then(() => {
            assert.deepStrictEqual(
                readTraceFile(tracerFile),
                addTimestamps(['item1'])
            );
        }));

    it('should complete scheduled operations before stop', () => {
        tracer.write('item1');
        return tracer.stop()
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
        return tracer.write(util.deepCopy(expectedObject))
            .then(() => {
                assert.deepStrictEqual(
                    readTraceFile(tracerFile),
                    addTimestamps([expectedObject])
                );
            });
    });

    it('should return registered tracers', () => {
        const tracer2 = tracers.fromConfig({ class: 'class', traceName: 'tracer2', trace: true });
        const tracer3 = tracers.fromConfig({ class: 'class', traceName: 'tracer3', trace: true });
        const registered = tracers.registered();

        assert.strictEqual(registered.length, 3, 'should register 3 tracers');
        assert.include(registered, tracer, 'should register tracer');
        assert.include(registered, tracer2, 'should register tracer');
        assert.include(registered, tracer3, 'should register tracer');
    });

    it('should unregister tracer', () => tracers.unregister(tracer)
        .then(() => {
            assert.notInclude(tracers.registered(), tracer, 'should unregister tracer');
            assert.isTrue(tracer.disabled, 'should be disabled once unregistered');
        }));

    it('should unregister all tracers', () => {
        const tracer2 = tracers.fromConfig({ class: 'class', traceName: 'tracer2', trace: true });
        const tracer3 = tracers.fromConfig({ class: 'class', traceName: 'tracer3', trace: true });
        assert.strictEqual(tracers.registered().length, 3, 'should register 3 tracers');
        return tracers.unregisterAll()
            .then(() => {
                assert.strictEqual(tracers.registered().length, 0, 'should have no registered tracers');
                assert.isTrue(tracer.disabled, 'should be disabled once unregistered');
                assert.isTrue(tracer2.disabled, 'should be disabled once unregistered');
                assert.isTrue(tracer3.disabled, 'should be disabled once unregistered');
            });
    });

    it('should get existing tracer using similar config', () => {
        let sameTracer;
        return tracer.write('somethings')
            .then(() => {
                sameTracer = tracers.fromConfig({ class: 'class', traceName: 'obj', trace: tracerFile });
                return sameTracer.write('something3');
            })
            .then(() => {
                assert.notStrictEqual(sameTracer.fd, undefined, 'should set fd');
                assert.strictEqual(sameTracer.fd, tracer.fd, 'fd should be the same');
            });
    });

    it('should not create trace when component or/and trace disabled', () => {
        assert.isNull(tracers.fromConfig({
            class: 'class', traceName: 'obj', trace: tracerFile, enable: false
        }));
        assert.isNull(tracers.fromConfig({
            class: 'class', traceName: 'obj', trace: false, enable: false
        }));
        assert.isNull(tracers.fromConfig({
            class: 'class', traceName: 'obj', trace: true, enable: false
        }));
        assert.isNull(tracers.fromConfig({
            class: 'class', traceName: 'obj', trace: false, enable: true
        }));
    });

    it('should stop and create tracer using similar config when path changed', () => {
        let sameTracer;
        return tracer.write('somethings')
            .then(() => {
                sameTracer = tracers.fromConfig({ class: 'class', traceName: 'obj', trace: `${tracerFile}new` });
                return sameTracer.write('something3');
            })
            .then(() => {
                assert.notStrictEqual(sameTracer.fd, undefined, 'should set fd');
                assert.notStrictEqual(sameTracer.fd, tracer.fd, 'fd should not be the same');
                assert.isTrue(tracer.disabled, 'should disable pre-existing tracer');
                assert.isFalse(sameTracer.disabled, 'should not disable new tracer');

                const registered = tracers.registered();
                assert.notInclude(registered, tracer, 'should unregister pre-existing tracer');
                assert.include(registered, sameTracer, 'should register new tracer');
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
        return tracer.write(data)
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
                return tracer.write(traceData[0].data);
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
                return tracer.write(data[0]);
            });
    });
});
