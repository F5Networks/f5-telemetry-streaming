/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const dataTagging = require('../../src/nodejs/dataTagging');

describe('Data Tagging', () => {
    describe('addTags', () => {
        it('should add tags to the default locations', () => {
            const data = {
                system: {},
                virtualServers: {},
                httpProfiles: {
                    http1: {},
                    http2: {}
                },
                clientSslProfiles: {
                    client1: {},
                    client2: {}
                },
                serverSslProfiles: {
                    server: {}
                },
                telemetryEventCategory: 'systemInfo'
            };
            const tags = {
                tag1: 'String tag',
                tag2: {
                    prop1: 'Object',
                    prop2: 'tag'
                }
            };
            const expected = {
                httpProfiles: {
                    http1: {
                        tag1: 'String tag',
                        tag2: {
                            prop1: 'Object',
                            prop2: 'tag'
                        }
                    },
                    http2: {
                        tag1: 'String tag',
                        tag2: {
                            prop1: 'Object',
                            prop2: 'tag'
                        }
                    }
                },
                clientSslProfiles: {
                    client1: {
                        tag1: 'String tag',
                        tag2: {
                            prop1: 'Object',
                            prop2: 'tag'
                        }
                    },
                    client2: {
                        tag1: 'String tag',
                        tag2: {
                            prop1: 'Object',
                            prop2: 'tag'
                        }
                    }
                },
                serverSslProfiles: {
                    server: {
                        tag1: 'String tag',
                        tag2: {
                            prop1: 'Object',
                            prop2: 'tag'
                        }
                    }
                },
                system: {},
                virtualServers: {},
                telemetryEventCategory: 'systemInfo'
            };
            dataTagging.addTags(data, tags);
            assert.deepEqual(data, expected);
        });

        it('should add tags to specified locations', () => {
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
            const tags = {
                theTag: 'Tag to add'
            };
            const locations = {
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
                virtualServers: {
                    virtual1: {
                        theTag: 'Tag to add'
                    }
                },
                httpProfiles: {
                    httpProfile1: {},
                    httpProfile2: {
                        theTag: 'Tag to add'
                    }
                },
                tmstats: {
                    cpuInfoStat: [
                        {
                            theTag: 'Tag to add'
                        },
                        {
                            theTag: 'Tag to add'
                        }
                    ],
                    diskInfoStat: [
                        {},
                        {
                            theTag: 'Tag to add'
                        }
                    ]
                },
                system: {}
            };
            dataTagging.addTags(data, tags, locations);
            assert.deepEqual(data, expected);
        });

        it('should add no tags when bad location', () => {
            const data = {
                system: {},
                virtualServers: {
                    virtual1: {}
                }
            };
            const tags = {
                newTag: {}
            };
            const locations = {
                virtualServers: {
                    virtual2: true
                }
            };
            const expected = {
                system: {},
                virtualServers: {
                    virtual1: {}
                }
            };
            dataTagging.addTags(data, tags, locations);
            assert.deepEqual(expected, data);
        });

        it('should add tags to event when no locaitons', () => {
            const data = {
                data: 'Event data',
                telemetryEventCategory: 'event'
            };
            const tags = {
                tag1: 'tag1 value',
                tag2: {
                    tag2Prop: ''
                }
            };
            const expected = {
                data: 'Event data',
                telemetryEventCategory: 'event',
                tag1: 'tag1 value',
                tag2: {
                    tag2Prop: ''
                }
            };
            dataTagging.addTags(data, tags);
            assert.deepEqual(expected, data);
        });

        it('should add no tags to event when data is string and tags are tenant and application', () => {
            const data = {
                data: 'Event data',
                telemetryEventCategory: 'event'
            };
            const tags = {
                tenant: '`T`',
                application: '`A`'
            };
            const expected = {
                data: 'Event data',
                telemetryEventCategory: 'event'
            };
            dataTagging.addTags(data, tags);
            assert.deepEqual(expected, data);
        });

        it('should add facility tag to data.system', () => {
            const data = {
                system: {
                    systemData: {}
                }
            };
            const tags = {
                facility: 'facilityValue'
            };
            const locations = {
                system: true
            };
            const expected = {
                system: {
                    systemData: {},
                    facility: 'facilityValue'
                }
            };
            dataTagging.addTags(data, tags, locations);
            assert.deepEqual(data, expected);
        });
    });

    describe('handleActions', () => {
        it('should handle setTag with no ifAllMatch', () => {
            const data = {
                system: {},
                virtualServers: {
                    virtual1: {},
                    virtual2: {}
                },
                telemetryEventCategory: 'systemInfo'
            };
            const actions = [
                {
                    enable: true,
                    setTag: {
                        tagToSet: 'hello there'
                    }
                },
                {
                    enable: true,
                    setTag: {
                        anotherTagToset: {
                            prop1: ''
                        }
                    },
                    locations: {
                        virtualServers: {
                            2: true
                        }
                    }
                }
            ];
            const expected = {
                system: {},
                virtualServers: {
                    virtual1: {
                        tagToSet: 'hello there'
                    },
                    virtual2: {
                        tagToSet: 'hello there',
                        anotherTagToset: {
                            prop1: ''
                        }
                    }
                },
                telemetryEventCategory: 'systemInfo'
            };
            dataTagging.handleActions(data, actions);
            assert.deepEqual(data, expected);
        });

        it('should handle setTag with ifAllMatch and not all match', () => {
            const data = {
                system: {},
                httpProfiles: {
                    http1: {
                        getReqs: 10
                    },
                    http2: {
                        getReqs: 8
                    }
                }
            };
            const actions = [
                {
                    enable: true,
                    setTag: {
                        newTag: 'New tag'
                    },
                    ifAllMatch: {
                        httpProfiles: {
                            '.*': {
                                getReqs: 10
                            }
                        }
                    }
                }
            ];
            const expected = {
                system: {},
                httpProfiles: {
                    http1: {
                        getReqs: 10
                    },
                    http2: {
                        getReqs: 8
                    }
                }
            };
            dataTagging.handleActions(data, actions);
            assert.deepEqual(data, expected);
        });

        it('should handle setTag with ifAllMatch and all match', () => {
            const data = {
                httpProfiles: {
                    http1: {
                        getReqs: 10
                    },
                    http2: {
                        getReqs: 10
                    }
                }
            };
            const actions = [
                {
                    enable: true,
                    setTag: {
                        newTag: 'New tag'
                    },
                    locations: {
                        httpProfiles: {
                            '.*': true
                        }
                    },
                    ifAllMatch: {
                        'http*': {
                            '.*': {
                                getReqs: 10
                            }
                        }
                    }
                }
            ];
            const expected = {
                httpProfiles: {
                    http1: {
                        getReqs: 10,
                        newTag: 'New tag'
                    },
                    http2: {
                        getReqs: 10,
                        newTag: 'New tag'
                    }
                }
            };
            dataTagging.handleActions(data, actions);
            assert.deepEqual(data, expected);
        });
    });

    describe('checkData', () => {
        it('should determine data doesn\'t pass conditions', () => {
            const data = {
                virtualServers: {
                    virtual1: {
                        'serverside.bitsIn': true
                    },
                    virtual2: {
                        'serverside.bitsIn': true
                    }
                },
                httpProfiles: {
                    httpProfile1: {
                        cookiePersistInserts: 1
                    }
                },
                system: {
                    hostname: 'bigip.example.com'
                }
            };
            const conditions = {
                httpProfiles: {
                    '.*': {
                        cookiePersistInserts: 0
                    }
                },
                system: {
                    hostname: 'something'
                }
            };
            const result = dataTagging.checkData(data, conditions, []);
            assert.deepEqual(result, false);
        });

        it('should determine that data passes conditions', () => {
            const data = {
                httpProfiles: {
                    http1: {
                        getReqs: 10
                    },
                    http2: {
                        getReqs: 10
                    }
                },
                system: {
                    hostname: 'bigip.example.com',
                    version: '14.0.0.4'
                }
            };
            const conditions = {
                'ht*': {
                    '.*': {
                        getReqs: 10
                    }
                },
                system: {
                    version: '14*'
                }
            };
            const result = dataTagging.checkData(data, conditions, []);
            assert.deepEqual(result, true);
        });
    });

    describe('addTag', () => {
        it('should handle properties.definitions tags for systemInfo', () => {
            const data = {
                system: {},
                virtualServers: {
                    '/Common/virtual1': {},
                    '/Common/virtual2': {}
                },
                telemetryEventCategory: 'systemInfo'
            };
            const tag = 'tenant';
            const tags = {
                tenant: '`T`'
            };
            const expected = {
                system: {},
                virtualServers: {
                    '/Common/virtual1': {
                        tenant: 'Common'
                    },
                    '/Common/virtual2': {
                        tenant: 'Common'
                    }
                },
                telemetryEventCategory: 'systemInfo'
            };
            dataTagging.addTag(data, tag, tags);
            assert.deepEqual(data, expected);
        });

        it('should handle properties.definitions tags for events', () => {
            const data = {
                virtual_name: '/Common/virtual1',
                telemetryEventCategory: 'event'
            };
            const tags = {
                tenant: '`T`'
            };
            const tag = 'tenant';
            const expected = {
                virtual_name: '/Common/virtual1',
                telemetryEventCategory: 'event',
                tenant: 'Common'
            };
            dataTagging.addTag(data, tag, tags);
            assert.deepEqual(data, expected);
        });

        it('should handle tag with no location', () => {
            const data = {
                system: {},
                virtualServers: {}
            };
            const tags = {
                theTag: 'Tag'
            };
            const tag = 'theTag';
            const expected = {
                system: {},
                virtualServers: {},
                theTag: 'Tag'
            };
            dataTagging.addTag(data, tag, tags);
            assert.deepEqual(data, expected);
        });

        it('should handle tag with location', () => {
            const data = {
                system: {}
            };
            const tags = {
                newTag: 'Tag 2.0'
            };
            const tag = 'newTag';
            const expected = {
                system: {
                    newTag: 'Tag 2.0'
                }
            };
            dataTagging.addTag(data, tag, tags, 'system');
            assert.deepEqual(data, expected);
        });

        it('should handle nested location', () => {
            const data = {
                virtualServers: {
                    virtual1: {}
                }
            };
            const tags = {
                tag: 'Tag'
            };
            const tag = 'tag';
            const expected = {
                virtualServers: {
                    virtual1: {
                        tag: 'Tag'
                    }
                }
            };
            dataTagging.addTag(data, tag, tags, 'virtual1', 'virtualServers');
            assert.deepEqual(data, expected);
        });
    });
});
