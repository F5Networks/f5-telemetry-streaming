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
const net = require('net');
const sinon = require('sinon');

const util = require('../../../src/lib/utils/misc');


chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Misc Util', () => {
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
