/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const request = require('request');
const sinon = require('sinon');
const zlib = require('zlib');

const constants = require('../../../src/lib/constants');
const splunkIndex = require('../../../src/lib/consumers/Splunk/index');
const splunkData = require('./data/splunkConsumerTestsData');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Splunk', () => {
    let clock;
    let splunkHost;
    let splunkPort;
    let splunkProtocol;
    let splunkRequestData;
    let splunkResponseData;
    let splunkResponseCode;

    function setupSplunkMockEndpoint(config) {
        config = config || {};
        testUtil.mockEndpoints([{
            endpoint: /\/services\/collector/,
            method: 'post',
            code: config.responseCode || splunkResponseCode,
            response: function response(uri, requestBody) {
                splunkRequestData.push({
                    basePath: this.basePath,
                    uri,
                    request: testUtil.deepCopy(requestBody),
                    headers: testUtil.deepCopy(this.req.headers)
                });
                return config.responseData || splunkResponseData;
            },
            responseHeaders: config.responseHeaders || {},
            requestHeaders: config.requestHeaders || {},
            options: {
                times: config.times || 100
            }
        }], {
            host: config.host || splunkHost,
            port: config.port || splunkPort,
            proto: config.protocol || splunkProtocol
        });
    }

    function decodeNockGzip(data) {
        return zlib.gunzipSync(Buffer.from(data, 'hex')).toString();
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        splunkHost = 'localhost';
        splunkPort = 8080;
        splunkProtocol = 'https';
        splunkRequestData = [];
        splunkResponseCode = 200;
        splunkResponseData = JSON.stringify({ message: 'success' });

        // Fake the clock to get consistent in Event Data output's 'time' variable
        clock = sinon.useFakeTimers(0);
        setupSplunkMockEndpoint();
    });

    afterEach(() => {
        clock.restore();
        sinon.restore();
        nock.cleanAll();
    });

    describe('process', () => {
        let defaultConsumerConfig;
        let expectedDataTemplate;

        beforeEach(() => {
            expectedDataTemplate = {
                time: 0,
                host: 'telemetry.bigip.com',
                source: 'f5.telemetry',
                sourcetype: 'f5:telemetry:json',
                event: {}
            };

            defaultConsumerConfig = {
                port: splunkPort,
                host: splunkHost,
                protocol: splunkProtocol,
                passphrase: 'mySecret',
                compressionType: 'gzip'
            };
        });

        it('should configure request options with default values', () => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });
            return splunkIndex(context)
                .then(() => {
                    const requestData = splunkRequestData[0];
                    assert.deepStrictEqual(requestData.basePath, 'https://localhost:8080', 'should match configured destination');
                    assert.deepStrictEqual(requestData.uri, '/services/collector/event', 'should match default path');
                    assert.deepNestedInclude(requestData.headers, {
                        'accept-encoding': 'gzip',
                        authorization: 'Splunk mySecret',
                        'content-encoding': 'gzip',
                        'content-length': 90,
                        'user-agent': constants.USER_AGENT
                    }, 'should match expected headers');
                });
        });

        it('should configure request options with provided values', () => {
            splunkHost = 'remoteSplunk';
            splunkPort = 4567;
            splunkProtocol = 'http';
            const context = testUtil.buildConsumerContext({
                config: {
                    protocol: splunkProtocol,
                    host: splunkHost,
                    port: splunkPort,
                    passphrase: 'superSecret',
                    compressionType: 'none'
                }
            });
            nock.cleanAll();
            setupSplunkMockEndpoint();
            return splunkIndex(context)
                .then(() => {
                    const requestData = splunkRequestData[0];
                    assert.deepStrictEqual(requestData.basePath, 'http://remotesplunk:4567', 'should match configured destination');
                    assert.deepStrictEqual(requestData.uri, '/services/collector/event', 'should match default path');
                    assert.deepNestedInclude(requestData.headers, {
                        authorization: 'Splunk superSecret',
                        'content-length': 92,
                        'user-agent': constants.USER_AGENT
                    }, 'should match expected headers');
                });
        });

        it('should trace data with secrets redacted', () => {
            const proxyHost = 'proxyServer';
            const proxyPort = 8080;
            const proxyProto = 'http';
            const context = testUtil.buildConsumerContext({
                config: {
                    protocol: 'http',
                    host: 'remoteSplunk',
                    port: '4567',
                    passphrase: 'superSecret',
                    compressionType: 'none',
                    proxy: {
                        protocol: proxyProto,
                        host: proxyHost,
                        port: proxyPort,
                        username: 'user',
                        passphrase: 'passphrase',
                        allowSelfSignedCert: true
                    }
                }
            });
            nock.cleanAll();
            setupSplunkMockEndpoint({
                host: proxyHost,
                port: proxyPort,
                protocol: proxyProto
            });
            return splunkIndex(context)
                .then(() => {
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.notStrictEqual(traceData.consumer.passphrase.indexOf('*****'), -1,
                        'consumer config passphrase should be redacted');
                    assert.notStrictEqual(traceData.consumer.proxy.passphrase.indexOf('*****'), -1,
                        'consumer proxy config passphrase should be redacted');
                    assert.notStrictEqual(traceData.requestOpts.headers.Authorization.indexOf('*****'), -1,
                        'passphrase in request headers should be redacted');
                    assert.strictEqual(JSON.stringify(traceData).indexOf('superSecret'), -1,
                        'passphrase should not be present anywhere in trace data');
                    assert.notStrictEqual(traceData.requestOpts.proxy.passphrase.indexOf('*****'), -1,
                        'consumer proxy config passphrase should be redacted');
                });
        });

        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = testUtil.deepCopy(expectedDataTemplate);
            expectedData.time = Date.parse(context.event.data.telemetryServiceInfo.cycleStart);
            expectedData.event = testUtil.deepCopy(context.event.data);

            return splunkIndex(context)
                .then(() => {
                    assert.deepStrictEqual(JSON.parse(decodeNockGzip(splunkRequestData[0].request)), expectedData);
                });
        });

        it('should process event data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            const expectedData = testUtil.deepCopy(expectedDataTemplate);
            expectedData.event = testUtil.deepCopy(context.event.data);

            return splunkIndex(context)
                .then(() => {
                    assert.deepStrictEqual(JSON.parse(decodeNockGzip(splunkRequestData[0].request)), expectedData);
                });
        });

        it('should process systemInfo in legacy format', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.config.format = 'legacy';
            // though not required explicity through schema, the app dashboard requires facility value
            // this is set through actions setTag and creates a property under system
            context.event.data.system.facility = 'myFacility';

            return splunkIndex(context)
                .then(() => {
                    const output = decodeNockGzip(splunkRequestData[0].request)
                        .replace(/\}\{/g, '},{');
                    assert.sameDeepMembers(JSON.parse(`[${output}]`), splunkData.legacySystemData.exampleOfSystemPollerOutput.expectedData);
                });
        });

        it('should process systemInfo in multiMetric format', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.config.format = 'multiMetric';

            return splunkIndex(context)
                .then(() => {
                    const output = decodeNockGzip(splunkRequestData[0].request)
                        .replace(/\}\{/g, '},{');
                    assert.sameDeepMembers(JSON.parse(`[${output}]`), splunkData.multiMetricSystemData.exampleOfSystemPollerOutput.expectedData);
                });
        });

        it('should ignore references in multiMetric format', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.config.format = 'multiMetric';
            context.event.data = {
                system: {
                    hostname: context.event.data.system.hostname
                },
                telemetryServiceInfo: context.event.data.telemetryServiceInfo,
                telemetryEventCategory: context.event.data.telemetryEventCategory,
                pools: {
                    pool1: {
                        metric: 10,
                        someReference: {
                            link: 'linkToReference',
                            name: 'someReference'
                        }
                    }
                }
            };

            return splunkIndex(context)
                .then(() => {
                    const output = decodeNockGzip(splunkRequestData[0].request)
                        .replace(/\}\{/g, '},{');
                    assert.sameDeepMembers(JSON.parse(`[${output}]`), splunkData.multiMetricSystemData.systemPollerOutputWithReferences.expectedData);
                });
        });

        it('should send data without compressionType', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.config.compressionType = 'none';
            context.config.format = 'multiMetric';

            return splunkIndex(context)
                .then(() => {
                    const output = splunkRequestData[0].request.replace(/\}\{/g, '},{');
                    assert.sameDeepMembers(JSON.parse(`[${output}]`), splunkData.multiMetricSystemData.exampleOfSystemPollerOutput.expectedData);
                });
        });

        ['legacy', 'multiMetric'].forEach((format) => {
            it(`should ignore events from Event Listener in ${format} format`, () => {
                // enable event loop to use setTimeout
                clock.restore();
                const context = testUtil.buildConsumerContext({
                    eventType: 'AVR',
                    config: defaultConsumerConfig
                });
                context.config.format = format;
                // error will be logged if method called
                const requestStub = sinon.stub(request, 'post');
                requestStub.throws(new Error('err message'));

                return splunkIndex(context)
                    .then(() => {
                        assert.strictEqual(requestStub.notCalled, true, 'should not call request.post');
                        assert.strictEqual(context.logger.error.callCount, 0, 'should have no error messages');
                        assert.notStrictEqual(context.logger.debug.callCount, 0, 'should have debug messages');
                        assert.ok(/No data to forward/.test(context.logger.debug.lastCall.args[0]));
                    });
            });

            it(`should ignore data from custom endpoints in ${format} format`, () => {
                // enable event loop to use setTimeout
                clock.restore();
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                context.config.format = format;
                context.event.isCustom = true;
                // error will be logged if method called
                const requestStub = sinon.stub(request, 'post');
                requestStub.throws(new Error('err message'));

                return splunkIndex(context)
                    .then(() => {
                        assert.strictEqual(requestStub.notCalled, true, 'should not call request.post');
                        assert.strictEqual(context.logger.error.callCount, 0, 'should have no error messages');
                        assert.notStrictEqual(context.logger.debug.callCount, 0, 'should have debug messages');
                        assert.ok(/No data to forward/.test(context.logger.debug.lastCall.args[0]));
                    });
            });
        });

        describe('tmstats', () => {
            beforeEach(() => {
                defaultConsumerConfig.compressionType = 'none';
            });

            it('should replace periods in tmstat key names with underscores', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                context.config.format = 'legacy';
                context.event.data = {
                    system: {
                        systemTimestamp: '2020-01-17T18:02:51.000Z'
                    },
                    tmstats: {
                        interfaceStat: [
                            {
                                name: '1.0',
                                if_index: '48',
                                'counters.pkts_in': '346790792',
                                'counters.pkts_out': '943520',
                                'longer.key.name.with.periods': true
                            },
                            {
                                name: 'mgmt',
                                if_index: '32',
                                'counters.bytes_in': '622092889300',
                                'counters.bytes_out': '766030668',
                                'longer.key.name.with.periods': true
                            }
                        ]
                    },
                    telemetryServiceInfo: context.event.data.telemetryServiceInfo,
                    telemetryEventCategory: context.event.data.telemetryEventCategory
                };

                return splunkIndex(context)
                    .then(() => {
                        const output = splunkRequestData[0].request;
                        assert.notStrictEqual(
                            output.indexOf('"counters_bytes_in":'), -1, 'output should include counters_bytes_in as a key'
                        );
                        assert.strictEqual(
                            output.indexOf('"counters.bytes_in":'), -1, 'output should not include counters.bytes_in as a key'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"longer_key_name_with_periods":'), -1, 'output should include longer_key_name_with_periods as a key'
                        );
                        assert.strictEqual(
                            output.indexOf('"longer.key.name.with.periods":'), -1, 'output should not include longer.key.name.with.periods as a key'
                        );
                    });
            });

            it('should replace IPv6 prefix in monitorInstanceStat', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                context.config.format = 'legacy';
                context.event.data = {
                    system: {
                        systemTimestamp: '2020-01-17T18:02:51.000Z'
                    },
                    tmstats: {
                        monitorInstanceStat: [
                            {
                                ip_address: '::FFFF:192.0.0.1'
                            },
                            {
                                'ip.address': '::ffff:192.0.0.2'
                            },
                            {
                                'ip.address': '192.0.0.3'
                            }
                        ]
                    },
                    telemetryServiceInfo: context.event.data.telemetryServiceInfo,
                    telemetryEventCategory: context.event.data.telemetryEventCategory
                };

                return splunkIndex(context)
                    .then(() => {
                        const output = splunkRequestData[0].request;
                        assert.notStrictEqual(
                            output.indexOf('"192.0.0.1"'), -1, 'output should remove ::FFFF from ::FFFF:192.0.0.1'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"192.0.0.2"'), -1, 'output should remove ::FFFF from ::ffff:192.0.0.2'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"192.0.0.3"'), -1, 'output should include 192.0.0.3'
                        );
                    });
            });

            it('should replace name and format IPs for poolMemberStat', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                context.config.format = 'legacy';
                context.event.data = {
                    system: {
                        systemTimestamp: '2020-01-17T18:02:51.000Z'
                    },
                    tmstats: {
                        poolMemberStat: [
                            {
                                name: 'Test/test-net.1-test_00:00:00:00:00:00:00:00:00:00:FF:FF:0A:0A:01:01:00:00:00:00_8080',
                                addr: '00:00:00:00:00:00:00:00:00:00:FF:FF:0A:0A:01:01:00:00:00:00',
                                port: '8080',
                                pool_name: 'Test/test-net.1-test'
                            },
                            {
                                name: 'Test/test-net.1-test_00:00:00:00:00:00:00:00:00:00:FF:FF:0A:09:08:64:00:00:00:00_443',
                                addr: '00:00:00:00:00:00:00:00:00:00:FF:FF:0A:09:08:64:00:00:00:00',
                                port: '443',
                                pool_name: 'Test/test-net.1-test'
                            },
                            {
                                name: 'Test/test-net.1-test_FE:80:00:00:00:00:00:00:02:01:23:FF:FE:45:67:01:00:00:00:00_8080',
                                addr: 'FE:80:00:00:00:00:00:00:02:01:23:FF:FE:45:67:01:00:00:00:00',
                                port: '8080',
                                pool_name: 'Test/test-net.1-test'
                            }
                        ]
                    },
                    telemetryServiceInfo: context.event.data.telemetryServiceInfo,
                    telemetryEventCategory: context.event.data.telemetryEventCategory
                };

                return splunkIndex(context)
                    .then(() => {
                        const output = splunkRequestData[0].request.split('}{');
                        const membersInOutput = output.map((o) => {
                            if (o.indexOf('bigip.tmstats.pool_member_stat') > -1) {
                                return JSON.parse(`{${o}}`);
                            }
                            return undefined;
                        }).filter((m) => m !== undefined);
                        assert.notStrictEqual(
                            membersInOutput.find((m) => m.event.name === '10.10.1.1:8080' && m.event.addr === '10.10.1.1'),
                            undefined, 'output should include poolMember 10.10.1.1:8080'
                        );
                        assert.notStrictEqual(
                            membersInOutput.find((m) => m.event.name === '10.9.8.100:443' && m.event.addr === '10.9.8.100'),
                            undefined, 'output should include poolMember 10.9.8.100:443'
                        );
                        assert.notStrictEqual(
                            membersInOutput.find((m) => m.event.name === 'FE80:0000:0000:0000:0201:23FF:FE45:6701:8080' && m.event.addr === 'FE80:0000:0000:0000:0201:23FF:FE45:6701'),
                            undefined, 'output should include poolMember with addr 10.10.1.3'
                        );
                    });
            });

            it('should format hex IP', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                context.config.format = 'legacy';
                context.event.data = {
                    system: {
                        systemTimestamp: '2020-01-17T18:02:51.000Z'
                    },
                    tmstats: {
                        virtualServerStat: [
                            {
                                source: '00:00:00:00:00:00:00:00:00:00:FF:FF:C0:00:00:01:00:00:00:00'
                            },
                            {
                                addr: '10:00:00:00:00:00:00:00:00:00:FF:F8:C0:00:00:01:00:00:00:00'
                            },
                            {
                                destination: '192.0.0.3'
                            }
                        ]
                    },
                    telemetryServiceInfo: context.event.data.telemetryServiceInfo,
                    telemetryEventCategory: context.event.data.telemetryEventCategory
                };

                return splunkIndex(context)
                    .then(() => {
                        const output = splunkRequestData[0].request;
                        assert.notStrictEqual(
                            output.indexOf('"source":"192.0.0.1"'), -1, 'output should include 192.0.0.1'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"addr":"1000:0000:0000:0000:0000:FFF8:C000:0001"'), -1, 'output should include 1000:0000:0000:0000:0000:FFF8:C000:0001'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"destination":"192.0.0.3"'), -1, 'output should include 192.0.0.3'
                        );
                    });
            });

            it('should include tenant and application', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                context.config.format = 'legacy';
                context.event.data = {
                    system: {
                        systemTimestamp: '2020-01-17T18:02:51.000Z'
                    },
                    tmstats: {
                        virtualServerStat: [
                            {
                                source: '00:00:00:00:00:00:00:00:00:00:FF:FF:C0:00:00:01:00:00:00:00',
                                tenant: 'tenant',
                                application: 'application'
                            }
                        ]
                    },
                    telemetryServiceInfo: context.event.data.telemetryServiceInfo,
                    telemetryEventCategory: context.event.data.telemetryEventCategory
                };

                return splunkIndex(context)
                    .then(() => {
                        const output = splunkRequestData[0].request;
                        assert.notStrictEqual(
                            output.indexOf('"tenant":"tenant"'), -1, 'output should include tenant'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"application":"application"'), -1, 'output should include application'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"appComponent":""'), -1, 'output should include appComponent'
                        );
                    });
            });

            it('should include last_cycle_count', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: defaultConsumerConfig
                });
                context.config.format = 'legacy';
                context.event.data = {
                    system: {
                        systemTimestamp: '2020-01-17T18:02:51.000Z'
                    },
                    tmstats: {
                        virtualServerStat: [
                            {
                                cycle_count: '10'
                            }
                        ],
                        virtualServerCpuStat: [
                            {
                                avg: '10'
                            }
                        ]
                    },
                    telemetryServiceInfo: context.event.data.telemetryServiceInfo,
                    telemetryEventCategory: context.event.data.telemetryEventCategory
                };

                return splunkIndex(context)
                    .then(() => {
                        const output = splunkRequestData[0].request;
                        assert.notStrictEqual(
                            output.indexOf('"last_cycle_count":"10"'), -1, 'output should include last_cycle_count'
                        );
                    });
            });
        });

        describe('proxy options', () => {
            beforeEach(() => {
                nock.cleanAll();
            });

            it('should pass basic proxy options', () => {
                const proxyHost = 'proxyServer';
                const proxyPort = 8080;
                const context = testUtil.buildConsumerContext({
                    config: {
                        port: 80,
                        host: 'localhost',
                        passphrase: 'mySecret',
                        allowSelfSignedCert: true,
                        proxy: {
                            host: proxyHost,
                            port: proxyPort
                        }
                    }
                });
                setupSplunkMockEndpoint({
                    host: proxyHost,
                    port: proxyPort
                });

                const postSpy = sinon.spy(request, 'post');
                return splunkIndex(context)
                    .then(() => {
                        const opts = postSpy.firstCall.args[0];
                        assert.deepStrictEqual(opts.proxy, 'https://proxyServer:8080');
                        assert.deepStrictEqual(opts.strictSSL, false);
                        assert.strictEqual(opts.uri, 'https://localhost:80/services/collector/event');
                    });
            });

            it('should pass proxy options with allowSelfSignedCert', () => {
                const proxyUser = 'user';
                const proxyPassword = 'passphrase';
                const proxyHost = 'proxyServer';
                const proxyPort = 8080;
                const proxyProto = 'http';
                const context = testUtil.buildConsumerContext({
                    config: {
                        port: 80,
                        host: 'localhost',
                        passphrase: 'mySecret',
                        allowSelfSignedCert: false,
                        proxy: {
                            protocol: proxyProto,
                            host: proxyHost,
                            port: proxyPort,
                            username: proxyUser,
                            passphrase: proxyPassword,
                            allowSelfSignedCert: true
                        }
                    }
                });
                setupSplunkMockEndpoint({
                    host: proxyHost,
                    port: proxyPort,
                    protocol: proxyProto
                });

                const postSpy = sinon.spy(request, 'post');
                return splunkIndex(context)
                    .then(() => {
                        const opts = postSpy.firstCall.args[0];
                        assert.deepStrictEqual(opts.proxy, `http://${proxyUser}:${proxyPassword}@proxyServer:8080`);
                        assert.deepStrictEqual(opts.strictSSL, false);
                        assert.strictEqual(opts.uri, 'https://localhost:80/services/collector/event');
                    });
            });
        });
    });
});
