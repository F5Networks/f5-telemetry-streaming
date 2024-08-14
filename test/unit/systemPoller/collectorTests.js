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

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const BigIpApiMock = require('../shared/bigipAPIMock');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const Collector = sourceCode('src/lib/systemPoller/collector');
const Loader = sourceCode('src/lib/systemPoller/loader');
const properties = sourceCode('src/lib/systemPoller/properties');

moduleCache.remember();

describe('System Poller / Colletor', () => {
    const defaultUser = 'admin';
    const localhost = 'localhost';
    let bigip;
    let coreStub;
    let loader;
    let logger;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = stubs.default.coreStub({ logger: true });
        logger = coreStub.logger.logger;

        bigip = new BigIpApiMock(localhost);
        bigip.addPasswordlessUser(defaultUser);

        loader = new Loader(localhost, {
            logger: logger.getChild('loader'),
            workers: 5
        });
        await loader.auth();
    });

    afterEach(() => {
        testUtil.nockCleanup();
        sinon.restore();
    });

    describe('constructor', () => {
        it('invalid args', async () => {
            assert.throws(() => new Collector(), /loader should be an instance of Loader/);
            assert.throws(() => new Collector(loader), /properties should be an object/);
            assert.throws(() => new Collector(loader, {}), /properties should be a non-empty collection/);
            assert.throws(() => new Collector(loader, { test: 'value' }), /logger should be an instance of Logger/);
            assert.throws(() => new Collector(
                loader,
                { test: 'value' },
                { logger, isCustom: 10 }
            ), /isCustom should be a boolean/);
            assert.throws(() => new Collector(
                loader,
                { test: 'value' },
                { logger, isCustom: true, workers: null }
            ), /workers should be a safe number/);
            assert.throws(() => new Collector(
                loader,
                { test: 'value' },
                { logger, isCustom: true, workers: 0 }
            ), /workers should be >= 1, got 0/);
            assert.throws(() => new Collector(
                loader,
                { test: 'value' },
                { logger, isCustom: true, workers: Number.MAX_SAFE_INTEGER + 1 }
            ), /workers should be a safe number/);
        });

        it('should use default values', async () => {
            const collector = new Collector(
                loader,
                { test: 'value' },
                { logger }
            );
            assert.isFalse(collector.isCustom);
            assert.deepStrictEqual(collector.workers, 1);
        });

        it('should use custom values', async () => {
            const collector = new Collector(
                loader,
                { test: 'value' },
                { logger, isCustom: true, workers: 10 }
            );
            assert.isTrue(collector.isCustom);
            assert.deepStrictEqual(collector.workers, 10);
        });
    });

    it('should collect stats', async () => {
        const path = '/mgmt/tm/ltm/virtual';
        bigip.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path,
            replyTimes: 1,
            response: () => [200, {
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
            }]
        });

        const endpoints = {
            virtualServers: {
                enable: true,
                name: 'virtualServers',
                path
            }
        };

        const customProps = properties.custom(endpoints, []);
        loader.setEndpoints(customProps.endpoints);

        const collector = new Collector(
            loader,
            customProps.properties,
            { logger, isCustom: true, workers: 10 }
        );

        const results = await collector.collect();
        assert.isFalse(collector.isActive());
        assert.isEmpty(results.errors, 'should have no errors reported');
        assert.deepStrictEqual(results.stats, {
            virtualServers: {
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
            }
        });
    });

    it('should create empty object when no data', async () => {
        const path = '/mgmt/tm/ltm/virtual';
        bigip.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path,
            replyTimes: 1,
            response: () => [200, {
                kind: 'tm:ltm:virtual:virtualcollectionstate',
                selfLink: 'https://localhost/mgmt/tm/ltm/virtual?$select=name%2Ckind%2Cpartition%2CfullPath%2Cdestination&ver=13.1.1'
            }]
        });

        const endpoints = {
            virtualServers: {
                enable: true,
                name: 'virtualServers',
                path
            }
        };

        const customProps = properties.custom(endpoints, []);
        loader.setEndpoints(customProps.endpoints);

        const collector = new Collector(
            loader,
            customProps.properties,
            { logger, isCustom: true, workers: 10 }
        );

        const results = await collector.collect();
        assert.isFalse(collector.isActive());
        assert.isEmpty(results.errors, 'should have no errors reported');
        assert.deepStrictEqual(results.stats, {
            virtualServers: {
                items: []
            }
        });
    });

    it('should create empty object on HTTP error', async () => {
        const path = '/mgmt/tm/ltm/virtual';
        bigip.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path,
            replyTimes: 3,
            response: () => [404, 'Not found']
        });

        const endpoints = {
            virtualServers: {
                enable: true,
                name: 'virtualServers',
                path
            }
        };

        const customProps = properties.custom(endpoints, []);
        loader.setEndpoints(customProps.endpoints);

        const collector = new Collector(
            loader,
            customProps.properties,
            { logger, isCustom: true, workers: 10 }
        );

        const results = await collector.collect();
        assert.isFalse(collector.isActive());
        assert.isNotEmpty(results.errors, 'should have error reported');
        assert.deepStrictEqual(results.stats, {
            virtualServers: {}
        });
    });

    it('should stop non-active instance', async () => {
        const path = '/mgmt/tm/ltm/virtual';
        const endpoints = {
            virtualServers: {
                enable: true,
                name: 'virtualServers',
                path
            }
        };

        const customProps = properties.custom(endpoints, []);
        loader.setEndpoints(customProps.endpoints);

        const collector = new Collector(
            loader,
            customProps.properties,
            { logger, isCustom: true, workers: 10 }
        );

        assert.isFalse(collector.isActive());
        await collector.stop();
        assert.isFalse(collector.isActive());
    });

    it('should stop active instance', async () => {
        const path = '/mgmt/tm/ltm/virtual';
        const endpoints = {
            virtualServers: {
                enable: true,
                name: 'virtualServers',
                path
            }
        };
        bigip.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path,
            replyTimes: 1,
            response: async () => {
                await testUtil.sleep(500);
                return [200, {
                    kind: 'tm:ltm:virtual:virtualcollectionstate',
                    selfLink: 'https://localhost/mgmt/tm/ltm/virtual?$select=name%2Ckind%2Cpartition%2CfullPath%2Cdestination&ver=13.1.1',
                    items: [
                        {
                            kind: 'tm:ltm:virtual:virtualstate',
                            name: 'default',
                            partition: 'Common',
                            fullPath: '/Common/default',
                            destination: '/Common/172.16.100.17:53'
                        }
                    ]
                }];
            }
        });

        const customProps = properties.custom(endpoints, []);
        loader.setEndpoints(customProps.endpoints);

        const collector = new Collector(
            loader,
            customProps.properties,
            { logger, isCustom: true, workers: 10 }
        );

        assert.isFalse(collector.isActive());

        const resultsPromise = collector.collect();
        assert.isTrue(collector.isActive());

        await testUtil.sleep(100);
        assert.isTrue(collector.isActive());
        await collector.stop();

        assert.isFalse(collector.isActive());

        const results = await resultsPromise;
        assert.isEmpty(results.errors, 'should have no errors reported');
        assert.deepStrictEqual(results.stats, {
            virtualServers: {
                items: [
                    {
                        kind: 'tm:ltm:virtual:virtualstate',
                        name: 'default',
                        partition: 'Common',
                        fullPath: '/Common/default',
                        destination: '/Common/172.16.100.17:53'
                    }
                ]
            }
        });
    });

    it('should stop active instance and ignore pending properties/tasks', async () => {
        const endpoints = {
            virtualServers: {
                enable: true,
                name: 'virtualServers',
                path: '/mgmt/tm/ltm/virtual1'
            },
            virtualServers2: {
                enable: true,
                name: 'virtualServers',
                path: '/mgmt/tm/ltm/virtual2'
            }
        };
        let requestID;

        bigip.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path: endpoints.virtualServers.path,
            replyTimes: 1,
            response: async () => {
                requestID = '1';
                await testUtil.sleep(500);
                return [200, {
                    kind: 'tm:ltm:virtual:virtualcollectionstate',
                    selfLink: 'https://localhost/mgmt/tm/ltm/virtual?$select=name%2Ckind%2Cpartition%2CfullPath%2Cdestination&ver=13.1.1',
                    items: [
                        {
                            kind: 'tm:ltm:virtual:virtualstate',
                            name: 'default1',
                            partition: 'Common',
                            fullPath: '/Common/default1',
                            destination: '/Common/172.16.100.17:53'
                        }
                    ]
                }];
            }
        });
        bigip.mockArbitraryEndpoint({
            authCheck: true,
            method: 'GET',
            path: endpoints.virtualServers2.path,
            replyTimes: 1,
            response: async () => {
                requestID = '2';
                await testUtil.sleep(500);
                return [200, {
                    kind: 'tm:ltm:virtual:virtualcollectionstate',
                    selfLink: 'https://localhost/mgmt/tm/ltm/virtual?$select=name%2Ckind%2Cpartition%2CfullPath%2Cdestination&ver=13.1.1',
                    items: [
                        {
                            kind: 'tm:ltm:virtual:virtualstate',
                            name: 'default2',
                            partition: 'Common',
                            fullPath: '/Common/default2',
                            destination: '/Common/172.16.100.17:53'
                        }
                    ]
                }];
            }
        });

        const customProps = properties.custom(endpoints, []);
        loader.setEndpoints(customProps.endpoints);

        const collector = new Collector(
            loader,
            customProps.properties,
            { logger, isCustom: true, workers: 1 }
        );

        assert.isFalse(collector.isActive());

        const resultsPromise = collector.collect();
        assert.isTrue(collector.isActive());

        await testUtil.sleep(100);
        assert.isTrue(collector.isActive());

        // multiple stops should be OK
        await assert.isFulfilled(Promise.all([
            collector.stop(),
            collector.stop(),
            collector.stop()
        ]));

        assert.isFalse(collector.isActive());

        const results = await resultsPromise;
        assert.isEmpty(results.errors, 'should have no errors reported');
        assert.deepStrictEqual(results.stats, {
            virtualServers: {
                items: [
                    {
                        kind: 'tm:ltm:virtual:virtualstate',
                        name: `default${requestID}`,
                        partition: 'Common',
                        fullPath: `/Common/default${requestID}`,
                        destination: '/Common/172.16.100.17:53'
                    }
                ]
            }
        });
    });
});
