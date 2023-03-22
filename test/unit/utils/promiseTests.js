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

const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');

const promiseUtil = sourceCode('src/lib/utils/promise');

moduleCache.remember();

describe('Promise Util', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('.allSettled()', () => {
        it('should reject when no array passed (no args)', () => assert.isRejected(promiseUtil.allSettled(), /is not an array/));
        it('should reject when no array passed (wrong type)', () => assert.isRejected(promiseUtil.allSettled('not a func'), /is not an array/));

        it('should resolve when all settled', () => assert.becomes(
            promiseUtil.allSettled([
                Promise.resolve(1),
                Promise.resolve(2)
            ]),
            [
                { status: 'fulfilled', value: 1 },
                { status: 'fulfilled', value: 2 }
            ]
        ));

        it('should resolve when all rejected', () => {
            const err1 = new Error('err1');
            const err2 = new Error('err2');
            return assert.becomes(
                promiseUtil.allSettled([
                    Promise.reject(err1),
                    Promise.reject(err2)
                ]),
                [
                    { status: 'rejected', reason: err1 },
                    { status: 'rejected', reason: err2 }
                ]
            );
        });

        it('should resolve when one fulfilled and one rejected', () => {
            const err2 = new Error('err2');
            return assert.becomes(
                promiseUtil.allSettled([
                    Promise.resolve(1),
                    Promise.reject(err2)
                ]),
                [
                    { status: 'fulfilled', value: 1 },
                    { status: 'rejected', reason: err2 }
                ]
            );
        });
    });

    describe('.getValues()', () => {
        it('should get values for all fulfilled promises', () => assert.becomes(
            promiseUtil.allSettled([
                Promise.resolve(1),
                Promise.resolve(2)
            ])
                .then(promiseUtil.getValues),
            [1, 2]
        ));

        it('should throw error when found rejected promise', () => {
            const err1 = new Error('err1');
            const err2 = new Error('err2');
            return assert.isRejected(
                promiseUtil.allSettled([
                    Promise.reject(err1),
                    Promise.reject(err2)
                ])
                    .then(promiseUtil.getValues),
                /err1/
            );
        });

        it('should get values for fulfilled and ignore rejected promises', () => {
            const err2 = new Error('err2');
            return assert.becomes(
                promiseUtil.allSettled([
                    Promise.resolve(1),
                    Promise.reject(err2)
                ])
                    .then((statuses) => promiseUtil.getValues(statuses, true)),
                [1, undefined]
            );
        });
    });

    describe('.loopForEach()', () => {
        it('should reject when no array passed (no args)', () => assert.isRejected(promiseUtil.loopForEach(), /is not an array/));
        it('should reject when no array passed (wrong type)', () => assert.isRejected(promiseUtil.loopForEach('not a func'), /is not an array/));
        it('should reject when no function passed (no args)', () => assert.isRejected(promiseUtil.loopForEach([]), /is not a function/));
        it('should reject when no function passed (wrong type)', () => assert.isRejected(promiseUtil.loopForEach([], 'not a func'), /is not a function/));

        it('should resolve without calling a callback when array has no elements', () => {
            const spy = sinon.spy();
            return promiseUtil.loopForEach([], spy)
                .then(() => {
                    assert.isFalse(spy.called, 'should not call a callback');
                });
        });

        it('should iterate over all elements (sync)', () => {
            const stack = [];
            const array = [1, 2, 3, 4, 5];
            return promiseUtil.loopForEach(array, (elem, idx, arr, breakCb) => {
                assert.isFunction(breakCb, 'should be function');
                assert.isNumber(idx, 'should be number');
                assert.deepStrictEqual(arr, [1, 2, 3, 4, 5], 'should be the same array');
                assert.isTrue(arr === array, 'should be the same array');

                stack.push([elem, idx]);
            })
                .then(() => {
                    assert.deepStrictEqual(
                        stack,
                        [
                            [1, 0],
                            [2, 1],
                            [3, 2],
                            [4, 3],
                            [5, 4]
                        ],
                        'should pass expected arguments to callback'
                    );
                });
        });

        it('should iterate over all elements (async)', () => {
            const stack = [];
            const array = [1, 2, 3, 4, 5];
            return promiseUtil.loopForEach(array, (elem, idx, arr, breakCb) => Promise.resolve()
                .then(() => {
                    assert.isFunction(breakCb, 'should be function');
                    assert.isNumber(idx, 'should be number');
                    assert.deepStrictEqual(arr, [1, 2, 3, 4, 5], 'should be the same array');
                    assert.isTrue(arr === array, 'should be the same array');

                    stack.push([elem, idx]);
                }))
                .then(() => {
                    assert.deepStrictEqual(
                        stack,
                        [
                            [1, 0],
                            [2, 1],
                            [3, 2],
                            [4, 3],
                            [5, 4]
                        ],
                        'should pass expected arguments to callback'
                    );
                });
        });

        it('should stop loop via callback', () => {
            const stack = [];
            const array = [1, 2, 3, 4, 5];
            return promiseUtil.loopForEach(array, (elem, idx, arr, breakCb) => Promise.resolve()
                .then(() => {
                    stack.push([elem, idx]);
                    if (stack.length === 2) {
                        breakCb();
                    }
                }))
                .then(() => {
                    assert.deepStrictEqual(
                        stack,
                        [
                            [1, 0],
                            [2, 1]
                        ],
                        'should pass expected arguments to callback'
                    );
                });
        });

        it('should stop loop when rejected (async)', () => {
            const stack = [];
            const array = [1, 2, 3, 4, 5];
            return assert.isRejected(promiseUtil.loopForEach(array, (elem, idx) => Promise.resolve()
                .then(() => {
                    stack.push([elem, idx]);
                    if (stack.length === 2) {
                        return Promise.reject(new Error('expected error'));
                    }
                    return Promise.resolve();
                })), 'expected error')
                .then(() => {
                    assert.deepStrictEqual(
                        stack,
                        [
                            [1, 0],
                            [2, 1]
                        ],
                        'should pass expected arguments to callback'
                    );
                });
        });

        it('should stop loop when failed (sync)', () => {
            const stack = [];
            const array = [1, 2, 3, 4, 5];
            return assert.isRejected(promiseUtil.loopForEach(array, (elem, idx) => {
                stack.push([elem, idx]);
                if (stack.length === 2) {
                    throw new Error('expected error');
                }
            }), 'expected error')
                .then(() => {
                    assert.deepStrictEqual(
                        stack,
                        [
                            [1, 0],
                            [2, 1]
                        ],
                        'should pass expected arguments to callback'
                    );
                });
        });
    });

    describe('.loopUntil()', () => {
        it('should reject when no function passed (no args)', () => assert.isRejected(promiseUtil.loopUntil(), /is not a function/));
        it('should reject when no function passed (wrong type)', () => assert.isRejected(promiseUtil.loopUntil('not a func'), /is not a function/));

        it('should call target func at least once (sync)', () => {
            let tries = 0;
            return promiseUtil.loopUntil((breakCb) => {
                tries += 1;
                breakCb();
                return tries;
            })
                .then((ret) => {
                    assert.strictEqual(ret, 1, 'should return expected data');
                    assert.strictEqual(tries, 1, 'should call target function at least once');
                });
        });

        it('should call target func at least once (async)', () => {
            let tries = 0;
            return promiseUtil.loopUntil((breakCb) => Promise.resolve()
                .then(() => {
                    tries += 1;
                    breakCb();
                    return tries;
                }))
                .then((ret) => {
                    assert.strictEqual(ret, 1, 'should return expected data');
                    assert.strictEqual(tries, 1, 'should call target function at least once');
                });
        });

        it('should return value from last successful call', () => {
            let tries = 0;
            return promiseUtil.loopUntil((breakCb) => {
                tries += 1;
                if (tries === 3) {
                    breakCb();
                    assert.isTrue(breakCb.called, 'should stop the loop');
                } else {
                    assert.isFalse(breakCb.called, 'should not stop the loop yet');
                }
                return tries;
            })
                .then((ret) => {
                    assert.strictEqual(ret, 3, 'should return expected data');
                    assert.strictEqual(tries, 3, 'should call target function 3 times');
                });
        });

        it('should stop loop when target func failed (sync)', () => {
            let tries = 0;
            return assert.isRejected(promiseUtil.loopUntil(() => {
                tries += 1;
                if (tries === 3) {
                    throw new Error('expected error');
                }
                return tries;
            }), /expected error/)
                .then(() => {
                    assert.strictEqual(tries, 3, 'should call target function 3 times');
                });
        });

        it('should stop loop when target func rejected (async)', () => {
            let tries = 0;
            return assert.isRejected(promiseUtil.loopUntil(() => {
                tries += 1;
                if (tries === 3) {
                    return Promise.reject(new Error('expected error'));
                }
                return tries;
            }), /expected error/)
                .then(() => {
                    assert.strictEqual(tries, 3, 'should call target function 3 times');
                });
        });

        it('should be able to call func at least 101 times', () => {
            let tries = 0;
            return promiseUtil.loopUntil((breakCb) => {
                tries += 1;
                if (tries === 101) {
                    breakCb();
                }
                return tries;
            })
                .then((ret) => {
                    assert.strictEqual(ret, 101, 'should return expected data');
                    assert.strictEqual(tries, 101, 'should call target function 100 times');
                });
        });
    });

    describe('.retry()', () => {
        it('should reject when no function passed (no args)', () => assert.isRejected(promiseUtil.retry(), /is not a function/));
        it('should reject when no function passed (wrong type)', () => assert.isRejected(promiseUtil.retry('not a func'), /is not a function/));

        it('should report number of tries via options', () => {
            const opts = { maxTries: 3 };
            return promiseUtil.retry(() => Promise.reject(new Error('expected error')), opts)
                .catch((err) => {
                    assert.strictEqual(opts.tries, 3, 'expected 3 attempts');
                    assert.ok(/expected error/.test(err));
                });
        });

        it('should run target func at least once (default options)', () => {
            let tries = 0;
            const promiseFunc = () => {
                tries += 1;
                return Promise.reject(new Error('expected error'));
            };

            return promiseUtil.retry(promiseFunc)
                .catch((err) => {
                    assert.strictEqual(tries, 1, 'expected 1 attempt only');
                    assert.ok(/expected error/.test(err));
                });
        });

        it('should run target func at least once (empty options)', () => {
            const opts = {};
            return promiseUtil.retry(() => Promise.reject(new Error('expected error')), opts)
                .catch((err) => {
                    assert.strictEqual(opts.tries, 1, 'expected 1 attempt only');
                    assert.ok(/expected error/.test(err));
                });
        });

        it('should retry rejected promise (async)', () => {
            const opts = { maxTries: 3 };
            return promiseUtil.retry(() => Promise.reject(new Error('expected error')), opts)
                .catch((err) => {
                    assert.strictEqual(opts.tries, 3, 'expected 3 attempts');
                    assert.ok(/expected error/.test(err));
                });
        });

        it('should retry failed func (sync)', () => {
            const opts = { maxTries: 3 };
            return promiseUtil.retry(() => { throw new Error('expected error'); }, opts)
                .catch((err) => {
                    assert.strictEqual(opts.tries, 3, 'expected 3 attempts');
                    assert.ok(/expected error/.test(err));
                });
        });

        it('should not retry fulfilled promise (async)', () => {
            const opts = { maxTries: 3 };
            return promiseUtil.retry(() => Promise.resolve('success'), opts)
                .then((ret) => {
                    assert.strictEqual(ret, 'success', 'should return expected data');
                    assert.strictEqual(opts.tries, 1, 'expected 1 attempt only');
                });
        });

        it('should not retry when target func not failed (sync)', () => {
            const opts = { maxTries: 3 };
            return promiseUtil.retry(() => 'success', opts)
                .then((ret) => {
                    assert.strictEqual(ret, 'success', 'should return expected data');
                    assert.strictEqual(opts.tries, 1, 'expected 1 attempt only');
                });
        });

        it('should call callback on retry', () => {
            let callbackFlag = false;
            let callbackErrFlag = false;
            let tries = 0;
            let cbTries = 0;

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

            return promiseUtil.retry(promiseFunc, { maxTries: 3, callback })
                .catch((err) => {
                    assert.strictEqual(tries, 3, 'expected 3 attempts');
                    // less than 'expectedTries' because 'maxTries' check goes first
                    assert.strictEqual(cbTries, 2, 'expected 2 attempts for callback too');
                    assert.ok(/expected error/.test(err));
                    assert.ok(callbackErrFlag);
                    assert.ok(callbackFlag);
                });
        });

        it('should stop retry on success', () => {
            let tries = 0;
            const expectedTries = 2;

            const promiseFunc = () => {
                tries += 1;
                if (tries === expectedTries) {
                    return Promise.resolve('success');
                }
                return Promise.reject(new Error('expected error'));
            };

            return promiseUtil.retry(promiseFunc, { maxTries: 3 })
                .then((data) => {
                    assert.strictEqual(tries, expectedTries, 'expected 2 attempts only');
                    assert.strictEqual(data, 'success');
                });
        });

        it('should retry with delay', () => {
            const timestamps = [];
            const promiseFunc = () => {
                timestamps.push(Date.now());
                return Promise.reject(new Error('expected error'));
            };

            return promiseUtil.retry(promiseFunc, { maxTries: 3, delay: 60 })
                .catch((err) => {
                    assert.ok(/expected error/.test(err));
                    assert.lengthOf(timestamps, 3, 'Expected 3 records only');

                    for (let i = 1; i < timestamps.length; i += 1) {
                        const actualDelay = timestamps[i] - timestamps[i - 1];
                        // sometimes it is less than expected
                        assert.approximately(actualDelay, 60, 10, 'should be close to expected delay - 60ms');
                    }
                });
        }).timeout(2000);

        it('should retry first time without backoff', () => {
            const timestamps = [];
            const promiseFunc = () => {
                timestamps.push(Date.now());
                return Promise.reject(new Error('expected error'));
            };

            return promiseUtil.retry(promiseFunc, { maxTries: 3, delay: 60, backoff: 10 })
                .catch((err) => {
                    assert.ok(/expected error/.test(err));
                    assert.lengthOf(timestamps, 3, 'Expected 3 records only');

                    for (let i = 1; i < timestamps.length; i += 1) {
                        const actualDelay = timestamps[i] - timestamps[i - 1];
                        let expectedDelay = 60;
                        // first attempt should be without backoff factor
                        if (i > 1) {
                            /* eslint-disable no-restricted-properties */
                            expectedDelay += 10 * Math.pow(2, i - 1);
                        }
                        assert.approximately(actualDelay, expectedDelay, 20, 'should be close to expected delay');
                    }
                });
        }).timeout(10000);

        it('should be able to retry func at least 101 times', () => {
            const opts = { maxTries: 101 };
            return promiseUtil.retry(() => { throw new Error('expected error'); }, opts)
                .catch((err) => {
                    assert.ok(/expected error/.test(err));
                    assert.strictEqual(opts.tries, 101, 'should call target func 101 times');
                });
        });
    });

    describe('.sleep()', () => {
        it('should sleep for X ms.', () => {
            const startTime = Date.now();
            const expectedDelay = 50;
            return promiseUtil.sleep(expectedDelay)
                .then(() => {
                    const actualDelay = Date.now() - startTime;
                    assert.approximately(actualDelay, expectedDelay, 10);
                });
        });

        it('should cancel promise', () => {
            const promise = promiseUtil.sleep(50);
            assert.isTrue(promise.cancel(new Error('expected error')));
            assert.isFalse(promise.cancel(new Error('expected error')));
            return assert.isRejected(
                promise.then(() => Promise.reject(new Error('cancellation doesn\'t work'))),
                'expected error'
            );
        });

        it('should cancel promise after some delay', () => {
            const promise = promiseUtil.sleep(50);
            setTimeout(() => promise.cancel(), 10);
            return assert.isRejected(promise, /canceled/);
        });

        it('should not be able to cancel once resolved', () => {
            const promise = promiseUtil.sleep(50);
            return promise.then(() => {
                assert.isFalse(promise.cancel(new Error('expected error')));
            });
        });

        it('should not be able to cancel once canceled', () => {
            const promise = promiseUtil.sleep(50);
            assert.isTrue(promise.cancel());
            return promise.catch((err) => err)
                .then((err) => {
                    assert.isTrue(/canceled/.test(err));
                    assert.isFalse(promise.cancel(new Error('expected error')));
                });
        });
    });
});
