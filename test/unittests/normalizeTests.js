/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const normalize = require('../../src/nodejs/normalize.js');
const normalizeUtil = require('../../src/nodejs/normalizeUtil.js');

const properties = require('../../src/nodejs/config/properties.json');
const dataExamples = require('./normalizeTestsData.js');
const EVENT_TYPES = require('../../src/nodejs/constants.js').EVENT_TYPES;


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

    const eventNormalizeOptions = {
        renameKeysByPattern: properties.global.renameKeys,
        addKeysByTag: {
            definitions: properties.definitions,
            tags: {},
            opts: {
                classifyByKeys: properties.events.classifyByKeys
            }
        },
        formatTimestamps: properties.global.formatTimestamps.keys,
        classifyEventByKeys: properties.events.classifyCategoryByKeys
    };

    dataExamples.normalizeEventData.forEach((eventDataExample) => {
        it(`should normalize event - ${eventDataExample.name}`, () => {
            const result = normalize.event(eventDataExample.data, eventNormalizeOptions);
            if (eventDataExample.category !== undefined) {
                assert.strictEqual(result.telemetryEventCategory, eventDataExample.category);
            }
            if (eventDataExample.expectedData !== undefined) {
                assert.deepEqual(result, eventDataExample.expectedData);
            }
        });
    });

    it('should normalize event with single key', () => {
        const event = '<100> some syslog event: host=x.x.x.x';
        const expectedResult = {
            data: event,
            telemetryEventCategory: EVENT_TYPES.EVENT_LISTENER
        };

        const result = normalize.event(event);
        assert.deepEqual(result, expectedResult);
    });

    it('should normalize event and rename key(s)', () => {
        const event = 'key1="value",key2="value"';
        const expectedResult = {
            key1: 'value',
            key3: 'value',
            telemetryEventCategory: EVENT_TYPES.LTM_EVENT
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

    it('should normalize event and format timestamps', () => {
        const event = 'key1="value",date_time="January 01, 2019 01:00:00 UTC"';
        const expectedResult = {
            key1: 'value',
            date_time: '2019-01-01T01:00:00.000Z',
            telemetryEventCategory: EVENT_TYPES.LTM_EVENT
        };
        const options = {
            formatTimestamps: ['date_time']
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

    it('should run custom functions', () => {
        const options = {
            runCustomFunctions: [
                {
                    name: 'formatAsJson',
                    args: {
                        type: 'csv',
                        mapKey: 'named_key'
                    }
                },
                {
                    name: 'getFirstKey'
                }
            ]
        };
        const expectedResult = 'name';

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

    it('should format timestamps', () => {
        const data = {
            sslCerts: {
                cert: {
                    expirationString: 'January 01, 2019 01:00:00 UTC',
                    shouldNotFormat: 'January 01, 2019 01:00:00 UTC'
                }
            }
        };
        const expectedResult = {
            sslCerts: {
                cert: {
                    expirationString: '2019-01-01T01:00:00.000Z', // ISO string
                    shouldNotFormat: 'January 01, 2019 01:00:00 UTC'
                }
            }
        };
        const options = {
            formatTimestamps: ['expirationString']
        };

        const result = normalize.data(data, options);
        assert.deepEqual(result, expectedResult);
    });

    it('should format timestamps when matching property key', () => {
        const data = '1560975328';
        const expectedResult = '2019-06-19T20:15:28.000Z';
        const options = {
            formatTimestamps: ['ltmConfigTime'],
            propertyKey: 'ltmConfigTime'
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

    it('should convert array to map', () => {
        const array = [
            {
                name: 'foo'
            }
        ];
        const expectedMap = {
            foo: {
                name: 'foo'
            }
        };
        const actualMap = normalizeUtil._convertArrayToMap(array, 'name');
        assert.deepEqual(actualMap, expectedMap);
    });

    it('should fail to convert array to map', () => {
        assert.throws(
            () => {
                normalizeUtil._convertArrayToMap({}, 'name');
            },
            (err) => {
                if ((err instanceof Error) && /array required/.test(err)) {
                    return true;
                }
                return false;
            },
            'unexpected error'
        );
    });

    it('should filter data by keys', () => {
        const obj = {
            'name/foo': {
                name: 'foo',
                removeMe: 'foo'
            }
        };
        const expectedObj = {
            'name/foo': {
                name: 'foo'
            }
        };
        // include
        let actualObj = normalizeUtil._filterDataByKeys(obj, { include: ['name'] });
        assert.deepEqual(actualObj, expectedObj);
        // exclude
        actualObj = normalizeUtil._filterDataByKeys(obj, { exclude: ['removeMe'] });
        assert.deepEqual(actualObj, expectedObj);
    });

    it('should not filter array', () => {
        const obj = [1, 2, 3];
        const actualObj = normalizeUtil._filterDataByKeys(obj, { include: ['name'] });
        assert.deepEqual(actualObj, obj);
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

    it('should format as json and filter/rename', () => {
        const data = 'named_key,key1,key2,key3\nname,value,value,value';
        const expectedResult = {
            name: {
                named_key: 'name',
                key1: 'value',
                renamedKey: 'value'
            }
        };

        const result = normalizeUtil.formatAsJson({
            data,
            type: 'csv',
            mapKey: 'named_key',
            filterKeys: { exclude: ['key2'] },
            renameKeys: { patterns: { key3: { constant: 'renamedKey' } } }
        });
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

    it('should restructure rules', () => {
        const args = {
            data: {
                '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth': {
                    aborts: 0,
                    avgCycles: 30660,
                    eventType: 'RULE_INIT',
                    failures: 0,
                    maxCycles: 30660,
                    minCycles: 23832,
                    priority: 500,
                    totalExecutions: 4
                },
                '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth': {
                    aborts: 0,
                    avgCycles: 26028,
                    eventType: 'RULE_INIT',
                    failures: 0,
                    maxCycles: 26028,
                    minCycles: 23876,
                    priority: 500,
                    totalExecutions: 4
                }
            }
        };
        const expected = {
            '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth': {
                events: {
                    RULE_INIT: {
                        aborts: 0,
                        avgCycles: 30660,
                        failures: 0,
                        maxCycles: 30660,
                        minCycles: 23832,
                        priority: 500,
                        totalExecutions: 4
                    }
                }
            },
            '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth': {
                events: {
                    RULE_INIT: {
                        aborts: 0,
                        avgCycles: 26028,
                        failures: 0,
                        maxCycles: 26028,
                        minCycles: 23876,
                        priority: 500,
                        totalExecutions: 4
                    }
                }
            }
        };
        const result = normalizeUtil.restructureRules(args);
        assert.deepStrictEqual(expected, result);
    });
});
