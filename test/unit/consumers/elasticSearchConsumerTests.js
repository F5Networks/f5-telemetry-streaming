/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const elastic = require('elasticsearch');
const sinon = require('sinon');

const elasticSearchIndex = require('../../../src/lib/consumers/ElasticSearch/index');
const util = require('../../../src/lib/util');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('ElasticSearch', () => {
    let passedPayload;
    let passedClientConfig;

    const defaultConsumerConfig = {
        host: 'localhost',
        port: '9200',
        path: '/path/to/post/data',
        index: 'ts_elasticsearch_consumer',
        dataType: 'f5telemetry',
        allowSelfSignedCert: true,
        protocol: 'http'
    };

    beforeEach(() => {
        sinon.stub(elastic, 'Client').callsFake((config) => {
            passedClientConfig = config;
            return {
                index: (payload) => {
                    passedPayload = payload;
                    return Promise.resolve();
                }
            };
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('process', () => {
        it('should configure ESClient with default options', () => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });

            elasticSearchIndex(context);
            assert.strictEqual(passedClientConfig.host.host, 'localhost');
            assert.strictEqual(passedClientConfig.host.path, '/path/to/post/data');
            assert.strictEqual(passedClientConfig.host.port, '9200');
            assert.strictEqual(passedClientConfig.host.protocol, 'http');
        });

        it('should configure ESClient with default options', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    host: 'localhost',
                    port: '9200',
                    path: '/path/to/post/data',
                    index: 'ts_elasticsearch_consumer',
                    dataType: 'f5telemetry',
                    allowSelfSignedCert: true,
                    protocol: 'http',
                    username: 'myUser',
                    passphrase: 'myPassword',
                    apiVersion: '12'
                }
            });

            elasticSearchIndex(context);
            assert.strictEqual(passedClientConfig.httpAuth, 'myUser:myPassword');
            assert.strictEqual(passedClientConfig.apiVersion, '12');
        });

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });

            const expectedPayload = {
                body: testUtil.deepCopy(context.event.data),
                index: 'ts_elasticsearch_consumer',
                type: 'f5telemetry'
            };
            elasticSearchIndex(context);
            assert.deepStrictEqual(passedPayload, expectedPayload);
        });

        it('should process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });

            const expectedData = testUtil.deepCopy(context.event.data);
            delete expectedData.telemetryEventCategory;
            const expectedPayload = {
                body: {
                    data: expectedData,
                    telemetryEventCategory: 'AVR'
                },
                index: 'ts_elasticsearch_consumer',
                type: 'f5telemetry'
            };

            elasticSearchIndex(context);
            assert.deepStrictEqual(passedPayload, expectedPayload);
        });
    });
});

