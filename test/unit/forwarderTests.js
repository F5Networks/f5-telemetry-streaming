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
        type: 'consumerType',
        traceName: 'testConsumer'
    };
    const type = 'dataType';
    const data = { foo: 'bar' };
    const metadata = { compute: { onlyWhenAvailable: true } };

    afterEach(() => {
        sinon.restore();
    });

    it('should forward to correct consumers', () => {
        let actualContext;
        const consumersCalled = [];
        sinon.stub(consumers, 'getConsumers').returns([
            {
                consumer: (context) => {
                    actualContext = context;
                    consumersCalled.push('uuid1');
                },
                id: 'uuid1',
                config,
                tracer: null,
                filter: new DataFilter({}),
                logger: {},
                metadata
            },
            {
                consumer: (context) => {
                    actualContext = { orig: context, modified: true };
                    consumersCalled.push('uuid2');
                },
                id: 'uuid2',
                config,
                tracer: null,
                filter: new DataFilter({}),
                logger: {},
                metadata
            },
            {
                consumer: (context) => {
                    actualContext = context;
                    consumersCalled.push('uuid3');
                },
                id: 'uuid3',
                config,
                tracer: null,
                filter: new DataFilter({}),
                logger: {},
                metadata
            }
        ]);
        const mockContext = { type, data, destinationIds: ['uuid1', 'uuid3'] };
        return assert.isFulfilled(forwarder.forward(mockContext)
            .then(() => {
                assert.deepStrictEqual(actualContext.event.data, data);
                assert.deepStrictEqual(actualContext.config, config);
                assert.deepStrictEqual(actualContext.metadata, metadata);
                assert.deepStrictEqual(consumersCalled, ['uuid1', 'uuid3']);
            }));
    });

    it('should resolve with no consumers', () => {
        sinon.stub(consumers, 'getConsumers').returns(null);
        return assert.isFulfilled(forwarder.forward({ type, data, destinationIds: [] }));
    });

    it('should resolve on consumer error', () => {
        sinon.stub(consumers, 'getConsumers').returns([
            {
                consumer: () => {
                    throw new Error('foo');
                },
                config,
                id: 'uuid123',
                tracer: null,
                filter: new DataFilter({}),
                logger: {},
                metadata: {}
            }
        ]);
        return assert.isFulfilled(forwarder.forward({ type, data, destinationIds: ['uuid123'] }));
    });
});
