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

const assert = require('../shared/assert');
const dummies = require('../shared/dummies');

const localhost = 'localhost';
let userID = 0;

function customEndpoints() {
    return {
        basePath: '/mgmt/tm/ltm',
        items: {
            virtualServers: {
                path: '/virtual'
            },
            pools: {
                path: '/pool'
            }
        }
    };
}

function system(options = {}) {
    const ret = dummies.declaration.system.minimal.decrypted();
    [
        'allowSelfSignedCert',
        'enable',
        'host',
        'port',
        'protocol',
        'trace'
    ].forEach((prop) => {
        if (typeof options[prop] !== 'undefined') {
            ret[prop] = options[prop];
        }
    });

    if (options.username === true || options.passphrase === true) {
        userID += 1;
        ret.username = `test_user_${userID}`;
    }
    if (options.passphrase === true) {
        ret.passphrase = {
            cipherText: `test_passphrase_${userID}`
        };
    }

    return ret;
}

function systemPoller(options = {}) {
    const ret = dummies.declaration.systemPoller.minimal.decrypted();
    [
        'actions',
        'chunkSize',
        'endpointList',
        'httpAgentOpts',
        'interval',
        'tag',
        'workers'
    ].forEach((prop) => {
        if (typeof options[prop] !== 'undefined') {
            ret[prop] = options[prop];
        }
    });

    ret.actions = [{
        includeData: {},
        locations: {
            system: {
                baseMac: true,
                configReady: true,
                hostname: true,
                licenseReady: true,
                machineId: true,
                provisionReady: true,
                version: true
            },
            tmstats: {
                cpuInfoStat: true
            },
            telemetryEventCategory: true,
            telemetryServiceInfo: true
        }
    }];

    if (options.endpoints) {
        ret.endpointList = customEndpoints();
        ret.actions[0].locations.virtualServers = true;
        ret.actions[0].locations.pools = true;
    }
    return ret;
}

function checkBigIpRequests(declaration, spies) {
    // ignore secrets encryption requests
    const secretsURI = '/mgmt/tm/ltm/auth/radius-server';
    const host = declaration.system.host || localhost;

    let allowSelfSignedCert = declaration.system.allowSelfSignedCert;
    if (typeof allowSelfSignedCert === 'undefined') {
        allowSelfSignedCert = false;
    }

    const props = {
        agent: Array.isArray(declaration.systemPoller.httpAgentOpts),
        strictSSL: !allowSelfSignedCert
    };

    let numbOfRequests = 0;
    const numOfChecks = Object.assign({}, props);
    Object.keys(numOfChecks).forEach((key) => {
        numOfChecks[key] = 0;
    });

    Object.entries(spies).forEach(([key, spy]) => {
        if (spy.callCount !== 0) {
            spy.args.forEach((args) => {
                if (args[0].uri.includes(host) && !args[0].uri.includes(secretsURI)) {
                    numbOfRequests += 1;
                    Object.entries(props).forEach(([name, expected]) => {
                        const actual = args[0][name];
                        if (name === 'agent') {
                            if (expected) {
                                assert.isDefined(actual);
                            } else {
                                assert.isUndefined(actual);
                            }
                        } else {
                            assert.deepStrictEqual(actual, expected, `request.${key} should use ${name} = ${expected}, got ${actual}`);
                        }
                        numOfChecks[name] += 1;
                    });
                }
            });
        }
    });

    if (numbOfRequests > 0) {
        Object.keys(numOfChecks).forEach((key) => {
            assert.isAbove(numOfChecks[key], 0);
        });
    }
}

function attachPoller(pollerConfig, systemConfig) {
    if (!systemConfig) {
        systemConfig = system();
    }

    systemConfig.systemPoller = 'systemPoller';

    return {
        systemPoller: pollerConfig,
        system: systemConfig
    };
}

function getDeclaration({
    enable = true,
    endpoints = false,
    interval = undefined,
    systemAuthConf = {},
    systemConf = {},
    trace = false
} = {}) {
    return attachPoller(
        systemPoller(
            Object.assign(
                {
                    enable,
                    endpoints,
                    interval,
                    trace
                }
            )
        ),
        system(
            Object.assign(
                {
                    enable,
                    trace
                },
                systemConf.value || {},
                systemAuthConf.value || {}
            )
        )
    );
}

function getStatsReport(custom = false, addTmstats = true) {
    if (custom) {
        return {
            deviceContext: {},
            stats: {
                virtualServers: {
                    items: [
                        {
                            destination: '/Common/172.16.100.17:53',
                            fullPath: '/Common/default',
                            kind: 'tm:ltm:virtual:virtualstate',
                            name: 'default',
                            partition: 'Common'
                        },
                        {
                            destination: '/Common/10.12.12.49:8443',
                            fullPath: '/Common/vs_with_pool',
                            kind: 'tm:ltm:virtual:virtualstate',
                            name: 'vs_with_pool',
                            partition: 'Common'
                        }
                    ]
                },
                pools: {
                    items: [
                        {
                            kind: 'tm:ltm:poll:poolstate',
                            name: 'default',
                            partition: 'Common',
                            fullPath: '/Common/default',
                            members: 10
                        },
                        {
                            kind: 'tm:ltm:pool:poolstate',
                            name: 'pool_with_members',
                            partition: 'Common',
                            fullPath: '/Common/pool_with_members',
                            members: 12
                        }
                    ]
                }
            }
        };
    }
    const ret = {
        deviceContext: {
            BASE_MAC_ADDR: '00:01:02:0A:0B:D0',
            HOSTNAME: 'bigip1',
            bashDisabled: !addTmstats,
            deviceVersion: '17.1.5',
            provisioning: {
                afm: {
                    level: 'none',
                    name: 'afm'
                },
                asm: {
                    level: 'nominal',
                    name: 'asm'
                },
                ltm: {
                    level: 'none',
                    name: 'ltm'
                }
            }
        },
        stats: {
            system: {
                baseMac: '00:01:02:0A:0B:D0',
                configReady: 'yes',
                hostname: 'bigip1',
                licenseReady: 'yes',
                machineId: '00000000-0000-0000-0000-000000000000',
                provisionReady: 'yes',
                version: '17.1.5',
                versionBuild: 'missing data'
            }
        }
    };
    if (addTmstats) {
        ret.stats.tmstats = {
            cpuInfoStat: [
                {
                    a: '1',
                    b: '2',
                    c: 'spam',
                    someKey: '/Tenant/app/test'
                },
                {
                    a: '3',
                    b: '4',
                    c: 'eggs',
                    someKey: '/Tenant/test'
                }
            ]
        };
    }
    return ret;
}

module.exports = {
    attachPoller,
    checkBigIpRequests,
    getDeclaration,
    getStatsReport,
    systemPoller,
    system
};
