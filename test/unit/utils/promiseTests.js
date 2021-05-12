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

const promiseUtil = require('../../../src/lib/utils/promise');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Promise Util', () => {
    describe('.allSettled()', () => {
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
                    .then(statuses => promiseUtil.getValues(statuses, true)),
                [1, undefined]
            );
        });
    });

    describe('.retry()', () => {
        it('should retry at least once', () => {
            let tries = 0;
            // first call + re-try = 2
            const expectedTries = 2;

            const promiseFunc = () => {
                tries += 1;
                return Promise.reject(new Error('expected error'));
            };

            return promiseUtil.retry(promiseFunc)
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

            return promiseUtil.retry(promiseFunc, { maxTries })
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

            return promiseUtil.retry(promiseFunc, { maxTries, callback })
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

            return promiseUtil.retry(promiseFunc, { maxTries })
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

            return promiseUtil.retry(promiseFunc, { maxTries, delay })
                .catch((err) => {
                    assert.ok(/expected error/.test(err));
                    assert.lengthOf(timestamps, expectedTries, `Expected ${expectedTries} timestamps, got ${timestamps.length}`);

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

            return promiseUtil.retry(promiseFunc, { maxTries, delay, backoff })
                .catch((err) => {
                    assert.ok(/expected error/.test(err));
                    assert.lengthOf(timestamps, expectedTries, `Expected ${expectedTries} timestamps, got ${timestamps.length}`);

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
});
