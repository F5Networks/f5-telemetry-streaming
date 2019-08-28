/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const DataFilter = require('../../src/nodejs/dataFilter.js');

/* eslint-disable global-require */

describe('Forwarder', () => {
    let forwarder;
    let consumers;

    let actualContext;
    const config = {
        type: 'consumerType'
    };
    const type = 'dataType';
    const data = { foo: 'bar' };

    before(() => {
        forwarder = require('../../src/nodejs/forwarder.js');
        consumers = require('../../src/nodejs/consumers.js');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should forward to consumer', () => {
        consumers.getConsumers = () => [
            {
                consumer: (context) => {
                    actualContext = context;
                },
                config,
                tracer: null,
                filter: new DataFilter({})
            }
        ];

        return forwarder.forward({ type, data })
            .then(() => {
                assert.deepEqual(actualContext.event.data, data);
                assert.deepEqual(actualContext.config, config);
            })
            .catch(err => Promise.reject(err));
    });

    it('should resolve with no consumers', () => {
        consumers.getConsumers = () => null;

        return forwarder.forward({ type, data })
            .then(() => {})
            .catch(err => Promise.reject(new Error(`Should not error: ${err}`)));
    });

    it('should resolve on consumer error', () => {
        consumers.getConsumers = () => [
            {
                consumer: () => {
                    throw new Error('foo');
                },
                config,
                tracer: null,
                filter: new DataFilter({})
            }
        ];

        return forwarder.forward({ type, data })
            .then(() => {})
            .catch(err => Promise.reject(new Error(`Should not error: ${err}`)));
    });
});
