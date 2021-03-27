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
const sinon = require('sinon');

const timers = require('../../../src/lib/utils/timers');


chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Timer Tests', () => {
    describe('BasicTimer', () => {
        const basicTimer = new timers.BasicTimer();

        describe('.start()', () => {
            it('should start function on interval', () => assert.isFulfilled(
                new Promise((resolve) => {
                    const intervalID = basicTimer.start(
                        (args) => {
                            basicTimer.stop(intervalID);
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
                    const intervalID = basicTimer.start(
                        () => {
                            const newIntervalID = basicTimer.update(
                                intervalID,
                                (args) => {
                                    basicTimer.stop(newIntervalID);
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
                    const intervalID = basicTimer.start(
                        (args) => {
                            basicTimer.stop(intervalID);
                            assert.strictEqual(args, 'test');
                            resolve();
                        },
                        'test',
                        0.01
                    );
                })
            ));
        });
    });

    describe('SlidingTimer', () => {
        let sinonClock;
        let expectedArgs;
        let loggerException;
        let loggerWarning;
        let callCounter = 0;

        const counterFunc = (args) => {
            assert.deepStrictEqual(args, expectedArgs);
            callCounter += 1;
        };

        const promisifiedCounterFunc = args => Promise.resolve(counterFunc(args));

        beforeEach(() => {
            sinonClock = sinon.useFakeTimers();
        });

        afterEach(() => {
            callCounter = 0;
            expectedArgs = undefined;
            loggerException = undefined;
            loggerWarning = undefined;

            sinonClock.restore();
        });

        // Tick the clock; and also force Promise resolution before/after clock tick
        const tickWithPromise = tickTime => Promise.resolve().then(() => sinonClock.tick(tickTime)).then();

        it('should start and run scheduled function on an interval, with passed args (function=promise)', () => {
            expectedArgs = 'test1';
            const timer = new timers.SlidingTimer(promisifiedCounterFunc, 'test1', 1); // 1 second
            timer.start();

            // Progress 3 seconds
            return Promise.resolve()
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => {
                    assert.strictEqual(callCounter, 3);
                });
        });

        it('should start and run scheduled function on an interval, with passed args (function=non-promise)', () => {
            expectedArgs = 'test2';
            const timer = new timers.SlidingTimer(counterFunc, 'test2', 1); // 1 second
            timer.start();

            // Progress 3 seconds
            return Promise.resolve()
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => assert.strictEqual(callCounter, 3));
        });

        it('should stop a running function', () => {
            const timer = new timers.SlidingTimer(promisifiedCounterFunc, undefined, 1); // 1 second
            timer.start();

            return Promise.resolve()
                .then(() => tickWithPromise(1100))
                .then(() => {
                    // Stop after first 'tick'
                    timer.stop();
                    return tickWithPromise(1100);
                })
                .then(() => tickWithPromise(1100))
                .then(() => assert.strictEqual(callCounter, 1));
        });

        it('should update a running function', () => {
            const timer = new timers.SlidingTimer(promisifiedCounterFunc, undefined, 1); // 1 second
            timer.start();

            return Promise.resolve()
                .then(() => tickWithPromise(1100))
                .then(() => {
                    // Stop after first 'tick'
                    timer.update(promisifiedCounterFunc, 'updatedArgs', 4); // Interval -> 4 seconds
                    expectedArgs = 'updatedArgs';
                    return tickWithPromise(2100);
                })
                .then(() => tickWithPromise(2100))
                .then(() => assert.strictEqual(callCounter, 2));
        });

        it('should update a long-running function', () => {
            let firstResolve = 0;
            let secondResolve = 0;
            const func = () => Promise.resolve()
                .then(() => new Promise(resolve => setTimeout(resolve, 1100)))
                .then(() => {
                    firstResolve += 1;
                    return new Promise(resolve => setTimeout(resolve, 1100));
                })
                .then(() => {
                    secondResolve += 1;
                });

            const timer = new timers.SlidingTimer(func, undefined, 1); // 1 second
            timer.start();

            return Promise.resolve()
                .then(() => tickWithPromise(1100)) // timer timeout
                .then(() => tickWithPromise(1100)) // first setTimeout
                .then(() => tickWithPromise(1100)) // second setTimeout
                .then(() => {}) // force promise resolution
                .then(() => {
                    timer.update(func, undefined, 4); // Interval -> 4 seconds
                    return tickWithPromise(4100);
                })
                .then(() => tickWithPromise(1100)) // first setTimeout
                .then(() => tickWithPromise(1100)) // second setTimeout
                .then(() => {
                    assert.strictEqual(firstResolve, 2);
                    assert.strictEqual(secondResolve, 2);
                });
        });

        it('should log warning, and continue processing, if function took longer than interval', () => {
            expectedArgs = 'test';
            const timer = new timers.SlidingTimer(promisifiedCounterFunc, 'test', 1); // 1 second
            loggerWarning = sinon.spy(timer.logger, 'warning');
            timer.start();

            // Progress 6 seconds
            return Promise.resolve()
                .then(() => tickWithPromise(2100))
                .then(() => tickWithPromise(2100))
                .then(() => tickWithPromise(2100))
                .then(() => {
                    assert.strictEqual(callCounter, 3);
                    assert.strictEqual(loggerWarning.callCount, 3);
                    assert.deepStrictEqual(loggerWarning.firstCall.args, ['Timer has interval of 1 seconds, but took 1.1 seconds.']);
                });
        });

        it('should log error and continue on thrown error (abortOnFailure = default)', () => {
            const errorFunc = () => {
                callCounter += 1;
                throw new Error('Func Err');
            };
            const timer = new timers.SlidingTimer(errorFunc, undefined, 1); // 1 second
            loggerException = sinon.spy(timer.logger, 'exception');
            timer.start();

            // Progress 3  seconds
            return Promise.resolve()
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => {
                    assert.strictEqual(callCounter, 3);
                    assert.strictEqual(loggerException.callCount, 3);
                    assert.strictEqual(loggerException.firstCall.args[0], 'SlidingTimer execution error');
                    assert.strictEqual(loggerException.firstCall.args[1].message, 'Func Err');
                });
        });

        it('should log error and continue on reject (abortOnFailure = default)', () => {
            const rejectionFunc = () => {
                callCounter += 1;
                return Promise.reject(new Error('Func Err'));
            };
            const timer = new timers.SlidingTimer(rejectionFunc, undefined, 1); // 1 second
            loggerException = sinon.spy(timer.logger, 'exception');
            timer.start();

            // Progress 3  seconds
            return Promise.resolve()
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => {
                    assert.strictEqual(callCounter, 3);
                    assert.strictEqual(loggerException.callCount, 3);
                    assert.strictEqual(loggerException.firstCall.args[0], 'SlidingTimer execution error');
                    assert.strictEqual(loggerException.firstCall.args[1].message, 'Func Err');
                });
        });

        it('should log error and not continue on reject (abortOnFailure = true)', () => {
            const rejectionFunc = () => {
                callCounter += 1;
                return Promise.reject(new Error('Func Err'));
            };
            const timer = new timers.SlidingTimer(rejectionFunc, undefined, 1, {
                abortOnFailure: true
            });
            loggerException = sinon.spy(timer.logger, 'exception');
            loggerWarning = sinon.spy(timer.logger, 'warning');
            timer.start();

            // Progress 3  seconds
            return Promise.resolve()
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => {
                    assert.strictEqual(callCounter, 1);
                    assert.strictEqual(timer.funcRunning, false, 'should set funcRunning to false on rejected function');
                    assert.strictEqual(loggerException.callCount, 1);
                    assert.strictEqual(loggerException.firstCall.args[0], 'SlidingTimer execution error');
                    assert.strictEqual(loggerException.firstCall.args[1].message, 'Func Err');
                    assert.strictEqual(loggerWarning.firstCall.args[0], 'Aborting on failure. Not scheduling next execution');
                });
        });

        it('should log error and continue on reject (abortOnFailure = false)', () => {
            const rejectionFunc = () => {
                callCounter += 1;
                return Promise.reject(new Error('Func Err'));
            };
            const timer = new timers.SlidingTimer(rejectionFunc, undefined, 1, {
                abortOnFailure: false
            });
            loggerException = sinon.spy(timer.logger, 'exception');
            timer.start();

            // Progress 3  seconds
            return Promise.resolve()
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => tickWithPromise(1100))
                .then(() => {
                    assert.strictEqual(callCounter, 3);
                    assert.strictEqual(timer.funcRunning, false, 'should set funcRunning to false on rejected function');
                    assert.strictEqual(loggerException.callCount, 3);
                    assert.strictEqual(loggerException.firstCall.args[0], 'SlidingTimer execution error');
                    assert.strictEqual(loggerException.firstCall.args[1].message, 'Func Err');
                });
        });
    });
});
