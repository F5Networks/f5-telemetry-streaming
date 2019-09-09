/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const DataFilter = require('../../src/nodejs/dataFilter.js');

describe('Data Filter', () => {
    it('should blacklist tmstats if consumer is not Splunk legacy', () => {
        const consumerConfig = {
            type: 'Kafka'
        };
        const expected = { tmstats: true };
        const dataFilter = new DataFilter(consumerConfig);

        assert.deepEqual(dataFilter.blacklist, expected);
    });

    it('should not blacklist tmstats if consumer is Splunk legacy', () => {
        const consumerConfig = {
            type: 'Splunk',
            config: {
                format: 'legacy'
            }
        };
        const expected = {};
        const dataFilter = new DataFilter(consumerConfig);

        assert.deepEqual(dataFilter.blacklist, expected);
    });

    describe('apply', () => {
        it('should filter data based on blacklist', () => {
            const data = {
                type: 'systemInfo',
                data: {
                    virtualServers: {
                        virtual1: {}
                    },
                    httpProfiles: {
                        httpProfile1: {},
                        httpProfile2: {}
                    },
                    tmstats: {
                        cpuInfoStat: [
                            {},
                            {}
                        ],
                        diskInfoStat: [
                            { hello: 'world' },
                            { foo: 'bar' }
                        ]
                    },
                    system: {}
                }
            };
            const blacklist = {
                virtualServers: {
                    '.*': true
                },
                httpProfiles: {
                    Profile2: true
                },
                tmstats: {
                    cpuInfoStat: {
                        '.*': true
                    },
                    diskInfoStat: {
                        1: true
                    }
                }
            };
            const expected = {
                type: 'systemInfo',
                data: {
                    virtualServers: {
                    },
                    httpProfiles: {
                        httpProfile1: {}
                    },
                    tmstats: {
                        cpuInfoStat: [],
                        diskInfoStat: [{ hello: 'world' }]
                    },
                    system: {}
                }
            };
            const dataFilter = new DataFilter({});
            dataFilter.blacklist = blacklist;

            assert.deepEqual(dataFilter.apply(data), expected);
        });
    });
});
