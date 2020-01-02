/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

const constants = require('../../src/lib/constants.js');

/* eslint-disable global-require */

describe('Util', () => {
    let util;
    let request;

    const setupRequestMock = (res, body, mockOpts) => {
        mockOpts = mockOpts || {};
        ['get', 'post', 'delete'].forEach((method) => {
            request[method] = (opts, cb) => {
                cb(mockOpts.err, res, mockOpts.toJSON === false ? body : JSON.stringify(body));
            };
        });
    };

    before(() => {
        util = require('../../src/lib/util.js');
        request = require('request');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should stringify object', () => {
        const obj = {
            foo: 'bar'
        };
        const newObj = util.stringify(obj);
        assert.notStrictEqual(newObj.indexOf('{"foo":"bar"}'), -1);
    });

    it('should stringify object', () => {
        const obj = {
            name: 'foo'
        };
        const stringifiedObj = util.stringify(obj);
        assert.deepEqual(stringifiedObj, '{"name":"foo"}');
    });

    it('should format data by class', () => {
        const obj = {
            my_item: {
                class: 'Consumer'
            }
        };
        const expectedObj = {
            Consumer: {
                my_item: {
                    class: 'Consumer'
                }
            }
        };
        const formattedObj = util.formatDataByClass(obj);
        assert.deepEqual(formattedObj, expectedObj);
    });

    it('should format data by class', () => {
        const obj = {
            my_item: {
                class: 'Consumer'
            }
        };
        const expectedObj = {
            Consumer: {
                my_item: {
                    class: 'Consumer'
                }
            }
        };
        const formattedObj = util.formatDataByClass(obj);
        assert.deepEqual(formattedObj, expectedObj);
    });

    it('should format config', () => {
        const obj = {
            my_item: {
                class: 'Consumer'
            }
        };
        const expectedObj = {
            Consumer: {
                my_item: {
                    class: 'Consumer'
                }
            }
        };
        const formattedObj = util.formatConfig(obj);
        assert.deepEqual(formattedObj, expectedObj);
    });

    it('should make request', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody);

        return util.makeRequest('example.com', '/', {})
            .then((data) => {
                assert.deepEqual(data, mockBody);
                return Promise.resolve();
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail request', () => {
        const mockRes = { statusCode: 404, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody);

        return util.makeRequest('example.com', '/', {})
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/Bad status code/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should fail request with error', () => {
        const mockRes = { statusCode: 404, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody, { err: new Error('test error') });

        return util.makeRequest('example.com', '/', {})
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/HTTP error/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should return non-JSON body', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = '{someInvalidJSONData';
        setupRequestMock(mockRes, mockBody, { toJSON: false });

        return util.makeRequest('example.com', '/', {})
            .then((body) => {
                assert.strictEqual(body, mockBody);
            })
            .catch(err => Promise.reject(err));
    });

    it('should continue on error code for request', () => {
        const mockRes = { statusCode: 404, statusMessage: 'message' };
        const mockBody = { key: 'value' };
        setupRequestMock(mockRes, mockBody);

        return util.makeRequest('example.com', '/', { continueOnErrorCode: true })
            .then(() => Promise.resolve())
            .catch(err => Promise.reject(err));
    });

    it('should base64 decode', () => {
        const string = 'f5string';
        const encString = Buffer.from(string, 'ascii').toString('base64');

        const decString = util.base64('decode', encString);
        assert.strictEqual(decString, string);
    });

    it('should error on incorrect base64 action', () => {
        try {
            util.base64('someaction', 'foo');
            assert.fail('Error expected');
        } catch (err) {
            const msg = err.message || err;
            assert.notStrictEqual(msg.indexOf('Unsupported action'), -1);
        }
    });

    it('should fail network check', () => {
        const host = 'localhost';
        const port = 0;

        return util.networkCheck(host, port)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/networkCheck:/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('should compare version strings', () => {
        assert.throws(
            () => {
                util.compareVersionStrings('14.0', '<>', '14.0');
            },
            (err) => {
                if ((err instanceof Error) && /Invalid comparator/.test(err)) {
                    return true;
                }
                return false;
            },
            'unexpected error'
        );
        assert.strictEqual(util.compareVersionStrings('14.1.0', '>', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '>', '14.1.0'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '<', '14.1.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.1', '>', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '>', '14.1'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '<', '14.1'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '==', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '===', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '<', '14.0'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '<=', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '>', '14.0'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '>=', '14.0'), true);
        assert.strictEqual(util.compareVersionStrings('14.0', '!=', '14.0'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '!==', '14.0'), false);
        assert.strictEqual(util.compareVersionStrings('14.0', '==', '15.0'), false);
        assert.strictEqual(util.compareVersionStrings('15.0', '==', '14.0'), false);
    });

    it('should return response as-is (Buffer) when requested', () => {
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        const mockBody = Buffer.from('something');
        request.get = (opts, cb) => {
            cb(null, mockRes, mockBody);
        };

        const opts = {
            method: 'GET',
            rawResponseBody: true
        };
        return util.makeRequest(constants.LOCAL_HOST, '/', opts)
            .then((res) => {
                assert.ok(mockBody.equals(res), 'should equal to origin Buffer');
            });
    });

    it('should correctly process different args', () => {
        const expectedURI = 'someproto://somehost:someport/someuri';
        const testData = [
            {
                args: [{ fullURI: expectedURI }],
                expected: expectedURI
            },
            {
                args: ['somehost', '/someuri', { protocol: 'someproto', port: 'someport' }],
                expected: expectedURI
            },
            {
                args: ['somehost', { protocol: 'someproto', port: 'someport' }],
                expected: 'someproto://somehost:someport'
            },
            {
                args: ['somehost'],
                expected: 'http://somehost:80'
            }
        ];

        let idx = 0;
        const mockRes = { statusCode: 200, statusMessage: 'message' };
        request.get = (opts, cb) => {
            assert.strictEqual(opts.uri, testData[idx].expected);
            cb(null, mockRes, {});
        };

        function _test() {
            return util.makeRequest.apply(null, testData[idx].args)
                .then(() => {
                    idx += 1;
                    if (idx < testData.length) {
                        return _test();
                    }
                    return Promise.resolve();
                });
        }
        return _test();
    });

    it('should fail when unable to build URI', () => {
        assert.throws(
            () => {
                util.makeRequest({});
            },
            (err) => {
                if ((err instanceof Error) && /makeRequest: No fullURI or host provided/.test(err)) {
                    return true;
                }
                return false;
            },
            'unexpected error'
        );
    });

    it('should have no custom TS options in request options', () => {
        const tsReqOptions = ['rawResponseBody', 'continueOnErrorCode',
            'expectedResponseCode', 'includeResponseObject',
            'port', 'protocol', 'fullURI', 'allowSelfSignedCert', 'returnRequestOnly'
        ];

        const mockRes = { statusCode: 200, statusMessage: 'message' };
        request.get = (opts, cb) => {
            const optsKeys = Object.keys(opts);
            tsReqOptions.forEach((tsOptKey) => {
                assert.ok(optsKeys.indexOf(tsOptKey) === -1, `Found '${tsOptKey} in request options`);
            });
            cb(null, mockRes, {});
        };

        return util.makeRequest('host', { protocol: 'http', port: 456, continueOnErrorCode: true });
    });

    it('should copy object', () => {
        const src = { schedule: { frequency: 'daily', time: { start: '04:20', end: '6:00' } } };
        assert.deepStrictEqual(util.deepCopy(src), src);
    });

    it('should pass empty object check', () => {
        assert.strictEqual(util.isObjectEmpty({}), true, 'empty object');
        assert.strictEqual(util.isObjectEmpty(null), true, 'null');
        assert.strictEqual(util.isObjectEmpty(undefined), true, 'undefined');
        assert.strictEqual(util.isObjectEmpty([]), true, 'empty array');
        assert.strictEqual(util.isObjectEmpty(''), true, 'empty string');
        assert.strictEqual(util.isObjectEmpty(0), true, 'number');
        assert.strictEqual(util.isObjectEmpty({ 1: 1, 2: 2 }), false, 'object');
        assert.strictEqual(util.isObjectEmpty([1, 2, 3]), false, 'array');
    });

    it('should retry at least once', () => {
        let tries = 0;
        // first call + re-try = 2
        const expectedTries = 2;

        const promiseFunc = () => {
            tries += 1;
            return Promise.reject(new Error('expected error'));
        };

        return util.retryPromise(promiseFunc)
            .catch((err) => {
                // in total should be 2 tries - 1 call + 1 re-try
                assert.strictEqual(tries, expectedTries);
                assert.ok(/expected error/.test(err));
            });
    });

    it('should retry rejected promise', () => {
        let tries = 0;
        const maxTries = 3;
        const expectedTries = maxTries + 1;

        const promiseFunc = () => {
            tries += 1;
            return Promise.reject(new Error('expected error'));
        };

        return util.retryPromise(promiseFunc, { maxTries })
            .catch((err) => {
                // in total should be 4 tries - 1 call + 3 re-try
                assert.strictEqual(tries, expectedTries);
                assert.ok(/expected error/.test(err));
            });
    });

    it('should call callback on retry', () => {
        let callbackFlag = false;
        let callbackErrFlag = false;
        let tries = 0;
        let cbTries = 0;
        const maxTries = 3;
        const expectedTries = maxTries + 1;

        const callback = (err) => {
            cbTries += 1;
            callbackErrFlag = /expected error/.test(err);
            callbackFlag = true;
            return true;
        };
        const promiseFunc = () => {
            tries += 1;
            return Promise.reject(new Error('expected error'));
        };

        return util.retryPromise(promiseFunc, { maxTries, callback })
            .catch((err) => {
                // in total should be 4 tries - 1 call + 3 re-try
                assert.strictEqual(tries, expectedTries);
                assert.strictEqual(cbTries, maxTries);
                assert.ok(/expected error/.test(err));
                assert.ok(callbackErrFlag);
                assert.ok(callbackFlag);
            });
    });

    it('should stop retry on success', () => {
        let tries = 0;
        const maxTries = 3;
        const expectedTries = 2;

        const promiseFunc = () => {
            tries += 1;
            if (tries === expectedTries) {
                return Promise.resolve('success');
            }
            return Promise.reject(new Error('expected error'));
        };

        return util.retryPromise(promiseFunc, { maxTries })
            .then((data) => {
                assert.strictEqual(tries, expectedTries);
                assert.strictEqual(data, 'success');
            });
    });

    it('should retry with delay', () => {
        const timestamps = [];
        const maxTries = 3;
        const expectedTries = maxTries + 1;
        const delay = 200;

        const promiseFunc = () => {
            timestamps.push(Date.now());
            return Promise.reject(new Error('expected error'));
        };

        return util.retryPromise(promiseFunc, { maxTries, delay })
            .catch((err) => {
                assert.ok(/expected error/.test(err));
                assert.ok(timestamps.length === expectedTries,
                    `Expected ${expectedTries} timestamps, got ${timestamps.length}`);

                for (let i = 1; i < timestamps.length; i += 1) {
                    const actualDelay = timestamps[i] - timestamps[i - 1];
                    // sometimes it is less than expected
                    assert.ok(actualDelay >= delay * 0.9,
                        `Actual delay (${actualDelay}) is less than expected (${delay})`);
                }
            });
    }).timeout(2000);

    it('should retry first time without backoff', () => {
        const timestamps = [];
        const maxTries = 3;
        const expectedTries = maxTries + 1;
        const delay = 200;
        const backoff = 100;

        const promiseFunc = () => {
            timestamps.push(Date.now());
            return Promise.reject(new Error('expected error'));
        };

        return util.retryPromise(promiseFunc, { maxTries, delay, backoff })
            .catch((err) => {
                assert.ok(/expected error/.test(err));
                assert.ok(timestamps.length === expectedTries,
                    `Expected ${expectedTries} timestamps, got ${timestamps.length}`);

                for (let i = 1; i < timestamps.length; i += 1) {
                    const actualDelay = timestamps[i] - timestamps[i - 1];
                    let expectedDelay = delay;
                    // first attempt should be without backoff factor
                    if (i > 1) {
                        /* eslint-disable no-restricted-properties */
                        expectedDelay += backoff * Math.pow(2, i - 1);
                    }
                    assert.ok(actualDelay >= expectedDelay * 0.9,
                        `Actual delay (${actualDelay}) is less than expected (${expectedDelay})`);
                }
            });
    }).timeout(10000);

    describe('.getConsumerClasses', () => {
        it('should return empty consumer object', () => {
            const result = util.getConsumerClasses({});
            assert.deepEqual(result, { consumers: {} });
        });

        it('should return object with count of consumer classes', () => {
            const declaration = {
                class1: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP'
                },
                class2: {
                    class: 'Telemetry_Consumer',
                    type: 'Splunk'
                },
                class3: {
                    class: 'Telemetry_Consumer',
                    type: 'Azure_Log_Analytics'
                },
                class4: {
                    class: 'Telemetry_Consumer',
                    type: 'Graphite'
                },
                class5: {
                    class: 'Telemetry_Consumer',
                    type: 'Kafka'
                },
                class6: {
                    class: 'Telemetry_Consumer',
                    type: 'ElasticSearch'
                },
                class7: {
                    class: 'Telemetry_Consumer',
                    type: 'Generic_HTTP'
                },
                class8: {
                    class: 'Telemetry_Consumer',
                    type: 'Azure_Log_Analytics'
                },
                class9: {
                    class: 'Telemetry_Consumer',
                    type: 'Azure_Log_Analytics'
                }
            };
            const expected = {
                consumers: {
                    Generic_HTTP: 2,
                    Splunk: 1,
                    Azure_Log_Analytics: 3,
                    Graphite: 1,
                    Kafka: 1,
                    ElasticSearch: 1
                }
            };
            const result = util.getConsumerClasses(declaration);
            assert.deepEqual(result, expected);
        });
    });

    it('should return random number from range', () => {
        const left = -5;
        const right = 5;

        for (let i = 0; i < 100; i += 1) {
            const randNumber = util.getRandomArbitrary(left, right);
            assert.ok(left <= randNumber && randNumber <= right, `${randNumber} should be in range ${left}:${right}`);
        }
    });
});

describe('validate renameKeys function', () => {
    let util;

    before(() => {
        util = require('../../src/lib/util.js');
    });

    it('should rename using regex literal', () => {
        const target = {
            brightredtomato: {
                a: 1,
                redcar: {
                    b: 2,
                    paintitred: {
                        c: 3
                    }
                }
            }
        };
        util.renameKeys(target, /red/, 'green');

        assert.strictEqual(Object.keys(target).length, 1);
        assert.strictEqual(Object.keys(target.brightgreentomato).length, 2);
        assert.strictEqual(target.brightgreentomato.a, 1);
        assert.strictEqual(Object.keys(target.brightgreentomato.greencar).length, 2);
        assert.strictEqual(target.brightgreentomato.greencar.b, 2);
        assert.strictEqual(Object.keys(target.brightgreentomato.greencar.paintitgreen).length, 1);
        assert.strictEqual(target.brightgreentomato.greencar.paintitgreen.c, 3);
    });

    it('regex flag - first instance only', () => {
        const target = {
            brightredredredtomato: { a: 1 }
        };
        util.renameKeys(target, /red/, 'green');

        assert.strictEqual(Object.keys(target).length, 1);
        assert.strictEqual(target.brightgreenredredtomato.a, 1);
    });

    it('first instance only, case insensitive', () => {
        const target = {
            brightRedTomato: { a: 1 }
        };
        util.renameKeys(target, /red/i, 'green');

        assert.strictEqual(Object.keys(target).length, 1);
        assert.strictEqual(target.brightgreenTomato.a, 1);
    });

    it('globally', () => {
        const target = {
            brightredredtomato: { a: 1 }
        };
        util.renameKeys(target, /red/g, 'green');

        assert.strictEqual(Object.keys(target).length, 1);
        assert.strictEqual(target.brightgreengreentomato.a, 1);
    });

    it('globally and case insensitive', () => {
        const target = {
            brightRedrEdreDtomato: { a: 1 }
        };
        util.renameKeys(target, /red/ig, 'green');

        assert.strictEqual(Object.keys(target).length, 1);
        assert.strictEqual(target.brightgreengreengreentomato.a, 1);
    });

    it('character group', () => {
        const target = {
            bearclaw: { a: 1 },
            teardrop: { b: 2 },
            dearjohn: { c: 3 }
        };
        util.renameKeys(target, /[bt]ear/, 'jelly');

        assert.strictEqual(Object.keys(target).length, 3);
        assert.strictEqual(target.jellyclaw.a, 1);
        assert.strictEqual(target.jellydrop.b, 2);
        assert.strictEqual(target.dearjohn.c, 3);
    });

    it('negated character group', () => {
        const target = {
            bearclaw: { a: 1 },
            teardrop: { b: 2 },
            dearjohn: { c: 3 }
        };
        util.renameKeys(target, /[^bt]ear/, 'jelly');

        assert.strictEqual(Object.keys(target).length, 3);
        assert.strictEqual(target.bearclaw.a, 1);
        assert.strictEqual(target.teardrop.b, 2);
        assert.strictEqual(target.jellyjohn.c, 3);
    });
});

// purpose: validate util (tracer)
describe('Util (Tracer)', () => {
    let util;
    let config;
    const tracerFile = `${os.tmpdir()}/telemetry`; // os.tmpdir for windows + linux

    before(() => {
        util = require('../../src/lib/util.js');
    });
    beforeEach(() => {
        config = {
            trace: tracerFile
        };
        if (fs.existsSync(tracerFile)) {
            fs.unlinkSync(tracerFile);
        }
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should write to tracer', () => {
        const msg = 'foobar';
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        let error;
        return tracer.write(msg)
            .then(() => {
                const contents = fs.readFileSync(tracerFile, 'utf8');
                assert.strictEqual(msg, contents);
            })
            .catch((err) => {
                error = err;
            })
            .then(() => {
                util.tracer.remove(tracer); // cleanup, otherwise will not exit
                if (error) {
                    return Promise.reject(error);
                }
                return Promise.resolve(error);
            });
    });

    it('should accept no data', () => {
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        return tracer.write(null);
    });

    it('should get existing tracer by the name', () => {
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        let tracer2;
        let error;

        return tracer.write('somethings')
            .then(() => {
                tracer2 = util.tracer.createFromConfig('class', 'obj', config);
                return tracer2.write('something3');
            })
            .then(() => {
                assert.strictEqual(tracer2.inode, tracer.inode, 'inode should be the sane');
                assert.strictEqual(tracer2.stream.fd, tracer.stream.fd, 'fd should be the same');
            })
            .catch((err) => {
                error = err;
            })
            .then(() => {
                util.tracer.remove(tracer); // cleanup, otherwise will not exit
                if (tracer2) {
                    util.tracer.remove(tracer2); // cleanup, otherwise will not exit
                }

                if (error) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });
    });

    it('should remove tracer by name', () => {
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        util.tracer.remove(tracer.name);
        assert.strictEqual(util.tracer.instances[tracer.name], undefined);
    });

    it('should remove tracer by filter', () => {
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        util.tracer.remove(null, t => t.name === tracer.name);
        assert.strictEqual(util.tracer.instances[tracer.name], undefined);
    });

    it('should truncate file', () => {
        const tracer = util.tracer.createFromConfig('class', 'obj', config);
        const expectedData = 'expectedData';
        let error;

        return tracer.write(expectedData)
            .then(() => {
                const contents = fs.readFileSync(tracerFile, 'utf8');
                assert.strictEqual(contents, expectedData);
                return tracer._truncate();
            }).then(() => {
                const contents = fs.readFileSync(tracerFile, 'utf8');
                assert.strictEqual(contents, '');
                return tracer.write(expectedData);
            })
            .then(() => {
                const contents = fs.readFileSync(tracerFile, 'utf8');
                assert.strictEqual(contents, expectedData);
            })
            .catch((err) => {
                error = err;
            })
            .then(() => {
                util.tracer.remove(tracer); // cleanup, otherwise will not exit

                if (error) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });
    });

    it('should recreate file and dir when deleted', () => {
        const fileName = `${os.tmpdir()}/telemetryTmpDir/telemetry`; // os.tmpdir for windows + linux
        const dirName = path.dirname(fileName);

        const tracerConfig = {
            trace: fileName
        };
        const tracer = util.tracer.createFromConfig('class', 'obj', tracerConfig);
        const expectedData = 'expectedData';
        let error;

        util.tracer.REOPEN_INTERVAL = 500;

        function removeTmpTestDirectory() {
            if (fs.existsSync(dirName)) {
                fs.readdirSync(dirName).forEach((item) => {
                    item = path.join(dirName, item);
                    fs.unlinkSync(item);
                });
                fs.rmdirSync(dirName);
            }
        }

        return tracer.write(expectedData)
            .then(() => {
                const contents = fs.readFileSync(fileName, 'utf8');
                assert.strictEqual(contents, expectedData);
                // remove file and directory
                removeTmpTestDirectory();
                if (fs.existsSync(fileName)) {
                    assert.fail('Should remove file');
                }
                if (fs.existsSync(dirName)) {
                    assert.fail('Should remove directory');
                }
            })
            // re-open should be scheduled in next 1sec
            .then(() => new Promise((resolve) => {
                function check() {
                    fs.exists(fileName, (exists) => {
                        if (exists) {
                            resolve(exists);
                        } else {
                            setTimeout(check, 200);
                        }
                    });
                }
                check();
            }))
            .then(() => {
                const contents = fs.readFileSync(fileName, 'utf8');
                assert.strictEqual(contents, '');
                assert.strictEqual(fs.existsSync(fileName), true, 'File should exists after recreation');
            })
            .catch((err) => {
                error = err;
            })
            .then(() => {
                util.tracer.remove(tracer); // cleanup, otherwise will not exit
                // remove file and directory
                removeTmpTestDirectory();

                if (error) {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            });
    }).timeout(10000);
});