describe('Rename Keys', () => {
    const member1 = '.members.x.';
    const member2Pre = '..members.x..y..';
    const member2Post = '.members.x.y.';
    const member3Pre = '...members.z...zz...';
    const member3Post = '.members.z.zz.';
    const regexTest = /([.])+\1/g;
    const replacement = '.';

    it('should remove duplicate periods in top-level keys', () => {
        const target = {};
        target[member1] = { a: 1, b: 2 };
        target[member2Pre] = { c: 3, d: 4 };
        target[member3Pre] = { e: 5, f: 6 };

        util.renameKeys(target, regexTest, replacement);

        assert.strictEqual(Object.keys(target[member1]).length, 2);
        assert.equal(target[member1].a, 1);
        assert.equal(target[member1].b, 2);

        assert.strictEqual(target[member2Pre], undefined);
        assert.strictEqual(target[member2Post].c, 3);
        assert.strictEqual(target[member2Post].d, 4);

        assert.strictEqual(target[member3Pre], undefined);
        assert.strictEqual(target[member3Post].e, 5);
        assert.strictEqual(target[member3Post].f, 6);
    });

    it('should remove duplicate periods in nested keys 1 level deeper', () => {
        const target = { a: {} };
        target.a[member1] = { a: 1, b: 2 };
        target.a[member2Pre] = { c: 3, d: 4 };
        target.a[member3Pre] = { e: 5, f: 6 };

        util.renameKeys(target, regexTest, replacement);

        assert.strictEqual(Object.keys(target.a[member1]).length, 2);
        assert.strictEqual(target.a[member1].a, 1);
        assert.strictEqual(target.a[member1].b, 2);

        assert.strictEqual(target.a[member2Pre], undefined);
        assert.strictEqual(target.a[member2Post].c, 3);
        assert.strictEqual(target.a[member2Post].d, 4);

        assert.strictEqual(target.a[member3Pre], undefined);
        assert.strictEqual(target.a[member3Post].e, 5);
        assert.strictEqual(target.a[member3Post].f, 6);
    });

    it('should remove duplicate periods in nested keys 2 levels deeper', () => {
        const target = { a: { b: {} } };
        target.a.b[member1] = { a: 1, b: 2 };
        target.a.b[member2Pre] = { c: 3, d: 4 };
        target.a.b[member3Pre] = { e: 5, f: 6 };

        util.renameKeys(target, regexTest, replacement);

        assert.strictEqual(Object.keys(target.a.b[member1]).length, 2);
        assert.strictEqual(target.a.b[member1].a, 1);
        assert.strictEqual(target.a.b[member1].b, 2);

        assert.strictEqual(target.a.b[member2Pre], undefined);
        assert.strictEqual(target.a.b[member2Post].c, 3);
        assert.strictEqual(target.a.b[member2Post].d, 4);

        assert.strictEqual(target.a.b[member3Pre], undefined);
        assert.strictEqual(target.a.b[member3Post].e, 5);
        assert.strictEqual(target.a.b[member3Post].f, 6);
    });

    it('should remove duplicate periods throughout object chain', () => {
        const target = {};
        target[member1] = { a: 1, b: 2 };
        target[member1][member2Pre] = { c: 3, d: 4 };
        target[member1][member2Pre][member3Pre] = { e: 5, f: 6 };

        util.renameKeys(target, regexTest, replacement);

        assert.strictEqual(Object.keys(target[member1]).length, 3);
        assert.strictEqual(target[member1].a, 1);
        assert.strictEqual(target[member1].b, 2);
        assert.strictEqual(target[member1][member2Pre], undefined);

        assert.strictEqual(Object.keys(target[member1][member2Post]).length, 3);
        assert.strictEqual(target[member1][member2Post].c, 3);
        assert.strictEqual(target[member1][member2Post].d, 4);
        assert.strictEqual(target[member1][member2Post][member3Pre], undefined);

        assert.strictEqual(Object.keys(target[member1][member2Post][member3Post]).length, 2);
        assert.strictEqual(target[member1][member2Post][member3Post].e, 5);
        assert.strictEqual(target[member1][member2Post][member3Post].f, 6);
    });

    it('trimmed and massaged data set from repro machine', () => {
        const target = {
            system: {
                hostname: 'ts13victim.org',
                version: '13.0.1',
                versionBuild: '0.0.3',
                location: 'missing data',
                description: 'missing data',
                marketingName: 'missing data',
                platformId: 'missing data',
                chassisId: 'missing data',
                baseMac: 'fa:16:3e:17:d1:27',
                callBackUrl: 'https://10.145.69.123',
                syncMode: 'standalone',
                syncColor: 'green',
                syncStatus: 'Standalone',
                syncSummary: ' ',
                failoverStatus: 'ACTIVE',
                failoverColor: 'green',
                systemTimestamp: '2019-06-18T18:03:47Z',
                cpu: 2,
                memory: 33,
                tmmCpu: 1,
                tmmMemory: 5,
                virtualServers: {
                    '/Common/10.12.10.10': {
                        'clientside.bitsIn': 262928,
                        'clientside.bitsOut': 356768,
                        'clientside.curConns': 0,
                        destination: '10.10.0.50:80',
                        availabilityState: 'unknown',
                        enabledState: 'enabled',
                        name: '/Common/10.12.10.10',
                        tenant: 'Common',
                        application: ''
                    }
                },
                pools: {
                    '/Common/pool_test': {
                        activeMemberCnt: 0,
                        'serverside.bitsIn': 24624,
                        'serverside.bitsOut': 35280,
                        'serverside.curConns': 0,
                        availabilityState: 'unknown',
                        enabledState: 'enabled',
                        name: '/Common/pool_test',
                        members: {
                            '/Common/_auto_2603.1046.1.14..80.:80': {
                                addr: '10.10.0.14',
                                port: 80,
                                'serverside.bitsIn': 24624,
                                'serverside.bitsOut': 35280,
                                'serverside.curConns': 0,
                                availabilityState: 'unknown',
                                enabledState: 'enabled'
                            },
                            '/Common/_auto_2603...1046...1..14..81..:81': {
                                addr: '10.10.0.15',
                                port: 81,
                                'serverside.bitsIn': 24624,
                                'serverside.bitsOut': 35280,
                                'serverside.curConns': 0,
                                availabilityState: 'unknown',
                                enabledState: 'enabled'
                            }
                        },
                        tenant: 'Common',
                        application: ''
                    }
                },
                telemetryServiceInfo: {
                    pollingInterval: 60,
                    cycleStart: '2019-06-18T18:03:47.115Z',
                    cycleEnd: '2019-06-18T18:03:47.623Z'
                },
                telemetryEventCategory: 'systemInfo'
            }
        };

        util.renameKeys(target, regexTest, replacement);

        assert.strictEqual(target.system.pools['/Common/pool_test'].members['/Common/_auto_2603.1046.1.14.80.:80'].port, 80);
        assert.strictEqual(target.system.pools['/Common/pool_test'].members['/Common/_auto_2603.1046.1.14.81.:81'].port, 81);
    });
});
