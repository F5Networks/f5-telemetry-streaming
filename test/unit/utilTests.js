/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const fs = require('fs');
const net = require('net');
const nock = require('nock');
const os = require('os');
const path = require('path');
const request = require('request');
const sinon = require('sinon');

const constants = require('../../src/lib/constants');
const util = require('../../src/lib/util');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Util', () => {
    describe('.start()', () => {
        it('should start function on interval', () => assert.isFulfilled(
            new Promise((resolve) => {
                const intervalID = util.start(
                    (args) => {
                        util.stop(intervalID);
                        assert.strictEqual(args, 'test');
                        resolve();
                    },
                    'test',
                    0.01
                );
            })
        ));
    });

    describe('.update()', () => {
        it('should update function\'s interval', () => assert.isFulfilled(
            new Promise((resolve) => {
                const intervalID = util.start(
                    () => {
                        const newIntervalID = util.update(
                            intervalID,
                            (args) => {
                                util.stop(newIntervalID);
                                assert.strictEqual(args, 'test');
                                resolve();
                            },
                            'test',
                            0.01
                        );
                    },
                    0.01
                );
            })
        ));
    });

    describe('.stop()', () => {
        it('should stop function', () => assert.isFulfilled(
            new Promise((resolve) => {
                const intervalID = util.start(
                    (args) => {
                        util.stop(intervalID);
                        assert.strictEqual(args, 'test');
                        resolve();
                    },
                    'test',
                    0.01
                );
            })
        ));
    });

    describe('.restOperationResponder()', () => {
        it('should complete rest operation', () => {
            const mock = {
                setStatusCode: (code) => {
                    mock.code = code;
                },
                setBody: (body) => {
                    mock.body = body;
                },
                complete: () => {
                    assert.strictEqual(mock.code, 200);
                    assert.strictEqual(mock.body, 'body');
                }
            };
            util.restOperationResponder(mock, 200, 'body');
        });
    });

    describe('.stringify()', () => {
        it('should stringify object', () => {
            assert.strictEqual(
                util.stringify({ foo: 'bar' }),
                '{"foo":"bar"}'
            );
        });

        it('should prettify format when specified', () => {
            assert.strictEqual(
                util.stringify({ test: 'abc' }, true),
                '{\n    "test": "abc"\n}'
            );
        });

        it('should return non-object as is', () => {
            assert.strictEqual(util.stringify(1), 1);
        });

        it('should silently continue when unable to stringify object', () => {
            const obj = { a: 1 };
            obj.b = obj;
            util.stringify(obj);
        });
    });

    describe('.makeRequest()', () => {
        afterEach(() => {
            testUtil.checkNockActiveMocks(nock);
            sinon.restore();
            nock.cleanAll();
        });

        it('should make request with non-defaults', () => {
            nock('https://example.com:443', {
                reqheaders: {
                    'User-Agent': /f5-telemetry/,
                    CustomHeader: 'CustomValue'
                }
            })
                .post('/')
                .reply(200, { key: 'value' });

            const originGet = request.get;
            sinon.stub(request, 'get').callsFake((opts, cb) => {
                assert.strictEqual(opts.strictSSL, false);
                originGet(opts, cb);
            });

            const opts = {
                port: 443,
                protocol: 'https',
                method: 'POST',
                headers: {
                    CustomHeader: 'CustomValue'
                },
                allowSelfSignedCert: true
            };
            return assert.becomes(
                util.makeRequest('example.com', opts),
                { key: 'value' }
            );
        });

        it('should make request with defaults (response code 200)', () => {
            nock('http://example.com', {
                reqheaders: {
                    'User-Agent': /f5-telemetry/
                }
            })
                .get('/')
                .reply(200, { key: 'value' });

            const originGet = request.get;
            sinon.stub(request, 'get').callsFake((opts, cb) => {
                assert.strictEqual(opts.strictSSL, true);
                originGet(opts, cb);
            });
            return assert.becomes(
                util.makeRequest('example.com'),
                { key: 'value' }
            );
        });

        it('should make request (response code 400)', () => {
            nock('http://example.com')
                .get('/')
                .reply(400, { key: 'value' });

            return assert.becomes(
                util.makeRequest('example.com', { expectedResponseCode: 400 }),
                { key: 'value' }
            );
        });

        it('should fail on response with code 400', () => {
            nock('http://example.com')
                .get('/')
                .reply(400, { key: 'value' });

            return assert.isRejected(
                util.makeRequest('example.com'),
                /Bad status code/
            );
        });

        it('should continue on response with code 400 (expected 200 by default)', () => {
            nock('http://example.com')
                .get('/')
                .reply(400, { key: 'value' });

            return assert.becomes(
                util.makeRequest('example.com', { continueOnErrorCode: true }),
                { key: 'value' }
            );
        });

        it('should fail request with error', () => {
            nock('http://example.com')
                .get('/')
                .replyWithError('error message');

            return assert.isRejected(
                util.makeRequest('example.com'),
                /HTTP error:.*error message.*/
            );
        });

        it('should return non-JSON body', () => {
            nock('http://example.com')
                .get('/')
                .reply(200, '{someInvalidJSONData');

            return assert.becomes(
                util.makeRequest('example.com'),
                '{someInvalidJSONData'
            );
        });

        it('should return raw response data (as Buffer)', () => {
            nock('http://example.com')
                .get('/')
                .reply(200, '{"someValidJSONData": 1}');

            return assert.becomes(
                util.makeRequest('example.com', { rawResponseBody: true }),
                Buffer.from('{"someValidJSONData": 1}')
            );
        });

        it('should return parsed data', () => {
            nock('http://example.com')
                .get('/')
                .reply(200, '{"someValidJSONData": 1}');

            return assert.becomes(
                util.makeRequest('example.com'),
                { someValidJSONData: 1 }
            );
        });

        it('should convert request data to string', () => {
            sinon.stub(request, 'get').callsFake((opts, cb) => {
                assert.strictEqual(typeof opts.body, 'string');
                cb(null, { statusCode: 200, statusMessage: 'message' }, {});
            });
            return assert.isFulfilled(util.makeRequest('example.com', { body: { key: 'value' } }));
        });

        it('should return data and response object', () => {
            nock('http://example.com')
                .get('/')
                .reply(200, '{"someValidJSONData": 1}');

            return assert.isFulfilled(
                util.makeRequest('example.com', { includeResponseObject: true })
                    .then((resp) => {
                        assert.strictEqual(resp.length, 2, 'should return array of 2');
                        assert.deepStrictEqual(resp[0], { someValidJSONData: 1 });
                    })
            );
        });

        it('should fail when unable to build URI', () => {
            assert.throws(
                () => util.makeRequest({}),
                /makeRequest: no fullURI or host provided/
            );
        });

        it('should fail when no arguments passed to function', () => {
            assert.throws(
                () => util.makeRequest(),
                /makeRequest: no arguments were passed to function/
            );
        });

        it('should have no custom TS options in request options', () => {
            const tsReqOptions = [
                'allowSelfSignedCert',
                'continueOnErrorCode',
                'expectedResponseCode',
                'fullURI',
                'includeResponseObject',
                'json',
                'port',
                'protocol',
                'rawResponseBody'
            ];
            sinon.stub(request, 'get').callsFake((opts, cb) => {
                const optsKeys = Object.keys(opts);
                tsReqOptions.forEach((tsOptKey) => {
                    assert.ok(optsKeys.indexOf(tsOptKey) === -1, `Found '${tsOptKey}' in request options`);
                });
                cb(null, { statusCode: 200, statusMessage: 'message' }, {});
            });

            return assert.isFulfilled(
                util.makeRequest('host', { protocol: 'http', port: 456, continueOnErrorCode: true })
            );
        });

        [
            {
                name: 'fullURI only',
                args: [{ fullURI: 'someproto://somehost:someport/someuri' }],
                expected: 'someproto://somehost:someport/someuri'
            },
            {
                name: 'host, uri, protocol and port',
                args: ['somehost', '/someuri', { protocol: 'someproto', port: 'someport' }],
                expected: 'someproto://somehost:someport/someuri'
            },
            {
                name: 'host, protocol and port',
                args: ['somehost', { protocol: 'someproto', port: 'someport' }],
                expected: 'someproto://somehost:someport'
            },
            {
                name: 'host only',
                args: ['somehost'],
                expected: 'http://somehost:80'
            }
        ].forEach((testConf) => {
            it(`should correctly process set of args: ${testConf.name}`, () => {
                sinon.stub(request, 'get').callsFake((opts, cb) => {
                    assert.strictEqual(opts.uri, testConf.expected);
                    cb(null, { statusCode: 200, statusMessage: 'message' }, {});
                });
                /* eslint-disable-next-line prefer-spread */
                return assert.isFulfilled(util.makeRequest.apply(util, testConf.args));
            });
        });

        [
            {
                name: 'timeout',
                opts: { timeout: 100 },
                expected: { timeout: 100 }
            }
        ].forEach((testConf) => {
            it(`should pass through any pass-through options: ${testConf.name}`, () => {
                let passedOpts;
                sinon.stub(request, 'get').callsFake((opts, cb) => {
                    passedOpts = opts;
                    cb(null, { statusCode: 200, statusMessage: '' }, {});
                });
                return util.makeRequest('host', testConf.opts)
                    .then(() => {
                        Object.keys(testConf.expected).forEach((expectedOpt) => {
                            assert.deepStrictEqual(passedOpts[expectedOpt], testConf.expected[expectedOpt]);
                        });
                    });
            });
        });
    });

    describe('.base64()', () => {
        it('should base64 decode', () => {
            assert.strictEqual(
                util.base64('decode', Buffer.from('f5string', 'ascii').toString('base64')),
                'f5string'
            );
        });

        it('should error on incorrect base64 action', () => {
            assert.throws(
                () => util.base64('someaction', 'foo'),
                /Unsupported action/
            );
        });
    });

    describe('.networkCheck()', () => {
        let socketMock;

        beforeEach(() => {
            socketMock = {
                events: {},
                end: () => socketMock.events.end(),
                on: (event, cb) => {
                    socketMock.events[event] = cb;
                    return socketMock;
                },
                connect: () => {
                    Promise.resolve()
                        .then(() => {
                            if (socketMock.testCallback) {
                                socketMock.testCallback(socketMock);
                            } else if (socketMock.events.connect) {
                                socketMock.events.connect();
                            }
                        });
                    return socketMock;
                }
            };
            sinon.stub(net, 'createConnection').callsFake(() => socketMock.connect());
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should fail network check (real connection to localhost:0)', () => {
            // force 'restore' to use real net.createConnection
            sinon.restore();
            return assert.isRejected(
                util.networkCheck('localhost', 0),
                /networkCheck/
            );
        });

        it('should check that host:port is reachable', () => assert.isFulfilled(
            util.networkCheck('localhost', 0, { period: 10 })
        ));

        it('should fail to check that host:port is reachable', () => {
            socketMock.testCallback = () => {
                socketMock.events.error(new Error('some error'));
            };
            return assert.isRejected(
                util.networkCheck('localhost', 0, { period: 10 }),
                /networkCheck.*some error/
            );
        });

        it('should fail on timeout', () => {
            socketMock.testCallback = () => {};
            return assert.isRejected(
                util.networkCheck('localhost', 0, { timeout: 10, period: 2 }),
                /networkCheck.*timeout exceeded/
            );
        });

        it('should use timeout as period', () => {
            socketMock.testCallback = () => {};
            return assert.isRejected(
                util.networkCheck('localhost', 0, { timeout: 10, period: 100 }),
                /networkCheck.*timeout exceeded/
            );
        }).timeout(30);
    });

    describe('.compareVersionStrings()', () => {
        it('should compare version strings', () => {
            assert.throws(
                () => util.compareVersionStrings('14.0', '<>', '14.0'),
                /Invalid comparator/
            );
            assert.strictEqual(util.compareVersionStrings('14.1.0', '>', '14.0'), true);
            assert.strictEqual(util.compareVersionStrings('14.0', '>', '14.1.0'), false);
            assert.strictEqual(util.compareVersionStrings('14.0', '<', '14.1.0'), true);
            assert.strictEqual(util.compareVersionStrings('14.1', '>', '14.0'), true);
            assert.strictEqual(util.compareVersionStrings('14.0', '>', '14.1'), false);
            assert.strictEqual(util.compareVersionStrings('14.0', '<', '14.1'), true);
            assert.strictEqual(util.compareVersionStrings('14.0', '==', '14.0'), true);
            assert.strictEqual(util.compareVersionStrings('14.0', '=', '14.0'), true);
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
    });

    describe('.deepCopy()', () => {
        it('should make deep copy of object', () => {
            const src = { schedule: { frequency: 'daily', time: { start: '04:20', end: '6:00' } } };
            const copy = util.deepCopy(src);
            assert.deepStrictEqual(copy, src, 'should deeply equal');

            // let's check that copy is deep
            src.schedule.frequency = 'frequency';
            assert.notStrictEqual(copy.schedule.frequency, src.schedule.frequency, 'should not be equal');
        });
    });

    describe('.mergeObjectArray', () => {
        it('should merge 2 basic objects containing arrays', () => {
            const input = [
                { a: 12, b: 13, c: [17, 18] },
                { b: 14, c: [78, 79], d: 11 }
            ];
            const expectedOutput = {
                a: 12, b: 14, c: [17, 18, 78, 79], d: 11
            };
            const mergedData = util.mergeObjectArray(input);
            assert.deepStrictEqual(mergedData, expectedOutput);
        });

        it('should accept an array with a single object', () => {
            const x = util.mergeObjectArray([{ a: 1 }]);
            assert.deepStrictEqual(x, { a: 1 });
        });

        it('should not process primitives or arrays that are root-level keys', () => {
            const input = [
                { a: 12 },
                { b: 14 },
                'myString',
                12,
                ['array1'],
                ['array2']
            ];
            const expectedOutput = { a: 12, b: 14 };
            const mergedData = util.mergeObjectArray(input);
            assert.deepStrictEqual(mergedData, expectedOutput);
        });

        it('should merge 3 Objects, with nested arrays and objects', () => {
            const input = [
                {
                    name1: {
                        arr: ['values'],
                        vals: [{ value: 12 }]
                    },
                    name2: {
                        arr: ['valuez'],
                        vals: [{ value: 22 }]
                    }
                },
                {
                    name2: {
                        arr: ['valuez2'],
                        vals: [{ value: 33, another: 24 }]
                    }
                },
                {
                    name4: {
                        arr: ['values'],
                        vals: [{ value: 52 }]
                    }
                }
            ];
            const expectedOutput = {
                name1: {
                    arr: ['values'],
                    vals: [{ value: 12 }]
                },
                name2: {
                    arr: ['valuez', 'valuez2'],
                    vals: [
                        { value: 22 },
                        { value: 33, another: 24 }
                    ]
                },
                name4: {
                    arr: ['values'],
                    vals: [{ value: 52 }]
                }
            };
            const mergedData = util.mergeObjectArray(input);
            assert.deepStrictEqual(mergedData, expectedOutput);
        });

        it('should not reject on empty array', () => {
            const mergedData = util.mergeObjectArray([]);
            assert.deepStrictEqual(mergedData, {});
        });

        it('should throw an error if the input is not an array', () => {
            assert.throws(
                () => util.mergeObjectArray('not an array'),
                /Expected input of Array/
            );
        });
    });

    describe('.copy()', () => {
        it('should make copy of object', () => {
            const src = { schedule: { frequency: 'daily', time: { start: '04:20', end: '6:00' } } };
            const copy = util.copy(src);
            assert.deepStrictEqual(copy, src, 'should deeply equal');

            // it is shallow copy - changes in src should affect copy
            src.schedule.frequency = 'frequency';
            assert.deepStrictEqual(copy, src, 'should deeply equal');
        });
    });

    describe('assignDefaults', () => {
        it('should assign defaults', () => {
            assert.deepStrictEqual(util.assignDefaults({}, {}), {});
            assert.deepStrictEqual(util.assignDefaults(null, { a: 1 }), { a: 1 });
            assert.deepStrictEqual(util.assignDefaults(undefined, { a: 1 }), { a: 1 });
            assert.deepStrictEqual(util.assignDefaults({}, { a: 1 }), { a: 1 });
            assert.deepStrictEqual(util.assignDefaults({ a: 1 }, { a: 2 }), { a: 1 }, 'should not override existing property');
            assert.deepStrictEqual(util.assignDefaults({ a: undefined }, { a: 2 }), { a: 2 }, 'should treat "undefined" as valid value');
        });

        it('should deeply assign defaults', () => {
            assert.deepStrictEqual(
                util.assignDefaults(
                    { a: { b: 'b', d: { e: 'e' } } },
                    { a: { c: 'c', d: { f: 'f' } } }
                ),
                { a: { b: 'b', c: 'c', d: { e: 'e', f: 'f' } } }
            );
        });

        it('should return same object', () => {
            const src = { a: 1 };
            const dst = util.assignDefaults(src, {});
            src.b = 2;
            assert.deepStrictEqual(dst, src, 'should return same object and not copy of it');
        });
    });

    describe('.isObjectEmpty()', () => {
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
    });

    describe('.retryPromise()', () => {
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
    });

    describe('.getRandomArbitrary()', () => {
        it('should return random number from range', () => {
            const left = -5;
            const right = 5;

            for (let i = 0; i < 100; i += 1) {
                const randNumber = util.getRandomArbitrary(left, right);
                assert.ok(left <= randNumber && randNumber <= right, `${randNumber} should be in range ${left}:${right}`);
            }
        });
    });

    describe('.renameKeys()', () => {
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

    describe('.trimString', () => {
        const expected = 'hello';
        const tests = [
            {
                name: 'should trim start and end of string',
                input: ['/hello/', '/'],
                expected
            },
            {
                name: 'should not trim the character in the middle of the string',
                input: ['he/llo', '/'],
                expected: 'he/llo'
            },
            {
                name: 'should be able to trim just the end of the string',
                input: ['hello/', '/'],
                expected
            },
            {
                name: 'should be able to trim just the start of the string',
                input: ['/hello', '/'],
                expected
            },
            {
                name: 'should be able to remove a string',
                input: ['revHELLOrev', 'rev'],
                expected: 'HELLO'
            },
            {
                name: 'it should not fail on empty string',
                input: ['', '/'],
                expected: ''
            },
            {
                name: 'it should trim all occurrences of character at both ends of string',
                input: ['///hello///', '/'],
                expected
            }
        ];
        tests.forEach((test) => {
            it(test.name, () => {
                const result = util.trimString.apply(null, test.input);
                assert.strictEqual(result, test.expected);
            });
        });
    });

    describe('Tracer', () => {
        const tracerDir = `${os.tmpdir()}/telemetry`; // os.tmpdir for windows + linux
        const tracerFile = `${tracerDir}/tracerTest`;
        let config;
        let tracer;

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

        beforeEach(() => {
            if (fs.existsSync(tracerDir)) {
                emptyDir(tracerDir);
            }

            config = {
                trace: tracerFile
            };
            tracer = util.tracer.createFromConfig('class', 'obj', config);
        });

        afterEach(() => {
            Object.keys(util.tracer.instances).forEach((tracerName) => {
                util.tracer.remove(tracerName);
            });
            sinon.restore();
        });

        after(() => {
            removeDir(tracerDir);
        });

        it('should create tracer using default location', () => {
            sinon.stub(constants, 'TRACER_DIR').value(tracerDir);
            tracer = util.tracer.createFromConfig('class2', 'obj2', { trace: true });
            return assert.isFulfilled(
                tracer.write('foobar')
                    .then(() => {
                        assert.strictEqual(fs.readFileSync(`${tracerDir}/class2.obj2`, 'utf8'), 'foobar');
                    })
            );
        });

        it('should write data to same file (2 tracers)', () => {
            // due to implementation of Tracer it is hard to verify output
            // so, just verify it is not fails
            const filePath = path.join(tracerDir, 'output');
            const tracer1 = util.tracer.createFromConfig('class2', 'obj2', { trace: filePath });
            const tracer2 = util.tracer.createFromConfig('class2', 'obj3', { trace: filePath });
            return assert.isFulfilled(Promise.all([
                tracer1.write('tracer1'),
                tracer2.write('tracer2')
            ])
                .then(() => {
                    assert.ok(/tracer[12]/.test(fs.readFileSync(filePath, 'utf8')));
                }));
        });

        it('should write data to file', () => assert.isFulfilled(
            tracer.write('foobar')
                .then(() => {
                    assert.strictEqual(fs.readFileSync(tracerFile, 'utf8'), 'foobar');
                })
        ));

        it('should accept no data', () => assert.isFulfilled(tracer.write(null)));

        it('should remove tracer', () => {
            util.tracer.remove(tracer);
            assert.strictEqual(util.tracer.instances[tracer.name], undefined);
        });

        it('should remove tracer by name', () => {
            util.tracer.remove(tracer.name);
            assert.strictEqual(util.tracer.instances[tracer.name], undefined);
        });

        it('should remove tracer by filter', () => {
            util.tracer.remove(t => t.name === tracer.name);
            assert.strictEqual(util.tracer.instances[tracer.name], undefined);
        });

        it('should get existing tracer by the name', () => assert.isFulfilled(
            tracer.write('somethings')
                .then(() => {
                    const sameTracer = util.tracer.createFromConfig('class', 'obj', config);
                    return sameTracer.write('something3')
                        .then(() => Promise.resolve(sameTracer));
                })
                .then((sameTracer) => {
                    assert.strictEqual(sameTracer.inode, tracer.inode, 'inode should be the sane');
                    assert.strictEqual(sameTracer.stream.fd, tracer.stream.fd, 'fd should be the same');
                })
        ));

        it('should truncate file', () => assert.isFulfilled(
            tracer.write('expectedData')
                .then(() => {
                    assert.strictEqual(fs.readFileSync(tracerFile, 'utf8'), 'expectedData');
                    return tracer._truncate();
                }).then(() => {
                    assert.strictEqual(fs.readFileSync(tracerFile, 'utf8'), '');
                    return tracer.write('expectedData');
                })
                .then(() => {
                    assert.strictEqual(fs.readFileSync(tracerFile, 'utf8'), 'expectedData');
                })
        ));

        it('should recreate file and dir when deleted', () => {
            const fileName = `${tracerDir}/telemetryTmpDir/telemetry`; // os.tmpdir for windows + linux
            const dirName = path.dirname(fileName);
            const tracerConfig = {
                trace: fileName
            };
            const oldInode = tracer.inode;

            if (fs.existsSync(fileName)) {
                fs.truncateSync(fileName);
            }

            tracer = util.tracer.createFromConfig('class2', 'obj2', tracerConfig);
            util.tracer.REOPEN_INTERVAL = 500;

            return assert.isFulfilled(tracer.write('expectedData')
                .then(() => {
                    assert.strictEqual(fs.readFileSync(fileName, 'utf8'), 'expectedData');
                    // remove file and directory
                    removeDir(dirName);
                    if (fs.existsSync(fileName)) {
                        assert.fail('should remove file');
                    }
                    if (fs.existsSync(dirName)) {
                        assert.fail('should remove directory');
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
                    assert.notStrictEqual(tracer.inode, oldInode, 'should have different inode');
                    assert.strictEqual(fs.readFileSync(fileName, 'utf8'), '');
                    assert.strictEqual(fs.existsSync(fileName), true, 'file should exists after re-creation');
                }));
        }).timeout(10000);
    });

    describe('.generateUuid', () => {
        it('should return valid and unique values with multiple/consecutive calls', () => {
            const v4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const uuids = [
                util.generateUuid(),
                util.generateUuid(),
                util.generateUuid()
            ];
            uuids.forEach((uuid) => {
                assert.ok(v4Regex.test(uuid));
            });
            assert.isTrue(new Set(uuids).size === uuids.length);
        });
    });

    describe('.getProperty', () => {
        const obj = {
            child1: {
                prop1: true,
                prop2: {
                    child1: {
                        prop1: 234
                    }
                }
            },
            child2: [
                { prop1: 'crimson' },
                { prop2: 'viridian' }
            ]
        };

        it('should return correct property value (primitive)', () => {
            assert.strictEqual(util.getProperty(obj, 'child1.prop1'), true);
        });


        it('should return correct property value (object)', () => {
            assert.deepStrictEqual(
                util.getProperty(obj, 'child1.prop2'),
                { child1: { prop1: 234 } }
            );
        });

        it('should return correct property value using array path', () => {
            assert.strictEqual(
                util.getProperty(obj, ['child2', '1', 'prop2']),
                'viridian'
            );
        });

        it('should return undefined if property not found', () => {
            assert.strictEqual(util.getProperty(obj, 'child2.prop1'), undefined);
        });

        it('should return defaultValue specified if property not found', () => {
            assert.strictEqual(util.getProperty(obj, ['child2', 'prop3', '0'], 'wrong tree'), 'wrong tree');
        });
    });
});
