/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const sinon = require('sinon');

const prometheusConsumer = require('../../../src/lib/pullConsumers/Prometheus');
const testUtil = require('../shared/util');

const EXPECTED_DATA = require('./prometheusPullConsumerTestsData').expectedData;
const SYSTEM_POLLER_DATA = require('./data/system_poller_datasets.json');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Prometheus Pull Consumer', () => {
    const context = testUtil.buildConsumerContext({
        config: {}
    });
    context.event = [[{}]];

    afterEach(() => {
        sinon.restore();
    });

    it('should process event', () => assert.isFulfilled(prometheusConsumer(context)));

    it('should reject on missing event', () => {
        sinon.stub(context, 'event').value(null);
        return assert.isRejected(
            prometheusConsumer(context),
            /No event data to process/
        );
    });

    it('should not reject on missing event data', () => {
        sinon.stub(context, 'event').value([[]]);
        return prometheusConsumer(context)
            .then((data) => {
                assert.strictEqual(data, '', 'should be empty string');
            });
    });

    it('should continue without tracer', () => {
        sinon.stub(context, 'tracer').value(null);
        return assert.isFulfilled(prometheusConsumer(context));
    });

    describe('formatting System Poller data', () => {
        it('should format data (unfiltered)', () => {
            sinon.stub(context, 'event').value([SYSTEM_POLLER_DATA.unfiltered]);
            return prometheusConsumer(context)
                .then((data) => {
                    assert.strictEqual(data, EXPECTED_DATA.unfiltered);
                });
        });

        it('should format data (just virtualServers)', () => {
            sinon.stub(context, 'event').value([SYSTEM_POLLER_DATA.virtualServers]);
            return prometheusConsumer(context)
                .then((data) => {
                    assert.strictEqual(data, EXPECTED_DATA.virtualServers);
                });
        });

        it('should format data from 2 System Pollers (virtualServers and pools', () => {
            sinon.stub(context, 'event').value([SYSTEM_POLLER_DATA.virtualServers, SYSTEM_POLLER_DATA.pools]);
            return prometheusConsumer(context)
                .then((data) => {
                    assert.strictEqual(data, EXPECTED_DATA.poolsAndVirtuals);
                });
        });

        describe('Custom metrics', () => {
            const mockCustomData = {
                data: {
                    pools: { // Prometheus Consumer will attempt to use label-formatting on 'pools' key
                        thisIsPool1: { myMetric: 12 }
                    }
                }
            };
            it('should use metric-name formatting (isCustom=true)', () => {
                const thisData = testUtil.deepCopy(mockCustomData);
                thisData.isCustom = true;
                sinon.stub(context, 'event').value([thisData]);

                const expectedData = '# HELP f5_pools_thisIsPool1_myMetric pools_thisIsPool1_myMetric\n# TYPE f5_pools_thisIsPool1_myMetric gauge\nf5_pools_thisIsPool1_myMetric 12\n';

                return prometheusConsumer(context)
                    .then((data) => {
                        assert.strictEqual(data, expectedData);
                    });
            });

            it('should apply label-based formatting by default (isCustom=undefined)', () => {
                sinon.stub(context, 'event').value([mockCustomData]);

                const expectedData = '# HELP f5_myMetric myMetric\n# TYPE f5_myMetric gauge\nf5_myMetric{pools="thisIsPool1"} 12\n';

                return prometheusConsumer(context)
                    .then((data) => {
                        assert.strictEqual(data, expectedData);
                    });
            });
        });
    });
});
