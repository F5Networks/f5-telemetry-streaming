/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    getPollersConfig: [
        {
            name: 'should fail when no System or System Poller name matches',
            declaration: {
                class: 'Telemetry'
            },
            sysOrPollerName: 'testSystem',
            errorRegExp: /System or System Poller with name 'testSystem' doesn't exist/
        },
        {
            name: 'should fail when System has no configured System Poller',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System'
                }
            },
            sysOrPollerName: 'testSystem',
            errorRegExp: /System with name 'testSystem' has no System Poller configured/
        },
        {
            name: 'should fail when System with such name doesn\'t exist',
            declaration: {
                class: 'Telemetry'
            },
            sysOrPollerName: 'testSystem',
            funcOptions: {
                pollerName: 'testPoller'
            },
            errorRegExp: /System with name 'testSystem' doesn't exist/
        },
        {
            name: 'should fail when System Poller with such name doesn\'t exist',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System'
                }
            },
            sysOrPollerName: 'testSystem',
            funcOptions: {
                pollerName: 'testPoller'
            },
            errorRegExp: /System Poller with name 'testPoller' doesn't exist/
        },
        {
            name: 'should fail when System Poller is not the one associated with the System',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: 'testPollerLinked'
                },
                testPoller: {
                    class: 'Telemetry_System_Poller'
                },
                testPollerLinked: {
                    class: 'Telemetry_System_Poller'
                }
            },
            sysOrPollerName: 'testSystem',
            funcOptions: {
                pollerName: 'testPoller'
            },
            errorRegExp: /System Poller with name 'testPoller' doesn't exist in System 'testSystem'/
        },
        {
            name: 'should return empty array when no pollers enabled (inline, by system name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        enable: false
                    }
                }
            },
            sysOrPollerName: 'testSystem',
            expectedConfig: []
        },
        {
            name: 'should return empty array when no pollers enabled (poller ref, by system name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: 'systemPoller'
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            sysOrPollerName: 'testSystem',
            expectedConfig: []
        },
        {
            name: 'should return empty array when no pollers enabled (poller ref, by system and poller name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: 'systemPoller'
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            sysOrPollerName: 'testSystem',
            funcOptions: {
                pollerName: 'systemPoller'
            },
            expectedConfig: []
        },
        {
            name: 'should return empty array when no pollers enabled (inline array + ref, by system name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        {
                            enable: false
                        },
                        {
                            enable: false
                        },
                        'systemPoller'
                    ]
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            sysOrPollerName: 'testSystem',
            expectedConfig: []
        },
        {
            name: 'should return empty array when no pollers enabled (by poller name)',
            declaration: {
                class: 'Telemetry',
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            sysOrPollerName: 'systemPoller',
            expectedConfig: []
        },
        {
            name: 'should return array with pollers configs (inline, by system name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        enable: true
                    }
                }
            },
            sysOrPollerName: 'testSystem',
            expectedConfig: [{
                name: 'testSystem::SystemPoller_1'
            }]
        },
        {
            name: 'should return array with pollers configs (ref, by system name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: 'systemPoller'
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: true
                }
            },
            sysOrPollerName: 'testSystem',
            expectedConfig: [{
                name: 'testSystem::systemPoller'
            }]
        },
        {
            name: 'should return array with pollers configs (ref, by system and poller name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: 'systemPoller'
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: true
                }
            },
            sysOrPollerName: 'systemPoller',
            expectedConfig: [{
                name: 'testSystem::systemPoller'
            }]
        },
        {
            name: 'should return array with pollers configs (by poller name - system not associated)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System'
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: true
                }
            },
            sysOrPollerName: 'systemPoller',
            expectedConfig: [{
                name: 'systemPoller_System::systemPoller'
            }]
        },
        {
            name: 'should return array with pollers configs (inline array + ref, by system name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        {
                            enable: true
                        },
                        {
                            enable: true
                        },
                        'systemPoller'
                    ]
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: true
                }
            },
            sysOrPollerName: 'testSystem',
            expectedConfig: [
                {
                    name: 'testSystem::systemPoller'
                },
                {
                    name: 'testSystem::SystemPoller_1'
                },
                {
                    name: 'testSystem::SystemPoller_2'
                }
            ]
        },
        {
            name: 'should return array with only the enabled pollers configs (inline array + ref, by system name)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    // uuid1
                    allowSelfSignedCert: false,
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: [
                        'My_System_Poller',
                        'The_Other_System_Poller',
                        {
                            // uuid4
                            enable: false,
                            interval: 250
                        },
                        {
                            // uuid5
                            enable: true,
                            interval: 500
                        }
                    ]
                },
                My_System_Poller: {
                    // uuid2
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 321
                },
                The_Other_System_Poller: {
                    // uuid3
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 123
                }
            },
            sysOrPollerName: 'My_System',
            expectedConfig: [
                { name: 'My_System::My_System_Poller' },
                { name: 'My_System::The_Other_System_Poller' },
                { name: 'My_System::SystemPoller_2' }
            ]
        },
        {
            name: 'should return array with pollers configs (by poller name - no system)',
            declaration: {
                class: 'Telemetry',
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: true
                }
            },
            sysOrPollerName: 'systemPoller',
            expectedConfig: [{
                name: 'systemPoller_System::systemPoller'
            }]
        },
        {
            name: 'should return array with pollers configs (ref, by poller name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: 'testPoller'
                },
                testPoller: {
                    class: 'Telemetry_System_Poller'
                }
            },
            sysOrPollerName: 'testPoller',
            expectedConfig: [{
                name: 'testSystem::testPoller'
            }]
        },
        {
            name: 'should return array with enabled pollers configs when includeDisabled=false (inline, by system name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        enable: true
                    }
                }
            },
            sysOrPollerName: 'testSystem',
            funcOptions: {
                includeDisabled: false
            },
            expectedConfig: [{
                name: 'testSystem::SystemPoller_1'
            }]
        },
        {
            name: 'should return array with disabled pollers configs when includeDisabled=true (inline, by system name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        enable: false
                    }
                }
            },
            sysOrPollerName: 'testSystem',
            funcOptions: {
                includeDisabled: true
            },
            expectedConfig: [{
                name: 'testSystem::SystemPoller_1'
            }]
        },
        {
            name: 'should return array with disabled pollers configs when includeDisabled=true (ref, by system name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: 'systemPoller'
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            sysOrPollerName: 'testSystem',
            funcOptions: {
                includeDisabled: true
            },
            expectedConfig: [{
                name: 'testSystem::systemPoller'
            }]
        },
        {
            name: 'should return array with disabled pollers config when includeDisabled=true (ref, by system and poller name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: 'systemPoller'
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            sysOrPollerName: 'testSystem',
            funcOptions: {
                pollerName: 'systemPoller',
                includeDisabled: true
            },
            expectedConfig: [{
                name: 'testSystem::systemPoller'
            }]
        },
        {
            name: 'should return array with disabled pollers configs when includeDisabled=true (inline array + ref, by system name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        {
                            enable: true
                        },
                        {
                            enable: false
                        },
                        'systemPoller'
                    ]
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            sysOrPollerName: 'testSystem',
            funcOptions: {
                includeDisabled: true
            },
            expectedConfig: [
                {
                    name: 'testSystem::systemPoller'
                },
                {
                    name: 'testSystem::SystemPoller_1'
                },
                {
                    name: 'testSystem::SystemPoller_2'
                }
            ]
        },
        {
            name: 'should return array with disabled pollers configs when includeDisabled=true (by poller name, no system)',
            declaration: {
                class: 'Telemetry',
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            sysOrPollerName: 'systemPoller',
            funcOptions: {
                includeDisabled: true
            },
            expectedConfig: [{
                name: 'systemPoller_System::systemPoller'
            }]
        }
    ],
    findSystemOrPollerConfigs: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should locate by System Poller name',
            rawConfig: {
                class: 'Telemetry',
                My_System: {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: 'My_System_Poller'
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 300
                }
            },
            expected: [{
                class: 'Telemetry_System_Poller',
                enable: true,
                interval: 300,
                name: 'My_System_Poller',
                id: 'uuid2',
                namespace: 'f5telemetry_default',
                traceName: 'My_System::My_System_Poller',
                trace: false,
                connection: {
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    allowSelfSignedCert: false
                },
                dataOpts: {
                    actions: [],
                    noTMStats: true,
                    tags: undefined
                },
                credentials: {
                    username: undefined,
                    passphrase: undefined
                }
            }],
            sysOrPollerName: 'My_System_Poller'
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should locate by System name',
            rawConfig: {
                class: 'Telemetry',
                My_System: {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: 'My_System_Poller'
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 300
                }
            },
            expected: [{
                class: 'Telemetry_System_Poller',
                enable: true,
                interval: 300,
                name: 'My_System_Poller',
                id: 'uuid2',
                namespace: 'f5telemetry_default',
                traceName: 'My_System::My_System_Poller',
                trace: false,
                connection: {
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    allowSelfSignedCert: false
                },
                dataOpts: {
                    actions: [],
                    noTMStats: true,
                    tags: undefined
                },
                credentials: {
                    username: undefined,
                    passphrase: undefined
                }
            }],
            sysOrPollerName: 'My_System'
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should locate by both System and System Poller name',
            rawConfig: {
                class: 'Telemetry',
                My_System: {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: 'My_System_Poller'
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 300
                }
            },
            expected: [{
                class: 'Telemetry_System_Poller',
                enable: true,
                interval: 300,
                name: 'My_System_Poller',
                id: 'uuid2',
                namespace: 'f5telemetry_default',
                traceName: 'My_System::My_System_Poller',
                trace: false,
                connection: {
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    allowSelfSignedCert: false
                },
                dataOpts: {
                    actions: [],
                    noTMStats: true,
                    tags: undefined
                },
                credentials: {
                    username: undefined,
                    passphrase: undefined
                }
            }],
            sysOrPollerName: 'My_System',
            pollerName: 'My_System_Poller'
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should locate a specific SystemPoller within an associated System',
            rawConfig: {
                class: 'Telemetry',
                My_System: {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: [
                        'My_System_Poller',
                        'My_Desired_Poller'
                    ]
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 100
                },
                My_Desired_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 300
                }
            },
            expected: [{
                class: 'Telemetry_System_Poller',
                enable: true,
                interval: 300,
                name: 'My_Desired_Poller',
                id: 'uuid3',
                namespace: 'f5telemetry_default',
                traceName: 'My_System::My_Desired_Poller',
                trace: false,
                connection: {
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    allowSelfSignedCert: false
                },
                dataOpts: {
                    actions: [],
                    noTMStats: true,
                    tags: undefined
                },
                credentials: {
                    username: undefined,
                    passphrase: undefined
                }
            }],
            sysOrPollerName: 'My_System',
            pollerName: 'My_Desired_Poller'
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should locate a specific SystemPoller without specifying a System',
            rawConfig: {
                class: 'Telemetry',
                My_System: {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: [
                        'My_System_Poller',
                        'My_Desired_Poller'
                    ]
                },
                My_Desired_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 300
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 100
                }
            },
            expected: [{
                class: 'Telemetry_System_Poller',
                enable: true,
                interval: 300,
                name: 'My_Desired_Poller',
                id: 'uuid2',
                namespace: 'f5telemetry_default',
                traceName: 'My_System::My_Desired_Poller',
                trace: false,
                connection: {
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    allowSelfSignedCert: false
                },
                dataOpts: {
                    actions: [],
                    noTMStats: true,
                    tags: undefined
                },
                credentials: {
                    username: undefined,
                    passphrase: undefined
                }
            }],
            sysOrPollerName: 'My_Desired_Poller'
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should not locate a System Poller if not attached to the requested System',
            rawConfig: {
                class: 'Telemetry',
                My_System: {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: [
                        'My_System_Poller',
                        'My_Desired_Poller'
                    ]
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 100
                },
                My_Desired_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [],
                    enable: true,
                    interval: 300
                },
                My_Desired_System: {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: [
                        'My_System_Poller'
                    ]
                }
            },
            expected: 'System with name \'My_Desired_Poller\' doesn\'t exist',
            sysOrPollerName: 'My_Desired_Poller',
            pollerName: 'My_Desired_Poller'
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should error if a System or Poller is not found',
            rawConfig: {
                class: 'Telemetry',
                My_System: {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: [{
                        actions: [],
                        enable: true,
                        interval: 300
                    }]
                }
            },
            expected: 'System or System Poller with name \'My_Desired_System\' doesn\'t exist',
            sysOrPollerName: 'My_Desired_System'
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should locate a nested poller using the auto generated System Poller name',
            rawConfig: {
                class: 'Telemetry',
                My_System: {
                    allowSelfSignedCert: false,
                    class: 'Telemetry_System',
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: {
                        actions: [],
                        enable: true,
                        interval: 300
                    }
                }
            },
            expected: [{
                class: 'Telemetry_System_Poller',
                enable: true,
                interval: 300,
                name: 'SystemPoller_1',
                id: 'uuid2',
                namespace: 'f5telemetry_default',
                traceName: 'My_System::SystemPoller_1',
                trace: false,
                connection: {
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    allowSelfSignedCert: false
                },
                dataOpts: {
                    actions: [],
                    noTMStats: true,
                    tags: undefined
                },
                credentials: {
                    username: undefined,
                    passphrase: undefined
                }
            }],
            sysOrPollerName: 'SystemPoller_1'
        }
    ]
};
