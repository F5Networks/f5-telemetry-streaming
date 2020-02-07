/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');

const util = require('./shared/util');
const dataFilter = require('../../src/lib/dataFilter.js');
const dataFilterTestsData = require('./dataFilterTestsData.js');


describe('Data Filter', () => {
    describe('DataFilter', () => {
        it('should blacklist tmstats if consumer is not Splunk legacy', () => {
            const consumerConfig = {
                type: 'Kafka'
            };
            const expected = { tmstats: true };
            const filter = new dataFilter.DataFilter(consumerConfig);

            assert.deepEqual(filter.blacklist, expected);
        });

        it('should not blacklist tmstats if consumer is Splunk legacy', () => {
            const consumerConfig = {
                type: 'Splunk',
                config: {
                    format: 'legacy'
                }
            };
            const expected = {};
            const filter = new dataFilter.DataFilter(consumerConfig);

            assert.deepEqual(filter.blacklist, expected);
        });
    });

    describe('handleAction', () => {
        dataFilterTestsData.handleAction.forEach((testConf) => {
            util.getCallableIt(testConf)(testConf.name, () => {
                dataFilter.handleAction(testConf.dataCtx, testConf.actionCtx);
                assert.deepStrictEqual(testConf.dataCtx, testConf.expectedCtx);
            });
        });
    });
});
