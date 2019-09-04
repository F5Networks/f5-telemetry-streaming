/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const dataUtil = require('../../src/lib/dataUtil.js');

describe('Data Util', () => {
    describe('getMatches', () => {
        it('should return what matches the property when it is a literal string', () => {
            const data = {
                system: {},
                httpProfiles: {},
                virtualServers: {}
            };
            const property = 'virtualServers';
            const expected = ['virtualServers'];
            const result = dataUtil.getMatches(data, property);
            assert.deepEqual(expected, result);
        });

        it('should return what matches the property when a regex is used', () => {
            const data = {
                httpProfiles: {},
                virtualServers: {},
                httpProfiles2: {}
            };
            const property = 'http.*';
            const expected = ['httpProfiles', 'httpProfiles2'];
            const result = dataUtil.getMatches(data, property);
            assert.deepEqual(expected, result);
        });

        it('should return no matches', () => {
            const data = {
                virtualServers: {},
                httpProfiles: {}
            };
            const property = 'noReults';
            const expected = [];
            const result = dataUtil.getMatches(data, property);
            assert.deepEqual(expected, result);
        });
    });

    describe('getDeepMatches', () => {
        it('should match specified properties', () => {
            const data = {
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
                        {},
                        {}
                    ]
                },
                system: {}
            };
            const properties = {
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
            const expected = [
                {
                    data: {
                        virtual1: {
                        }
                    },
                    key: 'virtual1'
                },
                {
                    data: {
                        httpProfile1: {},
                        httpProfile2: {}
                    },
                    key: 'httpProfile2'
                },
                {
                    data: [
                        {},
                        {}
                    ],
                    key: '0'
                },
                {
                    data: [
                        {},
                        {}
                    ],
                    key: '1'
                },
                {
                    data: [
                        {},
                        {}
                    ],
                    key: '1'
                }
            ];
            assert.deepEqual(dataUtil.getDeepMatches(data, properties), expected);
        });

        it('should not match bad properties', () => {
            const data = {
                system: {},
                virtualServers: {
                    virtual1: {}
                }
            };
            const properties = {
                virtualServers: {
                    virtual2: true
                }
            };
            assert.deepEqual(dataUtil.getDeepMatches(data, properties), []);
        });
    });
});
