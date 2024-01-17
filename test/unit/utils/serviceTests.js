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

const Service = sourceCode('src/lib/utils/service');

moduleCache.remember();

describe('Service', () => {
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({
            logger: true
        });
    });

    function shouldUseDebugOnly() {
        ['error', 'info', 'verbose', 'warning'].forEach((lvl) => {
            assert.isEmpty(coreStub.logger.messages[lvl], `should not log "${lvl}" messages`);
        });
    }

    function checkState(service, state) {
        const statuses = {
            destroyed: false,
            restarting: false,
            running: false,
            stopped: false
        };
        statuses[state] = true;
        assert.deepStrictEqual(service.isDestroyed(), statuses.destroyed, 'should match expected destroyed state');
        assert.deepStrictEqual(service.isRestarting(), statuses.restarting, 'should match expected restarting state');
        assert.deepStrictEqual(service.isRunning(), statuses.running, 'should match expected running state');
        assert.deepStrictEqual(service.isStopped(), statuses.stopped, 'should match expected stopped state');
    }

    function shouldLogMsg(lvl, msg) {
        msg = arguments.length === 1 ? lvl : msg;
        lvl = arguments.length === 1 ? 'debug' : lvl;
        assert.includeMatch(coreStub.logger.messages[lvl], msg);
    }

    function shouldNotLogMsg(lvl, msg) {
        msg = arguments.length === 1 ? lvl : msg;
        lvl = arguments.length === 1 ? 'debug' : lvl;
        assert.notIncludeMatch(coreStub.logger.messages[lvl], msg);
    }

    describe('Base Class', () => {
        let service;

        beforeEach(() => {
            service = new Service();
        });

        afterEach(() => sinon.restore());

        it('should return correct statuses for service', () => {
            checkState(service, 'stopped');
        });

        it('should return default restart options', () => {
            assert.deepStrictEqual(service.getRestartOptions(), {
                attempts: 1,
                delay: 100
            }, 'should return default values when not overriden');
        });

        it('should return false on attempt to stop non-running service', () => service.stop()
            .then((retVal) => {
                assert.isFalse(retVal, 'should return false on attempt to stop inactive service');
                checkState(service, 'stopped');
                shouldUseDebugOnly();
                shouldNotLogMsg(/start requested/);
            }));

        it('should return true on attempt to start non-running service', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on successfull start');
                checkState(service, 'running');
                shouldUseDebugOnly();
                shouldLogMsg(/running\.\.\./);
            }));

        it('should return true on attempt to restart non-running service', () => service.restart()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on successfull restart');
                checkState(service, 'running');
                shouldUseDebugOnly();
                shouldLogMsg(/running\.\.\./);
            }));

        it('should do start/stop/restart/destroy', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on successfull start');
                checkState(service, 'running');
                shouldUseDebugOnly();
                shouldLogMsg(/running\.\.\./);
                coreStub.logger.removeAllMessages();
                return service.stop();
            })
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to stop active service');
                checkState(service, 'stopped');
                shouldUseDebugOnly();
                shouldLogMsg(/stop requested/);
                shouldLogMsg(/stopping\.\.\./);
                coreStub.logger.removeAllMessages();
                return service.start();
            })
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on successfull start');
                checkState(service, 'running');
                shouldUseDebugOnly();
                shouldLogMsg(/running\.\.\./);
                coreStub.logger.removeAllMessages();
                return service.restart();
            })
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on successfull restart');
                checkState(service, 'running');
                shouldUseDebugOnly();
                shouldLogMsg(/restart requested/);
                shouldLogMsg(/restarting\.\.\./);
                shouldLogMsg(/running\.\.\./);
                coreStub.logger.removeAllMessages();
                return service.stop();
            })
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to stop active service');
                checkState(service, 'stopped');
                shouldUseDebugOnly();
                shouldLogMsg(/stop requested/);
                shouldLogMsg(/stopping\.\.\./);
                coreStub.logger.removeAllMessages();
                return service.destroy();
            })
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to destroy service');
                checkState(service, 'destroyed');
                shouldUseDebugOnly();
                shouldLogMsg(/termination requested/);
                shouldLogMsg(/destroyed\./);
            }));

        it('should not be able to start/stop/restart destroyed service', () => service.destroy()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to destroy service');
                checkState(service, 'destroyed');
                shouldUseDebugOnly();
                shouldLogMsg(/termination requested/);
                shouldLogMsg(/destroyed\./);
            })
            .then(() => assert.becomes(service.start(), false, 'should not be able to start destroyed service'))
            .then(() => assert.becomes(service.stop(), false, 'should not be able to stop destroyed service'))
            .then(() => assert.becomes(service.restart(), false, 'should not be able to restart destroyed service'))
            .then(() => assert.becomes(service.destroy(), false, 'should not be able to destroy destroyed service')));

        it('should be able to destroy running service', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');
                shouldUseDebugOnly();
                shouldLogMsg(/running\.\.\./);
                coreStub.logger.removeAllMessages();
                return service.destroy();
            })
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to destroy service');
                checkState(service, 'destroyed');
                shouldUseDebugOnly();
                shouldLogMsg(/termination requested/);
                shouldLogMsg(/destroyed\./);
            }));
    });

    describe('Custom Service', () => {
        class CustomService extends Service {
            _onStart(onError) {
                return this._onStartCb(onError);
            }

            _onStop(restart) {
                return this._onStopCb(restart);
            }
        }

        let onErrorCb;
        let service;

        beforeEach(() => {
            service = new CustomService();
            service._onStartCb = (onError) => {
                service.logger.debug('running-msg...');
                onErrorCb = onError;
            };
            service._onStopCb = () => {
                service.logger.debug('stopping-msg...');
            };
        });

        afterEach(() => sinon.restore());

        it('should reject when not able to start (sync)', () => {
            service._onStartCb = () => { throw new Error('onStartError'); };
            return assert.isRejected(service.start(), /onStartError/)
                .then(() => {
                    checkState(service, 'stopped');
                    shouldLogMsg(/stopped due error[\S\s]*onStartError/gm);
                });
        });

        it('should reject when not able to start (async)', () => {
            service._onStartCb = () => Promise.reject(new Error('onStartError'));
            return assert.isRejected(service.start(), /onStartError/)
                .then(() => {
                    checkState(service, 'stopped');
                    shouldLogMsg(/stopped due error[\S\s]*onStartError/gm);
                });
        });

        it('should resolve on attempt to restart non-active service even when not able to stop (sync)', () => {
            service._onStopCb = (restart) => {
                assert.isTrue(restart, 'should be set to true');
                throw new Error('onStopError');
            };
            return service.restart()
                .then((retVal) => {
                    assert.isTrue(retVal, 'should return true on attempt to restart service');
                    checkState(service, 'running');
                    shouldLogMsg(/caught error on attempt to stop[\S\s]*onStopError/gm);
                });
        });

        it('should resolve on attempt to restart non-active service even when not able to stop (async)', () => {
            service._onStopCb = (restart) => {
                assert.isTrue(restart, 'should be set to true');
                return Promise.reject(new Error('onStopError'));
            };
            return service.restart()
                .then((retVal) => {
                    assert.isTrue(retVal, 'should return true on attempt to restart service');
                    checkState(service, 'running');
                    shouldLogMsg(/caught error on attempt to stop[\S\s]*onStopError/gm);
                });
        });

        it('should reject when not able to stop (sync)', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');
                service._onStopCb = (restart) => {
                    assert.isFalse(restart, 'should be set to false');
                    throw new Error('onStopError');
                };
                return assert.isRejected(service.stop(), /onStopError/);
            })
            .then(() => {
                checkState(service, 'stopped');
                shouldLogMsg(/stopped due error[\S\s]*onStopError/gm);
            }));

        it('should reject when not able to stop (async)', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');
                service._onStopCb = (restart) => {
                    assert.isFalse(restart, 'should be set to false');
                    return Promise.reject(new Error('onStopError'));
                };
                return assert.isRejected(service.stop(), /onStopError/);
            })
            .then(() => {
                checkState(service, 'stopped');
                shouldLogMsg(/stopped due error[\S\s]*onStopError/gm);
            }));

        it('should ignore multiple errors when service is running and do restart', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');
                service.getRestartOptions = () => ({ delay: 10 });

                coreStub.logger.removeAllMessages();
                onErrorCb(new Error('onRunningError1'));
                onErrorCb(new Error('onRunningError2'));

                return testUtil.sleep(50);
            })
            .then(() => {
                checkState(service, 'running');
                shouldLogMsg(/restarting\.\.\./);
                shouldLogMsg('error', /restart requested due error[\S\s]*onRunningError1/gm);
                shouldNotLogMsg('error', /restart requested due error[\S\s]*onRunningError2/gm);
            }));

        it('should destroy starting service', () => {
            service._onStartCb = () => {
                service.logger.debug('slow-start');
                return testUtil.sleep(100);
            };
            return Promise.all([
                assert.isRejected(service.start(), /Service emitted event/),
                testUtil.waitTill(() => {
                    try {
                        shouldLogMsg(/slow-start/);
                        return service.destroy();
                    } catch (err) {
                        return false;
                    }
                }, 1)
            ])
                .then(() => {
                    shouldNotLogMsg(/running/);
                    checkState(service, 'destroyed');
                    shouldLogMsg(/termination requested/);
                    shouldLogMsg(/destroyed\./);

                    const firstMsgIdx = coreStub.logger.messages.debug.findIndex((item) => /termination requested.*starting/.test(item));
                    const secondMsgIdx = coreStub.logger.messages.debug.findIndex((item) => item.indexOf('transition from "starting" to "stopping"') !== -1);

                    assert.isAtLeast(firstMsgIdx, 0);
                    assert.isAtLeast(secondMsgIdx, 0);
                    assert.isBelow(firstMsgIdx, secondMsgIdx, 'should log initial request during "starting" state');
                });
        });

        it('should destroy stopping service', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');

                service._onStopCb = () => {
                    service.logger.debug('slow-stop');
                    return testUtil.sleep(100);
                };
                return Promise.all([
                    service.stop(),
                    testUtil.waitTill(() => {
                        try {
                            shouldLogMsg(/slow-stop/);
                            return service.destroy();
                        } catch (err) {
                            return false;
                        }
                    }, 1)
                ]);
            })
            .then(() => {
                shouldLogMsg(/stopping/);
                checkState(service, 'destroyed');
                shouldLogMsg(/termination requested/);
                shouldLogMsg(/destroyed\./);

                const firstMsgIdx = coreStub.logger.messages.debug.findIndex((item) => /termination requested.*stopping/.test(item));
                const secondMsgIdx = coreStub.logger.messages.debug.findIndex((item) => item.indexOf('transition from "stopping" to "stopped"') !== -1);

                assert.isAtLeast(firstMsgIdx, 0);
                assert.isAtLeast(secondMsgIdx, 0);
                assert.isBelow(firstMsgIdx, secondMsgIdx, 'should log initial request during "stopping" state');
            }));

        it('should try to restart service only once (by default)(stopped)', () => {
            service._onStart = () => Promise.reject(new Error('onStartError'));
            return assert.isRejected(service.restart(), /onStartError/)
                .then(() => {
                    checkState(service, 'stopped');
                    shouldLogMsg('attempt #1 of 1');
                    shouldNotLogMsg('attempt #2');
                });
        });

        it('should try to restart service only once (by default)(running)', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');

                service._onStart = () => Promise.reject(new Error('onRestartError'));
                return assert.isRejected(service.restart(), /onRestartError/)
                    .then(() => {
                        checkState(service, 'stopped');
                        shouldLogMsg('attempt #1 of 1');
                        shouldNotLogMsg('attempt #2');
                    });
            }));

        it('should try to stop service that stuck in restart loop(by default)(running-error)', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');
                service.getRestartOptions = () => ({ delay: 10 });

                service._onStart = () => Promise.reject(new Error('onRestartError'));
                onErrorCb(new Error('running error'));

                return testUtil.waitTill(() => {
                    try {
                        shouldLogMsg(`attempt #5 of ${Infinity}`);
                        // should not reject because of restart loop, see source code for .stop()
                        return service.stop();
                    } catch (err) {
                        return false;
                    }
                });
            })
            .then(() => {
                checkState(service, 'stopped');
                shouldLogMsg(/stop requested.*restarting/);
            }));

        it('should try to destroy service that stuck in restart loop(by default)(running-error)', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');
                service.getRestartOptions = () => ({ delay: 10 });

                service._onStart = () => Promise.reject(new Error('onRestartError'));
                onErrorCb(new Error('running error'));

                return testUtil.waitTill(() => {
                    try {
                        shouldLogMsg(`attempt #5 of ${Infinity}`);
                        // should not reject because of restart loop, see source code for .destroy()
                        return service.destroy();
                    } catch (err) {
                        return false;
                    }
                });
            })
            .then(() => {
                checkState(service, 'destroyed');
                shouldLogMsg(/stop requested.*restarting/);
            }));

        it('should use custom restart options (empty object, should use defaults)', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');

                service._onStart = () => Promise.reject(new Error('onRestartError'));
                return assert.isRejected(service.restart({}), /onRestartError/)
                    .then(() => {
                        checkState(service, 'stopped');
                        shouldLogMsg('attempt #1 of 1');
                        shouldNotLogMsg('attempt #2');
                    });
            }));

        it('should use custom restart options', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');

                service._onStart = () => Promise.reject(new Error('onRestartError'));
                return assert.isRejected(service.restart({ attempts: 3 }), /onRestartError/)
                    .then(() => {
                        checkState(service, 'stopped');
                        shouldLogMsg('attempt #1 of 3');
                        shouldLogMsg('attempt #2 of 3');
                        shouldLogMsg('attempt #3 of 3');
                        shouldNotLogMsg('attempt #4');
                    });
            }));

        it('should use Infinity number of attempts when .getRestartOptions() returns empty object', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');

                service.getRestartOptions = () => ({});
                service._onStart = () => Promise.reject(new Error('onRestartError'));
                onErrorCb(new Error('running error'));

                return testUtil.waitTill(() => {
                    try {
                        shouldLogMsg(`attempt #5 of ${Infinity}`);
                        // should not reject because of restart loop, see source code for .stop()
                        return service.stop();
                    } catch (err) {
                        return false;
                    }
                });
            })
            .then(() => {
                checkState(service, 'stopped');
                shouldLogMsg(/stop requested.*restarting/);
            }));

        it('should stop service on uncaught error during restart', () => service.start()
            .then((retVal) => {
                assert.isTrue(retVal, 'should return true on attempt to start service');
                checkState(service, 'running');

                service._onStart = (onError) => {
                    const originCancel = service._fatalErrorHandler.cancel;
                    service._fatalErrorHandler.cancel = () => {
                        // call origin to avoid infinite loop
                        originCancel();
                        throw new Error('onUncaughtError');
                    };
                    onError(new Error('onRunningError2'));
                };
                onErrorCb(new Error('onRunningError1'));
                return testUtil.waitTill(() => service.isStopped());
            })
            .then(() => {
                checkState(service, 'stopped');
                shouldLogMsg(/stopped due error[\S\s]*onUncaughtError/gm);
            }));

        it('should stop if fatal error caught during starting state', () => {
            service._onStartCb = (onError) => Promise.resolve()
                .then(() => {
                    onError(new Error('onUncaughtError'));
                    return testUtil.waitTill(() => {
                        try {
                            shouldLogMsg(/failed to start due error/);
                            return true;
                        } catch (err) {
                            return false;
                        }
                    });
                });
            return assert.isRejected(service.start(), /onUncaughtError/)
                .then(() => {
                    checkState(service, 'stopped');
                    shouldLogMsg(/stopped due error[\S\s]*onUncaughtError/gm);
                    shouldNotLogMsg(/running/);
                });
        });

        it('should ignore successfull start that happened too late', () => {
            let resolveLater;

            service._onStartCb = (onError) => new Promise((resolve) => {
                if (!resolveLater) {
                    resolveLater = resolve;
                    onError(new Error('onUncaughtError'));
                } else {
                    resolveLater();
                    testUtil.waitTill(() => {
                        try {
                            shouldLogMsg(/ignoring successfull start that happened out of order/gm);
                            return true;
                        } catch (err) {
                            return false;
                        }
                    }).then(resolve);
                }
            });
            return assert.isRejected(service.start(), /onUncaughtError/)
                .then(() => assert.isFulfilled(service.start()));
        });

        it('should ignore failed start that happened too late', () => {
            let rejectLater;

            service._onStartCb = (onError) => new Promise((resolve, reject) => {
                if (!rejectLater) {
                    rejectLater = reject;
                    onError(new Error('onUncaughtError'));
                } else {
                    rejectLater(new Error('onLateError'));
                    testUtil.waitTill(() => {
                        try {
                            shouldLogMsg(/ignoring failed start that happened out of order due error[\S\s]*onLateError/gm);
                            return true;
                        } catch (err) {
                            return false;
                        }
                    }).then(resolve);
                }
            });
            return assert.isRejected(service.start(), /onUncaughtError/)
                .then(() => assert.isFulfilled(service.start()));
        });

        it('should not block restart loop on fatal error or stuck onStart', () => {
            // never resolved promise
            service._onStartCb = (onError) => new Promise(() => {
                testUtil.sleep(10)
                    .then(() => onError(new Error('onFatalError')));
            });
            return assert.isRejected(service.restart({
                attempts: 10
            }), /onFatalError/)
                .then(() => {
                    checkState(service, 'stopped');
                    shouldLogMsg(/stopping/);
                    shouldLogMsg('attempt #1 of 10');
                    shouldLogMsg('attempt #10 of 10');
                });
        });

        it('should not restart if restarts prohibited', () => {
            service.restartsEnabled = false;
            return service.start()
                .then(() => {
                    checkState(service, 'running');
                    onErrorCb(new Error('onFatalError'));
                    return testUtil.waitTill(() => service.isStopped(), 1);
                })
                .then(() => {
                    checkState(service, 'stopped');
                    shouldLogMsg(/restarts on fatal error are prohibited/);
                    shouldLogMsg(/stopped due error/);
                    shouldNotLogMsg(/restarting/);
                });
        });
    });
});
