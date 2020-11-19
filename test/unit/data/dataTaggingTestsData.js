/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EVENT_TYPES = require('../../../src/lib/constants').EVENT_TYPES;

/* eslint-disable no-useless-escape */

module.exports = {
    /**
     * Set of data to check actual and expected results only.
     * If you need some additional check feel free to add additional
     * property or write separate test.
     *
     * Note: you can specify 'testOpts' property on the same level as 'name'.
     * Following options available:
     * - only (bool) - run this test only (it.only)
     * */
    handleAction: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not execute action when no tags (empty object)',
            actionCtx: {
                enable: true,
                setTag: {}
            },
            dataCtx: {
                data: {
                    foo: 'bar'
                }
            },
            expectedCtx: {
                data: {
                    foo: 'bar'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not execute action when no tags (undefined)',
            actionCtx: {
                enable: true,
                setTag: undefined
            },
            dataCtx: {
                data: {
                    foo: 'bar'
                }
            },
            expectedCtx: {
                data: {
                    foo: 'bar'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should execute action when no ifAllMatch',
            actionCtx: {
                enable: true,
                setTag: {
                    tag: 'tag'
                }
            },
            dataCtx: {
                data: {
                    foo: 'bar'
                }
            },
            expectedCtx: {
                data: {
                    foo: 'bar',
                    tag: 'tag'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should execute action when ifAllMatch is valid',
            actionCtx: {
                enable: true,
                setTag: {
                    tag: 'tag'
                },
                ifAllMatch: {
                    foo: 'bar'
                }
            },
            dataCtx: {
                data: {
                    foo: 'bar'
                }
            },
            expectedCtx: {
                data: {
                    foo: 'bar',
                    tag: 'tag'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should execute action when ifAnyMatch is valid',
            actionCtx: {
                enable: true,
                setTag: {
                    tag: 'tag'
                },
                ifAnyMatch: [
                    {
                        foo: 'bar'
                    },
                    {
                        foo: 'baz'
                    }
                ]
            },
            dataCtx: {
                data: {
                    foo: 'baz'
                }
            },
            expectedCtx: {
                data: {
                    foo: 'baz',
                    tag: 'tag'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not execute action when ifAllMatch is invalid',
            actionCtx: {
                enable: true,
                setTag: {
                    tag: 'tag'
                },
                ifAllMatch: {
                    foo: 'foo'
                }
            },
            dataCtx: {
                data: {
                    foo: 'bar'
                }
            },
            expectedCtx: {
                data: {
                    foo: 'bar'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not execute action when ifAnyMatch is invalid',
            actionCtx: {
                enable: true,
                setTag: {
                    tag: 'tag'
                },
                ifAnyMatch: [
                    {
                        foo: 'foo'
                    },
                    {
                        foo: 'fooz'
                    }
                ]
            },
            dataCtx: {
                data: {
                    foo: 'bar'
                }
            },
            expectedCtx: {
                data: {
                    foo: 'bar'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add tags to the default locations',
            dataCtx: {
                data: {
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
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tag1: 'String tag',
                    tag2: {
                        prop1: 'Object',
                        prop2: 'tag'
                    }
                }
            },
            deviceCtx: {
                deviceVersion: '13.0.0.0',
                provisioning: { ltm: { name: 'ltm', level: 'nominal' } }
            },
            expectedCtx: {
                data: {
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
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add tags to specified locations',
            dataCtx: {
                data: {
                    virtualServers: {
                        virtual1: {},
                        virtual2: {}
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
                }
            },
            actionCtx: {
                enable: true,
                setTag: {
                    theTag: 'Tag to add'
                },
                locations: {
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
                }
            },
            expectedCtx: {
                data: {
                    virtualServers: {
                        virtual1: {
                            theTag: 'Tag to add'
                        },
                        virtual2: {
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
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add no tags when bad location',
            dataCtx: {
                data: {
                    system: {},
                    virtualServers: {
                        virtual1: {}
                    }
                }
            },
            actionCtx: {
                enable: true,
                setTag: {
                    newTag: {}
                },
                locations: {
                    virtualServers: {
                        virtual2: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    system: {},
                    virtualServers: {
                        virtual1: {}
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add tags to event when no locations',
            dataCtx: {
                data: {
                    data: 'Event data',
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tag1: 'tag1 value',
                    tag2: {
                        tag2Prop: ''
                    }
                }
            },
            expectedCtx: {
                data: {
                    data: 'Event data',
                    telemetryEventCategory: EVENT_TYPES.DEFAULT,
                    tag1: 'tag1 value',
                    tag2: {
                        tag2Prop: ''
                    }
                },
                type: EVENT_TYPES.DEFAULT
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add no tags to event when data is string and tags are tenant and application',
            dataCtx: {
                data: {
                    data: 'Event data',
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tenant: '`T`',
                    application: '`A`'
                }
            },
            expectedCtx: {
                data: {
                    data: 'Event data',
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add facility tag to data.system',
            dataCtx: {
                data: {
                    system: {
                        systemData: {}
                    }
                }
            },
            actionCtx: {
                enable: true,
                setTag: {
                    facility: 'facilityValue'
                },
                locations: {
                    system: true
                }
            },
            expectedCtx: {
                data: {
                    system: {
                        systemData: {},
                        facility: 'facilityValue'
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add tag to parent object when location points to some value',
            dataCtx: {
                data: {
                    virtualServers: {
                        virtual1: {
                            ip: 'x.x.x.x'
                        }
                    }
                }
            },
            actionCtx: {
                enable: true,
                setTag: {
                    facility: 'facilityValue'
                },
                locations: {
                    virtualServers: {
                        '.*': {
                            ip: true
                        }
                    }
                }
            },
            expectedCtx: {
                data: {
                    virtualServers: {
                        virtual1: {
                            facility: 'facilityValue',
                            ip: 'x.x.x.x'
                        }
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should override existing property',
            dataCtx: {
                data: {
                    virtualServers: {
                        virtual1: {
                            ip: 'x.x.x.x'
                        }
                    }
                }
            },
            actionCtx: {
                enable: true,
                setTag: {
                    ip: 'z.z.z.z'
                },
                locations: {
                    virtualServers: {
                        '.*': true
                    }
                }
            },
            expectedCtx: {
                data: {
                    virtualServers: {
                        virtual1: {
                            ip: 'z.z.z.z'
                        }
                    }
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should set tenant and application tags to default locations (example 1)',
            dataCtx: {
                data: {
                    system: {},
                    virtualServers: {},
                    httpProfiles: {
                        '/tenant1/application1/http1': {},
                        '/tenant2/application1/http2': {},
                        http3: {},
                        http4: {}
                    },
                    clientSslProfiles: {
                        '/tenant1/application1/client1': {},
                        '/tenant2/application1/client2': {},
                        client3: {},
                        client4: {}
                    },
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tenantTag: '`T`',
                    applicationTag: '`A`'
                }
            },
            deviceCtx: {
                deviceVersion: '13.0.0.0',
                provisioning: { ltm: { name: 'ltm', level: 'nominal' } }
            },
            expectedCtx: {
                data: {
                    system: {},
                    virtualServers: {},
                    httpProfiles: {
                        '/tenant1/application1/http1': {
                            tenantTag: 'tenant1',
                            applicationTag: 'application1'
                        },
                        '/tenant2/application1/http2': {
                            tenantTag: 'tenant2',
                            applicationTag: 'application1'
                        },
                        http3: {},
                        http4: {}
                    },
                    clientSslProfiles: {
                        '/tenant1/application1/client1': {
                            tenantTag: 'tenant1',
                            applicationTag: 'application1'
                        },
                        '/tenant2/application1/client2': {
                            tenantTag: 'tenant2',
                            applicationTag: 'application1'
                        },
                        client3: {},
                        client4: {}
                    },
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should set tenant and application tags to default locations (example 2)',
            dataCtx: {
                data: {
                    system: {},
                    virtualServers: {},
                    httpProfiles: {
                        '/tenant1/application1/http1': {},
                        '/tenant2/application1/http2': {},
                        http3: {},
                        http4: {}
                    },
                    clientSslProfiles: {
                        '/tenant1/application1/client1': {},
                        '/tenant2/application1/client2': {},
                        client3: {},
                        client4: {}
                    },
                    aPools: {
                        '/tenant1/application1/pool1': {},
                        '/tenant2/application1/pool2': {},
                        pool3: {}
                    },
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER
            },
            actionCtx: {
                enable: true,
                setTag: {
                    parentTag: {
                        nestedTag: {
                            tenantTag: '`T`',
                            applicationTag: '`A`'
                        }
                    }
                }
            },
            deviceCtx: {
                deviceVersion: '13.0.0.0',
                provisioning: { ltm: { name: 'ltm', level: 'nominal' }, gtm: { name: 'gtm', level: 'minimum' } }
            },
            expectedCtx: {
                data: {
                    system: {},
                    virtualServers: {},
                    httpProfiles: {
                        '/tenant1/application1/http1': {
                            parentTag: {
                                nestedTag: {
                                    tenantTag: 'tenant1',
                                    applicationTag: 'application1'
                                }
                            }
                        },
                        '/tenant2/application1/http2': {
                            parentTag: {
                                nestedTag: {
                                    tenantTag: 'tenant2',
                                    applicationTag: 'application1'
                                }
                            }
                        },
                        http3: {
                            parentTag: {
                                nestedTag: {}
                            }
                        },
                        http4: {
                            parentTag: {
                                nestedTag: {}
                            }
                        }
                    },
                    clientSslProfiles: {
                        '/tenant1/application1/client1': {
                            parentTag: {
                                nestedTag: {
                                    tenantTag: 'tenant1',
                                    applicationTag: 'application1'
                                }
                            }
                        },
                        '/tenant2/application1/client2': {
                            parentTag: {
                                nestedTag: {
                                    tenantTag: 'tenant2',
                                    applicationTag: 'application1'
                                }
                            }
                        },
                        client3: {
                            parentTag: {
                                nestedTag: {}
                            }
                        },
                        client4: {
                            parentTag: {
                                nestedTag: {}
                            }
                        }
                    },
                    aPools: {
                        '/tenant1/application1/pool1': {
                            parentTag: {
                                nestedTag: {
                                    tenantTag: 'tenant1',
                                    applicationTag: 'application1'
                                }
                            }
                        },
                        '/tenant2/application1/pool2': {
                            parentTag: {
                                nestedTag: {
                                    tenantTag: 'tenant2',
                                    applicationTag: 'application1'
                                }
                            }
                        },
                        pool3: {
                            parentTag: {
                                nestedTag: {}
                            }
                        }
                    },
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should set tenant and application tags to locations',
            dataCtx: {
                data: {
                    virtualServers: {},
                    httpProfiles: {
                        '/tenant1/application1/http1': {},
                        '/tenant2/application1/http2': {},
                        http3: {},
                        http4: {}
                    },
                    clientSslProfiles: {
                        '/tenant1/application1/client1': {},
                        '/tenant2/application1/client2': {},
                        client3: {},
                        client4: {}
                    },
                    srvWideIps: {
                        '/Common/www.srvish.com': {
                            srvProp: true
                        }
                    },
                    someDeepProperty: {
                        someDeepProperty: {
                            someDeepProperty: {
                                '/tenant1/application1/property1': {},
                                '/tenant2/application1/property2': {},
                                property3: {},
                                property4: {}
                            }
                        }
                    },
                    somethingElseDeep: {
                        somethingElseDeep: {
                            '/tenant1/application1/property1': {},
                            '/tenant2/application1/property2': {},
                            property3: {},
                            property4: {}
                        }
                    },
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tenantTag: '`T`',
                    applicationTag: '`A`'
                },
                locations: {
                    virtualServers: {
                        '.*': true
                    },
                    httpProfiles: {
                        '/tenant2/application1/http2': true,
                        http3: true
                    },
                    clientSslProfiles: {
                        '/tenant2/application1/client2': true,
                        client3: true
                    },
                    srvWideIps: {
                        '.*': true
                    },
                    someDeepProperty: {
                        someDeepProperty: {
                            someDeepProperty: {
                                '/tenant2/application1/property1': true,
                                property2: true
                            }
                        }
                    },
                    somethingElseDeep: {
                        somethingElseDeep: true
                    }
                }
            },
            deviceCtx: {
                deviceVersion: '13.0.0.0',
                provisioning: { ltm: { name: 'ltm', level: 'nominal' }, gtm: { name: 'gtm', level: 'minimum' } }
            },
            expectedCtx: {
                data: {
                    virtualServers: {},
                    httpProfiles: {
                        '/tenant1/application1/http1': {},
                        '/tenant2/application1/http2': {
                            tenantTag: 'tenant2',
                            applicationTag: 'application1'
                        },
                        http3: {},
                        http4: {}
                    },
                    clientSslProfiles: {
                        '/tenant1/application1/client1': {},
                        '/tenant2/application1/client2': {
                            tenantTag: 'tenant2',
                            applicationTag: 'application1'
                        },
                        client3: {},
                        client4: {}
                    },
                    srvWideIps: {
                        '/Common/www.srvish.com': {
                            srvProp: true,
                            tenantTag: 'Common'
                        }
                    },
                    someDeepProperty: {
                        someDeepProperty: {
                            someDeepProperty: {
                                '/tenant1/application1/property1': {},
                                '/tenant2/application1/property2': {
                                    tenantTag: 'tenant2',
                                    applicationTag: 'application1'
                                },
                                property3: {},
                                property4: {}
                            }
                        }
                    },
                    somethingElseDeep: {
                        somethingElseDeep: {
                            '/tenant1/application1/property1': {},
                            '/tenant2/application1/property2': {},
                            property3: {},
                            property4: {}
                        }
                    },
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should set tenant and application tags to tmstats',
            dataCtx: {
                data: {
                    tmstats: {
                        virtualServerStat: {
                            '/tenant1/application1/vs1': {},
                            '/tenant2/application1/vs2': {},
                            vs3: {},
                            vs4: {}
                        }
                    },
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tenantTag: '`T`',
                    applicationTag: '`A`'
                }
            },
            expectedCtx: {
                data: {
                    tmstats: {
                        virtualServerStat: {
                            '/tenant1/application1/vs1': {
                                tenantTag: 'tenant1',
                                applicationTag: 'application1'
                            },
                            '/tenant2/application1/vs2': {
                                tenantTag: 'tenant2',
                                applicationTag: 'application1'
                            },
                            vs3: {},
                            vs4: {}
                        }
                    },
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add tags to event to locations',
            dataCtx: {
                data: {
                    parent: {
                        nested: {
                            someProp: true
                        }
                    },
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tag1: 'tag1 value',
                    tag2: {
                        tag2Prop: ''
                    }
                },
                locations: {
                    parent: {
                        nested: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    parent: {
                        nested: {
                            someProp: true,
                            tag1: 'tag1 value',
                            tag2: {
                                tag2Prop: ''
                            }
                        }
                    },
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add application and tenant tags to event when no locations (example 1)',
            dataCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    virtual_name: '/Common/app.app/app_vs',
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tenantTag: '`T`',
                    applicationTag: '`A`'
                }
            },
            expectedCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    virtual_name: '/Common/app.app/app_vs',
                    tenantTag: 'Common',
                    applicationTag: 'app.app',
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add application and tenant tags to event when no locations (example 2)',
            dataCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    virtual_name: '/Common/app.app/app_vs',
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    parentTag: {
                        nestedTag: {
                            tenantTag: '`T`',
                            applicationTag: '`A`'
                        }
                    }
                }
            },
            expectedCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    virtual_name: '/Common/app.app/app_vs',
                    parentTag: {
                        nestedTag: {
                            tenantTag: 'Common',
                            applicationTag: 'app.app'
                        }
                    },
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add application and tenant tags to event to locations',
            dataCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    parent: {
                        virtual_name: '/Common/app.app/app_vs'
                    },
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tenantTag: '`T`',
                    applicationTag: '`A`'
                },
                locations: {
                    parent: {
                        virtual_name: true
                    }
                }
            },
            expectedCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    parent: {
                        virtual_name: '/Common/app.app/app_vs',
                        tenantTag: 'Common',
                        applicationTag: 'app.app'
                    },
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should not add application and tenant tags to event when there are no matches',
            dataCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    virtual_name: 'app_vs',
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tenantTag: '`T`',
                    applicationTag: '`A`'
                }
            },
            expectedCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    virtual_name: 'app_vs',
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add tags to events when data is flat',
            dataCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    virtual_name: 'app_vs',
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tag: 'tagValue',
                    anotherTag: 'anotherTagValue'
                }
            },
            expectedCtx: {
                data: {
                    event_source: 'request_logging',
                    event_timestamp: '2019-01-01:01:01.000Z',
                    hostname: 'hostname',
                    virtual_name: 'app_vs',
                    tag: 'tagValue',
                    anotherTag: 'anotherTagValue',
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add tags to events when data is flat and type is unknown',
            dataCtx: {
                data: {
                    a: 'b',
                    c: 'd',
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tag: 'tagValue',
                    anotherTag: 'anotherTagValue'
                }
            },
            expectedCtx: {
                data: {
                    a: 'b',
                    c: 'd',
                    tag: 'tagValue',
                    anotherTag: 'anotherTagValue',
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add tags to events when data is flat and type is unknown',
            dataCtx: {
                data: {
                    a: 'b',
                    c: 'd',
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tag: 'tagValue',
                    anotherTag: 'anotherTagValue'
                }
            },
            expectedCtx: {
                data: {
                    a: 'b',
                    c: 'd',
                    tag: 'tagValue',
                    anotherTag: 'anotherTagValue',
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should add tags to events when data is flat and type is unknown (one more time)',
            dataCtx: {
                data: {
                    a: 'b',
                    c: 'd',
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            },
            actionCtx: {
                enable: true,
                setTag: {
                    tag: 'tagValue',
                    anotherTag: 'anotherTagValue'
                },
                locations: {
                    '.*': true
                }
            },
            expectedCtx: {
                data: {
                    a: 'b',
                    c: 'd',
                    tag: 'tagValue',
                    anotherTag: 'anotherTagValue',
                    telemetryEventCategory: EVENT_TYPES.DEFAULT
                },
                type: EVENT_TYPES.DEFAULT
            }
        }
    ]
};
