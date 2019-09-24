/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');

/* eslint-disable global-require */

describe('Data Pipeline', () => {
    let dataPipeline;
    let forwarder;

    before(() => {
        dataPipeline = require('../../src/lib/dataPipeline.js');
        forwarder = require('../../src/lib/forwarder.js');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should process data', () => {
        let fwdData;
        forwarder.forward = (ctx) => {
            fwdData = ctx.data;
            return Promise.resolve();
        };

        const expectedResult = {
            foo: 'bar',
            telemetryEventCategory: 'event'
        };

        return dataPipeline.process({ foo: 'bar' }, 'event')
            .then(() => {
                assert.deepEqual(fwdData, expectedResult);
            })
            .catch(err => Promise.reject(err));
    });

    it('should fail to process data', () => {
        forwarder.forward = () => Promise.reject(new Error('some message'));

        return dataPipeline.process({ foo: 'bar' }, 'systemInfo')
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                if (/some message/.test(err)) return Promise.resolve();
                assert.fail(err);
                return Promise.reject(err);
            });
    });
});
