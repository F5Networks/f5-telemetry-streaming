/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const DataFilter = require('../../src/lib/dataFilter').DataFilter;
const forwarder = require('../../src/lib/forwarder');
const consumers = require('../../src/lib/consumers');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Forwarder', () => {
    const config = {
        type: 'consumerType'
    };
    const type = 'dataType';
    const data = { foo: 'bar' };
    const metadata = { compute: { onlyWhenAvailable: true } };

    afterEach(() => {
        sinon.restore();
    });

    it('should forward to consumer', () => {
        let actualContext;
        sinon.stub(consumers, 'getConsumers').returns([
            {
                consumer: (context) => {
                    actualContext = context;
                },
                config,
                tracer: null,
                filter: new DataFilter({}),
                logger: {},
                metadata
            }
        ]);
        return assert.isFulfilled(forwarder.forward({ type, data })
            .then(() => {
                assert.deepStrictEqual(actualContext.event.data, data);
                assert.deepStrictEqual(actualContext.config, config);
                assert.deepStrictEqual(actualContext.metadata, metadata);
            }));
    });

    it('should resolve with no consumers', () => {
        sinon.stub(consumers, 'getConsumers').returns(null);
        return assert.isFulfilled(forwarder.forward({ type, data }));
    });

    it('should resolve on consumer error', () => {
        sinon.stub(consumers, 'getConsumers').returns([
            {
                consumer: () => {
                    throw new Error('foo');
                },
                config,
                tracer: null,
                filter: new DataFilter({}),
                logger: {},
                metadata: {}
            }
        ]);
        return assert.isFulfilled(forwarder.forward({ type, data }));
    });
});
