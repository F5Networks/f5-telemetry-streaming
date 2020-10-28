/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

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
    getPollersConfig: [
        {
            name: 'should fail when no System or System Poller name specified',
            declaration: {
                class: 'Telemetry'
            },
            systemName: 'testSystem',
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
            systemName: 'testSystem',
            errorRegExp: /System with name 'testSystem' has no System Poller configured/
        },
        {
            name: 'should fail when System with such name doesn\'t exist',
            declaration: {
                class: 'Telemetry'
            },
            systemName: 'testSystem',
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
            systemName: 'testSystem',
            funcOptions: {
                pollerName: 'testPoller'
            },
            errorRegExp: /System Poller with name 'testPoller' doesn't exist/
        },
        {
            name: 'should return empty array when no pollers enabled (inlined)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        enable: false
                    }
                }
            },
            systemName: 'testSystem',
            expectedConfig: []
        },
        {
            name: 'should return empty array when no pollers enabled (ref)',
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
            systemName: 'testSystem',
            expectedConfig: []
        },
        {
            name: 'should return empty array when no pollers enabled (by name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System'
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            systemName: 'testSystem',
            funcOptions: {
                pollerName: 'systemPoller'
            },
            expectedConfig: []
        },
        {
            name: 'should return empty array when no pollers enabled (inlined array + ref)',
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
            systemName: 'testSystem',
            expectedConfig: []
        },
        {
            name: 'should return empty array when no pollers enabled (system poller name only)',
            declaration: {
                class: 'Telemetry',
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            systemName: 'systemPoller',
            expectedConfig: []
        },
        {
            name: 'should return array with pollers configs (inlined)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        enable: true
                    }
                }
            },
            systemName: 'testSystem',
            expectedConfig: [{
                name: 'testSystem::SystemPoller_1'
            }]
        },
        {
            name: 'should return array with pollers configs (ref)',
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
            systemName: 'testSystem',
            expectedConfig: [{
                name: 'testSystem::systemPoller'
            }]
        },
        {
            name: 'should return array with pollers configs (by name)',
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
            systemName: 'testSystem',
            funcOptions: {
                pollerName: 'systemPoller'
            },
            expectedConfig: [{
                name: 'testSystem::systemPoller'
            }]
        },
        {
            name: 'should return array with pollers configs (inlined array + ref)',
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
            systemName: 'testSystem',
            expectedConfig: [
                {
                    name: 'testSystem::SystemPoller_1'
                },
                {
                    name: 'testSystem::SystemPoller_2'
                },
                {
                    name: 'testSystem::systemPoller'
                }
            ]
        },
        {
            name: 'should return array with enabled pollers configs (inlined array + ref)',
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
            systemName: 'testSystem',
            expectedConfig: [{
                name: 'testSystem::SystemPoller_1'
            }]
        },
        {
            name: 'should return array with pollers configs (system poller name only)',
            declaration: {
                class: 'Telemetry',
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: true
                }
            },
            systemName: 'systemPoller',
            expectedConfig: [{
                name: 'systemPoller::systemPoller'
            }]
        },
        {
            name: 'should return array with disabled pollers configs (inlined)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        enable: false
                    }
                }
            },
            systemName: 'testSystem',
            funcOptions: {
                includeDisabled: true
            },
            expectedConfig: [{
                name: 'testSystem::SystemPoller_1'
            }]
        },
        {
            name: 'should return array with disabled pollers configs (ref)',
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
            systemName: 'testSystem',
            funcOptions: {
                includeDisabled: true
            },
            expectedConfig: [{
                name: 'testSystem::systemPoller'
            }]
        },
        {
            name: 'should return array with pollers configs (by name)',
            declaration: {
                class: 'Telemetry',
                testSystem: {
                    class: 'Telemetry_System'
                },
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            systemName: 'testSystem',
            funcOptions: {
                pollerName: 'systemPoller',
                includeDisabled: true
            },
            expectedConfig: [{
                name: 'testSystem::systemPoller'
            }]
        },
        {
            name: 'should return array with disabled pollers configs (inlined array + ref)',
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
            systemName: 'testSystem',
            funcOptions: {
                includeDisabled: true
            },
            expectedConfig: [
                {
                    name: 'testSystem::SystemPoller_1'
                },
                {
                    name: 'testSystem::SystemPoller_2'
                },
                {
                    name: 'testSystem::systemPoller'
                }
            ]
        },
        {
            name: 'should return array with disabled pollers configs (system poller name only)',
            declaration: {
                class: 'Telemetry',
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                }
            },
            systemName: 'systemPoller',
            funcOptions: {
                includeDisabled: true
            },
            expectedConfig: [{
                name: 'systemPoller::systemPoller'
            }]
        },
        {
            name: 'should return array with pollers configs (disable createPollerConfig mock)',
            declaration: {
                class: 'Telemetry',
                systemPoller: {
                    class: 'Telemetry_System_Poller',
                    username: 'admin',
                    passphrase: {
                        cipherText: 'passphrase' // just to check decryption
                    },
                    enable: false
                }
            },
            systemName: 'systemPoller',
            mockConfigCreation: false,
            funcOptions: {
                includeDisabled: true
            },
            expectedConfig: [{
                name: 'systemPoller::systemPoller',
                enable: false,
                trace: false,
                interval: 300,
                connection: {
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    allowSelfSignedCert: false
                },
                credentials: {
                    username: 'admin',
                    passphrase: 'passphrase'
                },
                dataOpts: {
                    actions: [
                        {
                            setTag: {
                                tenant: '`T`',
                                application: '`A`'
                            },
                            enable: true
                        }
                    ],
                    noTMStats: true,
                    tags: undefined
                },
                endpoints: undefined
            }]
        }
    ],
    getTraceValue: [
        // matrix (like boolean logic),
        // first array is system's trace value (ignore element at index 0)
        // first element of each next line (starting from line 1) is poller's trace value
        ['',        undefined,  'system',   true,       false], // eslint-disable-line no-multi-spaces
        [undefined, false,      'system',   true,       false], // eslint-disable-line no-multi-spaces
        ['poller',  'poller',   'poller',   'poller',   false], // eslint-disable-line no-multi-spaces
        [true,      true,       'system',   true,       false], // eslint-disable-line no-multi-spaces
        [false,     false,      false,      false,      false]  // eslint-disable-line no-multi-spaces
    ]
};
