/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');

/* eslint-disable global-require */

describe('Consumers plugins', () => {
    let cDefault;
    let context;

    before(() => {
        cDefault = require('../src/nodejs/consumers/default');
    });
    beforeEach(() => {
        const tracerMock = {
            write() {}
        };
        const loggerMock = {
            error() {},
            exception() {},
            info() {},
            debug() {}
        };
        context = {
            event: {},
            config: {},
            tracer: tracerMock,
            logger: loggerMock
        };
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('default: should process event', () => {
        cDefault(context)
            .then(() => {
                assert.strictEqual(1, 1);
            })
            .catch(err => Promise.reject(err));
    });

    it('default: should reject on missing event', () => {
        context.event = undefined;
        return cDefault(context)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/No event to process/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });

    it('default: should continue without tracer', () => {
        context.tracer = undefined;
        return cDefault(context)
            .then(() => Promise.resolve())
            .catch(() => Promise.reject());
    });
});
