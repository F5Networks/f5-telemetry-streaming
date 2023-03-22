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

const net = require('net');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');

const util = sourceCode('src/lib/utils/misc');

moduleCache.remember();

describe('Misc Util', () => {
    before(() => {
        moduleCache.restore();
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
            socketMock.testCallback = () => { };
            return assert.isRejected(
                util.networkCheck('localhost', 0, { timeout: 10, period: 2 }),
                /networkCheck.*timeout exceeded/
            );
        });

        it('should use timeout as period', () => {
            socketMock.testCallback = () => { };
            return assert.isRejected(
                util.networkCheck('localhost', 0, { timeout: 10, period: 100 }),
                /networkCheck.*timeout exceeded/
            );
        }).timeout(30);
    });

    describe('.getRuntimeInfo()', () => {
        beforeEach(() => {
            sinon.stub(process, 'version').value('v14.5.1');
        });
        it('should return runtime info', () => {
            const nodeVersion = process.version;
            const returnValue = util.getRuntimeInfo().nodeVersion;
            assert(returnValue === '14.5.1', 'getRuntimeInfo returns wrong value 1');
            assert(returnValue === nodeVersion.substring(1), 'getRuntimeInfo returns wrong value 2');
        });
    });

    describe('.camelCaseToUnderscoreCase()', () => {
        it('should compare version strings', () => {
            assert.strictEqual(util.camelCaseToUnderscoreCase('HelloFriend'), 'hello_friend');
            assert.strictEqual(util.camelCaseToUnderscoreCase('whatIsUp'), 'what_is_up');
            assert.strictEqual(util.camelCaseToUnderscoreCase('THISWorksLikeThis'), 't_h_i_s_works_like_this');
        });
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

    describe('.parseJsonWithDuplicateKeys()', () => {
        it('should parse JSON string without duplicate keys', () => {
            const input = JSON.stringify({
                singleValue: 'value',
                nestedObject: {
                    topLevel: 'anotherValue',
                    nestedAgain: {
                        bottomLevel: 'endOfTheRoad'
                    }
                },
                arrayToo: [
                    'justAValue',
                    {
                        shouldIncludeObjects: {
                            objectValue: '11'
                        }
                    }
                ]
            });
            const expectedOutput = util.copy(JSON.parse(input));
            assert.deepStrictEqual(util.parseJsonWithDuplicateKeys(input), expectedOutput);
        });

        it('should parse JSON string with duplicate keys (values = strings)', () => {
            const input = `{
                "dupKey": "value",
                "nonDupKey": {
                    "why": "prove it can re-traverse object structure"
                },
                "dupKey": "value2"
            }`;
            assert.deepStrictEqual(util.parseJsonWithDuplicateKeys(input), {
                dupKey: [
                    'value',
                    'value2'
                ],
                nonDupKey: {
                    why: 'prove it can re-traverse object structure'
                }
            });
        });

        it('should parse JSON string with duplicate keys (values = objects)', () => {
            const input = `{
                "dupKey": {
                    "key1": "value1"
                },
                "dupKey": {
                    "why": "should support objects too"
                }
            }`;
            assert.deepStrictEqual(util.parseJsonWithDuplicateKeys(input), {
                dupKey: [
                    { key1: 'value1' },
                    { why: 'should support objects too' }
                ]
            });
        });

        it('should parse JSON string with duplicate keys (values = arrays)', () => {
            const input = `{
                "dupKey": [1, 2, 3],
                "dupKey": ["one", "two", "three"]
            }`;
            assert.deepStrictEqual(util.parseJsonWithDuplicateKeys(input), {
                dupKey: [1, 2, 3, 'one', 'two', 'three']
            });
        });

        it('should parse JSON string with duplicate keys (first duplicate = string, second duplicate = array)', () => {
            const input = `{
                "dupKey": "just a string value",
                "dupKey": [1, 2, 3]
            }`;
            assert.deepStrictEqual(util.parseJsonWithDuplicateKeys(input), {
                dupKey: ['just a string value', 1, 2, 3]
            });
        });

        it('should parse JSON string with duplicate keys (first duplicate = array, second duplicate = string)', () => {
            const input = `{
                "dupKey": [1, 2, 3],
                "dupKey": {
                    "key1": "value1",
                    "key2": "value2"
                }
            }`;
            assert.deepStrictEqual(util.parseJsonWithDuplicateKeys(input), {
                dupKey: [1, 2, 3, {
                    key1: 'value1',
                    key2: 'value2'
                }]
            });
        });

        it('should parse JSON string with duplicate keys in iControlRest output (endpoint = mgmt/tm/sys/performance/throughput)', () => {
            const input = `{
                "kind": "tm:sys:performance:throughput:throughputstats",
                "selfLink": "https://localhost/mgmt/tm/sys/performance/throughput?ver=14.1.4",
                "entries": {
                    "https://localhost/mgmt/tm/sys/performance/throughput/In": {
                        "nestedStats": {
                            "entries": {
                                "Average": {
                                    "description": "1260859"
                                },
                                "Throughput(bits)": {
                                    "description": "In"
                                }
                            }
                        }
                    },
                    "https://localhost/mgmt/tm/sys/performance/throughput/In": {
                        "nestedStats": {
                            "entries": {
                                "Average": {
                                    "description": "398"
                                },
                                "Throughput(packets)": {
                                    "description": "In"
                                }
                            }
                        }
                    },
                    "https://localhost/mgmt/tm/sys/performance/throughput/Out": {
                        "nestedStats": {
                            "entries": {
                                "Average": {
                                    "description": "37263"
                                },
                                "Throughput(bits)": {
                                    "description": "Out"
                                }
                            }
                        }
                    },
                    "https://localhost/mgmt/tm/sys/performance/throughput/Out": {
                        "nestedStats": {
                            "entries": {
                                "Average": {
                                    "description": "7"
                                },
                                "Throughput(packets)": {
                                    "description": "Out"
                                }
                            }
                        }
                    },
                    "https://localhost/mgmt/tm/sys/performance/throughput/SSL%20TPS": {
                        "nestedStats": {
                            "entries": {
                                "Average": {
                                    "description": "0"
                                },
                                "SSL Transactions": {
                                    "description": "SSL TPS"
                                }
                            }
                        }
                    }
                }
            }`;
            assert.deepStrictEqual(util.parseJsonWithDuplicateKeys(input), {
                kind: 'tm:sys:performance:throughput:throughputstats',
                selfLink: 'https://localhost/mgmt/tm/sys/performance/throughput?ver=14.1.4',
                entries: {
                    'https://localhost/mgmt/tm/sys/performance/throughput/In': [
                        {
                            nestedStats: {
                                entries: {
                                    Average: {
                                        description: '1260859'
                                    },
                                    'Throughput(bits)': {
                                        description: 'In'
                                    }
                                }
                            }
                        },
                        {
                            nestedStats: {
                                entries: {
                                    Average: {
                                        description: '398'
                                    },
                                    'Throughput(packets)': {
                                        description: 'In'
                                    }
                                }
                            }
                        }
                    ],
                    'https://localhost/mgmt/tm/sys/performance/throughput/Out': [
                        {
                            nestedStats: {
                                entries: {
                                    Average: {
                                        description: '37263'
                                    },
                                    'Throughput(bits)': {
                                        description: 'Out'
                                    }
                                }
                            }
                        },
                        {
                            nestedStats: {
                                entries: {
                                    Average: {
                                        description: '7'
                                    },
                                    'Throughput(packets)': {
                                        description: 'Out'
                                    }
                                }
                            }
                        }
                    ],
                    'https://localhost/mgmt/tm/sys/performance/throughput/SSL%20TPS': {
                        nestedStats: {
                            entries: {
                                Average: {
                                    description: '0'
                                },
                                'SSL Transactions': {
                                    description: 'SSL TPS'
                                }
                            }
                        }
                    }
                }
            });
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
            assert.lengthOf(Object.keys(target), 1);
            assert.lengthOf(Object.keys(target.brightgreentomato), 2);
            assert.strictEqual(target.brightgreentomato.a, 1);
            assert.lengthOf(Object.keys(target.brightgreentomato.greencar), 2);
            assert.strictEqual(target.brightgreentomato.greencar.b, 2);
            assert.lengthOf(Object.keys(target.brightgreentomato.greencar.paintitgreen), 1);
            assert.strictEqual(target.brightgreentomato.greencar.paintitgreen.c, 3);
        });

        it('regex flag - first instance only', () => {
            const target = {
                brightredredredtomato: { a: 1 }
            };
            util.renameKeys(target, /red/, 'green');

            assert.lengthOf(Object.keys(target), 1);
            assert.strictEqual(target.brightgreenredredtomato.a, 1);
        });

        it('first instance only, case insensitive', () => {
            const target = {
                brightRedTomato: { a: 1 }
            };
            util.renameKeys(target, /red/i, 'green');

            assert.lengthOf(Object.keys(target), 1);
            assert.strictEqual(target.brightgreenTomato.a, 1);
        });

        it('globally', () => {
            const target = {
                brightredredtomato: { a: 1 }
            };
            util.renameKeys(target, /red/g, 'green');

            assert.lengthOf(Object.keys(target), 1);
            assert.strictEqual(target.brightgreengreentomato.a, 1);
        });

        it('globally and case insensitive', () => {
            const target = {
                brightRedrEdreDtomato: { a: 1 }
            };
            util.renameKeys(target, /red/ig, 'green');

            assert.lengthOf(Object.keys(target), 1);
            assert.strictEqual(target.brightgreengreengreentomato.a, 1);
        });

        it('character group', () => {
            const target = {
                bearclaw: { a: 1 },
                teardrop: { b: 2 },
                dearjohn: { c: 3 }
            };
            util.renameKeys(target, /[bt]ear/, 'jelly');

            assert.lengthOf(Object.keys(target), 3);
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

            assert.lengthOf(Object.keys(target), 3);
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

    describe('.sleep()', () => {
        it('should sleep for X ms.', () => {
            const startTime = Date.now();
            const expectedDelay = 100;
            return util.sleep(expectedDelay)
                .then(() => {
                    const actualDelay = Date.now() - startTime;
                    assert.isTrue(actualDelay >= expectedDelay * 0.9, `expected actual delay ${actualDelay} be +- equal to ${expectedDelay}`);
                });
        });

        it('should cancel promise', () => {
            const promise = util.sleep(50);
            assert.isTrue(promise.cancel(new Error('expected error')));
            assert.isFalse(promise.cancel(new Error('expected error')));
            return assert.isRejected(
                promise.then(() => Promise.reject(new Error('cancellation doesn\'t work'))),
                'expected error'
            );
        });

        it('should cancel promise after some delay', () => {
            const promise = util.sleep(50);
            setTimeout(() => promise.cancel(), 10);
            return assert.isRejected(
                promise.then(() => Promise.reject(new Error('cancellation doesn\'t work'))),
                'canceled'
            );
        });

        it('should not be able to cancel once resolved', () => {
            const promise = util.sleep(50);
            return promise.then(() => {
                assert.isFalse(promise.cancel(new Error('expected error')));
            });
        });

        it('should not be able to cancel once canceled', () => {
            const promise = util.sleep(50);
            assert.isTrue(promise.cancel());
            return promise.catch((err) => err)
                .then((err) => {
                    assert.isTrue(/canceled/.test(err));
                    assert.isFalse(promise.cancel(new Error('expected error')));
                });
        });
    });

    describe('.maskJSONStringDefaultSecrets', () => {
        const mask = '*********';
        const defaultData = {
            someSecretData: {
                cipherText: 'test_passphrase_1'
            },
            someSecretData_2: {
                passphrase: 'test_passphrase_2'
            },
            someSecretData_3: {
                nestedData: {
                    passphrase: {
                        cipherText: 'test_passphrase_3'
                    }
                }
            },
            someSecretData_4: {
                nestedData: {
                    passphrase: 'test_passphrase_4'
                }
            }
        };
        const defaultMaskedData = {
            someSecretData: {
                cipherText: mask
            },
            someSecretData_2: {
                passphrase: mask
            },
            someSecretData_3: {
                nestedData: {
                    passphrase: {
                        cipherText: mask
                    }
                }
            },
            someSecretData_4: {
                nestedData: {
                    passphrase: mask
                }
            }
        };
        const jsonBeauty = (data) => JSON.stringify(data, null, 4);
        const jsonOneLine = (data) => JSON.stringify(data);

        describe('pure JSON data', () => {
            it('should mask secrets (without new lines)', () => {
                const expected = `this contains secrets: ${jsonOneLine(defaultMaskedData)}`;
                const masked = util.maskJSONStringDefaultSecrets(`this contains secrets: ${jsonOneLine(defaultData)}`);
                assert.deepStrictEqual(masked, expected, 'should mask secrets');
                assert.deepStrictEqual(util.maskJSONStringDefaultSecrets(masked), expected, 'should keep message the same when secrets masked already');

                assert.deepStrictEqual(
                    JSON.parse(util.maskJSONStringDefaultSecrets(jsonOneLine(defaultData))),
                    defaultMaskedData,
                    'should be able to parse JSON with masked data'
                );
            });

            it('should mask secrets (with new lines)', () => {
                const expected = `this contains secrets: ${jsonBeauty(defaultMaskedData)}`;
                const masked = util.maskJSONStringDefaultSecrets(`this contains secrets: ${jsonBeauty(defaultData)}`);
                assert.deepStrictEqual(masked, expected, 'should mask secrets');
                assert.deepStrictEqual(util.maskJSONStringDefaultSecrets(masked), expected, 'should keep message the same when secrets masked already');

                assert.deepStrictEqual(
                    JSON.parse(util.maskJSONStringDefaultSecrets(jsonBeauty(defaultData))),
                    defaultMaskedData,
                    'should be able to parse JSON with masked data'
                );
            });
        });

        describe('escaped JSON data', () => {
            it('should mask secrets (with new lines, serialized multiple times)', () => {
                let decl = jsonBeauty(defaultData);
                let expectedMsg = jsonBeauty(jsonBeauty(defaultMaskedData));
                for (let i = 0; i < 10; i += 1) {
                    decl = jsonBeauty(decl);
                    const masked = util.maskJSONStringDefaultSecrets(`this contains secrets: ${decl}`);
                    assert.include(
                        masked,
                        `this contains secrets: ${expectedMsg}`,
                        `should mask secret event after ${i + 1} serialization(s)`
                    );
                    assert.include(util.maskJSONStringDefaultSecrets(masked), expectedMsg, 'should keep message the same when secrets masked already');
                    expectedMsg = jsonBeauty(expectedMsg);
                }
            });

            it('should mask secrets(without new lines, serialized multiple times)', () => {
                let decl = jsonOneLine(defaultData);
                let expectedMsg = jsonOneLine(jsonOneLine(defaultMaskedData));
                for (let i = 0; i < 10; i += 1) {
                    decl = jsonOneLine(decl);
                    const masked = util.maskJSONStringDefaultSecrets(`this contains secrets: ${decl}`);
                    assert.include(
                        masked,
                        `this contains secrets: ${expectedMsg}`,
                        `should mask secret event after ${i + 1} serialization(s)`
                    );
                    assert.include(util.maskJSONStringDefaultSecrets(masked), expectedMsg, 'should keep message the same when secrets masked already');
                    expectedMsg = jsonOneLine(expectedMsg);
                }
            });
        });
    });

    describe('.maskJSONObjectDefaultSecrets', () => {
        const mask = '*********';
        const defaultData = {
            someSecretData: {
                cipherText: 'test_passphrase_1'
            },
            someSecretData_2: {
                passphrase: 'test_passphrase_2'
            },
            someSecretData_3: {
                nestedData: {
                    passphrase: {
                        cipherText: 'test_passphrase_3'
                    }
                }
            },
            someSecretData_4: {
                nestedData: {
                    passphrase: 'test_passphrase_4'
                }
            }
        };
        const defaultMaskedData = {
            someSecretData: {
                cipherText: mask
            },
            someSecretData_2: {
                passphrase: mask
            },
            someSecretData_3: {
                nestedData: {
                    passphrase: mask
                }
            },
            someSecretData_4: {
                nestedData: {
                    passphrase: mask
                }
            }
        };

        it('should mask secrets in JSON data', () => {
            const masked = util.maskJSONObjectDefaultSecrets(util.deepCopy(defaultData));
            assert.deepStrictEqual(masked, defaultMaskedData, 'should mask secrets');
        });

        it('should not break circular refs by default', () => {
            const root = util.deepCopy(defaultData);
            root.someSecretData_3.ref = root;

            const masked = util.maskJSONObjectDefaultSecrets(root);
            assert.isTrue(masked === masked.someSecretData_3.ref, 'should not break circular ref');
        });
    });

    describe('.generateUniquePropName', () => {
        it('should return originKey when it doesn\'t exist in the object', () => {
            assert.deepStrictEqual(util.generateUniquePropName({}, 'key'), 'key', 'should return originKey');
        });

        it('should return unique key for the object', () => {
            assert.deepStrictEqual(util.generateUniquePropName({ key: 1 }, 'key'), 'key0', 'should return unique key');
        });

        it('should return unique key for the object after couple attempts', () => {
            assert.deepStrictEqual(util.generateUniquePropName({
                key: 1,
                key0: 2,
                key1: 10,
                key3: 20
            }, 'key'), 'key2', 'should return unique key');
        });
    });

    describe('.createJSONStringSecretsMaskFunc', () => {
        const mask = '*********';
        const badDataExample = [{
            data: {
                timeSeries: [{
                    metric: {
                        secretString: 'custom.googleapis.com/system/tmmCpu'
                    },
                    points: [{
                        value: {
                            int64Value: 10
                        },
                        interval: {
                            endTime: {}
                        }
                    }],
                    resource: {
                        type: 'generic_node',
                        labels: {
                            namespace: 'localhost.localdomain',
                            node_id: '00000000-0000-0000-0000-000000000000',
                            location: 'global'
                        }
                    }
                }]
            },
            timestamp: '1970-01-01T01:00:00.000Z'
        }];
        const defaultData = {
            doNotTouch: 'ok',
            someSecretData: {
                secretString: 'test_passphrase_1',
                secretArray: ['test_passphrase_2', true, false, null, 10, -2.25, 2.25e10, -2.25e10]
            },
            someSecretData_2: {
                doNotTouch: 'ok',
                secretString: '\\"',
                secretFalse: false,
                secretNumber: 10
            },
            someSecretData_3: {
                nestedData: {
                    secretTrue: true
                },
                secretNull: null,
                secretNumber: -2.25e10
            },
            someSecretData_4: {
                doNotTouch: 'ok',
                secretNumber: -2.25
            },
            secretNumber: 2.25e10,
            secretArray: []
        };
        const defaultMaskedData = {
            doNotTouch: 'ok',
            someSecretData: {
                secretString: mask,
                secretArray: mask
            },
            someSecretData_2: {
                doNotTouch: 'ok',
                secretString: mask,
                secretFalse: mask,
                secretNumber: mask
            },
            someSecretData_3: {
                nestedData: {
                    secretTrue: mask
                },
                secretNull: mask,
                secretNumber: mask
            },
            someSecretData_4: {
                doNotTouch: 'ok',
                secretNumber: mask
            },
            secretNumber: mask,
            secretArray: mask
        };
        const jsonBeauty = (data) => JSON.stringify(data, null, 4);
        const jsonOneLine = (data) => JSON.stringify(data);

        let maskFn;

        beforeEach(() => {
            maskFn = util.createJSONStringSecretsMaskFunc([
                'secretArray',
                'secretFalse',
                'secretNull',
                'secretNumber',
                'secretString',
                'secretTrue'
            ]);
        });

        it('should do nothing when no properties provided', () => {
            const emptyMaskFn = util.createJSONStringSecretsMaskFunc([]);
            const ret = emptyMaskFn(jsonOneLine({ key: 'val' }));
            assert.deepStrictEqual(maskFn.matchesFound, 0, 'should replace 0 secrets');
            assert.deepStrictEqual(ret, '{"key":"val"}', 'should do nothing');
        });

        it('should use non-default mask', () => {
            const myMaskFn = util.createJSONStringSecretsMaskFunc(['secret'], 'test_passphrase_1');
            const ret = myMaskFn(jsonOneLine({ secret: 'val' }));
            assert.deepStrictEqual(myMaskFn.matchesFound, 1, 'should replace 1 secrets');
            assert.deepStrictEqual(ret, '{"secret":"test_passphrase_1"}', 'should use non-default mask');
        });

        it('should use empty string as  non-default mask', () => {
            const myMaskFn = util.createJSONStringSecretsMaskFunc(['secret'], '');
            const ret = myMaskFn(jsonOneLine({ secret: 'val' }));
            assert.deepStrictEqual(myMaskFn.matchesFound, 1, 'should replace 1 secrets');
            assert.deepStrictEqual(ret, '{"secret":""}', 'should use non-default mask');
        });

        it('should be able to parse masked data after multiple serializations', () => {
            let decl = defaultData;
            for (let i = 0; i < 10; i += 1) {
                decl = jsonOneLine(decl);
            }
            decl = maskFn(decl);
            assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');

            for (let i = 0; i < 10; i += 1) {
                decl = JSON.parse(decl);
            }

            assert.deepStrictEqual(
                JSON.parse(maskFn(jsonOneLine(defaultData))),
                defaultMaskedData,
                'should be able to parse JSON with masked data'
            );
        });

        describe('pure JSON data', () => {
            it('should mask secrets (without new lines)', () => {
                const expected = `this contains secrets: ${jsonOneLine(defaultMaskedData)}`;
                const masked = maskFn(`this contains secrets: ${jsonOneLine(defaultData)}`);
                assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');
                assert.deepStrictEqual(masked, expected, 'should mask secrets');
                assert.deepStrictEqual(maskFn(masked), expected, 'should keep message the same when secrets masked already');
                assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');
                assert.deepStrictEqual(
                    JSON.parse(maskFn(jsonOneLine(defaultData))),
                    defaultMaskedData,
                    'should be able to parse JSON with masked data'
                );
                assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');
            });

            it('should mask secrets (with new lines)', () => {
                const expected = `this contains secrets: ${jsonBeauty(defaultMaskedData)}`;
                const masked = maskFn(`this contains secrets: ${jsonBeauty(defaultData)}`);
                assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');
                assert.deepStrictEqual(masked, expected, 'should mask secrets');
                assert.deepStrictEqual(maskFn(masked), expected, 'should keep message the same when secrets masked already');
                assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');
                assert.deepStrictEqual(
                    JSON.parse(maskFn(jsonBeauty(defaultData))),
                    defaultMaskedData,
                    'should be able to parse JSON with masked data'
                );
                assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');
            });

            it('should not fail with catastrophic backtracking issue (without new lines)', () => {
                maskFn(`this contains secrets: ${jsonOneLine(badDataExample)}`);
                assert.deepStrictEqual(maskFn.matchesFound, 1, 'should replace 1 secret');
            });

            it('should not fail with catastrophic backtracking issue (with new lines)', () => {
                maskFn(`this contains secrets: ${jsonBeauty(badDataExample)}`);
                assert.deepStrictEqual(maskFn.matchesFound, 1, 'should replace 1 secret');
            });
        });

        describe('escaped JSON data', () => {
            it('should mask secrets (with new lines, serialized multiple times)', () => {
                let decl = jsonBeauty(defaultData);
                let expectedMsg = jsonBeauty(jsonBeauty(defaultMaskedData));
                for (let i = 0; i < 10; i += 1) {
                    decl = jsonBeauty(decl);
                    const masked = maskFn(`this contains secrets: ${decl}`);
                    assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');
                    assert.include(
                        masked,
                        `this contains secrets: ${expectedMsg}`,
                        `should mask secret event after ${i + 1} serialization(s)`
                    );
                    assert.include(maskFn(masked), expectedMsg, 'should keep message the same when secrets masked already');
                    assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');
                    expectedMsg = jsonBeauty(expectedMsg);
                }
            });

            it('should mask secrets(without new lines, serialized multiple times)', () => {
                let decl = jsonOneLine(defaultData);
                let expectedMsg = jsonOneLine(jsonOneLine(defaultMaskedData));
                for (let i = 0; i < 10; i += 1) {
                    decl = jsonOneLine(decl);
                    const masked = maskFn(`this contains secrets: ${decl}`);
                    assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');
                    assert.include(
                        masked,
                        `this contains secrets: ${expectedMsg}`,
                        `should mask secret event after ${i + 1} serialization(s)`
                    );
                    assert.include(maskFn(masked), expectedMsg, 'should keep message the same when secrets masked already');
                    assert.deepStrictEqual(maskFn.matchesFound, 11, 'should replace 11 secrets');
                    expectedMsg = jsonOneLine(expectedMsg);
                }
            });

            it('should not fail with catastrophic backtracking issue (without new lines)', () => {
                maskFn(`this contains secrets: ${jsonOneLine(jsonOneLine(badDataExample))}`);
                assert.deepStrictEqual(maskFn.matchesFound, 1, 'should replace 1 secret');
            });

            it('should not fail with catastrophic backtracking issue (with new lines)', () => {
                maskFn(`this contains secrets: ${jsonBeauty(jsonBeauty(badDataExample))}`);
                assert.deepStrictEqual(maskFn.matchesFound, 1, 'should replace 1 secret');
            });
        });
    });

    describe('.createJSONObjectSecretsMaskFunc', () => {
        const mask = '*********';
        const defaultData = {
            secretArray: [],
            secretFalse: false,
            secretNull: null,
            secretNumber: 10,
            secretString: 'test',
            secretTrue: true,
            secretEmptyObject: {},
            secretObject: {
                null: null
            },
            nestedData: {
                secretArray: [
                    'data',
                    10,
                    null,
                    false
                ],
                nestedData: [
                    {
                        secretArray: [
                            'data',
                            10,
                            null,
                            false,
                            {
                                secretFalse: false
                            }
                        ]
                    }
                ]
            }
        };
        const defaultMaskedData = {
            secretArray: mask,
            secretFalse: mask,
            secretNull: mask,
            secretNumber: mask,
            secretString: mask,
            secretTrue: mask,
            secretEmptyObject: mask,
            secretObject: mask,
            nestedData: {
                secretArray: mask,
                nestedData: [
                    {
                        secretArray: [
                            'data',
                            10,
                            null,
                            false,
                            {
                                secretFalse: mask
                            }
                        ]
                    }
                ]
            }
        };

        it('should do nothing when data is not array/object', () => {
            const maskFn = util.createJSONObjectSecretsMaskFunc([
                'prop'
            ]);
            assert.deepStrictEqual(maskFn({ prop: 'value' }), { prop: mask }, 'should mask data');
            assert.deepStrictEqual(maskFn.matchesFound, 1, 'should replace 1 match');

            assert.deepStrictEqual(maskFn(true), true, 'should do nothing with boolean');
            assert.deepStrictEqual(maskFn.matchesFound, 0, 'should replace 0 matches');

            assert.deepStrictEqual(maskFn(false), false, 'should do nothing with boolean');
            assert.deepStrictEqual(maskFn.matchesFound, 0, 'should replace 0 matches');

            assert.deepStrictEqual(maskFn(null), null, 'should do nothing with null');
            assert.deepStrictEqual(maskFn.matchesFound, 0, 'should replace 0 matches');

            assert.deepStrictEqual(maskFn('string'), 'string', 'should do nothing with string');
            assert.deepStrictEqual(maskFn.matchesFound, 0, 'should replace 0 matches');

            assert.deepStrictEqual(maskFn(10), 10, 'should do nothing with number');
            assert.deepStrictEqual(maskFn.matchesFound, 0, 'should replace 0 matches');
        });

        it('should accept all 3 params', () => {
            const maskFn = util.createJSONObjectSecretsMaskFunc(
                ['dataToMask'],
                {
                    mask: 'mask',
                    maxDepth: 2
                }
            );
            const ret = maskFn({
                dataToMask: 'someValue',
                nestedData: {
                    nestedData: {
                        dataToMask: 'someValue'
                    }
                }
            });
            assert.deepStrictEqual(ret, {
                dataToMask: 'mask',
                nestedData: {
                    nestedData: {
                        dataToMask: 'someValue'
                    }
                }
            }, 'should replace data with custom mask');
            assert.deepStrictEqual(maskFn.matchesFound, 1, 'should replace 1 match');
        });

        it('should mask secrets using custom mask', () => {
            const maskFn = util.createJSONObjectSecretsMaskFunc(
                ['dataToMask'],
                { mask: 'mask' }
            );
            const ret = maskFn({ dataToMask: 'someValue' });
            assert.deepStrictEqual(ret, { dataToMask: 'mask' }, 'should replace data with custom mask');
            assert.deepStrictEqual(maskFn.matchesFound, 1, 'should replace 1 match');
        });

        it('should mask secrets using default mask (object)', () => {
            const maskFn = util.createJSONObjectSecretsMaskFunc([
                'secretArray',
                'secretFalse',
                'secretNull',
                'secretNumber',
                'secretString',
                'secretTrue',
                'secretEmptyObject',
                'secretObject'
            ]);
            const ret = maskFn(util.deepCopy(defaultData));
            assert.deepStrictEqual(ret, defaultMaskedData, 'should replace data with mask');
            assert.deepStrictEqual(maskFn.matchesFound, 10, 'should replace 10 matches');
        });

        it('should mask secrets using default mask (array)', () => {
            const maskFn = util.createJSONObjectSecretsMaskFunc([
                'secretArray',
                'secretFalse',
                'secretNull',
                'secretNumber',
                'secretString',
                'secretTrue',
                'secretEmptyObject',
                'secretObject'
            ]);
            const ret = maskFn([util.deepCopy(defaultData)]);
            assert.deepStrictEqual(ret, [defaultMaskedData], 'should replace data with mask');
            assert.deepStrictEqual(maskFn.matchesFound, 10, 'should replace 10 matches');
        });

        it('should respect maxDepth (object)', () => {
            const maskFn = util.createJSONObjectSecretsMaskFunc([
                'secretArray',
                'secretFalse',
                'secretNull',
                'secretNumber',
                'secretString',
                'secretTrue',
                'secretEmptyObject',
                'secretObject'
            ], {
                maxDepth: 2
            });
            const ret = maskFn(util.deepCopy(defaultData));
            assert.deepStrictEqual(ret, {
                secretArray: mask,
                secretFalse: mask,
                secretNull: mask,
                secretNumber: mask,
                secretString: mask,
                secretTrue: mask,
                secretEmptyObject: mask,
                secretObject: mask,
                nestedData: {
                    secretArray: mask,
                    nestedData: [
                        {
                            secretArray: [
                                'data',
                                10,
                                null,
                                false,
                                {
                                    secretFalse: false
                                }
                            ]
                        }
                    ]
                }
            }, 'should respect maxDepth');
            assert.deepStrictEqual(maskFn.matchesFound, 9, 'should replace 9 matches');
        });

        it('should respect maxDepth (array)', () => {
            const maskFn = util.createJSONObjectSecretsMaskFunc([
                'secretArray',
                'secretFalse',
                'secretNull',
                'secretNumber',
                'secretString',
                'secretTrue',
                'secretEmptyObject',
                'secretObject'
            ], {
                maxDepth: 2
            });
            const ret = maskFn([util.deepCopy(defaultData)]);
            assert.deepStrictEqual(ret, [{
                secretArray: mask,
                secretFalse: mask,
                secretNull: mask,
                secretNumber: mask,
                secretString: mask,
                secretTrue: mask,
                secretEmptyObject: mask,
                secretObject: mask,
                nestedData: {
                    secretArray: [
                        'data',
                        10,
                        null,
                        false
                    ],
                    nestedData: [
                        {
                            secretArray: [
                                'data',
                                10,
                                null,
                                false,
                                {
                                    secretFalse: false
                                }
                            ]
                        }
                    ]
                }
            }], 'should respect maxDepth');
            assert.deepStrictEqual(maskFn.matchesFound, 8, 'should replace 8 matches');
        });

        it('should override origin options', () => {
            const maskFn = util.createJSONObjectSecretsMaskFunc(
                ['dataToMask'],
                {
                    mask: 'mask',
                    maxDepth: 1,
                    breakCircularRef: false
                }
            );
            const root = {
                level1: {
                    level2: {
                        level3: {
                            dataToMask: 'test'
                        }
                    }
                }
            };
            root.level1.ref = root;

            const ret = maskFn(root, {
                mask: 'myMask',
                maxDepth: 0,
                breakCircularRef: 'circular-ref'
            });
            assert.deepStrictEqual(ret, {
                level1: {
                    ref: 'circular-ref',
                    level2: {
                        level3: {
                            dataToMask: 'myMask'
                        }
                    }
                }
            }, 'should replace data using custom options');
            assert.deepStrictEqual(maskFn.matchesFound, 1, 'should replace 1 match');
        });
    });

    describe('.traverseJSON', () => {
        const rootObject = {
            array: [
                10,
                20,
                {
                    array: [
                        {
                            string: 'string',
                            number: 10
                        },
                        [10],
                        {
                            boolean: true
                        }
                    ]
                }
            ],
            object: {
                string: 'string',
                nested: {
                    float: 10.10
                }
            }
        };
        const rootArray = [
            [
                10,
                20,
                {
                    array: [
                        {
                            string: 'string',
                            number: 10
                        },
                        [10],
                        {
                            boolean: true
                        }
                    ]
                }
            ],
            {
                string: 'string',
                nested: {
                    float: 10.10
                }
            }
        ];

        it('number of arguments', () => {
            const testObj = { level1: { level2: 10 } };
            util.traverseJSON(testObj, function () {
                assert.lengthOf(arguments, 2, 'should pass 2 arguments when no callback params specified');
            });
            // eslint-disable-next-line no-unused-vars
            util.traverseJSON(testObj, function (parent) {
                assert.lengthOf(arguments, 2, 'should pass 2 arguments when 1 param specified');
            });
            // eslint-disable-next-line no-unused-vars
            util.traverseJSON(testObj, function (parent, key) {
                assert.lengthOf(arguments, 2, 'should pass 2 arguments when 2 param specified');
            });
            // eslint-disable-next-line no-unused-vars
            util.traverseJSON(testObj, function (parent, key, depth) {
                assert.lengthOf(arguments, 3, 'should pass 3 arguments when 3 param specified');
            });
            // eslint-disable-next-line no-unused-vars
            util.traverseJSON(testObj, function (parent, key, depth, stop) {
                assert.lengthOf(arguments, 4, 'should pass 4 arguments when 4 param specified');
            });
            // eslint-disable-next-line no-unused-vars
            util.traverseJSON(testObj, function (parent, key, depth, stop, path) {
                assert.lengthOf(arguments, 5, 'should pass 5 arguments when 5 param specified');
            });
            // eslint-disable-next-line no-unused-vars
            util.traverseJSON(testObj, function (parent, key, depth, stop, path, unknownArg) {
                assert.lengthOf(arguments, 5, 'should pass 5 arguments when 6 param specified');
            });
        });

        it('should be able to process 10_000 nested objects', () => {
            const maxDepth = 10000;
            const root = {};
            let current = root;
            for (let i = 0; i < maxDepth; i += 1) {
                current.level = i;
                current.next = {};
                current = current.next;
            }

            const actualLevels = [];
            util.traverseJSON(root, (parent, key) => {
                if (key === 'level') {
                    actualLevels.push(parent.level);
                }
            });
            assert.lengthOf(actualLevels, maxDepth, 'should traverse all nested objects');
            for (let i = 0; i < maxDepth; i += 1) {
                assert.deepStrictEqual(actualLevels[i], i, 'should traverse object in expected order');
            }
        });

        it('should be able to process 10_000 nested arrays', () => {
            const maxDepth = 10000;
            const root = [];
            let current = root;
            for (let i = 0; i < maxDepth; i += 1) {
                current.push(i);
                current.push([]);
                current = current[current.length - 1];
            }

            const actualLevels = [];
            util.traverseJSON(root, (parent, key) => {
                if (key === 0) {
                    actualLevels.push(parent[key]);
                }
            });
            assert.lengthOf(actualLevels, maxDepth, 'should traverse all nested arrays');
            for (let i = 0; i < maxDepth; i += 1) {
                assert.deepStrictEqual(actualLevels[i], i, 'should traverse object in expected order');
            }
        });

        it('should traverse mixed data (root - object)', () => {
            const root = util.deepCopy(rootObject);
            const actualHistory = [];
            util.traverseJSON(root, (parent, key, depth, stop, path) => {
                actualHistory.push([path, key, parent[key], depth]);
            });

            const expectedHistory = [
                // path, key, value, depth
                [[], 'array', root.array, 1],
                [['array'], 0, 10, 2],
                [['array'], 1, 20, 2],
                [['array'], 2, root.array[2], 2],
                [['array', 2], 'array', root.array[2].array, 3],
                [['array', 2, 'array'], 0, root.array[2].array[0], 4],
                [['array', 2, 'array', 0], 'string', 'string', 5],
                [['array', 2, 'array', 0], 'number', 10, 5],
                [['array', 2, 'array'], 1, [10], 4],
                [['array', 2, 'array', 1], 0, 10, 5],
                [['array', 2, 'array'], 2, root.array[2].array[2], 4],
                [['array', 2, 'array', 2], 'boolean', true, 5],
                [[], 'object', root.object, 1],
                [['object'], 'string', 'string', 2],
                [['object'], 'nested', root.object.nested, 2],
                [['object', 'nested'], 'float', 10.10, 3]
            ];
            assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse all objects');
            assert.deepStrictEqual(root, rootObject, 'should not modify original object');
        });

        it('should traverse mixed data (root - array)', () => {
            const root = util.deepCopy(rootArray);
            const actualHistory = [];
            util.traverseJSON(root, (parent, key, depth, stop, path) => {
                actualHistory.push([path, key, parent[key], depth]);
            });

            const expectedHistory = [
                // path, key, value, depth
                [[], 0, root[0], 1],
                [[0], 0, 10, 2],
                [[0], 1, 20, 2],
                [[0], 2, root[0][2], 2],
                [[0, 2], 'array', root[0][2].array, 3],
                [[0, 2, 'array'], 0, root[0][2].array[0], 4],
                [[0, 2, 'array', 0], 'string', 'string', 5],
                [[0, 2, 'array', 0], 'number', 10, 5],
                [[0, 2, 'array'], 1, [10], 4],
                [[0, 2, 'array', 1], 0, 10, 5],
                [[0, 2, 'array'], 2, root[0][2].array[2], 4],
                [[0, 2, 'array', 2], 'boolean', true, 5],
                [[], 1, root[1], 1],
                [[1], 'string', 'string', 2],
                [[1], 'nested', root[1].nested, 2],
                [[1, 'nested'], 'float', 10.10, 3]
            ];
            assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse all objects');
            assert.deepStrictEqual(root, rootArray, 'should not modify original object');
        });

        it('should stop execution when requested', () => {
            const root = {
                level1: {
                    level2: {
                        level3: true
                    }
                }
            };
            const actualHistory = [];
            util.traverseJSON(root, (parent, key, depth, stop, path) => {
                actualHistory.push([path, key]);
                if (key === 'level2') {
                    stop();
                }
            });

            const expectedHistory = [
                // path, key
                [[], 'level1'],
                [['level1'], 'level2']
            ];
            assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
        });

        it('should not inspect nested data when requested', () => {
            const root = {
                level1_a: {
                    level2_a_stop: {
                        level3_a: {
                            level4: true
                        }
                    },
                    level2_b: {
                        level3: false
                    }
                },
                level1_b: {
                    level2_a: {
                        level3: true
                    },
                    level2_b: {
                        level3: false
                    }
                }
            };
            const actualHistory = [];
            // eslint-disable-next-line consistent-return
            util.traverseJSON(root, (parent, key, depth, stop, path) => {
                actualHistory.push([path, key]);
                if (key === 'level2_a_stop') {
                    return false;
                }
            });

            const expectedHistory = [
                // path, key
                [[], 'level1_a'],
                [['level1_a'], 'level2_a_stop'],
                [['level1_a'], 'level2_b'],
                [['level1_a', 'level2_b'], 'level3'],
                [[], 'level1_b'],
                [['level1_b'], 'level2_a'],
                [['level1_b', 'level2_a'], 'level3'],
                [['level1_b'], 'level2_b'],
                [['level1_b', 'level2_b'], 'level3']
            ];
            assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
        });

        it('should handle circular references', () => {
            const root = util.deepCopy(rootObject);
            root.object.nested.circular = root;
            const actualHistory = [];

            util.traverseJSON(root, (parent, key, depth, stop, path) => {
                actualHistory.push([path, key, parent[key], depth]);
            });

            const expectedHistory = [
                // path, key, value, depth
                [[], 'array', root.array, 1],
                [['array'], 0, 10, 2],
                [['array'], 1, 20, 2],
                [['array'], 2, root.array[2], 2],
                [['array', 2], 'array', root.array[2].array, 3],
                [['array', 2, 'array'], 0, root.array[2].array[0], 4],
                [['array', 2, 'array', 0], 'string', 'string', 5],
                [['array', 2, 'array', 0], 'number', 10, 5],
                [['array', 2, 'array'], 1, [10], 4],
                [['array', 2, 'array', 1], 0, 10, 5],
                [['array', 2, 'array'], 2, root.array[2].array[2], 4],
                [['array', 2, 'array', 2], 'boolean', true, 5],
                [[], 'object', root.object, 1],
                [['object'], 'string', 'string', 2],
                [['object'], 'nested', root.object.nested, 2],
                [['object', 'nested'], 'float', 10.10, 3],
                [['object', 'nested'], 'circular', root, 3] // assert should be able to handle circular refs
            ];
            assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse all objects');
        });

        it('should break circular references (in objects, boolean value)', () => {
            const root = {
                level1: {}
            };
            root.level1.circularRef = root;

            const actualHistory = [];
            util.traverseJSON(root, { breakCircularRef: true }, (parent, key, depth, stop, path) => {
                actualHistory.push([path, key]);
            });

            const expectedHistory = [
                // path, key
                [[], 'level1'],
                [['level1'], 'circularRef']
            ];
            assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
            assert.deepStrictEqual(root, {
                level1: {
                    circularRef: true
                }
            }, 'should break circular ref');
        });

        it('should break circular references (in objects, complex value)', () => {
            const root = {
                level1: {}
            };
            root.level1.circularRef = root;

            const actualHistory = [];
            util.traverseJSON(root, { breakCircularRef: { refBreak: true } }, (parent, key, depth, stop, path) => {
                actualHistory.push([path, key]);
            });

            const expectedHistory = [
                // path, key
                [[], 'level1'],
                [['level1'], 'circularRef']
            ];
            assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
            assert.deepStrictEqual(root, {
                level1: {
                    circularRef: { refBreak: true }
                }
            }, 'should break circular ref');
        });

        it('should break circular references (no callback)', () => {
            const root = {
                level1: {}
            };
            root.level1.circularRef = root;
            util.traverseJSON(root, { breakCircularRef: true });
            assert.deepStrictEqual(root, {
                level1: {
                    circularRef: true
                }
            }, 'should break circular ref');
        });

        it('should respect maxDepth', () => {
            const root = util.deepCopy(rootObject);
            root.object.nested.circular = root;

            const actualHistory = [];
            util.traverseJSON(root, { maxDepth: 2 }, (parent, key, depth, stop, path) => {
                actualHistory.push([path, key, parent[key], depth]);
            });

            const expectedHistory = [
                // path, key, value, depth
                [[], 'array', root.array, 1],
                [['array'], 0, 10, 2],
                [['array'], 1, 20, 2],
                [['array'], 2, root.array[2], 2],
                [[], 'object', root.object, 1],
                [['object'], 'string', 'string', 2],
                [['object'], 'nested', root.object.nested, 2]
            ];
            assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
        });

        it('should respect maxDepth (arrays)', () => {
            const root = [[[[[[[[]]]]]]]];

            const actualHistory = [];
            util.traverseJSON(root, { maxDepth: 2 }, (parent, key, depth, stop, path) => {
                actualHistory.push([path, key, parent[key], depth]);
            });

            const expectedHistory = [
                // path, key, value, depth
                [[], 0, root[0], 1],
                [[0], 0, root[0][0], 2]
            ];
            assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
        });

        it('should allow to swap options and callback', () => {
            const root = [[[[[[[[]]]]]]]];

            const actualHistory = [];
            util.traverseJSON(root, (parent, key, depth, stop, path) => {
                actualHistory.push([path, key, parent[key], depth]);
            }, { maxDepth: 2 });

            const expectedHistory = [
                // path, key, value, depth
                [[], 0, root[0], 1],
                [[0], 0, root[0][0], 2]
            ];
            assert.sameDeepMembers(actualHistory, expectedHistory, 'should traverse expected objects only');
        });

        it('should do nothing when root object is empty array', () => {
            const spy = sinon.spy();
            util.traverseJSON([], spy);
            assert.isFalse(spy.called, 'should not call callback');
        });

        it('should do nothing when root object is primitive', () => {
            const primitives = [
                0,
                'string',
                true,
                undefined,
                null
            ];
            const spy = sinon.spy();
            primitives.forEach((primitive) => util.traverseJSON(primitive, spy));
            assert.isFalse(spy.called, 'should not call callback');
        });
    });

    describe('.proxyForNodeCallbackFuncs', () => {
        it('should wrap origin function into promise-based function', () => {
            const successFunc = (a, b, cb) => {
                assert.deepStrictEqual(a, 10, 'should pass expected arg');
                assert.deepStrictEqual(b, 20, 'should pass expected arg');
                assert.isFunction(cb, 'should pass expected arg');
                cb(null, a + b);
            };
            const promisified = util.proxyForNodeCallbackFuncs({ successFunc }, 'successFunc');
            return assert.becomes(promisified(10, 20), [30], 'should resolve with expected value');
        });

        it('should reject when callback received error as first arg', () => {
            const funcWithError = (a, b, cb) => {
                assert.deepStrictEqual(a, 10, 'should pass expected arg');
                assert.deepStrictEqual(b, 20, 'should pass expected arg');
                assert.isFunction(cb, 'should pass expected arg');
                cb(new Error('expected error'), a + b);
            };
            const promisified = util.proxyForNodeCallbackFuncs({ funcWithError }, 'funcWithError');
            return assert.isRejected(promisified(10, 20), /expected error/, 'should reject on error');
        });
    });

    describe('.onApplicationExit', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('should register callback', () => {
            const stub = sinon.stub(process, 'on');
            stub.callsFake();

            util.onApplicationExit(() => {});
            assert.sameDeepMembers(
                stub.args.map((args) => args[0]),
                ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'],
                'should register callback'
            );
        });
    });

    describe('Chunks', () => {
        describe('constructor', () => {
            it('should not throw error on missing maxChunkSize value', () => {
                let chunks = new util.Chunks();
                assert.deepStrictEqual(chunks.maxChunkSize, Number.MAX_SAFE_INTEGER, 'should set default value for maxChunkSize');

                chunks = new util.Chunks({});
                assert.deepStrictEqual(chunks.maxChunkSize, Number.MAX_SAFE_INTEGER, 'should set default value for maxChunkSize');
            });

            it('should throw error on invalid maxChunkSize value', () => {
                assert.throws(
                    () => new util.Chunks({ maxChunkSize: 'not a number' }),
                    '\'maxChunkSize\' should be > 0, got \'not a number\' (string)',
                    'should throw error on invalid maxChunkSize value'
                );
                assert.throws(
                    () => new util.Chunks({ maxChunkSize: -1 }),
                    '\'maxChunkSize\' should be > 0, got \'-1\' (number)',
                    'should throw error on invalid maxChunkSize value'
                );
                assert.throws(
                    () => new util.Chunks({ maxChunkSize: 0 }),
                    '\'maxChunkSize\' should be > 0, got \'0\' (number)',
                    'should throw error on invalid maxChunkSize value'
                );
            });

            it('should use default serializer', () => {
                const chunks = new util.Chunks();
                chunks.add([1, 2, 3]);
                assert.deepStrictEqual(chunks.getAll(), [['[1,2,3]']], 'should return expected data');
            });

            it('should use non-default serializer', () => {
                const chunks = new util.Chunks({ serializer: (data) => JSON.stringify(data, null, 4) });
                chunks.add([1, 2, 3]);
                assert.deepStrictEqual(chunks.getAll(), [['[\n    1,\n    2,\n    3\n]']], 'should return expected data');
            });

            it('should use "this" as context for serializer', () => {
                const chunks = new util.Chunks({
                    serializer(data) {
                        assert.instanceOf(this, util.Chunks);
                        assert.deepStrictEqual(this.currentChunkSize, 0, 'should return expected value');
                        return JSON.stringify(data, null, 4);
                    }
                });
                chunks.add('test');
            });
        });

        describe('.add()', () => {
            it('should add data', () => {
                const chunks = new util.Chunks({ maxChunkSize: 10 });
                assert.deepStrictEqual(chunks.getAll(), [], 'should return expected value');
                assert.deepStrictEqual(chunks.totalChunks, 0, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 0, 'should return expected value');

                chunks.add('test1test');
                assert.deepStrictEqual(chunks.getAll(), [['test1test']], 'should return expected data');
                assert.deepStrictEqual(chunks.totalChunks, 1, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 9, 'should return expected value');

                chunks.add('test2test');
                assert.deepStrictEqual(chunks.getAll(), [['test1test'], ['test2test']], 'should return expected data');
                assert.deepStrictEqual(chunks.totalChunks, 2, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 18, 'should return expected value');

                chunks.add('t');
                assert.deepStrictEqual(chunks.getAll(), [['test1test'], ['test2test', 't']], 'should return expected data');
                assert.deepStrictEqual(chunks.totalChunks, 2, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 19, 'should return expected value');

                chunks.add('est');
                assert.deepStrictEqual(chunks.getAll(), [['test1test'], ['test2test', 't'], ['est']], 'should return expected data');
                assert.deepStrictEqual(chunks.totalChunks, 3, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 22, 'should return expected value');

                chunks.add('3test');
                assert.deepStrictEqual(chunks.getAll(), [['test1test'], ['test2test', 't'], ['est', '3test']], 'should return expected data');
                assert.deepStrictEqual(chunks.totalChunks, 3, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 27, 'should return expected value');
            });

            it('should convert data to JSON', () => {
                const chunks = new util.Chunks({ maxChunkSize: 10 });
                assert.deepStrictEqual(chunks.getAll(), [], 'should return expected value');
                assert.deepStrictEqual(chunks.totalChunks, 0, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 0, 'should return expected value');

                chunks.add(10);
                assert.deepStrictEqual(chunks.getAll(), [['10']], 'should return expected data');
                assert.deepStrictEqual(chunks.totalChunks, 1, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 2, 'should return expected value');

                chunks.add({ test: 10 });
                assert.deepStrictEqual(chunks.getAll(), [['10'], ['{"test":10}']], 'should return expected data');
                assert.deepStrictEqual(chunks.totalChunks, 2, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 13, 'should return expected value');
            });

            it('should add data when serializer returns Array', () => {
                const chunks = new util.Chunks({
                    maxChunkSize: 10,
                    serializer: (data) => [data.slice(0, 2), data.slice(2)]
                });
                chunks.add('message');
                assert.deepStrictEqual(chunks.getAll(), [['me', 'ssage']], 'should return expected data');
                assert.deepStrictEqual(chunks.totalChunks, 1, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 7, 'should return expected value');

                chunks.add('messageB');
                assert.deepStrictEqual(chunks.getAll(), [['me', 'ssage', 'me'], ['ssageB']], 'should return expected data');
                assert.deepStrictEqual(chunks.totalChunks, 2, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 15, 'should return expected value');
            });
        });

        describe('.clear()', () => {
            it('should reset state', () => {
                const chunks = new util.Chunks({ maxChunkSize: 10 });
                assert.deepStrictEqual(chunks.totalSize, 0, 'should return expected value');

                chunks.add('test1test');
                chunks.add('test2test');
                assert.deepStrictEqual(chunks.totalChunks, 2, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 18, 'should return expected value');
                assert.deepStrictEqual(chunks.getAll(), [['test1test'], ['test2test']], 'should return expected data');

                chunks.clear();
                assert.deepStrictEqual(chunks.totalChunks, 0, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 0, 'should return expected value');
                assert.deepStrictEqual(chunks.getAll(), [], 'should return expected data');

                chunks.add('test3test');
                chunks.add('test4test');
                assert.deepStrictEqual(chunks.totalChunks, 2, 'should return expected value');
                assert.deepStrictEqual(chunks.totalSize, 18, 'should return expected value');
                assert.deepStrictEqual(chunks.getAll(), [['test3test'], ['test4test']], 'should return expected data');
            });
        });

        describe('.currentChunkSize', () => {
            it('should return size of current chunk', () => {
                const chunks = new util.Chunks({ maxChunkSize: 10 });
                assert.deepStrictEqual(chunks.currentChunkSize, 0, 'should return expected value');

                chunks.add('test1test');
                assert.deepStrictEqual(chunks.currentChunkSize, 9, 'should return expected value');
                assert.deepStrictEqual(chunks.totalChunks, 1, 'should return expected value');

                chunks.add('t');
                assert.deepStrictEqual(chunks.currentChunkSize, 10, 'should return expected value');
                assert.deepStrictEqual(chunks.totalChunks, 1, 'should return expected value');

                chunks.add('e');
                assert.deepStrictEqual(chunks.currentChunkSize, 1, 'should return expected value');
                assert.deepStrictEqual(chunks.totalChunks, 2, 'should return expected value');
            });
        });

        describe('.getAll()', () => {
            it('should return all data', () => {
                const chunks = new util.Chunks({ maxChunkSize: 10 });
                assert.deepStrictEqual(chunks.getAll(), [], 'should return expected value');

                chunks.add('test1test');
                chunks.add('test2test');
                assert.deepStrictEqual(chunks.getAll(), [['test1test'], ['test2test']], 'should return expected data');
            });
        });

        describe('.maxChunkSize', () => {
            it('should be read-only property', () => {
                const chunks = new util.Chunks();
                const origin = chunks.maxChunkSize;
                assert.throws(() => {
                    chunks.maxChunkSize = 10;
                });
                assert.isTrue(origin === chunks.maxChunkSize, 'should not be able to update read-only property');
            });

            it('should set property value', () => {
                let chunks = new util.Chunks();
                assert.deepStrictEqual(chunks.maxChunkSize, Number.MAX_SAFE_INTEGER, 'should set default value for maxChunkSize');

                chunks = new util.Chunks({ maxChunkSize: 10 });
                assert.deepStrictEqual(chunks.maxChunkSize, 10, 'should set provided value for maxChunkSize');
            });
        });

        describe('.serializer', () => {
            it('should be read-only property', () => {
                const chunks = new util.Chunks();
                const origin = chunks.serializer;
                assert.throws(() => {
                    chunks.serializer = 10;
                });
                assert.isTrue(origin === chunks.serializer, 'should not be able to update read-only property');
            });

            it('should use default serializer', () => {
                const chunks = new util.Chunks();
                assert.deepStrictEqual(chunks.serializer([1, 2, 3]), '[1,2,3]', 'should return expected data');
            });

            it('should use non-default serializer', () => {
                const chunks = new util.Chunks({ serializer: (data) => JSON.stringify(data, null, 4) });
                assert.deepStrictEqual(chunks.serializer([1, 2, 3]), '[\n    1,\n    2,\n    3\n]', 'should return expected data');
            });
        });

        describe('.totalChunks', () => {
            it('should be read-only property', () => {
                const chunks = new util.Chunks();
                const origin = chunks.totalChunks;
                assert.throws(() => {
                    chunks.totalChunks = 10;
                });
                assert.isTrue(origin === chunks.totalChunks, 'should not be able to update read-only property');
            });

            it('should return number of chunks', () => {
                const chunks = new util.Chunks({ maxChunkSize: 10 });
                assert.deepStrictEqual(chunks.totalChunks, 0, 'should return expected value');

                chunks.add('test');
                assert.deepStrictEqual(chunks.totalChunks, 1, 'should return expected value');
                chunks.add('test');
                assert.deepStrictEqual(chunks.totalChunks, 1, 'should return expected value');
                chunks.add('test');
                assert.deepStrictEqual(chunks.totalChunks, 2, 'should return expected value');
            });
        });

        describe('.totalSize', () => {
            it('should be read-only property', () => {
                const chunks = new util.Chunks();
                const origin = chunks.totalSize;
                assert.throws(() => {
                    chunks.totalSize = 10;
                });
                assert.isTrue(origin === chunks.totalSize, 'should not be able to update read-only property');
            });

            it('should return number of bytes', () => {
                const chunks = new util.Chunks({ maxChunkSize: 10 });
                assert.deepStrictEqual(chunks.totalSize, 0, 'should return expected value');

                chunks.add('test');
                assert.deepStrictEqual(chunks.totalSize, 4, 'should return expected value');
                chunks.add('test');
                assert.deepStrictEqual(chunks.totalSize, 8, 'should return expected value');
                chunks.add('test');
                assert.deepStrictEqual(chunks.totalSize, 12, 'should return expected value');
            });
        });
    });
});
