/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EVENT_TYPES = require('../../../src/lib/constants').EVENT_TYPES;

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
    processActions: {
        dataTagging: [
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should not execute action when no tags (empty object)',
                actions: [
                    {
                        enable: true,
                        setTag: {}
                    }
                ],
                dataCtx: {
                    data: {
                        foo: 'bar'
                    },
                    type: EVENT_TYPES.SYSTEM_POLLER
                },
                expectedCtx: {
                    data: {
                        foo: 'bar'
                    },
                    type: 'systemInfo'
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should execute action when no ifAllMatch',
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tag: 'tag'
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tag: 'tag'
                        },
                        ifAllMatch: {
                            foo: 'bar'
                        }
                    }
                ],
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
                actions: [
                    {
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
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tag: 'tag'
                        },
                        ifAllMatch: {
                            foo: 'foo'
                        }
                    }
                ],
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
                actions: [
                    {
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
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tag1: 'String tag',
                            tag2: {
                                prop1: 'Object',
                                prop2: 'tag'
                            }
                        }
                    }
                ],
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
                actions: [
                    {
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
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            newTag: {}
                        },
                        locations: {
                            virtualServers: {
                                virtual2: true
                            }
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tag1: 'tag1 value',
                            tag2: {
                                tag2Prop: ''
                            }
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tenant: '`T`',
                            application: '`A`'
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            facility: 'facilityValue'
                        },
                        locations: {
                            system: true
                        }
                    }
                ],
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
                actions: [
                    {
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
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            ip: 'z.z.z.z'
                        },
                        locations: {
                            virtualServers: {
                                '.*': true
                            }
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tenantTag: '`T`',
                            applicationTag: '`A`'
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            parentTag: {
                                nestedTag: {
                                    tenantTag: '`T`',
                                    applicationTag: '`A`'
                                }
                            }
                        }
                    }
                ],
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
                actions: [
                    {
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
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tenantTag: '`T`',
                            applicationTag: '`A`'
                        }
                    }
                ],
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
                actions: [
                    {
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
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tenantTag: '`T`',
                            applicationTag: '`A`'
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            parentTag: {
                                nestedTag: {
                                    tenantTag: '`T`',
                                    applicationTag: '`A`'
                                }
                            }
                        }
                    }
                ],
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
                actions: [
                    {
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
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tenantTag: '`T`',
                            applicationTag: '`A`'
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tag: 'tagValue',
                            anotherTag: 'anotherTagValue'
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tag: 'tagValue',
                            anotherTag: 'anotherTagValue'
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tag: 'tagValue',
                            anotherTag: 'anotherTagValue'
                        }
                    }
                ],
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
                actions: [
                    {
                        enable: true,
                        setTag: {
                            tag: 'tagValue',
                            anotherTag: 'anotherTagValue'
                        },
                        locations: {
                            '.*': true
                        }
                    }
                ],
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
        ],
        dataFiltering: [
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should execute action when no ifAllMatch',
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            foo: 'bar'
                        }
                    }
                ],
                dataCtx: {
                    data: {
                        foo: 'bar',
                        tag: 'tag'
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
                name: 'should execute action when ifAllMatch is valid',
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            tag: 'tag'
                        },
                        ifAllMatch: {
                            foo: 'bar'
                        }
                    }
                ],
                dataCtx: {
                    data: {
                        foo: 'bar',
                        tag: 'tag'
                    }
                },
                expectedCtx: {
                    data: {
                        tag: 'tag'
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should execute action when ifAnyMatch is valid',
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
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
                    }
                ],
                dataCtx: {
                    data: {
                        foo: 'baz',
                        tag: 'tag'
                    }
                },
                expectedCtx: {
                    data: {
                        tag: 'tag'
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should not execute action when ifAllMatch is invalid',
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            tag: 'tag'
                        },
                        ifAllMatch: {
                            foo: 'foo'
                        }
                    }
                ],
                dataCtx: {
                    data: {
                        foo: 'bar',
                        tag: 'tag'
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
                name: 'should not execute action when ifAnyMatch is invalid',
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            tag: 'tag'
                        },
                        ifAnyMatch: [
                            {
                                foo: 'foo',
                                tag: 'untagged'
                            },
                            {
                                foo: 'foo',
                                tag: 'notag'
                            }
                        ]
                    }
                ],
                dataCtx: {
                    data: {
                        foo: 'bar',
                        tag: 'tag'
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
                name: 'should return only included keys (example 1)',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'hostname'
                        },
                        virtualServers: {
                            vs1: {
                                ip: 'x.x.x.x'
                            },
                            vs2: {
                                ip: 'z.z.z.z'
                            }
                        },
                        pool: {
                            pool1: {}
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            virtualServers: true
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        virtualServers: {
                            vs1: {
                                ip: 'x.x.x.x'
                            },
                            vs2: {
                                ip: 'z.z.z.z'
                            }
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should return only included keys (example 2)',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'hostname',
                            version: 'version'
                        },
                        virtualServers: {
                            vs1: {
                                ip: 'x.x.x.x',
                                mask: 'g.g.g.g'
                            },
                            vs2: {
                                ip: 'z.z.z.z',
                                mask: 'h.h.h.h'
                            }
                        },
                        pool: {
                            pool1: {}
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            '.*': {
                                hostname: true,
                                '.*': {
                                    ip: true
                                }
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            hostname: 'hostname'
                        },
                        virtualServers: {
                            vs1: {
                                ip: 'x.x.x.x'
                            },
                            vs2: {
                                ip: 'z.z.z.z'
                            }
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should also be able to filter telemetry metadata',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'hostname'
                        },
                        pool: {
                            pool1: {}
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            telemetryServiceInfo: true,
                            telemetryEventCategory: true
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            hostname: 'hostname'
                        },
                        pool: {
                            pool1: {}
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should not include metadata keys if not in includeData',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'hostname'
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            system: true
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            hostname: 'hostname'
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should only include properties matching a regex',
                dataCtx: {
                    data: {
                        system: {
                            diskStorage: {
                                '/usr': {
                                    '1024-blocks': 5186648,
                                    Capacity: '84%',
                                    Capacity_Float: 0.84,
                                    name: '/usr'
                                },
                                '/var': {
                                    '1024-blocks': 5186648,
                                    Capacity: '24%',
                                    Capacity_Float: 0.24,
                                    name: '/var'
                                },
                                '/log': {
                                    '1024-blocks': 5186648,
                                    Capacity: '32%',
                                    Capacity_Float: 0.32,
                                    name: '/log'
                                }
                            }
                        },
                        virtualServers: {
                            '/Common/Shared/telemetry_local': {
                                name: '/Common/Shared/telemetry_local'
                            },
                            '/Common/Shared/telemetry_remote': {
                                name: '/Common/Shared/telemetry_remote'
                            },
                            '/Common/Shared/remote_vs': {
                                name: '/Common/Shared/remote_vs'
                            },
                            '/Common/Shared/local_vs': {
                                name: '/Common/Shared/local_vs'
                            }
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            system: {
                                diskStorage: {
                                    '/usr': true
                                }
                            },
                            virtualServers: {
                                remote: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            diskStorage: {
                                '/usr': {
                                    '1024-blocks': 5186648,
                                    Capacity: '84%',
                                    Capacity_Float: 0.84,
                                    name: '/usr'
                                }
                            }
                        },
                        virtualServers: {
                            '/Common/Shared/telemetry_remote': {
                                name: '/Common/Shared/telemetry_remote'
                            },
                            '/Common/Shared/remote_vs': {
                                name: '/Common/Shared/remote_vs'
                            }
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should be able to use regexes as keys',
                dataCtx: {
                    data: {
                        system: {},
                        virtualServers: {},
                        pools: {
                            '/Common/Shared/telemetry_pool1': {
                                name: '/Common/Shared/telemetry_pool1',
                                enabledState: 'enabled'
                            },
                            '/Common/Shared/telemetry_pool2': {
                                name: '/Common/Shared/telemetry_pool2',
                                enabledState: 'enabled'
                            },
                            '/Common/Shared/node_pool': {
                                name: '/Common/Shared/node_pool',
                                enabledState: 'enabled'
                            }
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            pools: {
                                '^/Common/Shared/telemetry_pool': {
                                    enabledState: true
                                }
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {},
                        virtualServers: {},
                        pools: {
                            '/Common/Shared/telemetry_pool1': {
                                name: '/Common/Shared/telemetry_pool1'
                            },
                            '/Common/Shared/telemetry_pool2': {
                                name: '/Common/Shared/telemetry_pool2'
                            },
                            '/Common/Shared/node_pool': {
                                name: '/Common/Shared/node_pool',
                                enabledState: 'enabled'
                            }
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should exclude multiple properties matching a regex (example 1)',
                dataCtx: {
                    data: {
                        system: {},
                        virtualServers: {
                            '/Common/Shared/telemetry_local': {
                                name: '/Common/Shared/telemetry_local'
                            },
                            '/Common/Shared/telemetry_remote': {
                                name: '/Common/Shared/telemetry_remote'
                            },
                            '/Common/Shared/remote_vs': {
                                name: '/Common/Shared/remote_vs'
                            },
                            '/Common/Shared/local_vs': {
                                name: '/Common/Shared/local_vs'
                            }
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            virtualServers: {
                                vs$: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {},
                        virtualServers: {
                            '/Common/Shared/telemetry_local': {
                                name: '/Common/Shared/telemetry_local'
                            },
                            '/Common/Shared/telemetry_remote': {
                                name: '/Common/Shared/telemetry_remote'
                            }
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should include multiple properties matching a regex (example 2)',
                dataCtx: {
                    data: {
                        system: {},
                        virtualServers: {
                            '/Common/Shared/telemetry_local': {
                                name: '/Common/Shared/telemetry_local'
                            },
                            '/Common/Shared/telemetry_remote': {
                                name: '/Common/Shared/telemetry_remote'
                            },
                            '/Common/Shared/remote_vs': {
                                name: '/Common/Shared/remote_vs'
                            },
                            '/Common/Shared/local_vs': {
                                name: '/Common/Shared/local_vs'
                            }
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            virtualServers: {
                                vs$: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        virtualServers: {
                            '/Common/Shared/remote_vs': {
                                name: '/Common/Shared/remote_vs'
                            },
                            '/Common/Shared/local_vs': {
                                name: '/Common/Shared/local_vs'
                            }
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should exclude whole properties',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: '14.1.0.6',
                            ltmConfigTime: '2019-11-01T18:07:14.000Z'
                        },
                        virtualServers: {
                            '/Common/Shared/telemetry_local': {
                                name: '/Common/Shared/telemetry_local'
                            },
                            '/Common/Shared/telemetry_remote': {
                                name: '/Common/Shared/telemetry_remote'
                            }
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            system: true
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        virtualServers: {
                            '/Common/Shared/telemetry_local': {
                                name: '/Common/Shared/telemetry_local'
                            },
                            '/Common/Shared/telemetry_remote': {
                                name: '/Common/Shared/telemetry_remote'
                            }
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should exclude properties matching a regex',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: '14.1.0.6',
                            ltmConfigTime: '2019-11-01T18:07:14.000Z',
                            diskStorage: {
                                '/usr': {
                                    '1024-blocks': 5186648,
                                    Capacity: '84%',
                                    Capacity_Float: 0.84,
                                    name: '/usr'
                                },
                                '/var': {
                                    '1024-blocks': 5186648,
                                    Capacity: '24%',
                                    Capacity_Float: 0.24,
                                    name: '/var'
                                },
                                '/log': {
                                    '1024-blocks': 5186648,
                                    Capacity: '32%',
                                    Capacity_Float: 0.32,
                                    name: '/log'
                                }
                            }
                        },
                        virtualServers: {
                            '/Common/Shared/telemetry_local': {
                                name: '/Common/Shared/telemetry_local'
                            },
                            '/Common/Shared/telemetry_remote': {
                                name: '/Common/Shared/telemetry_remote'
                            },
                            '/Common/Shared/remote_vs': {
                                name: '/Common/Shared/remote_vs'
                            },
                            '/Common/Shared/local_vs': {
                                name: '/Common/Shared/local_vs'
                            }
                        },
                        pools: {
                            '/Common/Shared/telemetry_pool1': {
                                name: '/Common/Shared/telemetry_pool1',
                                enabledState: 'enabled'
                            },
                            '/Common/Shared/telemetry_pool2': {
                                name: '/Common/Shared/telemetry_pool2',
                                enabledState: 'enabled'
                            },
                            '/Common/Shared/node_pool': {
                                name: '/Common/Shared/node_pool',
                                enabledState: 'enabled'
                            }
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            system: {
                                diskStorage: {
                                    '/usr': true,
                                    '/var': {
                                        '1024-blocks': true
                                    }
                                }
                            },
                            virtualServers: true,
                            pools: true
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: '14.1.0.6',
                            ltmConfigTime: '2019-11-01T18:07:14.000Z',
                            diskStorage: {
                                '/var': {
                                    Capacity: '24%',
                                    Capacity_Float: 0.24,
                                    name: '/var'
                                },
                                '/log': {
                                    '1024-blocks': 5186648,
                                    Capacity: '32%',
                                    Capacity_Float: 0.32,
                                    name: '/log'
                                }
                            }
                        },
                        telemetryServiceInfo: {
                            pollingInterval: 10,
                            cycleStart: '2019-11-01T22:35:30.080Z',
                            cycleEnd: '2019-11-01T22:35:30.541Z'
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should exclude existing properties only (example 1)',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1'
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            system: {
                                version: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1'
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should exclude existing properties only (example 2)',
                dataCtx: {
                    data: {
                        system: {}
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            system: {
                                version: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {}
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should include nothing in attempt to include non-existing data (example 1)',
                dataCtx: {
                    data: {
                        virtualServers: {
                            '/Common/Shared/telemetry_local': {
                                name: '/Common/Shared/telemetry_local'
                            }
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            system: true
                        }
                    }
                ],
                expectedCtx: {
                    data: {}
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should include nothing in attempt to include non-existing data (example 2)',
                dataCtx: {
                    data: {
                        system: {
                            version: 'x.x.x'
                        },
                        virtualServers: {
                            '/Common/Shared/telemetry_local': {
                                name: '/Common/Shared/telemetry_local'
                            }
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            '.*': {
                                hostname: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {}
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should include nothing in attempt to include non-existing data (example 3)',
                dataCtx: {
                    data: {
                        system: {
                            version: 'x.x.x',
                            build: 'z.z.z'
                        },
                        virtualServers: {
                            '/Common/Shared/telemetry_local': {
                                name: '/Common/Shared/telemetry_local'
                            }
                        },
                        telemetryEventCategory: 'systemInfo'
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            system: {
                                hostname: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {}
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should exclude properties from event',
                dataCtx: {
                    data: {
                        hostname: 'telemetry.bigip.com',
                        errdefs_msgno: '01490102:5:',
                        partition_name: 'Common',
                        session_id: 'ec7fd55d',
                        Access_Profile: '/Common/access_app',
                        Partition: 'Common',
                        Session_Id: 'ec7fd55d',
                        Access_Policy_Result: 'Logon_Deny',
                        tenant: 'Common',
                        application: '',
                        telemetryEventCategory: 'APM'
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            session_id: true,
                            Access_Policy_Result: true
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        hostname: 'telemetry.bigip.com',
                        errdefs_msgno: '01490102:5:',
                        partition_name: 'Common',
                        Access_Profile: '/Common/access_app',
                        Partition: 'Common',
                        Session_Id: 'ec7fd55d',
                        tenant: 'Common',
                        application: '',
                        telemetryEventCategory: 'APM'
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should include properties to event',
                dataCtx: {
                    data: {
                        hostname: 'telemetry.bigip.com',
                        errdefs_msgno: '01490102:5:',
                        partition_name: 'Common',
                        session_id: 'ec7fd55d',
                        Access_Profile: '/Common/access_app',
                        Partition: 'Common',
                        Session_Id: 'ec7fd55d',
                        Access_Policy_Result: 'Logon_Deny',
                        tenant: 'Common',
                        application: '',
                        telemetryEventCategory: 'APM'
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            session_id: true,
                            Access_Policy_Result: true
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        session_id: 'ec7fd55d',
                        Access_Policy_Result: 'Logon_Deny'
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should exclude \'version\' only',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            system: {
                                version: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            versionBuild: 'versionBuild'
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should exclude \'version\' and \'versionBuild\' only (example 1)',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            system: {
                                'version*': true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1'
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should exclude \'version\' and \'versionBuild\' only (example 2)',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            system: {
                                versio: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1'
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should include \'version\' and \'versionBuild\' only',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            system: {
                                version: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should include \'version\' only when regex provided',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            system: {
                                version$: true
                            }
                        }
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            version: 'version'
                        }
                    }
                }
            }
        ],
        JMESPath: [
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should apply JMESPath action to data',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        JMESPath: {},
                        expression: '{ message: @ }'
                    }
                ],
                expectedCtx: {
                    data: {
                        message: {
                            system: {
                                hostname: 'bigip1',
                                version: 'version',
                                versionBuild: 'versionBuild'
                            }
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should not apply disabled JMESPath action to data',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                },
                actions: [
                    {
                        enable: false,
                        JMESPath: {},
                        expression: '{ message: @ }'
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should not error on invalid JMESPath expression',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        JMESPath: {},
                        expression: true
                    }
                ],
                expectedCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                }
            },
            // TEST RELATED DATA STARTS HERE
            {
                name: 'should be able to handle multiple JMESPath expressions',
                dataCtx: {
                    data: {
                        system: {
                            hostname: 'bigip1',
                            version: 'version',
                            versionBuild: 'versionBuild'
                        }
                    }
                },
                actions: [
                    {
                        enable: true,
                        JMESPath: {},
                        expression: '{ message: @ }'
                    },
                    {
                        enable: true,
                        JMESPath: {},
                        expression: 'merge(@, {"host": message.system.hostname})'
                    }
                ],
                expectedCtx: {
                    data: {
                        host: 'bigip1',
                        message: {
                            system: {
                                hostname: 'bigip1',
                                version: 'version',
                                versionBuild: 'versionBuild'
                            }
                        }
                    }
                }
            }
        ],
        combinations: [
            {
                name: 'should handle multiple actions (setTags, includeData, excludeData, JMESPath)',
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
                actions: [
                    {
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
                    {
                        enable: true,
                        includeData: {},
                        locations: {
                            virtualServers: true,
                            tmstats: true,
                            system: true
                        }
                    },
                    {
                        enable: true,
                        excludeData: {},
                        locations: {
                            virtualServers: true
                        }
                    },
                    {
                        enable: true,
                        JMESPath: {},
                        expression: 'tmstats.{ cpu: cpuInfoStat }'
                    }
                ],
                expectedCtx: {
                    data: {
                        cpu: [
                            {
                                theTag: 'Tag to add'
                            },
                            {
                                theTag: 'Tag to add'
                            }
                        ]
                    }
                }
            }
        ]
    }
};
