/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const logger = sourceCode('src/lib/logger');
const timers = sourceCode('src/lib/utils/timers');

moduleCache.remember();

describe('Timer Tests', () => {
    let fakeClock;
    let loggerStub;

    const assertApproximatelyArray = (actual, expected, delta, message) => {
        actual.forEach((av, idx) => {
            assert.approximately(av, expected[idx], delta, message);
        });
    };

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        fakeClock = stubs.clock();
        loggerStub = stubs.logger(logger);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('TimerInterface', () => {
        [
            'isActive',
            'start',
            'stop',
            'update'
        ].forEach((method) => {
            it(`should throw error for method that not implemented - ${method}()`, () => {
                const timerInterface = new timers.TimerInterface();
                assert.throws(
                    () => timerInterface[method](),
                    'Not implemented',
                    'should throw error when method not implemented'
                );
            });
        });
    });

    describe('Common', () => {
        // test for BasicTimer and SlidingTimer can be combined together because
        // it should behave similar for most cases
        [
            {
                name: 'BasicTimer',
                TimerClass: timers.BasicTimer
            },
            {
                name: 'SlidingTimer',
                TimerClass: timers.SlidingTimer
            }
        ].forEach((testConf) => testUtil.getCallableDescribe(testConf)(testConf.name, () => {
            let timerInst;

            beforeEach(() => {
                timerInst = new testConf.TimerClass();
            });

            afterEach(() => (timerInst ? timerInst.stop() : Promise.resolve()));

            describe('constructor', () => {
                it('should set properties (no args passed)', () => {
                    assert.isFalse(timerInst.isActive(), 'should not be active');
                    assert.notExists(timerInst.func, 'should not set target function');
                    assert.notExists(timerInst.intervalInS, 'should not set interval');
                    assert.notExists(timerInst.args, 'should not set arguments');
                    assert.notExists(timerInst.logger, 'should not set logger');
                    assert.isFalse(timerInst.abortOnFailure, 'should set abortOnFailure to false');
                });

                it('should set properties', () => {
                    const targetFunc = () => {};
                    timerInst = new testConf.TimerClass(targetFunc, 0.01, 'arg1', 'arg2');
                    assert.isFalse(timerInst.isActive(), 'should not be active');
                    assert.deepStrictEqual(timerInst.func, targetFunc, 'should set target function');
                    assert.deepStrictEqual(timerInst.intervalInS, 0.01, 'should set interval in seconds');
                    assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should set arguments');
                    assert.notExists(timerInst.logger, 'should not set logger');
                    assert.isFalse(timerInst.abortOnFailure, 'should set abortOnFailure to false');
                });

                it('should set properties (empty options passed)', () => {
                    const targetFunc = () => {};
                    timerInst = new testConf.TimerClass(targetFunc, {}, 'arg1', 'arg2');
                    assert.isFalse(timerInst.isActive(), 'should not be active');
                    assert.deepStrictEqual(timerInst.func, targetFunc, 'should set target function');
                    assert.notExists(timerInst.intervalInS, 'should not set interval');
                    assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should set arguments');
                    assert.notExists(timerInst.logger, 'should not set logger');
                    assert.isFalse(timerInst.abortOnFailure, 'should set abortOnFailure to false');
                });

                it('should set properties (options passed)', () => {
                    const targetFunc = () => {};
                    const siLogger = logger.getChild('st');
                    timerInst = new testConf.TimerClass(targetFunc, {
                        intervalInS: 0.01,
                        abortOnFailure: true,
                        logger: siLogger
                    }, 'arg1', 'arg2');
                    assert.isFalse(timerInst.isActive(), 'should not be active');
                    assert.deepStrictEqual(timerInst.func, targetFunc, 'should set target function');
                    assert.deepStrictEqual(timerInst.intervalInS, 0.01, 'should set interval in seconds');
                    assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should set arguments');
                    assert.deepStrictEqual(timerInst.logger, siLogger, 'should not set logger');
                    assert.isTrue(timerInst.abortOnFailure, 'should set abortOnFailure to true');
                });
            });

            describe('.isActive()', () => {
                it('should be active once started and inactive once stopped', () => {
                    fakeClock.stub.restore();
                    timerInst = new testConf.TimerClass(() => {}, 1);
                    assert.isFalse(timerInst.isActive(), 'should not be active');
                    return timerInst.start()
                        .then(() => {
                            assert.isTrue(timerInst.isActive(), 'should be active once started');
                            return timerInst.update();
                        })
                        .then(() => {
                            assert.isTrue(timerInst.isActive(), 'should be active once updated');
                            return timerInst.stop();
                        })
                        .then(() => {
                            assert.isFalse(timerInst.isActive(), 'should be inactive once stopped');
                        });
                });
            });

            describe('.start()', () => {
                it('should throw error when no function to run', () => assert.isRejected(
                    timerInst.start(),
                    'No function to run',
                    'should throw error when no function to run'
                ));

                it('should start when no interval specified', () => {
                    fakeClock.stub.restore();
                    assert.notExists(timerInst.intervalInS, 'should not set interval');
                    return assert.isFulfilled(
                        new Promise((resolve, reject) => {
                            timerInst.start(() => {
                                timerInst.stop()
                                    .then(() => {
                                        assert.notExists(timerInst.intervalInS, 'should not set interval');
                                        assert.notExists(timerInst.args, 'should not set arguments');
                                        assert.notExists(timerInst.logger, 'should not set logger');
                                        assert.isFalse(timerInst.abortOnFailure, 'should set abortOnFailure to false');
                                    })
                                    .then(resolve, reject);
                            }).catch(reject);
                        })
                    );
                });

                it('should not allow to start twice', () => assert.isRejected(
                    timerInst.start(() => {})
                        .then(() => timerInst.start(() => {})),
                    /started already/,
                    'should not allow to start twice'
                ));

                it('should start function and re-schedule it', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    let callCount = 0;
                    const btLogger = logger.getChild('bt');
                    const timestamps = [];
                    const targetFunc = () => Promise.resolve()
                        .then(() => {
                            callCount += 1;
                            timestamps.push(Date.now());
                            assert.isTrue(timerInst.isActive(), 'should be active');
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should not update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 2, 'should not update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should not update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should not update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should not update abortOnFailure');

                            if (callCount >= 3) {
                                return timerInst.stop()
                                    .then(() => {
                                        assertApproximatelyArray(timestamps, [2000, 4000, 6000], 200, 'should run on expected intervals');
                                        assert.isFalse(timerInst.isActive(), 'should not be active');
                                    })
                                    .then(() => resolve(callCount));
                            }
                            return Promise.resolve();
                        })
                        .catch(reject);

                    timerInst = new testConf.TimerClass(
                        targetFunc,
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.start().catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                })
                    .then((callCount) => {
                        assert.strictEqual(callCount, 3, 'should call function 3 times');
                    })));

                it('should not update properties and start function (no args passed)', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should not update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 2, 'should not update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should not update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should not update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should not update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        targetFunc,
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.start().catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should not update properties when interval passed as number and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 3, 'should update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should not update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should not update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should not update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        () => {},
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.start(targetFunc, 3).catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should not update properties when args passed and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 3, 'should update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should not update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should not update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        () => {},
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        }
                    );
                    timerInst.start(targetFunc, 3, 'arg1', 'arg2').catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should not update properties when function only passed and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 2, 'should not update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should not update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should not update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should not update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        () => {},
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.start(targetFunc).catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should update properties (direct assignment) and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 2, 'should update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass();
                    timerInst.func = targetFunc;
                    timerInst.abortOnFailure = true;
                    timerInst.intervalInS = 2;
                    timerInst.logger = btLogger;
                    timerInst.args = ['arg1', 'arg2'];
                    timerInst.start().catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should update properties when options object passed and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 2, 'should update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass();
                    timerInst.start(
                        targetFunc,
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    )
                        .catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should update properties when empty options object passed and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    fakeClock.stub.restore();
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.notExists(timerInst.intervalInS, 'should update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should not update arguments');
                            assert.notExists(timerInst.logger, 'should update logger');
                            assert.isFalse(timerInst.abortOnFailure, 'should update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        () => {},
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.start(
                        targetFunc,
                        {}
                    )
                        .catch(reject);
                })));

                it('should update properties and remove existing args and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    fakeClock.stub.restore();
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.notExists(timerInst.intervalInS, 'should update interval');
                            assert.notExists(timerInst.args, 'should update arguments');
                            assert.notExists(timerInst.logger, 'should update logger');
                            assert.isFalse(timerInst.abortOnFailure, 'should update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        () => {},
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.start(
                        targetFunc,
                        {
                            preserveArgs: false
                        }
                    )
                        .catch(reject);
                })));

                it('should catch and log error and continue to run function', () => {
                    let callCount = 0;
                    return assert.isFulfilled(new Promise((resolve, reject) => {
                        timerInst = new testConf.TimerClass(
                            () => {
                                callCount += 1;
                                setTimeout(() => timerInst.stop().then(resolve), 4000);
                                return Promise.reject(new Error('test'));
                            },
                            {
                                intervalInS: 1,
                                logger: logger.getChild('bt')
                            }
                        );
                        timerInst.start().catch(reject);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.isAbove(callCount, 3, 'should call function more than 3 times');
                            assert.includeMatch(loggerStub.messages.error, /execution error[\s\S]+test/gm, 'should log error message');
                        }));
                });

                it('should catch and log error and stop execution', () => {
                    let callCount = 0;
                    return assert.isFulfilled(new Promise((resolve, reject) => {
                        timerInst = new testConf.TimerClass(
                            () => {
                                callCount += 1;
                                setTimeout(resolve, 4000);
                                return Promise.reject(new Error('test'));
                            },
                            {
                                abortOnFailure: true,
                                intervalInS: 1,
                                logger: logger.getChild('bt')
                            }
                        );
                        timerInst.start().catch(reject);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.strictEqual(callCount, 1, 'should call function just once and stop it');
                            assert.isFalse(timerInst.isActive(), 'should stop timer');
                            assert.includeMatch(loggerStub.messages.error, /execution error[\s\S]+test/gm, 'should log error message');
                            assert.includeMatch(loggerStub.messages.warning, /aborting on failure/, 'should log warning message');
                        }));
                });

                it('should catch and log error and continue to run function (without logger)', () => {
                    let callCount = 0;
                    return assert.isFulfilled(new Promise((resolve, reject) => {
                        timerInst = new testConf.TimerClass(() => {
                            callCount += 1;
                            setTimeout(() => timerInst.stop().then(resolve), 4000);
                            return Promise.reject(new Error('test'));
                        }, 1);
                        timerInst.start().catch(reject);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.isAbove(callCount, 3, 'should call function more than 3 times');
                        }));
                });

                it('should catch and log error and stop execution (without logger)', () => {
                    let callCount = 0;
                    return assert.isFulfilled(new Promise((resolve, reject) => {
                        timerInst = new testConf.TimerClass(
                            () => {
                                callCount += 1;
                                setTimeout(resolve, 4000);
                                return Promise.reject(new Error('test'));
                            },
                            {
                                abortOnFailure: true,
                                intervalInS: 1
                            }
                        );
                        timerInst.start().catch(reject);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.strictEqual(callCount, 1, 'should call function just once and stop it');
                            assert.isFalse(timerInst.isActive(), 'should stop timer');
                        }));
                });

                it('should not stop new function when prev. one stopped due error', () => {
                    let originFuncCallCount = 0;
                    let newFuncCallCount = 0;

                    return assert.isFulfilled(new Promise((resolve, reject) => {
                        timerInst = new testConf.TimerClass(
                            () => {
                                originFuncCallCount += 1;
                                return timerInst.stop()
                                    // .start should generate new intervalID
                                    .then(() => timerInst.start(() => {
                                        newFuncCallCount += 1;
                                        if (newFuncCallCount >= 3) {
                                            resolve();
                                        }
                                    }))
                                    .catch(reject)
                                    // rejecting with error to stop current execution
                                    // at that time new intervalID should be generated already
                                    .then(() => Promise.reject(new Error('test')));
                            },
                            {
                                abortOnFailure: true,
                                intervalInS: 1
                            }
                        );
                        timerInst.start().catch(reject);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.isTrue(timerInst.isActive(), 'should run timer');
                            assert.strictEqual(originFuncCallCount, 1, 'should not call origin func once stopped');
                            assert.isAtLeast(newFuncCallCount, 3, 'should continue to call new func');
                        }));
                });
            });

            describe('.update()', () => {
                // this suite is almost a copy past of .start() suite but it is still
                // good to have full coverage to verify behavior

                it('should throw error when no function to run', () => assert.isRejected(
                    timerInst.update(),
                    'No function to run',
                    'should throw error when no function to run'
                ));

                it('should start when no interval specified', () => {
                    fakeClock.stub.restore();
                    assert.notExists(timerInst.intervalInS, 'should not set interval');
                    return assert.isFulfilled(
                        new Promise((resolve, reject) => {
                            timerInst.update(() => {
                                timerInst.stop()
                                    .then(() => {
                                        assert.notExists(timerInst.intervalInS, 'should not set interval');
                                        assert.notExists(timerInst.args, 'should not set arguments');
                                        assert.notExists(timerInst.logger, 'should not set logger');
                                        assert.isFalse(timerInst.abortOnFailure, 'should set abortOnFailure to false');
                                    })
                                    .then(resolve, reject);
                            }).catch(reject);
                        })
                    );
                });

                it('should start function and re-schedule it', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    let callCount = 0;
                    const btLogger = logger.getChild('bt');
                    const timestamps = [];
                    const targetFunc = () => Promise.resolve()
                        .then(() => {
                            callCount += 1;
                            timestamps.push(Date.now());
                            assert.isTrue(timerInst.isActive(), 'should be active');
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should not update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 2, 'should not update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should not update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should not update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should not update abortOnFailure');

                            if (callCount >= 3) {
                                return timerInst.stop()
                                    .then(() => {
                                        assertApproximatelyArray(timestamps, [2000, 4000, 6000], 200, 'should run on expected intervals');
                                        assert.isFalse(timerInst.isActive(), 'should not be active');
                                    })
                                    .then(() => resolve(callCount));
                            }
                            return Promise.resolve();
                        })
                        .catch(reject);

                    timerInst = new testConf.TimerClass(
                        targetFunc,
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.update().catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                })
                    .then((callCount) => {
                        assert.strictEqual(callCount, 3, 'should call function 3 times');
                    })));

                it('should not update properties and start function (no args passed)', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should not update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 2, 'should not update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should not update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should not update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should not update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        targetFunc,
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.update().catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should not update properties when interval passed as number and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 3, 'should update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should not update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should not update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should not update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        () => {},
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.update(targetFunc, 3).catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should not update properties when args passed and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 3, 'should update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should not update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should not update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        () => {},
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        }
                    );
                    timerInst.update(targetFunc, 3, 'arg1', 'arg2').catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should not update properties when function only passed and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 2, 'should not update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should not update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should not update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should not update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        () => {},
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.update(targetFunc).catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should update properties (direct assignment) and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 2, 'should update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass();
                    timerInst.func = targetFunc;
                    timerInst.abortOnFailure = true;
                    timerInst.intervalInS = 2;
                    timerInst.logger = btLogger;
                    timerInst.args = ['arg1', 'arg2'];
                    timerInst.update().catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should update properties when options object passed and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.deepStrictEqual(timerInst.intervalInS, 2, 'should update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should update arguments');
                            assert.deepStrictEqual(timerInst.logger, btLogger, 'should update logger');
                            assert.isTrue(timerInst.abortOnFailure, 'should update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass();
                    timerInst.update(
                        targetFunc,
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    )
                        .catch(reject);
                    fakeClock.clockForward(1000, { promisify: true, repeat: 3 });
                })));

                it('should update properties when empty options object passed and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    fakeClock.stub.restore();
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.notExists(timerInst.intervalInS, 'should update interval');
                            assert.deepStrictEqual(timerInst.args, ['arg1', 'arg2'], 'should not update arguments');
                            assert.notExists(timerInst.logger, 'should update logger');
                            assert.isFalse(timerInst.abortOnFailure, 'should update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        () => {},
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.update(
                        targetFunc,
                        {}
                    )
                        .catch(reject);
                })));

                it('should update properties and remove existing args and start function', () => assert.isFulfilled(new Promise((resolve, reject) => {
                    fakeClock.stub.restore();
                    const btLogger = logger.getChild('bt');
                    const targetFunc = () => timerInst.stop()
                        .then(() => {
                            assert.deepStrictEqual(timerInst.func, targetFunc, 'should update target function');
                            assert.notExists(timerInst.intervalInS, 'should update interval');
                            assert.notExists(timerInst.args, 'should update arguments');
                            assert.notExists(timerInst.logger, 'should update logger');
                            assert.isFalse(timerInst.abortOnFailure, 'should update abortOnFailure');
                        })
                        .then(resolve, reject);
                    timerInst = new testConf.TimerClass(
                        () => {},
                        {
                            abortOnFailure: true,
                            intervalInS: 2,
                            logger: btLogger
                        },
                        'arg1',
                        'arg2'
                    );
                    timerInst.update(
                        targetFunc,
                        {
                            preserveArgs: false
                        }
                    )
                        .catch(reject);
                })));

                it('should catch and log error and continue to run function', () => {
                    let callCount = 0;
                    return assert.isFulfilled(new Promise((resolve, reject) => {
                        timerInst = new testConf.TimerClass(
                            () => {
                                callCount += 1;
                                setTimeout(() => timerInst.stop().then(resolve), 4000);
                                return Promise.reject(new Error('test'));
                            },
                            {
                                intervalInS: 1,
                                logger: logger.getChild('bt')
                            }
                        );
                        timerInst.update().catch(reject);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.isAbove(callCount, 3, 'should call function more than 3 times');
                            assert.includeMatch(loggerStub.messages.error, /execution error[\s\S]+test/gm, 'should log error message');
                        }));
                });

                it('should catch and log error and stop execution', () => {
                    let callCount = 0;
                    return assert.isFulfilled(new Promise((resolve, reject) => {
                        timerInst = new testConf.TimerClass(
                            () => {
                                callCount += 1;
                                setTimeout(resolve, 4000);
                                return Promise.reject(new Error('test'));
                            },
                            {
                                abortOnFailure: true,
                                intervalInS: 1,
                                logger: logger.getChild('bt')
                            }
                        );
                        timerInst.update().catch(reject);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.strictEqual(callCount, 1, 'should call function just once and stop it');
                            assert.isFalse(timerInst.isActive(), 'should stop timer');
                            assert.includeMatch(loggerStub.messages.error, /execution error[\s\S]+test/gm, 'should log error message');
                            assert.includeMatch(loggerStub.messages.warning, /aborting on failure/, 'should log warning message');
                        }));
                });

                it('should catch and log error and continue to run function (without logger)', () => {
                    let callCount = 0;
                    return assert.isFulfilled(new Promise((resolve, reject) => {
                        timerInst = new testConf.TimerClass(() => {
                            callCount += 1;
                            setTimeout(() => timerInst.stop().then(resolve), 4000);
                            return Promise.reject(new Error('test'));
                        }, 1);
                        timerInst.update().catch(reject);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.isAbove(callCount, 3, 'should call function more than 3 times');
                        }));
                });

                it('should catch and log error and stop execution (without logger)', () => {
                    let callCount = 0;
                    return assert.isFulfilled(new Promise((resolve, reject) => {
                        timerInst = new testConf.TimerClass(
                            () => {
                                callCount += 1;
                                setTimeout(resolve, 4000);
                                return Promise.reject(new Error('test'));
                            },
                            {
                                abortOnFailure: true,
                                intervalInS: 1
                            }
                        );
                        timerInst.update().catch(reject);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.strictEqual(callCount, 1, 'should call function just once and stop it');
                            assert.isFalse(timerInst.isActive(), 'should stop timer');
                        }));
                });

                it('should not stop new function when prev. one stopped due error', () => {
                    let originFuncCallCount = 0;
                    let newFuncCallCount = 0;

                    return assert.isFulfilled(new Promise((resolve, reject) => {
                        timerInst = new testConf.TimerClass(
                            () => {
                                originFuncCallCount += 1;
                                return timerInst.update(() => {
                                    newFuncCallCount += 1;
                                    if (newFuncCallCount >= 3) {
                                        resolve();
                                    }
                                })
                                    .catch(reject)
                                    // rejecting with error to stop current execution
                                    // at that time new intervalID should be generated already
                                    .then(() => Promise.reject(new Error('test')));
                            },
                            {
                                abortOnFailure: true,
                                intervalInS: 1
                            }
                        );
                        timerInst.update().catch(reject);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.isTrue(timerInst.isActive(), 'should run timer');
                            assert.strictEqual(originFuncCallCount, 1, 'should not call origin func once stopped');
                            assert.isAtLeast(newFuncCallCount, 3, 'should continue to call new func');
                        }));
                });
            });

            describe('.stop()', () => {
                it('should stop function', () => {
                    let callCount = 0;
                    return new Promise((resolve) => {
                        setTimeout(resolve, 8000);
                        timerInst.start(() => {
                            callCount += 1;
                            if (callCount >= 3) {
                                timerInst.stop();
                            }
                        }, 1);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    })
                        .then(() => {
                            assert.isFalse(timerInst.isActive(), 'should stop timer');
                            assert.approximately(callCount, 3, 2, 'should stop basic timer');
                            return assert.isFulfilled(timerInst.stop(), 'should not fail to stop timer again');
                        });
                });

                it('should not block when return .stop promise', () => {
                    let callCount = 0;
                    return assert.isFulfilled(new Promise((resolve) => {
                        setTimeout(resolve, 8000);
                        timerInst.start(() => {
                            callCount += 1;
                            if (callCount >= 3) {
                                // without waiting this is non-blocking
                                return timerInst.stop();
                            }
                            return Promise.resolve();
                        }, 1);
                        fakeClock.clockForward(1000, { promisify: true, repeat: 10 });
                    }))
                        .then(() => {
                            assert.isFalse(timerInst.isActive(), 'should stop timer');
                            assert.approximately(callCount, 3, 2, 'should stop basic timer');
                        });
                });
            });
        }));
    });

    describe('SlidingTimer (additional tests)', () => {
        let timerInst;

        beforeEach(() => {
            timerInst = new timers.SlidingTimer();
        });

        afterEach(() => (timerInst ? timerInst.stop() : Promise.resolve()));

        describe('.stop()', () => {
            it('should wait till complete stop', () => new Promise((resolve) => {
                timerInst.start(() => {
                    // can't return .stop promise because
                    // wait === true is blocking operation
                    timerInst.stop(true)
                        .then(resolve);
                    return testUtil.sleep(2000);
                }, 1);
                fakeClock.clockForward(10, { promisify: true, repeat: 1000 });
            })
                .then(() => {
                    // 1s interval + 2s sleep - at least 3s
                    assert.isAbove(Date.now(), 3000, 'should wait till complete stop');
                    assert.isFalse(timerInst.isActive(), 'should stop timer');
                }));

            it('should not wait till complete stop', () => new Promise((resolve) => {
                timerInst.start(() => {
                    timerInst.stop()
                        .then(resolve);
                    return testUtil.sleep(2000);
                }, 1);
                fakeClock.clockForward(10, { promisify: true, repeat: 1000 });
            })
                .then(() => {
                    assert.isBelow(Date.now(), 3000, 'should not wait till complete stop');
                    return testUtil.sleep(3000);
                })
                .then(() => {
                    assert.isFalse(timerInst.isActive(), 'should stop timer');
                }));
        });

        it('should log warning message about interval slide', () => new Promise((resolve, reject) => {
            timerInst = new timers.SlidingTimer(
                () => testUtil.sleep(2000).then(resolve),
                {
                    intervalInS: 1,
                    logger: logger.getChild('bt')
                }
            );
            timerInst.update().catch(reject);
            fakeClock.clockForward(10, { promisify: true, repeat: 1000 });
        })
            .then(() => testUtil.sleep(2000))
            .then(() => {
                assert.includeMatch(loggerStub.messages.warning, /configured interval of/, 'should log warning message');
            }));

        it('should adjust interval', () => {
            const timestamps = [];
            let callCount = 0;

            return assert.isFulfilled(
                new Promise((resolve, reject) => {
                    timerInst = new timers.SlidingTimer(() => {
                        timestamps.push(Date.now());
                        if (callCount < 4) {
                            callCount += 1;
                            return new Promise((innerResolve) => { setTimeout(innerResolve, 1100 + callCount * 100); });
                        }
                        return timerInst.stop().then(resolve, reject);
                    }, 1);
                    // execution scheduled already
                    fakeClock.clockForward(10, { promisify: true });
                    timerInst.start().catch(reject);
                })
            )
                .then(() => {
                    assertApproximatelyArray(timestamps.slice(0, 3), [
                        1000, // first execution
                        2200, // second starts immediately after first - 1000 + 1200 delay
                        3500 // third starts immediately after second - 2200 + 1300 delay
                    ], 200, 'should adjust interval');
                });
        });
    });

    describe('.setSlidingInterval() / .clearSlidingInterval()', () => {
        let intervalID;

        beforeEach(() => {
            intervalID = undefined;
        });

        afterEach(() => new Promise((resolve) => {
            if (!timers.clearSlidingInterval(intervalID, resolve)) {
                resolve();
            }
        })
            .then(() => {
                assert.strictEqual(timers.numberOfActiveSlidingIntervals(), 0, 'should have no active sliding intervals');
            }));

        it('should start and run scheduled function on an interval, without args (function=promise)', () => {
            const timestamps = [];
            return assert.isFulfilled(
                new Promise((resolve, reject) => {
                    let counter = 0;
                    intervalID = timers.setSlidingInterval(function () {
                        return Promise.resolve()
                            .then(() => {
                                timestamps.push(Date.now());
                                try {
                                    assert.isEmpty(arguments);
                                } catch (err) {
                                    reject(err);
                                }
                                counter += 1;
                                if (counter >= 3) {
                                    resolve();
                                }
                            });
                    }, 1000); // 1 second
                    fakeClock.clockForward(500, { promisify: true });
                })
            )
                .then(() => {
                    assertApproximatelyArray(timestamps.slice(0, 3), [1000, 2000, 3000], 100, 'should not adjust interval');
                });
        });

        it('should start and run scheduled function on an interval, without args (function=non-promise)', () => {
            const timestamps = [];
            return assert.isFulfilled(
                new Promise((resolve, reject) => {
                    let counter = 0;
                    intervalID = timers.setSlidingInterval(function () {
                        timestamps.push(Date.now());
                        try {
                            assert.isEmpty(arguments);
                        } catch (err) {
                            reject(err);
                        }
                        counter += 1;
                        if (counter === 3) {
                            resolve();
                        }
                    }, 1000); // 1 second
                    fakeClock.clockForward(500, { promisify: true });
                })
            )
                .then(() => {
                    assertApproximatelyArray(timestamps.slice(0, 3), [1000, 2000, 3000], 100, 'should not adjust interval');
                });
        });

        it('should start and run scheduled function on an interval, with passed args (function=promise)', () => {
            const timestamps = [];
            return assert.isFulfilled(
                new Promise((resolve, reject) => {
                    let counter = 0;
                    intervalID = timers.setSlidingInterval((arg1, arg2) => Promise.resolve()
                        .then(() => {
                            timestamps.push(Date.now());
                            try {
                                assert.deepStrictEqual(arg1, 'arg1');
                                assert.deepStrictEqual(arg2, 'arg2');
                            } catch (err) {
                                reject(err);
                            }
                            counter += 1;
                            if (counter >= 3) {
                                resolve();
                            }
                        }), 1000, 'arg1', 'arg2'); // 1 second
                    fakeClock.clockForward(500, { promisify: true });
                })
            )
                .then(() => {
                    assertApproximatelyArray(timestamps.slice(0, 3), [1000, 2000, 3000], 100, 'should not adjust interval');
                });
        });

        it('should start and run scheduled function on an interval, with passed args (function=non-promise)', () => {
            const timestamps = [];
            return assert.isFulfilled(
                new Promise((resolve, reject) => {
                    let counter = 0;
                    intervalID = timers.setSlidingInterval((arg1, arg2) => {
                        timestamps.push(Date.now());
                        try {
                            assert.deepStrictEqual(arg1, 'arg1');
                            assert.deepStrictEqual(arg2, 'arg2');
                        } catch (err) {
                            reject(err);
                        }
                        counter += 1;
                        if (counter === 3) {
                            resolve();
                        }
                    }, 1000, 'arg1', 'arg2'); // 1 second
                    fakeClock.clockForward(500, { promisify: true });
                })
            )
                .then(() => {
                    assertApproximatelyArray(timestamps.slice(0, 3), [1000, 2000, 3000], 100, 'should not adjust interval');
                });
        });

        it('should catch error (function=promise)', () => assert.isFulfilled(
            new Promise((resolve, reject) => {
                intervalID = timers.setSlidingInterval(
                    (arg) => Promise.reject(new Error(arg)),
                    {
                        interval: 1000,
                        onError: (error) => {
                            try {
                                assert.match(error, /test/);
                            } catch (err) {
                                reject(err);
                            }
                            resolve();
                        }
                    },
                    'test'
                ); // 1 second
                fakeClock.clockForward(500, { promisify: true });
            })
        ));

        it('should catch error (function=non-promise)', () => assert.isFulfilled(
            new Promise((resolve, reject) => {
                intervalID = timers.setSlidingInterval(
                    (arg) => { throw new Error(arg); },
                    {
                        interval: 1000,
                        onError: (error) => {
                            try {
                                assert.match(error, /test/);
                            } catch (err) {
                                reject(err);
                            }
                            resolve();
                        }
                    },
                    'test'
                ); // 1 second
                fakeClock.clockForward(500, { promisify: true });
            })
        ));

        it('should adjust interval', () => {
            const timestamps = [];
            const durations = [];
            let callCount = 0;

            return assert.isFulfilled(
                new Promise((resolve, reject) => {
                    intervalID = timers.setSlidingInterval(
                        () => {
                            timestamps.push(Date.now());
                            if (callCount < 4) {
                                callCount += 1;
                                return new Promise((innerResolve) => {
                                    setTimeout(innerResolve, 1100 + callCount * 100);
                                });
                            }
                            return timers.clearSlidingInterval(intervalID, resolve);
                        },
                        {
                            interval: 1000,
                            onError: reject,
                            onIntervalSlide: (duration, interval) => {
                                durations.push([duration, interval]);
                            }
                        }
                    );
                    // execution scheduled already
                    fakeClock.clockForward(10, { promisify: true });
                })
            )
                .then(() => {
                    assertApproximatelyArray(timestamps.slice(0, 3), [
                        1000, // first execution
                        2200, // second starts immediately after first - 1000 + 1200 delay
                        3500 // third starts immediately after second - 2200 + 1300 delay
                    ], 200, 'should adjust interval');
                    assertApproximatelyArray(
                        durations.slice(0, 3).map((p) => p[0]),
                        [1200, 1300, 1400],
                        200,
                        'should match expected duration'
                    );
                    assert.deepStrictEqual(
                        durations.slice(0, 3).map((p) => p[1]),
                        [1000, 1000, 1000],
                        'should pass configured interval value'
                    );
                });
        });

        it('should adjust interval when error handling is slow', () => {
            const timestamps = [];
            const durations = [];
            let callCount = 0;

            return assert.isFulfilled(
                new Promise((resolve) => {
                    intervalID = timers.setSlidingInterval(
                        () => {
                            timestamps.push(Date.now());
                            if (callCount < 4) {
                                callCount += 1;
                                return Promise.reject(new Error('test'));
                            }
                            return timers.clearSlidingInterval(intervalID, resolve);
                        },
                        {
                            interval: 1000,
                            onError: () => new Promise((innerResolve) => {
                                setTimeout(
                                    innerResolve,
                                    1100 + callCount * 100
                                );
                            }),
                            onIntervalSlide: (duration, interval) => {
                                durations.push([duration, interval]);
                            }
                        }
                    );
                    // execution scheduled already
                    fakeClock.clockForward(10, { promisify: true });
                })
            )
                .then(() => {
                    assertApproximatelyArray(timestamps.slice(0, 3), [
                        1000, // first execution
                        2200, // second starts immediately after first - 1000 + 1200 delay
                        3500 // third starts immediately after second - 2200 + 1300 delay
                    ], 200, 'should adjust interval');
                    assertApproximatelyArray(
                        durations.slice(0, 3).map((p) => p[0]),
                        [1200, 1300, 1400],
                        200,
                        'should match expected duration'
                    );
                    assert.deepStrictEqual(
                        durations.slice(0, 3).map((p) => p[1]),
                        [1000, 1000, 1000],
                        'should pass configured interval value'
                    );
                });
        });

        it('should stop sliding interval immediately after configuration', () => {
            const spy = sinon.spy();
            const cancelSpy = sinon.spy();
            intervalID = timers.setSlidingInterval(spy, 10);
            timers.clearSlidingInterval(intervalID, () => cancelSpy('async'));
            cancelSpy('sync');

            fakeClock.clockForward(1, { promisify: true });
            return testUtil.sleep(20)
                .then(() => {
                    assert.strictEqual(spy.callCount, 0, 'should not call function once canceled');
                    assert.deepStrictEqual(
                        cancelSpy.args.map((args) => args[0]),
                        ['sync', 'async'],
                        'should run callback in async way'
                    );
                });
        });

        it('should stop sliding interval before scheduled execution', () => {
            const spy = sinon.spy();
            intervalID = timers.setSlidingInterval(spy, 30);
            fakeClock.clockForward(1, { promisify: true });
            return testUtil.sleep(5)
                .then(() => new Promise((resolve) => { timers.clearSlidingInterval(intervalID, resolve); }))
                .then(() => testUtil.sleep(30))
                .then(() => {
                    assert.strictEqual(spy.callCount, 0, 'should not call function once canceled');
                });
        });

        it('should not reschedule when disabled', () => {
            const cancelSpy = sinon.spy();
            const spy = sinon.spy(() => {
                timers.clearSlidingInterval(intervalID, cancelSpy);
            });
            intervalID = timers.setSlidingInterval(spy, 10);
            fakeClock.clockForward(1, { promisify: true });
            return testUtil.sleep(30)
                .then(() => {
                    assert.strictEqual(spy.callCount, 1, 'should call function just once');
                    assert.strictEqual(cancelSpy.callCount, 1, 'should call callback');
                });
        });

        it('should not try to stop sliding interval disabled already', () => {
            intervalID = timers.setSlidingInterval(() => {}, 1);
            assert.isTrue(timers.clearSlidingInterval(intervalID), 'should return true when sliding interval exists and disabled');
            assert.isFalse(timers.clearSlidingInterval(intervalID), 'should return false when sliding interval disabled already');
        });
    });
});
