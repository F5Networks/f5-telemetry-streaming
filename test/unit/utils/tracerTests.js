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
const Tracer = require('../../../src/lib/utils/tracer').Tracer;

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
            trace: tracerFile
        };
        tracer = Tracer.createFromConfig('class', 'obj', config);
        clock = sinon.useFakeTimers(fakeDate);
    });

    afterEach(() => {
        sinon.restore();
        clock.restore();
        return Tracer.remove(() => true);
    });

    after(() => {
        removeDir(tracerDir);
    });

    it('should create tracer using default location and write data to it', () => {
        sinon.stub(constants.TRACER, 'DIR').value(tracerDir);
        tracer = Tracer.createFromConfig('class2', 'obj2', { trace: true });
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
        tracer = Tracer.createFromConfig('class2', 'obj2', { trace: true });
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

    it('should remove tracer', () => {
        Tracer.remove(tracer);
        assert.strictEqual(Tracer.instances[tracer.name], undefined);
    });

    it('should remove tracer by name', () => {
        Tracer.remove(tracer.name);
        assert.strictEqual(Tracer.instances[tracer.name], undefined);
    });

    it('should remove tracer by filter', () => {
        Tracer.remove(t => t.name === tracer.name);
        assert.strictEqual(Tracer.instances[tracer.name], undefined);
    });

    it('should get existing tracer by the name', () => assert.isFulfilled(
        tracer.write('somethings')
            .then(() => {
                const sameTracer = Tracer.createFromConfig('class', 'obj', config);
                return sameTracer.write('something3')
                    .then(() => Promise.resolve(sameTracer));
            })
            .then((sameTracer) => {
                assert.notStrictEqual(sameTracer.fd, undefined, 'should set fd');
                assert.strictEqual(sameTracer.fd, tracer.fd, 'fd should be the sane');
            })
    ));

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
