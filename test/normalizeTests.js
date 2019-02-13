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

    it('should normalize event with single key', () => {
        const event = '<100> some syslog event: host=x.x.x.x';
        const expectedResult = {
            data: event
        };

        const result = normalize.event(event);
        assert.deepEqual(result, expectedResult);
    });

    it('should normalize event and rename key(s)', () => {
        const event = 'key1="value","key2"="value"';
        const expectedResult = {
            key1: 'value',
            key3: 'value'
        };
        const options = {
            renameKeysByPattern: {
                patterns: {
                    key2: { constant: 'key3' }
                }
            }
        };

        const result = normalize.event(event, options);
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
            filterByKeys: { include: ['Version', 'Product'] }
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
                patterns: {
                    'sys/version': {
                        pattern: 'sys/version(.*)',
                        group: 1
                    }
                }
            }
        };

        const result = normalize.data(exampleData, options);
        assert.notStrictEqual(result['/0'], undefined);
    });

    it('should not rename key by pattern', () => {
        const options = {
            renameKeysByPattern: {
                patterns: {
                    'sys/version': {
                        pattern: 'sys/version(.*)',
                        group: 1
                    }
                },
                options: {
                    exactMatch: true
                }
            }
        };

        const result = normalize.data(exampleData, options);
        assert.strictEqual(result['/0'], undefined);
    });

    it('should convert array to map', () => {
        const data = {
            list: [
                {
                    name: 'foo'
                }
            ]
        };
        const expectedResult = {
            list: {
                'name/foo': {
                    name: 'foo'
                }
            }
        };
        const options = {
            convertArrayToMap: {
                keyName: 'name',
                keyNamePrefix: 'name/'
            }
        };

        const result = normalize.data(data, options);
        assert.deepEqual(result, expectedResult);
    });

    it('should leave array untouched', () => {
        const data = {
            list: [
                {
                    name: 'foo'
                }
            ]
        };
        const options = {
            convertArrayToMap: undefined
        };

        const result = normalize.data(data, options);
        assert.deepEqual(result, result);
    });

    it('should include first entry', () => {
        const data = {
            foo: 'bar',
            entries: {
                'https://localhost/mgmt/tm/sys/endpoint/stats': {
                    childKey: 'bar'
                }
            }
        };
        const expectedResult = {
            foo: 'bar',
            childKey: 'bar'
        };
        const options = {
            includeFirstEntry: {
                pattern: '/stats',
                excludePattern: '/members/'
            }
        };

        const result = normalize.data(data, options);
        assert.deepEqual(result, expectedResult);
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
                application: 'app.app',
                foo: 'bar'
            }
        };
        const options = {
            addKeysByTag: {
                tags: {
                    tenant: '`T`',
                    application: '`A`',
                    foo: 'bar'
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

    it('should add keys by tag (flat classify)', () => {
        const data = {
            vs: '/Common/app.app/foo'
        };
        const expectedResult = {
            vs: '/Common/app.app/foo',
            tenant: 'Common',
            application: 'app.app'
        };
        const options = {
            addKeysByTag: {
                tags: {
                    tenant: '`T`',
                    application: '`A`'
                },
                definitions: properties.definitions,
                opts: {
                    classifyByKeys: ['vs']
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

        let result = normalizeUtil.getSum({ data });
        assert.deepEqual(result, expectedResult);

        // check empty object is returned
        result = normalizeUtil.getSum({ data: '' });
        assert.deepEqual(result, {});

        // check that child non object does not cause issues
        data.mangled = 'foo';
        result = normalizeUtil.getSum({ data });
        assert.deepEqual(result, expectedResult);
    });

    it('should get first key', () => {
        const data = {
            '10.0.0.1/24': {
                description: 'foo'
            },
            '10.0.0.2/24': {
                description: 'foo'
            }
        };
        // check multiple branches
        let expectedResult = '10.0.0.1/24';
        let result = normalizeUtil.getFirstKey({ data });
        assert.strictEqual(result, expectedResult);

        expectedResult = 'https://10.0.0.1';
        result = normalizeUtil.getFirstKey({ data, splitOnValue: '/', keyPrefix: 'https://' });
        assert.strictEqual(result, expectedResult);

        expectedResult = 'null';
        result = normalizeUtil.getFirstKey({ data: '' });
        assert.strictEqual(result, expectedResult);
    });

    it('should get percent from keys', () => {
        const data = {
            total: 10000,
            partial: 2000
        };
        const expectedResult = 20; // percent

        const result = normalizeUtil.getPercentFromKeys({ data, totalKey: 'total', partialKey: 'partial' });
        assert.strictEqual(result, expectedResult);
    });

    it('should format as json', () => {
        const data = 'named_key,key1\nname,value';
        const expectedResult = {
            name: {
                named_key: 'name',
                key1: 'value'
            }
        };

        const result = normalizeUtil.formatAsJson({ data, type: 'csv', mapKey: 'named_key' });
        assert.deepEqual(result, expectedResult);
    });

    it('should throw error about incorrect type', () => {
        const data = 'named_key,key1\nname,value';

        try {
            normalizeUtil.formatAsJson({ data, type: 'foo', mapKey: 'named_key' });
            assert.fail('Error expected');
        } catch (err) {
            const msg = err.message || err;
            assert.notStrictEqual(msg.indexOf('Unsupported type'), -1);
        }
    });
});
