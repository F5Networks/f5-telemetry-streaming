/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');
const normalize = require('../src/nodejs/normalize.js');
const normalizeUtil = require('../src/nodejs/normalizeUtil.js');

const properties = require('../src/nodejs/config/properties.json');

describe('Normalize', () => {
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    const exampleData = {
        kind: 'tm:sys:version:versionstats',
        selfLink: 'https://localhost/mgmt/tm/sys/version?ver=14.0.0.1',
        entries: {
            'https://localhost/mgmt/tm/sys/version/0': {
                nestedStats: {
                    entries: {
                        Build: {
                            description: 'Build'
                        },
                        Date: {
                            description: 'Date'
                        },
                        Edition: {
                            description: 'Edition'
                        },
                        Product: {
                            description: 'Product'
                        },
                        Title: {
                            description: 'Title'
                        },
                        Version: {
                            description: 'Version'
                        }
                    }
                }
            }
        }
    };

    it('should normalize event', () => {
        const event = 'key1="value",key2="value"';
        const expectedResult = {
            key1: 'value',
            key2: 'value'
        };

        const result = normalize.event(event);
        assert.deepEqual(result, expectedResult);
    });

    it('should normalize data (no change)', () => {
        const data = {
            key1: 'value',
            key2: 'value'
        };

        const result = normalize.data(data);
        assert.deepEqual(result, data);
    });

    it('should normalize data', () => {
        const expectedResult = {
            'sys/version/0': {
                Build: 'Build',
                Date: 'Date',
                Edition: 'Edition',
                Product: 'Product',
                Title: 'Title',
                Version: 'Version'
            }
        };

        const result = normalize.data(exampleData);
        assert.deepEqual(result, expectedResult);
    });

    it('should get key', () => {
        const options = {
            key: 'sys/version/0::Version'
        };

        const result = normalize.data(exampleData, options);
        assert.strictEqual(result, 'Version');
    });

    it('should filter by key', () => {
        const options = {
            key: 'sys/version/0',
            filterByKeys: ['Version', 'Product']
        };
        const expectedResult = {
            Product: 'Product',
            Version: 'Version'
        };

        const result = normalize.data(exampleData, options);
        assert.deepEqual(result, expectedResult);
    });

    it('should rename key by pattern', () => {
        const options = {
            renameKeysByPattern: {
                'sys/version': {
                    pattern: 'sys/version(.*)',
                    group: 1
                }
            }
        };

        const result = normalize.data(exampleData, options);
        assert.notStrictEqual(result['/0'], undefined);
    });

    it('should run custom function', () => {
        const options = {
            runCustomFunction: {
                name: 'formatAsJson',
                args: {
                    type: 'csv',
                    mapKey: 'named_key'
                }
            }
        };
        const expectedResult = {
            name: {
                named_key: 'name',
                key1: 'value'
            }
        };

        const result = normalize.data('named_key,key1\nname,value', options);
        assert.deepEqual(result, expectedResult);
    });

    it('should add keys by tag', () => {
        const data = {
            '/Common/app.app/foo': {
                key: 'value'
            }
        };
        const expectedResult = {
            '/Common/app.app/foo': {
                key: 'value',
                tenant: 'Common',
                application: 'app.app'
            }
        };
        const options = {
            addKeysByTag: {
                tags: {
                    tenant: '`T`',
                    application: '`A`'
                },
                definitions: properties.definitions,
                opts: {
                    skip: ['somekey']
                }
            }
        };

        const result = normalize.data(data, options);
        assert.deepEqual(result, expectedResult);
    });
});

describe('Normalize Util', () => {
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should get average', () => {
        const data = {
            tmm0: {
                oneMinAverageSystem: 10
            },
            tmm1: {
                oneMinAverageSystem: 20
            }
        };

        const expectedResult = 15;

        const result = normalizeUtil.getAverage({ data, keyWithValue: 'oneMinAverageSystem' });
        assert.strictEqual(result, expectedResult);
    });

    it('should get sum', () => {
        const data = {
            tmm0: {
                clientSideTrafficBitsIn: 10,
                clientSideTrafficBitsOut: 20
            },
            tmm1: {
                clientSideTrafficBitsIn: 20,
                clientSideTrafficBitsOut: 40
            }
        };

        const expectedResult = {
            clientSideTrafficBitsIn: 30,
            clientSideTrafficBitsOut: 60
        };

        const result = normalizeUtil.getSum({ data, allKeys: true });
        assert.deepEqual(result, expectedResult);
    });
});
