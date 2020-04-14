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
    processClientRequest: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when \'.safeProcess()\' failed (just basic Error thrown)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System'
                }
            },
            returnCtx: () => { throw new Error('expected error'); },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System/My_System_Poller'
            },
            expectedResponse: {
                code: 500,
                body: {
                    code: 500,
                    message: 'Error: systemPoller:safeProcess unhandled exception: Error: expected error'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when \'.safeProcess()\' failed (Promise rejection)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System'
                }
            },
            returnCtx: () => Promise.reject(new Error('expected error')),
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System/My_System_Poller'
            },
            expectedResponse: {
                code: 500,
                body: {
                    code: 500,
                    message: 'Error: expected error'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when no System or System Poller name specified',
            requestOpts: {
                uri: '/shared/telemetry/systempoller'
            },
            expectedResponse: {
                code: 400,
                body: {
                    code: 400,
                    message: 'Error: Bad Request. Name for System or System Poller was not specified.'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when System with such name doesn\'t exist (uri = system)',
            declaration: {
                class: 'Telemetry'
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/systemName'
            },
            expectedResponse: {
                code: 404,
                body: {
                    code: 404,
                    message: 'Error: System or System Poller with name \'systemName\' doesn\'t exist'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when System has no configured System Poller (uri = system)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System'
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System'
            },
            expectedResponse: {
                code: 404,
                body: {
                    code: 404,
                    message: 'Error: System with name \'My_System\' has no System Poller configured'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when System with such name doesn\'t exist (uri = system/poller)',
            declaration: {
                class: 'Telemetry'
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/systemName/systemPoller'
            },
            expectedResponse: {
                code: 404,
                body: {
                    code: 404,
                    message: 'Error: System with name \'systemName\' doesn\'t exist'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail when System Poller with such name doesn\'t exist (uri = system/poller)',
            declaration: {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System'
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System/systemPoller'
            },
            expectedResponse: {
                code: 404,
                body: {
                    code: 404,
                    message: 'Error: System Poller with name \'systemPoller\' doesn\'t exist'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return expected data on 200 (System Poller)(uri = poller)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_System_Poller'
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System_Poller'
            },
            expectedResponse: {
                code: 200,
                body: [
                    {
                        poller: 'My_System_Poller::My_System_Poller'
                    }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return expected data on 200 (System + inline System Poller)(uri = system)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 100
                    }
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System'
            },
            expectedResponse: {
                code: 200,
                body: [
                    {
                        poller: 'My_System::SystemPoller_1'
                    }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return expected data on 200 (System + System Poller reference override)(uri = system/poller)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 100
                    }
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System/My_System_Poller'
            },
            expectedResponse: {
                code: 200,
                body: [
                    {
                        poller: 'My_System::My_System_Poller'
                    }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return expected data on 200 (System + System Poller reference)(uri = system/poller)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_System_Poller'
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System/My_System_Poller'
            },
            expectedResponse: {
                code: 200,
                body: [
                    {
                        poller: 'My_System::My_System_Poller'
                    }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return expected data on 200 (System + System Poller reference)(uri = system)',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: 'My_System_Poller'
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System'
            },
            expectedResponse: {
                code: 200,
                body: [
                    {
                        poller: 'My_System::My_System_Poller'
                    }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return expected data on 200 (System + array of System Poller references)(uri = system)',
            declaration: {
                class: 'Telemetry',
                SystemPoller1: {
                    class: 'Telemetry_System_Poller'
                },
                SystemPoller2: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        'SystemPoller1',
                        'SystemPoller2'
                    ]
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System'
            },
            expectedResponse: {
                code: 200,
                body: [
                    {
                        poller: 'My_System::SystemPoller1'
                    },
                    {
                        poller: 'My_System::SystemPoller2'
                    }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return expected data on 200 (System + array of inlined System Pollers)(uri = system)',
            declaration: {
                class: 'Telemetry',
                SystemPoller1: {
                    class: 'Telemetry_System_Poller'
                },
                SystemPoller_2: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: [
                        {
                            interval: 100
                        },
                        'SystemPoller_2',
                        {
                            interval: 200
                        }
                    ]
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System'
            },
            expectedResponse: {
                code: 200,
                body: [
                    {
                        poller: 'My_System::SystemPoller_1'
                    },
                    {
                        poller: 'My_System::SystemPoller_2'
                    },
                    {
                        poller: 'My_System::SystemPoller_3'
                    }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should return expected data on 200 even if System or System Poller disabled (System + array of inlined System Pollers)(uri = system)',
            declaration: {
                class: 'Telemetry',
                SystemPoller1: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                },
                SystemPoller2: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                },
                My_System: {
                    class: 'Telemetry_System',
                    enable: false,
                    systemPoller: [
                        {
                            interval: 100,
                            enable: false
                        },
                        'SystemPoller2',
                        {
                            interval: 200,
                            enable: false
                        }
                    ]
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/systempoller/My_System'
            },
            expectedResponse: {
                code: 200,
                body: [
                    {
                        poller: 'My_System::SystemPoller_1'
                    },
                    {
                        poller: 'My_System::SystemPoller2'
                    },
                    {
                        poller: 'My_System::SystemPoller_2'
                    }
                ]
            }
        }
    ],
    fetchPollerData: [
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should get enabled System Poller when no options provided',
            config: {
                parsed: {
                    Telemetry_System: {
                        My_System: {
                            allowSelfSignedCert: false,
                            class: 'Telemetry_System',
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPoller: 'My_System_Poller'
                        }
                    },
                    Telemetry_System_Poller: {
                        My_System_Poller: {
                            actions: [],
                            allowSelfSignedCert: false,
                            class: 'Telemetry_System_Poller',
                            enable: true,
                            host: 'localhost',
                            interval: 300,
                            port: 8100,
                            protocol: 'http'
                        }
                    }
                }
            },
            objName: 'My_System_Poller',
            expectedResponse: [
                { data: { poller: 'My_System_Poller::My_System_Poller' } }
            ]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should even get disabled System Poller when includeDisabled=true',
            config: {
                parsed: {
                    Telemetry_System: {
                        My_System: {
                            allowSelfSignedCert: false,
                            class: 'Telemetry_System',
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPoller: 'My_System_Poller'
                        }
                    },
                    Telemetry_System_Poller: {
                        My_System_Poller: {
                            actions: [],
                            allowSelfSignedCert: false,
                            class: 'Telemetry_System_Poller',
                            enable: false,
                            host: 'localhost',
                            interval: 300,
                            port: 8100,
                            protocol: 'http'
                        }
                    }
                }
            },
            objName: 'My_System_Poller',
            options: {
                includeDisabled: true
            },
            expectedResponse: [
                { data: { poller: 'My_System_Poller::My_System_Poller' } }
            ]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'it should get System Poller, even when includeDisabled=false',
            config: {
                parsed: {
                    Telemetry_System: {
                        My_System: {
                            allowSelfSignedCert: false,
                            class: 'Telemetry_System',
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPoller: 'My_System_Poller'
                        }
                    },
                    Telemetry_System_Poller: {
                        My_System_Poller: {
                            actions: [],
                            allowSelfSignedCert: false,
                            class: 'Telemetry_System_Poller',
                            enable: true,
                            host: 'localhost',
                            interval: 300,
                            port: 8100,
                            protocol: 'http'
                        }
                    }
                }
            },
            objName: 'My_System_Poller',
            options: {
                includeDisabled: false
            },
            expectedResponse: [
                { data: { poller: 'My_System_Poller::My_System_Poller' } }
            ]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should allow passing subObjName through options',
            config: {
                parsed: {
                    Telemetry_System: {
                        My_System: {
                            allowSelfSignedCert: false,
                            class: 'Telemetry_System',
                            enable: true,
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http',
                            systemPoller: 'My_System_Poller'
                        }
                    },
                    Telemetry_System_Poller: {
                        My_System_Poller: {
                            actions: [],
                            allowSelfSignedCert: false,
                            class: 'Telemetry_System_Poller',
                            enable: true,
                            host: 'localhost',
                            interval: 300,
                            port: 8100,
                            protocol: 'http'
                        }
                    }
                }
            },
            objName: 'My_System',
            options: {
                subObjName: 'My_System_Poller'
            },
            expectedResponse: [
                { data: { poller: 'My_System::My_System_Poller' } }
            ]
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
