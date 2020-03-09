/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const dataFilterTestsData = require('./dataFilterTestsData');
const dataFilter = require('../../src/lib/dataFilter');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Data Filter', () => {
    describe('DataFilter', () => {
        it('should blacklist tmstats if consumer is not Splunk legacy', () => {
            const consumerConfig = {
                type: 'Kafka'
            };
            const data = {
                data: {
                    tmstats: {}
                }
            };

            const expected = { tmstats: true };
            const filter = new dataFilter.DataFilter(consumerConfig);
            const filteredData = filter.apply(data);

            assert.deepStrictEqual(filter.blacklist, expected);
            assert.deepStrictEqual(filteredData, { data: {} });
        });

        it('should not blacklist tmstats if consumer is Splunk legacy', () => {
            const consumerConfig = {
                type: 'Splunk',
                config: {
                    format: 'legacy'
                }
            };
            const data = {
                data: {
                    tmstats: {}
                }
            };
            const expected = {};
            const filter = new dataFilter.DataFilter(consumerConfig);
            const filteredData = filter.apply(data);

            assert.deepStrictEqual(filter.blacklist, expected);
            assert.deepStrictEqual(filteredData, data);
        });
    });

    describe('handleAction', () => {
        dataFilterTestsData.handleAction.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                dataFilter.handleAction(testConf.dataCtx, testConf.actionCtx);
                assert.deepStrictEqual(testConf.dataCtx, testConf.expectedCtx);
            });
        });
    });
});
