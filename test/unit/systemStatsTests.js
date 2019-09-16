/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const SystemStats = require('../../src/lib/systemStats');

describe('systemStats', () => {
    describe('.processData', () => {
        const sysStats = new SystemStats();

        it('should skip normalization', () => {
            const property = {
                key: 'propKey',
                normalize: false
            };
            const data = {
                kind: 'dataKind'
            };
            const key = 'keyForData';
            const expected = {
                kind: 'dataKind'
            };
            const result = sysStats._processData(property, data, key);
            assert.deepEqual(result, expected);
        });

        it('should normalize data', () => {
            const property = {
                key: 'propKey',
                normalization: [
                    {
                        convertArrayToMap: { keyName: 'name', keyNamePrefix: 'name/' }
                    },
                    {
                        includeFirstEntry: ''
                    },
                    {
                        filterKeys: { exclude: ['fullPath'] }
                    },
                    {
                        renameKeys: { patterns: { prop1: { pattern: 'prop' } } }
                    },
                    {
                        runFunctions: []
                    },
                    {
                        addKeysByTag: { skip: ['something'] }
                    }
                ]
            };
            const data = {
                'tenant/app/item': {
                    prop1: 'someData',
                    prop2: 'someMoreData',
                    fullPath: 'the/full/path'
                }
            };
            const key = 'keyValue';
            const expected = {
                'tenant/app/item': {
                    prop: 'someData',
                    prop2: 'someMoreData',
                    name: 'tenant/app/item'
                }
            };
            const result = sysStats._processData(property, data, key);
            assert.deepEqual(result, expected);
        });

        it('should normalize data and use defaults without normalization array', () => {
            const property = {
                key: 'propKey'
            };
            const data = {
                'tenant~app~name': {
                    prop: 'value',
                    kind: 'dataKind',
                    selfLink: '/link/to/self'
                }
            };
            const key = 'keyValue';
            const expected = {
                'tenant/app/name': {
                    prop: 'value'
                }
            };
            const result = sysStats._processData(property, data, key);
            assert.deepEqual(result, expected);
        });

        it('should normalize data and use defaults with normalization array', () => {
            const property = {
                key: 'propKey',
                normalization: [
                    {
                        addKeysByTag: { skip: ['prop2'] }
                    }
                ]
            };
            const data = {
                'tenant~app~something': {
                    prop: 'value',
                    kind: 'dataKind',
                    selfLink: '/link/to/self'
                }
            };
            const key = 'keyValue';
            const expected = {
                'tenant/app/something': {
                    prop: 'value',
                    name: 'tenant/app/something'
                }
            };
            const result = sysStats._processData(property, data, key);
            assert.deepEqual(result, expected);
        });
    });
});
