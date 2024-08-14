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

module.exports = {
    custom: [
        {
            name: 'should process various endpoints',
            dataActions: [],
            endpoints: {
                endpoint1: {
                    enable: true,
                    name: 'statName',
                    path: '/something/path'
                },
                endpoint2: {
                    enable: true,
                    name: 'endpoint2',
                    path: '/something/path2'
                },
                endpoint3: {
                    enable: true,
                    name: 'httpStat',
                    path: '/something/path2',
                    protocol: 'http'
                },
                endpoint4: {
                    enable: true,
                    name: 'snmpStat1',
                    path: 'stat.name',
                    protocol: 'snmp',
                    numericalEnums: false
                },
                endpoint5: {
                    enable: true,
                    name: 'snmpStat2',
                    path: 'stat2.name',
                    protocol: 'snmp',
                    numericalEnums: true
                },
                endpoint6: {
                    enable: true,
                    name: 'nonBigipStat',
                    path: '/something/path2/stats'
                },
                endpoint7: {
                    enable: true,
                    name: 'bigipStat',
                    path: '/mgmt/tm/something/path2/stats'
                },
                endpoint8: {
                    enable: true,
                    name: 'endpoint2',
                    path: '/something/path2'
                }
            },
            expected: {
                endpoints: [
                    {
                        enable: true,
                        name: 'endpoint1',
                        path: '/something/path'
                    },
                    {
                        enable: true,
                        name: 'endpoint2',
                        path: '/something/path2'
                    },
                    {
                        enable: true,
                        name: 'endpoint3',
                        path: '/something/path2',
                        protocol: 'http'
                    },
                    {
                        enable: true,
                        name: 'endpoint4',
                        path: '/mgmt/tm/util/bash',
                        protocol: 'snmp',
                        numericalEnums: false,
                        body: {
                            command: 'run',
                            utilCmdArgs: '-c "snmpwalk -L n -O QUs -c public localhost stat.name"'
                        }
                    },
                    {
                        enable: true,
                        name: 'endpoint5',
                        path: '/mgmt/tm/util/bash',
                        protocol: 'snmp',
                        numericalEnums: true,
                        body: {
                            command: 'run',
                            utilCmdArgs: '-c "snmpwalk -L n -O eQUs -c public localhost stat2.name"'
                        }
                    },
                    {
                        enable: true,
                        name: 'endpoint6',
                        path: '/something/path2/stats'
                    },
                    {
                        enable: true,
                        name: 'endpoint7',
                        path: '/mgmt/tm/something/path2/stats'
                    },
                    {
                        enable: true,
                        name: 'endpoint8',
                        path: '/something/path2'
                    }
                ],
                properties: {
                    statName: {
                        key: 'endpoint1',
                        normalization: {
                            propertyKey: 'statName',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } }
                            ]
                        }
                    },
                    // overriden!!!
                    endpoint2: {
                        key: 'endpoint8',
                        normalization: {
                            propertyKey: 'endpoint2',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } }
                            ]
                        }
                    },
                    httpStat: {
                        key: 'endpoint3',
                        normalization: {
                            propertyKey: 'httpStat',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } }
                            ]
                        }
                    },
                    snmpStat1: {
                        key: 'endpoint4',
                        normalization: {
                            propertyKey: 'snmpStat1',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } },
                                {
                                    runFunctions: [{ name: 'restructureSNMPEndpoint', args: {} }]
                                }
                            ]
                        }
                    },
                    snmpStat2: {
                        key: 'endpoint5',
                        normalization: {
                            propertyKey: 'snmpStat2',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } },
                                {
                                    runFunctions: [{ name: 'restructureSNMPEndpoint', args: {} }]
                                }
                            ]
                        }
                    },
                    nonBigipStat: {
                        key: 'endpoint6',
                        normalization: {
                            propertyKey: 'nonBigipStat',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } }
                            ]
                        }
                    },
                    bigipStat: {
                        key: 'endpoint7',
                        normalization: {
                            propertyKey: 'bigipStat',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } },
                                {
                                    renameKeys: {
                                        patterns: {
                                            'something/path2': { pattern: 'something/path2/(.*)', group: 1 }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },
        {
            name: 'should process various endpoints and apply filtering based on dataActions',
            dataActions: [
                {
                    excludeData: {},
                    enable: true,
                    locations: {
                        statName: true,
                        snmpStat2: true
                    }
                }
            ],
            endpoints: {
                endpoint1: {
                    enable: true,
                    name: 'statName',
                    path: '/something/path'
                },
                endpoint2: {
                    enable: true,
                    name: 'endpoint2',
                    path: '/something/path2'
                },
                endpoint3: {
                    enable: true,
                    name: 'httpStat',
                    path: '/something/path2',
                    protocol: 'http'
                },
                endpoint4: {
                    enable: true,
                    name: 'snmpStat1',
                    path: 'stat.name',
                    protocol: 'snmp',
                    numericalEnums: false
                },
                endpoint5: {
                    enable: true,
                    name: 'snmpStat2',
                    path: 'stat2.name',
                    protocol: 'snmp',
                    numericalEnums: true
                },
                endpoint6: {
                    enable: true,
                    name: 'nonBigipStat',
                    path: '/something/path2/stats'
                },
                endpoint7: {
                    enable: true,
                    name: 'bigipStat',
                    path: '/mgmt/tm/something/path2/stats'
                },
                endpoint8: {
                    enable: true,
                    name: 'endpoint2',
                    path: '/something/path2'
                }
            },
            expected: {
                endpoints: [
                    {
                        enable: true,
                        name: 'endpoint1',
                        path: '/something/path'
                    },
                    {
                        enable: true,
                        name: 'endpoint2',
                        path: '/something/path2'
                    },
                    {
                        enable: true,
                        name: 'endpoint3',
                        path: '/something/path2',
                        protocol: 'http'
                    },
                    {
                        enable: true,
                        name: 'endpoint4',
                        path: '/mgmt/tm/util/bash',
                        protocol: 'snmp',
                        numericalEnums: false,
                        body: {
                            command: 'run',
                            utilCmdArgs: '-c "snmpwalk -L n -O QUs -c public localhost stat.name"'
                        }
                    },
                    {
                        enable: true,
                        name: 'endpoint5',
                        path: '/mgmt/tm/util/bash',
                        protocol: 'snmp',
                        numericalEnums: true,
                        body: {
                            command: 'run',
                            utilCmdArgs: '-c "snmpwalk -L n -O eQUs -c public localhost stat2.name"'
                        }
                    },
                    {
                        enable: true,
                        name: 'endpoint6',
                        path: '/something/path2/stats'
                    },
                    {
                        enable: true,
                        name: 'endpoint7',
                        path: '/mgmt/tm/something/path2/stats'
                    },
                    {
                        enable: true,
                        name: 'endpoint8',
                        path: '/something/path2'
                    }
                ],
                properties: {
                    // overriden!!!
                    endpoint2: {
                        key: 'endpoint8',
                        normalization: {
                            propertyKey: 'endpoint2',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } }
                            ]
                        }
                    },
                    httpStat: {
                        key: 'endpoint3',
                        normalization: {
                            propertyKey: 'httpStat',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } }
                            ]
                        }
                    },
                    snmpStat1: {
                        key: 'endpoint4',
                        normalization: {
                            propertyKey: 'snmpStat1',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } },
                                {
                                    runFunctions: [{ name: 'restructureSNMPEndpoint', args: {} }]
                                }
                            ]
                        }
                    },
                    nonBigipStat: {
                        key: 'endpoint6',
                        normalization: {
                            propertyKey: 'nonBigipStat',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } }
                            ]
                        }
                    },
                    bigipStat: {
                        key: 'endpoint7',
                        normalization: {
                            propertyKey: 'bigipStat',
                            normalization: [
                                {
                                    renameKeys: {
                                        patterns: { '~': { replaceCharacter: '/', exactMatch: false } }
                                    }
                                },
                                { filterKeys: { exclude: ['kind', 'selfLink'] } },
                                {
                                    renameKeys: {
                                        patterns: {
                                            'something/path2': { pattern: 'something/path2/(.*)', group: 1 }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        }
    ]
};
