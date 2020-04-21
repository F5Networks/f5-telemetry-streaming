/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const request = require('request');
const sinon = require('sinon');
const zlib = require('zlib');

const splunkIndex = require('../../../src/lib/consumers/Splunk/index');
const splunkData = require('./splunkConsumerTestsData');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Splunk', () => {
    let clock;

    beforeEach(() => {
        // Fake the clock to get consistent in Event Data output's 'time' variable
        clock = sinon.useFakeTimers(0);
    });

    afterEach(() => {
        clock.restore();
        sinon.restore();
    });

    describe('process', () => {
        const expectedDataTemplate = {
            time: 0,
            host: 'bigip1',
            source: 'f5.telemetry',
            sourcetype: 'f5:telemetry:json',
            event: {}
        };

        const defaultConsumerConfig = {
            port: 80,
            host: 'localhost',
            passphrase: 'mySecret'
        };

        it('should configure request options with default values', (done) => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.strictEqual(opts.gzip, true);
                    assert.deepStrictEqual(opts.headers, {
                        'Accept-Encoding': 'gzip',
                        Authorization: 'Splunk mySecret',
                        'Content-Encoding': 'gzip',
                        'Content-Length': 90
                    });
                    assert.strictEqual(opts.url, 'https://localhost:80/services/collector/event');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        it('should configure request options with provided values', (done) => {
            const context = testUtil.buildConsumerContext({
                config: {
                    protocol: 'http',
                    host: 'remoteSplunk',
                    port: '4567',
                    passphrase: 'superSecret',
                    gzip: false
                }
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.headers, {
                        Authorization: 'Splunk superSecret',
                        'Content-Length': 92
                    });
                    assert.strictEqual(opts.url, 'http://remoteSplunk:4567/services/collector/event');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        it('should trace data with secrets redacted', (done) => {
            let traceData;
            const context = testUtil.buildConsumerContext({
                config: {
                    protocol: 'http',
                    host: 'remoteSplunk',
                    port: '4567',
                    passphrase: 'superSecret',
                    gzip: false
                }
            });
            context.tracer = {
                write: (input) => {
                    traceData = JSON.parse(input);
                }
            };

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.deepStrictEqual(opts.headers, {
                        Authorization: 'Splunk superSecret',
                        'Content-Length': 92
                    });
                    assert.notStrictEqual(traceData.consumer.passphrase.indexOf('*****'), -1,
                        'consumer config passphrase should be redacted');
                    assert.notStrictEqual(traceData.requestOpts.headers.Authorization.indexOf('*****'), -1,
                        'passphrase in request headers should be redacted');
                    assert.strictEqual(JSON.stringify(traceData).indexOf('superSecret'), -1,
                        'passphrase should not be present anywhere in trace data');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        it('should process systemInfo data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = testUtil.deepCopy(expectedDataTemplate);
            expectedData.time = 1576001615000;
            expectedData.event = testUtil.deepCopy(context.event.data);

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    const output = zlib.gunzipSync(opts.body).toString();
                    assert.deepStrictEqual(output, JSON.stringify(expectedData));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        it('should process event data', (done) => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            const expectedData = testUtil.deepCopy(expectedDataTemplate);
            expectedData.event = testUtil.deepCopy(context.event.data);

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    const output = zlib.gunzipSync(opts.body).toString();
                    assert.deepStrictEqual(output, JSON.stringify(expectedData));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        it('should process systemInfo in legacy format', (done) => {
            // test works correctly while:
            // - we generating output in predictable order
            // - Object.keys() returns the same array on different node versions
            const expectedData = splunkData.legacySystemData[0].expectedData;
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.config.format = 'legacy';

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    let output = zlib.gunzipSync(opts.body).toString();
                    output = output.replace(/}{"time/g, '},{"time');
                    output = JSON.parse(`[${output}]`);
                    assert.deepStrictEqual(output, expectedData);
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        it('should ignore events from Event Listener in legacy format', () => {
            // enable event loop to use setTimeout
            clock.restore();

            const logMessages = {
                debug: [],
                error: []
            };
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            context.config.format = 'legacy';
            context.logger = {
                debug: msg => logMessages.debug.push(msg),
                error: msg => logMessages.error.push(msg),
                exception: msg => logMessages.error.push(msg)
            };
            // error will be logged if method called
            const requestStub = sinon.stub(request, 'post');
            requestStub.throws(new Error('err message'));

            splunkIndex(context);
            return (new Promise(resolve => setTimeout(resolve, 100)))
                .then(() => {
                    assert.strictEqual(requestStub.notCalled, true, 'should not call request.post');
                    assert.strictEqual(logMessages.error.length, 0, 'should have no error messages');
                    assert.notStrictEqual(logMessages.debug.length, 0, 'should have debug messages');
                    assert.ok(/No data to forward/.test(logMessages.debug[logMessages.debug.length - 1]));
                });
        });

        describe('tmstats', () => {
            it('should replace periods in tmstat key names with underscores', (done) => {
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
                sinon.stub(request, 'post').callsFake((opts) => {
                    try {
                        const output = zlib.gunzipSync(opts.body).toString();
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
                        done();
                    } catch (err) {
                        // done() with parameter is treated as an error.
                        // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                        done(err);
                    }
                });

                splunkIndex(context);
            });

            it('should replace IPv6 prefix in monitorInstanceStat', (done) => {
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
                sinon.stub(request, 'post').callsFake((opts) => {
                    try {
                        const output = zlib.gunzipSync(opts.body).toString();
                        assert.notStrictEqual(
                            output.indexOf('"192.0.0.1"'), -1, 'output should remove ::FFFF from ::FFFF:192.0.0.1'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"192.0.0.2"'), -1, 'output should remove ::FFFF from ::ffff:192.0.0.2'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"192.0.0.3"'), -1, 'output should include 192.0.0.3'
                        );
                        done();
                    } catch (err) {
                        // done() with parameter is treated as an error.
                        // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                        done(err);
                    }
                });

                splunkIndex(context);
            });

            it('should format hex IP', (done) => {
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
                sinon.stub(request, 'post').callsFake((opts) => {
                    try {
                        const output = zlib.gunzipSync(opts.body).toString();
                        assert.notStrictEqual(
                            output.indexOf('"source":"192.0.0.1"'), -1, 'output should include 192.0.0.1'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"addr":"1000:0000:0000:0000:0000:FFF8:C000:0001"'), -1, 'output should include 1000:0000:0000:0000:0000:FFF8:C000:0001'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"destination":"192.0.0.3"'), -1, 'output should include 192.0.0.3'
                        );
                        done();
                    } catch (err) {
                        // done() with parameter is treated as an error.
                        // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                        done(err);
                    }
                });

                splunkIndex(context);
            });

            it('should include tenant and application', (done) => {
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
                sinon.stub(request, 'post').callsFake((opts) => {
                    try {
                        const output = zlib.gunzipSync(opts.body).toString();
                        assert.notStrictEqual(
                            output.indexOf('"tenant":"tenant"'), -1, 'output should include tenant'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"application":"application"'), -1, 'output should include application'
                        );
                        assert.notStrictEqual(
                            output.indexOf('"appComponent":""'), -1, 'output should include appComponent'
                        );
                        done();
                    } catch (err) {
                        // done() with parameter is treated as an error.
                        // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                        done(err);
                    }
                });

                splunkIndex(context);
            });

            it('should include last_cycle_count', (done) => {
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
                sinon.stub(request, 'post').callsFake((opts) => {
                    try {
                        const output = zlib.gunzipSync(opts.body).toString();
                        assert.notStrictEqual(
                            output.indexOf('"last_cycle_count":"10"'), -1, 'output should include last_cycle_count'
                        );
                        done();
                    } catch (err) {
                        // done() with parameter is treated as an error.
                        // Use catch back to pass thrown error from assert.deepStrictEqual to done() callback
                        done(err);
                    }
                });

                splunkIndex(context);
            });
        });
    });
});
