/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const baseDataReceiver = require('../../../src/lib/eventListener/baseDataReceiver');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Base Data Receiver', () => {
    const BaseDataReceiver = baseDataReceiver.BaseDataReceiver;
    let receiverInst;
    let stateChangedSpy;
    let startHandlerStub;
    let stopHandlerStub;

    const fetchStates = () => stateChangedSpy.args.map((callArgs) => callArgs[0].current);

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        receiverInst = new BaseDataReceiver();
        startHandlerStub = sinon.stub(receiverInst, 'startHandler');
        stopHandlerStub = sinon.stub(receiverInst, 'stopHandler');
        stateChangedSpy = sinon.spy();
        receiverInst.on('stateChanged', stateChangedSpy);

        startHandlerStub.resolves();
        stopHandlerStub.resolves();
    });

    afterEach(() => {
        receiverInst = null;
        sinon.restore();
    });

    describe('abstract methods', () => {
        beforeEach(() => {
            sinon.restore();
        });

        ['startHandler', 'stopHandler'].forEach((method) => {
            it(`.${method}()`, () => {
                assert.throws(
                    () => receiverInst[method](),
                    /Not implemented/,
                    'should throw "Not implemented" error'
                );
            });
        });
    });

    describe('._setState()', () => {
        it('should reject when unable to set state', () => assert.isFulfilled(Promise.all([
            assert.isRejected(receiverInst._setState('NEW'), /NEW.*NEW/),
            assert.isRejected(receiverInst._setState(BaseDataReceiver.STATE.NEW), /NEW.*NEW/)
        ])));

        it('should be able to set every state from .next', () => {
            const promises = [];
            Object.keys(BaseDataReceiver.STATE).forEach((stateKey) => {
                const state = BaseDataReceiver.STATE[stateKey];
                state.next.forEach((nextStateKey) => {
                    promises.push(new Promise((resolve, reject) => {
                        receiverInst._state = state;
                        receiverInst._setState(nextStateKey).then(resolve).catch(reject);
                    }));
                });
            });
            return assert.isFulfilled(Promise.all(promises));
        });

        it('should not be able to set inappropriate state', () => {
            assert.isRejected(receiverInst._setState('DESTROYED'), /NEW.*DESTROYED/);
        });

        it('should be able to set inappropriate state when forces', () => receiverInst._setState('DESTROYED', { force: true })
            .then(() => {
                assert.strictEqual(receiverInst.getCurrentStateName(), 'DESTROYED', 'should have expected state');
            }));

        it('should not wait till state transition finished', () => receiverInst._setState('STARTING', { force: true })
            .then(() => assert.isRejected(receiverInst._setState('STOPPING', { wait: false }), /STARTING.*STOPPING/)));

        it('should wait till state transition finished', () => new Promise((resolve, reject) => {
            startHandlerStub.callsFake(() => {
                receiverInst.stop().then(resolve).catch(reject);
                return testUtil.sleep(100);
            });
            receiverInst.start().catch(reject);
        })
            .then(() => {
                assert.deepStrictEqual(fetchStates(), ['STARTING', 'RUNNING', 'STOPPING', 'STOPPED'], 'should match state\'s change order');
            }));
    });

    describe('.getCurrentStateName()', () => {
        it('should return current state', () => {
            assert.strictEqual(receiverInst.getCurrentStateName(), 'NEW');
            return receiverInst.destroy()
                .then(() => {
                    assert.strictEqual(receiverInst.getCurrentStateName(), 'DESTROYED');
                });
        });
    });

    describe('.destroy()', () => {
        it('should destroy instance and check state', () => receiverInst.destroy()
            .then(() => {
                assert.deepStrictEqual(fetchStates(), ['DESTROYING', 'DESTROYED'], 'should match state\'s change order');
                assert.strictEqual(stopHandlerStub.callCount, 1, 'should call stopHandler once');
                assert.isTrue(receiverInst.isDestroyed(), 'should return true when instance destroyed');
                assert.isTrue(receiverInst.hasState(BaseDataReceiver.STATE.DESTROYED), 'should have DESTROYED state');
                assert.isFalse(receiverInst.isRestartAllowed(), 'should not allow restart once instance destroyed');
            }));

        it('should not fail when .destroy() called twice', () => Promise.all([
            receiverInst.destroy(),
            receiverInst.destroy()
        ])
            .then(() => {
                assert.strictEqual(stopHandlerStub.callCount, 2, 'should call stopHandler 2 times');
                assert.isTrue(receiverInst.isDestroyed(), 'should have DESTROYED state');
            }));
    });

    describe('.hasState()', () => {
        it('should check current state', () => {
            assert.isTrue(receiverInst.hasState(BaseDataReceiver.STATE.NEW), 'should have NEW state');
            assert.isTrue(receiverInst.hasState('NEW'), 'should have NEW state');
            return receiverInst._setState(BaseDataReceiver.STATE.DESTROYING)
                .then(() => {
                    assert.isTrue(receiverInst.hasState(BaseDataReceiver.STATE.DESTROYING), 'should have DESTROYING state');
                    assert.isTrue(receiverInst.hasState('DESTROYING'), 'should have DESTROYING state');
                });
        });
    });

    describe('.nextStateAllowed()', () => {
        it('should check if a next state is allowed', () => {
            assert.isFalse(receiverInst.nextStateAllowed(BaseDataReceiver.STATE.NEW), 'should not allow NEW as next state for NEW');
            assert.isFalse(receiverInst.nextStateAllowed('NEW'), 'should not allow NEW as next state for NEW');
            assert.isTrue(receiverInst.nextStateAllowed(BaseDataReceiver.STATE.STARTING), 'should allow STARTING as next state for NEW');
            assert.isTrue(receiverInst.nextStateAllowed('STARTING'), 'should allow STARTING as next state for NEW');
        });
    });

    describe('.restart()', () => {
        it('should be able to restart on first try', () => receiverInst.restart()
            .then(() => {
                assert.deepStrictEqual(fetchStates(), ['RESTARTING', 'STOPPING', 'STOPPED', 'STARTING', 'RUNNING'], 'should match state\'s change order');
                assert.strictEqual(startHandlerStub.callCount, 1, 'should call startHandler once');
                assert.strictEqual(stopHandlerStub.callCount, 1, 'should call stopHandlerStub once');
                assert.isFalse(receiverInst.isDestroyed(), 'should return false when instance started');
                assert.isTrue(receiverInst.isRunning(), 'should return true when instance started');
                assert.isTrue(receiverInst.hasState('RUNNING'), 'should have RUNNING state');
                assert.isTrue(receiverInst.isRestartAllowed(), 'should allow restart once instance started');
                return receiverInst.destroy();
            })
            .then(() => {
                assert.isTrue(receiverInst.isDestroyed(), 'should return true when instance destroyed');
            }));

        it('should be able to call restart on second try', () => {
            startHandlerStub.resolves();
            startHandlerStub.onFirstCall().rejects(new Error('start error'));
            stopHandlerStub.resolves();
            stopHandlerStub.onFirstCall().rejects(new Error('stop error'));
            return receiverInst.restart()
                .then(() => {
                    assert.strictEqual(startHandlerStub.callCount, 2, 'should call startHandler 2 times');
                    assert.strictEqual(stopHandlerStub.callCount, 2, 'should call stopHandlerStub 2 times');
                    assert.isTrue(receiverInst.hasState('RUNNING'), 'should have RUNNING state');
                });
        });

        it('should try to restart 10 times', () => {
            startHandlerStub.rejects(new Error('start error'));
            stopHandlerStub.rejects(new Error('stop error'));
            return assert.isRejected(receiverInst.restart({ attempts: 10 }), /start error/)
                .then(() => {
                    assert.strictEqual(startHandlerStub.callCount, 10, 'should call startHandler 10 times');
                    assert.strictEqual(stopHandlerStub.callCount, 10, 'should call stopHandlerStub 10 times');
                    assert.isTrue(receiverInst.hasState('FAILED_TO_RESTART'), 'should have FAILED_TO_RESTART state');
                });
        });

        it('should try to restart with delay', () => {
            startHandlerStub.rejects(new Error('start error'));
            stopHandlerStub.rejects(new Error('stop error'));
            return assert.isRejected(receiverInst.restart({ attempts: 10, delay: 1 }), /start error/)
                .then(() => {
                    assert.strictEqual(startHandlerStub.callCount, 10, 'should call startHandler 10 times');
                    assert.strictEqual(stopHandlerStub.callCount, 10, 'should call stopHandlerStub 10 times');
                    assert.isTrue(receiverInst.hasState('FAILED_TO_RESTART'), 'should have FAILED_TO_RESTART state');
                });
        });

        it('should not be able to call .restart() again right after first call', () => {
            const errors = [];
            return Promise.all([
                receiverInst.restart().catch(Array.prototype.push.bind(errors)),
                receiverInst.restart().catch(Array.prototype.push.bind(errors))
            ])
                .then(() => {
                    assert.lengthOf(errors, 1, 'should throw error');
                    assert.isTrue(/RESTARTING.*RESTARTING/.test(errors[0]), 'should not be able to change state to RESTARTING again');
                    assert.strictEqual(startHandlerStub.callCount, 1, 'should call startHandler once');
                    assert.strictEqual(stopHandlerStub.callCount, 1, 'should call stopHandlerStub once');
                    assert.isTrue(receiverInst.hasState(BaseDataReceiver.STATE.RUNNING), 'should have RUNNING state');
                });
        });

        it('should stop trying to restart once destroyed', () => {
            startHandlerStub.onThirdCall().callsFake(() => receiverInst.destroy());
            startHandlerStub.rejects(new Error('start error'));
            stopHandlerStub.rejects(new Error('stop error'));
            return assert.isRejected(receiverInst.restart(), /DESTROYED/)
                .then(() => {
                    assert.isAbove(startHandlerStub.callCount, 2, 'should call startHandler more than 2 times');
                    assert.isAbove(stopHandlerStub.callCount, 2, 'should call stopHandlerStub more than 2 times');
                    assert.isTrue(receiverInst.hasState(BaseDataReceiver.STATE.DESTROYED), 'should have DESTROYED state');
                });
        });
    });

    describe('.start()', () => {
        it('should start instance and check state', () => receiverInst.start()
            .then(() => {
                assert.deepStrictEqual(fetchStates(), ['STARTING', 'RUNNING'], 'should match state\'s change order');
                assert.strictEqual(startHandlerStub.callCount, 1, 'should call startHandler once');
                assert.isFalse(receiverInst.isDestroyed(), 'should return false when instance started');
                assert.isTrue(receiverInst.isRunning(), 'should return true when instance started');
                assert.isTrue(receiverInst.hasState(BaseDataReceiver.STATE.RUNNING), 'should have RUNNING state');
                assert.isTrue(receiverInst.isRestartAllowed(), 'should allow restart once instance started');
                return receiverInst.destroy();
            })
            .then(() => {
                assert.isTrue(receiverInst.isDestroyed(), 'should return true when instance destroyed');
            }));

        it('should not be able to start destroyed instance', () => receiverInst.destroy()
            .then(() => assert.isRejected(receiverInst.start(), /DESTROYED.*STARTING/)));

        it('should not be able to start instance that is not stopped yet', () => new Promise((resolve, reject) => {
            stopHandlerStub.callsFake(() => {
                receiverInst.start().then(resolve).catch(reject);
                return testUtil.sleep(100);
            });
            receiverInst.stop().catch(reject);
        })
            .then(() => {
                assert.deepStrictEqual(fetchStates(), ['STOPPING', 'STOPPED', 'STARTING', 'RUNNING'], 'should match state\'s change order');
            }));

        it('should not wait till completion of previous operation', () => {
            const errors = [];
            return new Promise((resolve, reject) => {
                stopHandlerStub.callsFake(() => receiverInst.start(false).catch((err) => errors.push(err)));
                receiverInst.stop().then(resolve).catch(reject);
            })
                .then(() => {
                    assert.lengthOf(errors, 1, 'should throw error');
                    assert.isTrue(/STOPPING.*STARTING/.test(errors[0]), 'should not be able to change state to STOPPING');
                });
        });

        it('should change state to FAILED_TO_START when failed', () => {
            startHandlerStub.rejects(new Error('expected error'));
            return assert.isRejected(receiverInst.start(), /expected error/)
                .then(() => {
                    assert.isTrue(receiverInst.hasState('FAILED_TO_START'), 'should have FAILED_TO_START state');
                });
        });
    });

    describe('.stop()', () => {
        it('should stop instance and check state', () => receiverInst.stop()
            .then(() => {
                assert.strictEqual(stopHandlerStub.callCount, 1, 'should call stopHandler once');
                assert.isFalse(receiverInst.isDestroyed(), 'should return false when instance stopped');
                assert.isFalse(receiverInst.isRunning(), 'should return false when instance stopped');
                assert.isTrue(receiverInst.hasState('STOPPED'), 'should have STOPPED state');
                assert.isTrue(receiverInst.isRestartAllowed(), 'should allow restart once instance stopped');
                return receiverInst.destroy();
            })
            .then(() => {
                assert.isTrue(receiverInst.isDestroyed(), 'should return true when instance destroyed');
            }));

        it('should not be able to stop destroyed instance', () => receiverInst.destroy()
            .then(() => assert.isRejected(receiverInst.stop(), /DESTROYED.*STOPPING/)));

        it('should not be able to stop instance that is not started yet', () => new Promise((resolve, reject) => {
            startHandlerStub.callsFake(() => {
                receiverInst.stop().then(resolve).catch(reject);
                return testUtil.sleep(100);
            });
            receiverInst.start().catch(reject);
        })
            .then(() => {
                assert.deepStrictEqual(fetchStates(), ['STARTING', 'RUNNING', 'STOPPING', 'STOPPED'], 'should match state\'s change order');
            }));

        it('should not wait till completion of previous operation', () => {
            const errors = [];
            return new Promise((resolve, reject) => {
                startHandlerStub.callsFake(() => receiverInst.stop(false).catch((err) => errors.push(err)));
                receiverInst.start().then(resolve).catch(reject);
            })
                .then(() => {
                    assert.lengthOf(errors, 1, 'should throw error');
                    assert.isTrue(/STARTING.*STOPPING/.test(errors[0]), 'should not be able to change state to STOPPING');
                });
        });

        it('should change state to FAILED_TO_STOP when failed', () => {
            stopHandlerStub.rejects(new Error('expected error'));
            return assert.isRejected(receiverInst.stop(), /expected error/)
                .then(() => {
                    assert.isTrue(receiverInst.hasState('FAILED_TO_STOP'), 'should have FAILED_TO_STOP state');
                });
        });
    });
});
