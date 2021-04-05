/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
 * Object's ID might be one of the following:
 * - obj.traceName
 * - obj.namespace::obj.name
 * - UUID
 */

module.exports = {
    name: 'Trace value tests',
    tests: []
};

(function generateTraceValueTests() {
    const traceValueMatrix = [
        // matrix (like boolean logic),
        // first array is system's trace value (ignore element at index 0)
        // first element of each next line (starting from line 1) is poller's trace value
        ['',        undefined,  'system',   true,       false], // eslint-disable-line no-multi-spaces
        [undefined, false,      'system',   true,       false], // eslint-disable-line no-multi-spaces
        ['poller',  'poller',   'poller',   'poller',   false], // eslint-disable-line no-multi-spaces
        [true,      true,       'system',   true,       false], // eslint-disable-line no-multi-spaces
        [false,     false,      false,      false,      false]  // eslint-disable-line no-multi-spaces
    ];
    const systemTraceValues = traceValueMatrix[0];
    for (let i = 1; i < traceValueMatrix.length; i += 1) {
        const pollerTrace = traceValueMatrix[i][0];
        for (let j = 1; j < systemTraceValues.length; j += 1) {
            const systemTrace = systemTraceValues[j];
            const expectedTrace = traceValueMatrix[i][j];
            module.exports.tests.push(Object.assign({
                name: `should preserve trace config - systemTrace = ${systemTrace}, pollerTrace = ${pollerTrace}, expectedTrace = ${expectedTrace}`
            }, generateDeclarationAndExpectedOutput(systemTrace, pollerTrace, expectedTrace)));
        }
    }
}()); // invoke func immediately

