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
    getData: [
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
            consumerName: 'My_Pull_Consumer',
            expectedResponse: [{ mockedResponse: { pollerName: 'My_System_Poller', systemName: 'My_System' } }]
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
            consumerName: 'My_Pull_Consumer',
            expectedResponse: [
                { mockedResponse: { pollerName: 'My_Second_System_Poller', systemName: 'My_System' } },
                { mockedResponse: { pollerName: 'My_System_Poller', systemName: 'My_System' } }
            ]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should retrieve data when declaration associates Pull Consumer with multiple System Pollers and Systems',
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
                My_System_2: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_System_Poller', 'My_Second_System_Poller']
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: ['My_System_Poller', 'My_Second_System_Poller']
                }
            },
            consumerName: 'My_Pull_Consumer',
            expectedResponse: [
                { mockedResponse: { pollerName: 'My_Second_System_Poller', systemName: 'My_System' } },
                { mockedResponse: { pollerName: 'My_System_Poller', systemName: 'My_System' } },
                { mockedResponse: { pollerName: 'My_Second_System_Poller', systemName: 'My_System_2' } },
                { mockedResponse: { pollerName: 'My_System_Poller', systemName: 'My_System_2' } }
            ]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should retrieve data when declaration associates Pull Consumer with single System Poller',
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
                    systemPoller: 'My_System_Poller'
                }
            },
            consumerName: 'My_Pull_Consumer',
            expectedResponse: [
                { mockedResponse: { pollerName: 'My_System_Poller', systemName: 'My_System' } }
            ]
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
            consumerName: 'My_Pull_Consumer',
            expectedResponse: [
                { mockedResponse: { pollerName: 'My_Second_System_Poller', systemName: 'My_System' } }
            ]
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail if there is no configured pull consumer',
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
            consumerName: 'My_Pull_Consumer',
            errorRegExp: /No configured Pull Consumers found/
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
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: 'My_System_Poller'
                }
            },
            consumerName: 'Cannot_Find_Consumer',
            errorRegExp: /Pull Consumer with name 'Cannot_Find_Consumer' doesn't exist/
        },
        // TEST RELATED DATA STARTS HERE
        {
            name: 'should fail if the requested Pull Consumer is disabled',
            declaration: {
                class: 'Telemetry',
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    enable: false,
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
            consumerName: 'My_Pull_Consumer',
            errorRegExp: /Error: Pull Consumer with name 'My_Pull_Consumer' is disabled/
        }
    ]
};
