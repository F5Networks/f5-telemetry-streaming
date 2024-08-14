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

/* eslint-disable no-useless-escape */

/**
 * NOTE: DO NOT REMOVE 'kind' AND 'selfLink' PROPERTIES FROM RESPONSE's TOP LEVEL
 */

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
    name: 'Context data',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect context data',
            defaultContextData: true,
            endpoints: [
                {
                    endpoint: '/mgmt/tm/sys/provision',
                    replyTimes: 1,
                    response: {
                        kind: 'tm:sys:provision:provisioncollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/provision?ver=14.1.0',
                        items: [
                            {
                                name: 'afm',
                                level: 'none',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            },
                            {
                                name: 'ltm',
                                level: 'none',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            },
                            {
                                name: 'asm',
                                level: 'nominal',
                                // just to be sure that filterKeys works
                                cpuRatio: 0
                            }
                        ]
                    }
                },
                {
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    replyTimes: 1,
                    response: {
                        kind: 'shared:resolver:device-groups:deviceinfostate',
                        selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info',
                        baseMac: '00:01:2:a:B:d0',
                        hostname: 'bigip1',
                        version: '12.1.5',
                        machineId: '00000000-0000-0000-0000-000000000000'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/systemauth.disablebash',
                    replyTimes: 1,
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        name: 'systemauth.disablebash',
                        fullPath: 'systemauth.disablebash',
                        generation: 1,
                        selfLink: 'https://localhost/mgmt/tm/sys/db/systemauth.disablebash?ver=14.1.2',
                        defaultValue: 'false',
                        scfConfig: 'true',
                        value: 'false',
                        valueRange: 'false true'
                    }
                }
            ],
            expectedData: {
                HOSTNAME: 'bigip1',
                BASE_MAC_ADDR: '00:01:02:0A:0B:D0',
                bashDisabled: false,
                deviceVersion: '12.1.5',
                provisioning: {
                    afm: {
                        name: 'afm',
                        level: 'none'
                    },
                    ltm: {
                        name: 'ltm',
                        level: 'none'
                    },
                    asm: {
                        name: 'asm',
                        level: 'nominal'
                    }
                }
            }
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should not fail when no data (with items property)',
            endpoints: [
                {
                    endpoint: '/mgmt/tm/sys/provision',
                    replyTimes: 1,
                    response: {
                        kind: 'tm:sys:provision:provisioncollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/provision?ver=14.1.0',
                        items: []
                    }
                },
                {
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    replyTimes: 1,
                    response: {
                        kind: 'shared:resolver:device-groups:deviceinfostate',
                        selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/systemauth.disablebash',
                    replyTimes: 1,
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/systemauth.disablebash?ver=14.1.2'
                    }
                }
            ],
            expectedData: {
                HOSTNAME: 'missing data',
                BASE_MAC_ADDR: 'missing data',
                bashDisabled: false,
                deviceVersion: 'missing data',
                provisioning: {}
            }
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should not fail when no data (without items property)',
            endpoints: [
                {
                    endpoint: '/mgmt/tm/sys/provision',
                    replyTimes: 1,
                    response: {
                        kind: 'tm:sys:provision:provisioncollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/provision?ver=14.1.0'
                    }
                },
                {
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    replyTimes: 1,
                    response: {
                        kind: 'shared:resolver:device-groups:deviceinfostate',
                        selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
                    }
                },
                {
                    endpoint: '/mgmt/tm/sys/db/systemauth.disablebash',
                    replyTimes: 1,
                    response: {
                        kind: 'tm:sys:db:dbstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/db/systemauth.disablebash?ver=14.1.2'
                    }
                }
            ],
            expectedData: {
                HOSTNAME: 'missing data',
                BASE_MAC_ADDR: 'missing data',
                bashDisabled: false,
                deviceVersion: 'missing data',
                provisioning: {}
            }
        }
    ]
};