function generateDeclarationAndExpectedOutput(systemTrace, pollerTrace, expectedTrace) {
    return {
        declaration: {
            class: 'Telemetry',
            My_Poller_1: {
                class: 'Telemetry_System_Poller',
                host: 'host1',
                trace: pollerTrace
            },
            My_Poller_2: {
                class: 'Telemetry_System_Poller',
                host: 'host2',
                trace: pollerTrace
            },
            My_System: {
                class: 'Telemetry_System',
                host: 'host3',
                enable: true,
                trace: systemTrace,
                iHealthPoller: {
                    trace: pollerTrace,
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    interval: {
                        timeWindow: {
                            start: '23:15',
                            end: '02:15'
                        }
                    }
                },
                systemPoller: [
                    'My_Poller_1',
                    {
                        interval: 60,
                        trace: pollerTrace
                    }
                ]
            },
            My_System_2: {
                class: 'Telemetry_System',
                host: 'host4',
                iHealthPoller: 'My_iHealth_Poller',
                trace: systemTrace
            },
            My_iHealth_Poller: {
                class: 'Telemetry_iHealth_Poller',
                trace: pollerTrace,
                username: 'test_user_2',
                passphrase: {
                    cipherText: 'test_passphrase_2'
                },
                interval: {
                    timeWindow: {
                        start: '23:15',
                        end: '02:15'
                    }
                }
            }
        },
        expected: {
            mappings: {},
            components: [
                {
                    class: 'Telemetry_System_Poller',
                    connection: {
                        allowSelfSignedCert: false,
                        host: 'host2',
                        port: 8100,
                        protocol: 'http'
                    },
                    credentials: {
                        passphrase: undefined,
                        username: undefined
                    },
                    dataOpts: {
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ],
                        noTMStats: true,
                        tags: undefined
                    },
                    enable: true,
                    id: 'My_Poller_2::My_Poller_2',
                    interval: 300,
                    name: 'My_Poller_2',
                    namespace: 'f5telemetry_default',
                    systemName: 'My_Poller_2',
                    trace: pollerTrace || false,
                    traceName: 'My_Poller_2::My_Poller_2'
                },
                {
                    class: 'Telemetry_System_Poller',
                    connection: {
                        allowSelfSignedCert: false,
                        host: 'host3',
                        port: 8100,
                        protocol: 'http'
                    },
                    credentials: {
                        passphrase: undefined,
                        username: undefined
                    },
                    dataOpts: {
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ],
                        noTMStats: true,
                        tags: undefined
                    },
                    enable: true,
                    id: 'My_System::My_Poller_1',
                    interval: 300,
                    name: 'My_Poller_1',
                    namespace: 'f5telemetry_default',
                    systemName: 'My_System',
                    trace: expectedTrace,
                    traceName: 'My_System::My_Poller_1'
                },
                {
                    class: 'Telemetry_System_Poller',
                    connection: {
                        allowSelfSignedCert: false,
                        host: 'host3',
                        port: 8100,
                        protocol: 'http'
                    },
                    credentials: {
                        passphrase: undefined,
                        username: undefined
                    },
                    dataOpts: {
                        actions: [
                            {
                                enable: true,
                                setTag: {
                                    application: '`A`',
                                    tenant: '`T`'
                                }
                            }
                        ],
                        noTMStats: true,
                        tags: undefined
                    },
                    enable: true,
                    id: 'My_System::SystemPoller_1',
                    interval: 60,
                    name: 'SystemPoller_1',
                    namespace: 'f5telemetry_default',
                    systemName: 'My_System',
                    trace: expectedTrace,
                    traceName: 'My_System::SystemPoller_1'
                },
                {
                    class: 'Telemetry_iHealth_Poller',
                    name: 'iHealthPoller_1',
                    enable: true,
                    trace: pollerTrace ? expectedTrace : false, // schema default is false
                    iHealth: {
                        name: 'iHealthPoller_1',
                        credentials: {
                            username: 'test_user_1',
                            passphrase: {
                                cipherText: '$M$test_passphrase_1',
                                class: 'Secret',
                                protected: 'SecureVault'
                            }
                        },
                        downloadFolder: undefined,
                        interval: {
                            day: undefined,
                            frequency: 'daily',
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        },
                        proxy: {
                            connection: {
                                host: undefined,
                                port: undefined,
                                protocol: undefined,
                                allowSelfSignedCert: undefined
                            },
                            credentials: {
                                username: undefined,
                                passphrase: undefined
                            }
                        }
                    },
                    system: {
                        host: 'host3',
                        name: 'My_System',
                        connection: {
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        }
                    },
                    id: 'My_System::iHealthPoller_1',
                    namespace: 'f5telemetry_default',
                    systemName: 'My_System',
                    traceName: 'My_System::iHealthPoller_1'
                },
                {
                    class: 'Telemetry_iHealth_Poller',
                    name: 'My_iHealth_Poller',
                    enable: true,
                    trace: pollerTrace ? expectedTrace : false, // schema default is false
                    iHealth: {
                        name: 'My_iHealth_Poller',
                        credentials: {
                            username: 'test_user_2',
                            passphrase: {
                                cipherText: '$M$test_passphrase_2',
                                class: 'Secret',
                                protected: 'SecureVault'
                            }
                        },
                        downloadFolder: undefined,
                        interval: {
                            day: undefined,
                            frequency: 'daily',
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        },
                        proxy: {
                            connection: {
                                host: undefined,
                                port: undefined,
                                protocol: undefined,
                                allowSelfSignedCert: undefined
                            },
                            credentials: {
                                username: undefined,
                                passphrase: undefined
                            }
                        }
                    },
                    system: {
                        host: 'host4',
                        name: 'My_System_2',
                        connection: {
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        },
                        credentials: {
                            username: undefined,
                            passphrase: undefined
                        }
                    },
                    id: 'My_System_2::My_iHealth_Poller',
                    namespace: 'f5telemetry_default',
                    systemName: 'My_System_2',
                    traceName: 'My_System_2::My_iHealth_Poller'
                }
            ]
        }
    };
}
