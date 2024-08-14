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

const sinon = require('sinon');

const BigIpApiMock = require('../shared/bigipAPIMock');
const sourceCode = require('../shared/sourceCode');

const defaultProperties = sourceCode('src/lib/properties.json');

const defaultUser = 'admin';
const localhost = 'localhost';

class PollerMock {
    /**
     * @param {DeviceConfig} device
     */
    constructor(device) {
        this.httpMockOptions = { replyTimes: 999 };

        const host = (!device.connection.host || device.connection.host === localhost)
            ? localhost
            : device.connection.host;

        this.bigip = {
            inst: new BigIpApiMock(host, {
                port: device.connection.port,
                protocol: device.connection.protocol
            })
        };

        if (host === localhost) {
            this.bigip.inst.addPasswordlessUser(device.credentials.username || defaultUser);
        } else {
            this.bigip.auth = this.bigip.inst.mockAuth(
                device.credentials.username,
                device.credentials.password,
                this.httpMockOptions
            );
        }

        // default enpoints - device context
        this.bashContextStub = this.bigip.inst.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path: '/mgmt/tm/sys/db/systemauth.disablebash',
            response: () => {},
            ...this.httpMockOptions
        });

        // custom enpoints
        this.customPoolsStub = this.bigip.inst.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path: '/mgmt/tm/ltm/pool',
            response: () => {},
            ...this.httpMockOptions
        });

        // custom enpoints
        this.customVirtualsStub = this.bigip.inst.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path: '/mgmt/tm/ltm/virtual',
            response: () => {},
            ...this.httpMockOptions
        });

        // default enpoints - device stats
        this.sysReadyStub = this.bigip.inst.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path: '/mgmt/tm/sys/ready',
            response: () => {},
            ...this.httpMockOptions
        });

        // default enpoints - device stats
        this.tmstatsStub = this.bigip.inst.mockArbitraryEndpoint({
            authCheck: true,
            method: 'POST',
            path: '/mgmt/tm/util/bash',
            reqBody: (body) => body && body.utilCmdArgs && body.utilCmdArgs.indexOf('tmctl') !== -1,
            response: () => {},
            ...this.httpMockOptions
        });

        // default enpoints - device context
        this.bigip.inst.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path: '/mgmt/tm/sys/provision',
            response: () => [200, {
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
            }],
            ...this.httpMockOptions
        });

        // default enpoints - device context
        this.bigip.inst.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path: '/mgmt/shared/identified-devices/config/device-info',
            response: () => [200, {
                kind: 'shared:resolver:device-groups:deviceinfostate',
                selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info',
                baseMac: '00:01:2:a:B:d0',
                hostname: 'bigip1',
                version: '17.1.5',
                machineId: '00000000-0000-0000-0000-000000000000'
            }],
            ...this.httpMockOptions
        });

        // mock all by default
        this.getBashContextStub();
        this.getCustomVirtualsStub();
        this.getCustomPoolsStub();
        this.getSysReadyStub();
        this.getTmstatsStub();
    }

    /** Stub for 'is bash enabled' context stub */
    getBashContextStub() {
        const data = (enabled) => ({
            kind: 'tm:sys:db:dbstate',
            name: 'systemauth.disablebash',
            fullPath: 'systemauth.disablebash',
            generation: 1,
            selfLink: 'https://localhost/mgmt/tm/sys/db/systemauth.disablebash?ver=14.1.2',
            defaultValue: 'false',
            scfConfig: 'true',
            value: String(enabled),
            valueRange: 'false true'
        });
        const customStub = sinon.stub(
            { method() { return true; } },
            'method'
        );
        customStub.returns(true);

        this.bashContextStub.stub.callsFake(async () => {
            const ret = await customStub();
            if (typeof ret === 'boolean') {
                return [200, data(ret)];
            }
            return [500, 'bash context endpoint error'];
        });
        return customStub;
    }

    /** Stub for custom endpoints */
    getCustomPoolsStub() {
        const data = {
            kind: 'tm:ltm:pool:poolcollectionstate',
            selfLink: 'https://localhost/mgmt/tm/ltm/pool',
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
        };
        const customStub = sinon.stub(
            { method() { return true; } },
            'method'
        );
        customStub.returns(true);

        this.customPoolsStub.stub.callsFake(async () => (await customStub()
            ? [200, data]
            : [500, 'custom endpoint error']));
        return customStub;
    }

    /** Stub for custom endpoints */
    getCustomVirtualsStub() {
        const data = {
            kind: 'tm:ltm:virtual:virtualcollectionstate',
            selfLink: 'https://localhost/mgmt/tm/ltm/virtual?$select=name%2Ckind%2Cpartition%2CfullPath%2Cdestination&ver=13.1.1',
            items: [
                {
                    kind: 'tm:ltm:virtual:virtualstate',
                    name: 'default',
                    partition: 'Common',
                    fullPath: '/Common/default',
                    destination: '/Common/172.16.100.17:53'
                },
                {
                    kind: 'tm:ltm:virtual:virtualstate',
                    name: 'vs_with_pool',
                    partition: 'Common',
                    fullPath: '/Common/vs_with_pool',
                    destination: '/Common/10.12.12.49:8443'
                }
            ]
        };
        const customStub = sinon.stub(
            { method() { return true; } },
            'method'
        );
        customStub.returns(true);

        this.customVirtualsStub.stub.callsFake(async () => (await customStub()
            ? [200, data]
            : [500, 'custom endpoint error']));
        return customStub;
    }

    /** Stub for system.configReady endpoint */
    getSysReadyStub() {
        const data = {
            kind: 'tm:sys:ready:readystats',
            selfLink: 'https://localhost/mgmt/tm/sys/ready?ver=14.1.0',
            entries: {
                'https://localhost/mgmt/tm/sys/ready/0': {
                    nestedStats: {
                        entries: {
                            configReady: {
                                description: 'yes'
                            },
                            licenseReady: {
                                description: 'yes'
                            },
                            provisionReady: {
                                description: 'yes'
                            }
                        }
                    }
                }
            }
        };
        const customStub = sinon.stub(
            { method() { return true; } },
            'method'
        );
        customStub.returns(true);

        this.sysReadyStub.stub.callsFake(async () => (await customStub()
            ? [200, data]
            : [500, 'system.configready endpoint error']));
        return customStub;
    }

    /** Stub for TMStats endpoints */
    getTmstatsStub() {
        const TMCTL_CMD_REGEXP = /'tmctl\s+-c\s+(.*)'/;
        const data = (uri, requestBody) => {
            // requestBody is string
            let tmctlTable = requestBody.match(TMCTL_CMD_REGEXP);
            if (!tmctlTable) {
                throw new Error(`Unable to find tmctl table in request: ${JSON.stringify(requestBody)}`);
            }
            tmctlTable = tmctlTable[1];
            let tmctlStat;

            Object.keys(defaultProperties.stats).some((statKey) => {
                const stat = defaultProperties.stats[statKey];
                if (stat.structure && stat.structure.parentKey === 'tmstats' && stat.then
                    && stat.then.keyArgs.replaceStrings['\\$tmctlArgs'].indexOf(tmctlTable) !== -1) {
                    tmctlStat = stat.then;
                    return true;
                }
                return false;
            });
            if (!tmctlStat) {
                throw new Error(`Unable to find stat for ${tmctlTable}`);
            }
            const mapKey = tmctlStat.normalization[0].runFunctions[0].args.mapKey;
            if (Array.isArray(mapKey)) {
                return {
                    kind: 'tm:util:bash:runstate',
                    commandResult: [
                        ['a', 'b', 'c', mapKey[0], mapKey[1], mapKey[2]],
                        [1, 2, 'spam', '/Tenant/app/test', '192.168.0.1', 8080],
                        [3, 4, 'eggs', '/Tenant/test', '192.168.0.1', 8080]
                    ].join('\n')
                };
            }
            return {
                kind: 'tm:util:bash:runstate',
                commandResult: [
                    ['a', 'b', 'c', mapKey || 'someKey'],
                    [1, 2, 'spam', '/Tenant/app/test'],
                    [3, 4, 'eggs', '/Tenant/test']
                ].join('\n')
            };
        };
        const customStub = sinon.stub(
            { method() { return true; } },
            'method'
        );
        customStub.returns(true);

        this.tmstatsStub.stub.callsFake(async (uri, requestBody) => (await customStub()
            ? [200, data(uri, requestBody)]
            : [500, 'tmstats endpoint error']));
        return customStub;
    }

    paginaionSetup(pages = 2) {
        this.customPoolsStub.remove();
        this.customVirtualsStub.remove();

        const collectionPath = /\/mgmt\/tm\/ltm\/pool\?(?:%24|\$)top=(\d+)/;
        this.bigip.inst.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path: collectionPath,
            response: (uri) => {
                pages -= 1;

                const csize = parseInt(uri.match(collectionPath)[1], 10);
                let cskip = uri.match(/\?.*(?:%24|\$)skip=(\d+)/);
                cskip = (cskip ? parseInt(cskip[1], 10) : 0);

                const ret = [200, {
                    kind: 'tm:ltm:pool:poolcollectionstate',
                    nextLink: pages ? `https://localhost/mgmt/tm/ltm/pool?%24top=${csize}&%24skip=${cskip + csize}` : '',
                    items: []
                }];

                for (let i = cskip; i < (cskip + csize); i += 1) {
                    ret[1].items.push({
                        kind: 'tm:ltm:pool:poolstate',
                        name: `test_pool_${i}`,
                        partition: 'Common',
                        fullPath: `/Common/test_pool_${i}`,
                        selfLink: `https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_${i}?ver=14.1.0`,
                        slowRampTime: 10
                    });
                }
                return ret;
            },
            ...this.httpMockOptions
        });

        const statsPath = /\/mgmt\/tm\/ltm\/pool\/~Common~test_pool_(\d+)\/stats/;
        this.bigip.inst.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path: statsPath,
            response: (uri) => {
                const pid = uri.match(statsPath)[1];
                return [200, {
                    kind: 'tm:ltm:pool:poolstats',
                    selfLink: `https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_${pid}/stats?ver=14.1.0`,
                    entries: {
                        [`https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_${pid}/stats`]: {
                            nestedStats: {
                                kind: 'tm:ltm:pool:poolstats',
                                selfLink: `https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_${pid}/stats?ver=14.1.0`,
                                entries: {
                                    activeMemberCnt: {
                                        value: parseInt(pid, 10)
                                    }
                                }
                            }
                        }
                    }
                }];
            },
            ...this.httpMockOptions
        });
    }
}

module.exports = PollerMock;

/**
 * @typedef {object} DeviceConfig
 * @property {object} connection
 * @property {string} [connection.host]
 * @property {number} [connection.port]
 * @property {string} [connection.protocol]
 * @property {object} credentials
 * @property {string} [credentials.username]
 * @property {string} [credentials.password]
 */
