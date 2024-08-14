/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Object's ID might be one of the following:
 * - obj.traceName
 * - obj.namespace::obj.name
 * - UUID
 *
 * NOTE: JSON Schema sets 'false' to iHealth Poller 'trace' if it is omitted
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
        // each pair - [system poller value, ihealth poller value]
        ['',         undefined,              'system',               true,                   false        ], // eslint-disable-line no-multi-spaces, array-bracket-spacing
        [undefined, [false, false],         ['system', false],      [true, false],          [false, false]], // eslint-disable-line no-multi-spaces
        ['poller',  ['poller', 'poller'],   ['poller', 'poller'],   ['poller', 'poller'],   [false, false]], // eslint-disable-line no-multi-spaces
        [true,      [true, true],           ['system', 'system'],   [true, true],           [false, false]], // eslint-disable-line no-multi-spaces
        [false,     [false, false],         [false, false],         [false, false],         [false, false]]  // eslint-disable-line no-multi-spaces, max-len
    ];
    const systemTraceValues = traceValueMatrix[0];
    for (let i = 1; i < traceValueMatrix.length; i += 1) {
        const pollerTrace = traceValueMatrix[i][0];
        for (let j = 1; j < systemTraceValues.length; j += 1) {
            const systemTrace = systemTraceValues[j];
            const expectedTrace = traceValueMatrix[i][j];
            module.exports.tests.push(Object.assign({
                name: `should preserve trace config - systemTrace = ${systemTrace}, pollerTrace = ${pollerTrace}, expectedTrace = ${expectedTrace}`
            }, generateDeclarationAndExpectedOutput({
                system: systemTrace,
                systemPoller: pollerTrace,
                ihealthPoller: pollerTrace,
                expectedSystemPoller: expectedTrace[0],
                expectedIHealthPoller: expectedTrace[1]
            })));
        }
    }
}()); // invoke func immediately

function generateDeclarationAndExpectedOutput(trace) {
    return {
        declaration: {
            class: 'Telemetry',
            My_Poller_1: {
                class: 'Telemetry_System_Poller',
                host: 'host1',
                trace: trace.systemPoller
            },
            My_Poller_2: {
                class: 'Telemetry_System_Poller',
                host: 'host2',
                trace: trace.systemPoller
            },
            My_System: {
                class: 'Telemetry_System',
                host: 'host3',
                enable: true,
                trace: trace.system,
                iHealthPoller: {
                    trace: trace.ihealthPoller,
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
                        workers: 6,
                        chunkSize: 60,
                        trace: trace.systemPoller
                    }
                ]
            },
            My_System_2: {
                class: 'Telemetry_System',
                host: 'host4',
                iHealthPoller: 'My_iHealth_Poller',
                trace: trace.system
            },
            My_iHealth_Poller: {
                class: 'Telemetry_iHealth_Poller',
                trace: trace.ihealthPoller,
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
                        noTMStats: true
                    },
                    enable: true,
                    id: 'f5telemetry_default::My_Poller_2::My_Poller_2',
                    interval: 300,
                    workers: 5,
                    chunkSize: 30,
                    name: 'My_Poller_2',
                    namespace: 'f5telemetry_default',
                    systemName: 'My_Poller_2',
                    trace: {
                        enable: !!trace.systemPoller,
                        encoding: 'utf8',
                        maxRecords: 10,
                        path: typeof trace.systemPoller === 'string' ? trace.systemPoller : '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_Poller_2::My_Poller_2',
                        type: 'output'
                    },
                    traceName: 'f5telemetry_default::My_Poller_2::My_Poller_2'
                },
                {
                    class: 'Telemetry_System_Poller',
                    connection: {
                        allowSelfSignedCert: false,
                        host: 'host3',
                        port: 8100,
                        protocol: 'http'
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
                        noTMStats: true
                    },
                    enable: true,
                    id: 'f5telemetry_default::My_System::My_Poller_1',
                    interval: 300,
                    workers: 5,
                    chunkSize: 30,
                    name: 'My_Poller_1',
                    namespace: 'f5telemetry_default',
                    systemName: 'My_System',
                    trace: {
                        enable: !!trace.expectedSystemPoller,
                        encoding: 'utf8',
                        maxRecords: 10,
                        path: typeof trace.expectedSystemPoller === 'string' ? trace.expectedSystemPoller : '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::My_Poller_1',
                        type: 'output'
                    },
                    traceName: 'f5telemetry_default::My_System::My_Poller_1'
                },
                {
                    class: 'Telemetry_System_Poller',
                    connection: {
                        allowSelfSignedCert: false,
                        host: 'host3',
                        port: 8100,
                        protocol: 'http'
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
                        noTMStats: true
                    },
                    enable: true,
                    id: 'f5telemetry_default::My_System::SystemPoller_1',
                    interval: 60,
                    workers: 6,
                    chunkSize: 60,
                    name: 'SystemPoller_1',
                    namespace: 'f5telemetry_default',
                    systemName: 'My_System',
                    trace: {
                        enable: !!trace.expectedSystemPoller,
                        encoding: 'utf8',
                        maxRecords: 10,
                        path: typeof trace.expectedSystemPoller === 'string' ? trace.expectedSystemPoller : '/var/tmp/telemetry/Telemetry_System_Poller.f5telemetry_default::My_System::SystemPoller_1',
                        type: 'output'
                    },
                    traceName: 'f5telemetry_default::My_System::SystemPoller_1'
                },
                {
                    class: 'Telemetry_iHealth_Poller',
                    name: 'iHealthPoller_1',
                    enable: true,
                    trace: {
                        enable: !!trace.expectedIHealthPoller,
                        encoding: 'utf8',
                        maxRecords: 10,
                        path: typeof trace.expectedIHealthPoller === 'string' ? trace.expectedIHealthPoller : '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System::iHealthPoller_1',
                        type: 'output'
                    },
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
                        downloadFolder: '/shared/tmp',
                        interval: {
                            frequency: 'daily',
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    },
                    system: {
                        name: 'My_System',
                        connection: {
                            host: 'host3',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        }
                    },
                    id: 'f5telemetry_default::My_System::iHealthPoller_1',
                    namespace: 'f5telemetry_default',
                    traceName: 'f5telemetry_default::My_System::iHealthPoller_1'
                },
                {
                    class: 'Telemetry_iHealth_Poller',
                    name: 'My_iHealth_Poller',
                    enable: true,
                    trace: {
                        enable: !!trace.expectedIHealthPoller,
                        encoding: 'utf8',
                        maxRecords: 10,
                        path: typeof trace.expectedIHealthPoller === 'string' ? trace.expectedIHealthPoller : '/var/tmp/telemetry/Telemetry_iHealth_Poller.f5telemetry_default::My_System_2::My_iHealth_Poller',
                        type: 'output'
                    },
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
                        downloadFolder: '/shared/tmp',
                        interval: {
                            frequency: 'daily',
                            timeWindow: {
                                start: '23:15',
                                end: '02:15'
                            }
                        }
                    },
                    system: {
                        name: 'My_System_2',
                        connection: {
                            host: 'host4',
                            port: 8100,
                            protocol: 'http',
                            allowSelfSignedCert: false
                        }
                    },
                    id: 'f5telemetry_default::My_System_2::My_iHealth_Poller',
                    namespace: 'f5telemetry_default',
                    traceName: 'f5telemetry_default::My_System_2::My_iHealth_Poller'
                }
            ]
        }
    };
}
