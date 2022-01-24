/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const lodash = require('lodash');

const prometheusConsumer = require('../../../src/lib/pullConsumers/Prometheus');
const testUtil = require('../shared/util');

const EXPECTED_DATA = require('./data/prometheusPullConsumerTestsData').expectedData;
const SYSTEM_POLLER_DATA = require('./data/system_poller_datasets.json');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

const arraysToPromLines = (input) => lodash.flatten(input).join('\n');

describe('Prometheus Pull Consumer', () => {
    let context;
    let eventStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        context = testUtil.buildConsumerContext({
            config: {}
        });
        eventStub = sinon.stub(context, 'event').value([[{}]]);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should process event', () => assert.isFulfilled(prometheusConsumer(context)));

    it('should reject on null event', () => {
        eventStub.value(null);
        return assert.isRejected(
            prometheusConsumer(context),
            /No event data to process/
        );
    });

    it('should not reject on missing event data', () => {
        eventStub.value([[]]);
        return prometheusConsumer(context)
            .then((response) => {
                assert.strictEqual(response.data, '', 'should be empty string');
            });
    });

    it('should continue without tracer', () => {
        sinon.stub(context, 'tracer').value(null);
        return assert.isFulfilled(prometheusConsumer(context));
    });

    it('should set correct ContentType', () => {
        eventStub.value([[]]);
        return prometheusConsumer(context)
            .then((response) => {
                assert.strictEqual(response.contentType, 'text/plain; version=0.0.4; charset=utf-8', 'should be text/plain ContentType');
            });
    });

    describe('formatting System Poller data', () => {
        it('should format data (unfiltered)', () => {
            eventStub.value([SYSTEM_POLLER_DATA.unfiltered]);
            return prometheusConsumer(context)
                .then((response) => {
                    assert.strictEqual(response.data, EXPECTED_DATA.unfiltered);
                });
        });

        it('should format data (just virtualServers)', () => {
            eventStub.value([SYSTEM_POLLER_DATA.virtualServers]);
            return prometheusConsumer(context)
                .then((response) => {
                    assert.strictEqual(response.data, EXPECTED_DATA.virtualServers);
                });
        });

        it('should format data from 2 System Pollers (virtualServers and pools)', () => {
            eventStub.value([SYSTEM_POLLER_DATA.virtualServers, SYSTEM_POLLER_DATA.pools]);
            return prometheusConsumer(context)
                .then((response) => {
                    assert.strictEqual(response.data, EXPECTED_DATA.poolsAndVirtuals);
                });
        });

        it('should format data with similarly named objects (isCustom=false)', () => {
            eventStub.value([{
                data: {
                    pools: {
                        '/Common/my-pool/stats': {
                            activeMemberCnt: 1
                        },
                        '/Common/my_pool/stats': {
                            activeMemberCnt: 3
                        }
                    }
                },
                isCustom: false
            }]);

            const expectedData = arraysToPromLines([
                '# HELP f5_activeMemberCnt activeMemberCnt', '# TYPE f5_activeMemberCnt gauge',
                'f5_activeMemberCnt{pools="/Common/my-pool/stats"} 1', 'f5_activeMemberCnt{pools="/Common/my_pool/stats"} 3', ''
            ]);

            return prometheusConsumer(context)
                .then((response) => {
                    assert.strictEqual(response.data, expectedData);
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
                eventStub.value([thisData]);

                const expectedData = arraysToPromLines([
                    '# HELP f5_pools_thisIsPool1_myMetric pools_thisIsPool1_myMetric', '# TYPE f5_pools_thisIsPool1_myMetric gauge',
                    'f5_pools_thisIsPool1_myMetric 12', ''
                ]);

                return prometheusConsumer(context)
                    .then((response) => {
                        assert.strictEqual(response.data, expectedData);
                    });
            });

            it('should apply label-based formatting by default (isCustom=undefined)', () => {
                eventStub.value([mockCustomData]);

                const expectedData = arraysToPromLines(
                    ['# HELP f5_myMetric myMetric', '# TYPE f5_myMetric gauge', 'f5_myMetric{pools="thisIsPool1"} 12', '']
                );

                return prometheusConsumer(context)
                    .then((response) => {
                        assert.strictEqual(response.data, expectedData);
                    });
            });

            it('should reformat special characters in metric payload (isCustom=true)', () => {
                eventStub.value([{
                    data: {
                        memory: {
                            'my name': {
                                allocated: 125
                            },
                            'my&name': {
                                allocated: 300
                            },
                            my_name: {
                                allocated: 275
                            }
                        }
                    },
                    isCustom: true
                }]);
                const expectedData = arraysToPromLines([
                    ['# HELP f5_memory_my_name_allocated memory_my_name_allocated', '# TYPE f5_memory_my_name_allocated gauge', 'f5_memory_my_name_allocated 275', ''],
                    ['# HELP f5_memory_my__x20__name_allocated memory_my name_allocated', '# TYPE f5_memory_my__x20__name_allocated gauge', 'f5_memory_my__x20__name_allocated 125', ''],
                    ['# HELP f5_memory_my__x26__name_allocated memory_my&name_allocated', '# TYPE f5_memory_my__x26__name_allocated gauge', 'f5_memory_my__x26__name_allocated 300', '']
                ]);

                return prometheusConsumer(context)
                    .then((response) => {
                        assert.strictEqual(response.data, expectedData);
                    });
            });

            it('should log but not error when duplicate metric name encountered (isCustom=true)', () => {
                eventStub.value([{
                    data: {
                        memory: {
                            'my name': {
                                allocated: 125
                            },
                            my_name: {
                                allocated: 175
                            },
                            my__x20__name: {
                                allocated: 11
                            }
                        }
                    },
                    isCustom: true
                }]);

                const expectedData = arraysToPromLines([
                    ['# HELP f5_memory_my_name_allocated memory_my_name_allocated', '# TYPE f5_memory_my_name_allocated gauge', 'f5_memory_my_name_allocated 175', ''],
                    ['# HELP f5_memory_my__x20__name_allocated memory_my__x20__name_allocated', '# TYPE f5_memory_my__x20__name_allocated gauge', 'f5_memory_my__x20__name_allocated 11', '']
                ]);

                return prometheusConsumer(context)
                    .then((response) => {
                        assert.deepStrictEqual(
                            context.logger.error.getCalls()[0].args[0],
                            'Unable to register metric for: memory_my name_allocated. A metric with the name f5_memory_my__x20__name_allocated has already been registered.'
                        );
                        assert.strictEqual(response.data, expectedData);
                    });
            });
        });
    });
});
