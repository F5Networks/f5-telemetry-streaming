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
            name: 'should retrieve data with the minimal declaration',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_System_Poller']
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: ['My_System_Poller']
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/pullconsumer/My_Pull_Consumer'
            },
            expectedResponse: {
                code: 200,
                body: [
                    { mockedResponse: { pollerName: 'My_System_Poller' } }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should retrieve data when declaration associates Pull Consumer with multiple System Pollers',
            declaration: {
                class: 'Telemetry',
                My_Second_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_System_Poller', 'My_Second_System_Poller']
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: ['My_System_Poller', 'My_Second_System_Poller']
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/pullconsumer/My_Pull_Consumer'
            },
            expectedResponse: {
                code: 200,
                body: [
                    { mockedResponse: { pollerName: 'My_System_Poller' } },
                    { mockedResponse: { pollerName: 'My_Second_System_Poller' } }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should only get data from enabled System Pollers',
            declaration: {
                class: 'Telemetry',
                My_Second_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller',
                    enable: false
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_System_Poller', 'My_Second_System_Poller']
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: ['My_System_Poller', 'My_Second_System_Poller']
                }
            },
            returnCtx: (config, poller) => {
                if (config.parsed.Telemetry_System_Poller[poller].enable === true) {
                    return Promise.resolve([{ data: { poller } }]);
                }
                return Promise.resolve([[]]);
            },
            requestOpts: {
                uri: '/shared/telemetry/pullconsumer/My_Pull_Consumer'
            },
            expectedResponse: {
                code: 200,
                body: [
                    { poller: 'My_Second_System_Poller' }
                ]
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail if the requested Pull Consumer does not exist',
            declaration: {
                class: 'Telemetry',
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_System_Poller']
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/pullconsumer/My_Pull_Consumer'
            },
            expectedResponse: {
                code: 404,
                body: {
                    code: 404,
                    message: 'Error: Pull Consumer with name \'My_Pull_Consumer\' doesn\'t exist'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail if the requested Pull Consumer is disabled',
            declaration: {
                class: 'Telemetry',
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    enable: 'false',
                    systemPoller: ['My_System_Poller']
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_System_Poller']
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/pullconsumer/My_Pull_Consumer'
            },
            expectedResponse: {
                code: 404,
                body: {
                    code: 404,
                    message: 'Error: Pull Consumer with name \'My_Pull_Consumer\' is disabled'
                }
            }
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail if no Pull Consumer name is specified',
            declaration: {
                class: 'Telemetry',
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: ['My_System_Poller']
                },
                My_System_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_System_Poller']
                }
            },
            requestOpts: {
                uri: '/shared/telemetry/pullconsumer'
            },
            expectedResponse: {
                code: 400,
                body: {
                    code: 400,
                    message: 'Error: Bad Request. Name for Pull Consumer was not specified.'
                }
            }
        }
    ]
};
