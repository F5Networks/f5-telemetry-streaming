/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const assert = require('./shared/assert');
const sourceCode = require('./shared/sourceCode');

const dataFilter = sourceCode('src/lib/dataFilter');

moduleCache.remember();

describe('Data Filter', () => {
    before(() => {
        moduleCache.restore();
    });

    describe('DataFilter', () => {
        it('should ignore tmstats if consumer is not Splunk legacy', () => {
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

            assert.deepStrictEqual(filter.excludeList, expected);
            assert.deepStrictEqual(filteredData, { data: {} });
        });

        it('should not ignore tmstats if consumer is Splunk legacy', () => {
            const consumerConfig = {
                type: 'Splunk',
                format: 'legacy'
            };
            const data = {
                data: {
                    tmstats: {}
                }
            };
            const expected = {};
            const filter = new dataFilter.DataFilter(consumerConfig);
            const filteredData = filter.apply(data);

            assert.deepStrictEqual(filter.excludeList, expected);
            assert.deepStrictEqual(filteredData, data);
        });
    });
});
