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

const eventEmitter = require('../../../src/lib/utils/eventEmitter');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Safe Event Emitter', () => {
    const eventName = 'eventName';
    let emitter;

    beforeEach(() => {
        emitter = new eventEmitter.SafeEventEmitter();
    });

    afterEach(() => {
        emitter.removeAllListeners(eventName);
    });

    describe('safeEmit', () => {
        it('should catch listener error', () => {
            const error = new Error('test error');
            emitter.on(eventName, () => { throw error; });
            const ret = emitter.safeEmit(eventName);
            assert.isTrue(error === ret, 'should return error');
        });
    });

    describe('safeEmitAsync', () => {
        it('should catch listener error in sync part', () => {
            const error = new Error('test error');
            emitter.on(eventName, () => { throw error; });
            return assert.becomes(emitter.safeEmitAsync(eventName), error);
        });

        it('should catch listener error in async part', () => {
            const error = new Error('test error');
            emitter.on(eventName, () => new Promise((resolve, reject) => reject(error)));
            return assert.becomes(emitter.safeEmitAsync(eventName), error);
        });
    });
});
