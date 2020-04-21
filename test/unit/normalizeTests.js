/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
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
const sinon = require('sinon');

const properties = require('../../src/lib/properties.json');
const normalize = require('../../src/lib/normalize');
const normalizeUtil = require('../../src/lib/normalizeUtil');
const EVENT_TYPES = require('../../src/lib/constants').EVENT_TYPES;
const dataExamples = require('./normalizeTestsData');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Normalize', () => {
    afterEach(() => {
        sinon.restore();
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

    describe('event', () => {
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
                    assert.deepStrictEqual(result, eventDataExample.expectedData);
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
            assert.deepStrictEqual(result, expectedResult);
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
            assert.deepStrictEqual(result, expectedResult);
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
            assert.deepStrictEqual(result, expectedResult);
        });
    });

    describe('data', () => {
        it('should normalize data (no change)', () => {
            const data = {
                key1: 'value',
                key2: 'value'
            };

            const result = normalize.data(data);
            assert.deepStrictEqual(result, data);
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
            assert.deepStrictEqual(result, expectedResult);
        });

        it('should get key', () => {
            const options = {
                key: 'sys/version/0::Version'
            };

            const result = normalize.data(exampleData, options);
            assert.strictEqual(result, 'Version');
        });

        describe('filterByKeys', () => {
            it('should filter by key', () => {
                const options = {
                    key: 'sys/version/0',
                    normalization: [
                        {
                            filterKeys: { include: ['Version', 'Product'] }
                        }
                    ]
                };
                const expectedResult = {
                    Product: 'Product',
                    Version: 'Version'
                };

                const result = normalize.data(exampleData, options);
                assert.deepStrictEqual(result, expectedResult);
            });
        });

        describe('renameKeysByPattern', () => {
            it('should rename key by pattern', () => {
                const options = {
                    normalization: [
                        {
                            renameKeys: {
                                patterns: {
                                    'sys/version': {
                                        pattern: 'sys/version(.*)',
                                        group: 1
                                    }
                                }
                            }
                        }
                    ]
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
        });

        describe('convertArrayToMap', () => {
            it('should convert with keyname and prefix', () => {
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
                    normalization: [
                        {
                            convertArrayToMap: {
                                keyName: 'name',
                                keyNamePrefix: 'name/'
                            }
                        }
                    ]
                };

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
            });

            it('should preserve array if convertArrayToMap not specified', () => {
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
                assert.deepStrictEqual(result, result);
            });

            it('should preserve array if skipWheKeyMissing specified and key does not exist', () => {
                const data = {
                    list: [
                        {
                            name: 'foo',
                            date: '1/1/10'
                        },
                        {
                            name: 'bar',
                            date: '1/2/10'
                        }
                    ]
                };
                const expectedResult = {
                    list: [
                        {
                            name: 'foo',
                            date: '1/1/10'
                        },
                        {
                            name: 'bar',
                            date: '1/2/10'
                        }
                    ]
                };
                const options = {
                    normalization: [
                        {
                            convertArrayToMap: {
                                keyName: 'nonexistent',
                                skipWhenKeyMissing: true
                            }
                        }
                    ]
                };

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
            });

            it('should return empty list if empty array and skipWhenKeyMissing is specified', () => {
                const data = {
                    list: [
                    ]
                };
                const expectedResult = {
                    list: []
                };
                const options = {
                    normalization: [
                        {
                            convertArrayToMap: {
                                keyName: 'someKey',
                                skipWhenKeyMissing: true
                            }
                        }
                    ]
                };

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
            });

            it('should return empty object if empty array and skipWhenKeyMissing not specified', () => {
                const data = {
                    list: [
                    ]
                };
                const expectedResult = {
                    list: {}
                };
                const options = {
                    normalization: [
                        {
                            convertArrayToMap: {
                                keyName: 'someKey'
                            }
                        }
                    ]
                };

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
            });
        });

        describe('includeFirstEntry', () => {
            it('should flatten data with first entry with pattern match', () => {
                const data = {
                    parentKey: 'bar',
                    entries: {
                        'https://localhost/mgmt/tm/sys/endpoint/stats': {
                            childKey: 'stats'
                        }
                    }
                };
                const expectedResult = {
                    parentKey: 'bar',
                    childKey: 'stats'
                };
                const options = {
                    normalization: [
                        {
                            includeFirstEntry: {
                                pattern: '/stats',
                                excludePattern: '/members/'
                            }
                        }
                    ]
                };

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
            });

            it('should not flatten data with first entry when pattern and excludePattern both match', () => {
                const data = {
                    parentKey: 'bar',
                    entries: {
                        '/items/one/exclude': {
                            childKey: 'one'
                        },
                        '/items/two/exclude': {
                            childKey: 'two'
                        }
                    }
                };
                const expectedResult = {
                    '/items/one/exclude': {
                        childKey: 'one'
                    },
                    '/items/two/exclude': {
                        childKey: 'two'
                    }
                };
                const options = {
                    normalization: [
                        {
                            includeFirstEntry: {
                                pattern: '/items',
                                excludePattern: '/exclude'
                            }
                        }
                    ]
                };

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
            });

            it('should run custom functions on first entries', () => {
                const data = {
                    parentKey: 'bar',
                    entries: {
                        '/ref/category1/item1': {
                            id: 'category1/item1',
                            total: 1000,
                            partial: 500,
                            items: ['one', 'two']
                        }
                    },
                    items: {
                        'https://ref/category1/item1': {
                            addtl: 20
                        }
                    }
                };
                const expectedResult = {
                    parentKey: 'bar',
                    modKey: 'https://ref/category1/item1',
                    modTotal: 1000,
                    modPartial: 500,
                    modAddtl: 20
                };
                const options = {
                    normalization: [
                        {
                            includeFirstEntry: {
                                pattern: '/ref',
                                runFunctions: [{ name: 'customFunc' }]
                            }
                        },
                        {
                            filterKeys: {
                                exclude: ['items']
                            }
                        }
                    ]
                };
                normalizeUtil.customFunc = sinon.stub().callsFake((obj) => {
                    const itemPropKey = Object.keys(obj.data.items)[0];
                    return {
                        parentKey: obj.data.parentKey,
                        modKey: itemPropKey,
                        modTotal: obj.data.total,
                        modPartial: obj.data.partial,
                        modAddtl: obj.data.items[itemPropKey].addtl
                    };
                });

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
            });
        });

        describe('runFunctions', () => {
            it('should run custom functions', () => {
                const options = {
                    normalization: [
                        {
                            runFunctions: [
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
                        }
                    ]
                };
                const expectedResult = 'name';

                const result = normalize.data('named_key,key1\nname,value', options);
                assert.deepStrictEqual(result, expectedResult);
            });

            it('should execute catch with stack trace when thrown error from run custom function', () => {
                const options = {
                    normalization: [
                        {
                            runFunctions: [
                                {
                                    name: 'getAverage',
                                    args: {
                                        keyWithValue: 'oneMinAverageSystem'
                                    }
                                }
                            ]
                        }
                    ]
                };

                const data = {
                    tmm0: {
                        oneMinAverageSystem: 10
                    },
                    tmm1: {
                        oneMinAverageSystem: 20
                    },
                    tmm2: {
                        // intentionally missing value
                    }
                };

                let caught = false;
                try {
                    normalize.data(data, options);
                } catch (err) {
                    caught = true;
                    assert.notStrictEqual(err.message.indexOf('runCustomFunction \'getAverage\' failed'), -1);
                }
                assert(caught);
            });
        });

        describe('addKeysByTag', () => {
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
                        foo: 'bar',
                        addntlTag: 'tag'
                    }
                };
                const options = {
                    normalization: [
                        {
                            addKeysByTag: {
                                tags: {
                                    tenant: '`T`',
                                    application: '`A`',
                                    foo: 'bar'
                                },
                                definitions: properties.definitions,
                                opts: {
                                    skip: ['somekey'],
                                    tags: {
                                        addntlTag: 'tag'
                                    }
                                }
                            }
                        }
                    ]
                };

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
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
                    normalization: [
                        {
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
                        }
                    ]
                };

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
            });
        });


        describe('formatTimestamps', () => {
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
                    normalization: [
                        {
                            formatTimestamps: ['expirationString']
                        }
                    ]
                };

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
            });

            it('should format timestamps when matching property key', () => {
                const data = '1560975328';
                const expectedResult = '2019-06-19T20:15:28.000Z';
                const options = {
                    normalization: [
                        {
                            formatTimestamps: ['ltmConfigTime']
                        }
                    ],
                    propertyKey: 'ltmConfigTime'
                };

                const result = normalize.data(data, options);
                assert.deepStrictEqual(result, expectedResult);
            });
        });
    });

    describe('_handleFormatTimestamps', () => {
        it('should format timestamps with propertyKey', () => {
            const ret = {
                ltmConfigTime: '1560975328'
            };
            const timestamps = ['ltmConfigTime'];
            const options = {
                propertyKey: 'ltmConfigTime'
            };
            const expected = {
                ltmConfigTime: '2019-06-19T20:15:28.000Z'
            };
            const result = normalize._handleTimestamps(ret, timestamps, options);
            assert.deepStrictEqual(result, expected);
        });

        it('should format timestamps without propertyKey', () => {
            const ret = {
                formatMe: 'September 16, 2019 01:00:00 UTC'
            };
            const timestamps = ['formatMe'];
            const expected = {
                formatMe: '2019-09-16T01:00:00.000Z'
            };
            const result = normalize._handleTimestamps(ret, timestamps, {});
            assert.deepStrictEqual(result, expected);
        });
    });

    describe('_handleFilterByKeys', () => {
        it('should filter out keys', () => {
            const ret = {
                key1: 'keyValue',
                key2: 'hello',
                key3: 'data'
            };
            const filterByKeys = [
                {
                    exclude: ['key1', 'key3']
                }
            ];
            const expected = {
                key2: 'hello'
            };
            const result = normalize._handleFilterByKeys(ret, filterByKeys);
            assert.deepStrictEqual(result, expected);
        });
    });

    describe('_handleRenameKeys', () => {
        it('should rename keys', () => {
            const ret = {
                prop1: 'value1',
                prop2: 'value2',
                prop3: 'value3'
            };
            const renameKeys = [
                { patterns: { prop1: { pattern: 'prop' }, prop2: { pattern: 'p' } } }
            ];
            const expected = {
                prop: 'value1',
                p: 'value2',
                prop3: 'value3'
            };
            const result = normalize._handleRenameKeys(ret, renameKeys);
            assert.deepStrictEqual(result, expected);
        });
    });
});
