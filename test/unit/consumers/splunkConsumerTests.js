/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const request = require('request');
const zlib = require('zlib');

chai.use(chaiAsPromised);
const assert = chai.assert;
const sinon = require('sinon');

const splunkIndex = require('../../../src/lib/consumers/Splunk/index');
const splunkData = require('./splunkConsumerTestsData.js');
const util = require('../shared/util.js');

/* eslint-disable global-require */
describe('Splunk', () => {
    let clock;

    beforeEach(() => {
        // Fake the clock to get consistent in Event Data output's 'time' variable
        clock = sinon.useFakeTimers();
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
            const context = util.buildConsumerContext({
                config: defaultConsumerConfig
            });

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    assert.strictEqual(opts.gzip, true);
                    assert.deepEqual(opts.headers, {
                        'Accept-Encoding': 'gzip',
                        Authorization: 'Splunk mySecret',
                        'Content-Encoding': 'gzip',
                        'Content-Length': 90
                    });
                    assert.strictEqual(opts.url, 'https://localhost:80/services/collector/event');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        it('should configure request options with provided values', (done) => {
            const context = util.buildConsumerContext({
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
                    assert.deepEqual(opts.headers, {
                        Authorization: 'Splunk superSecret',
                        'Content-Length': 92
                    });
                    assert.strictEqual(opts.url, 'http://remoteSplunk:4567/services/collector/event');
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        it('should process systemInfo data', (done) => {
            const context = util.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            const expectedData = util.deepCopy(expectedDataTemplate);
            expectedData.time = 1576001615000;
            expectedData.event = util.deepCopy(context.event.data);

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    const output = zlib.gunzipSync(opts.body).toString();
                    assert.deepEqual(output, JSON.stringify(expectedData));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        it('should process event data', (done) => {
            const context = util.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            const expectedData = util.deepCopy(expectedDataTemplate);
            expectedData.event = util.deepCopy(context.event.data);

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    const output = zlib.gunzipSync(opts.body).toString();
                    assert.deepEqual(output, JSON.stringify(expectedData));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        it('should process systemInfo in legacy format', (done) => {
            const context = util.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            context.config.format = 'legacy';
            const expectedLegacyData = splunkData.legacySystemData[0].expectedData;

            sinon.stub(request, 'post').callsFake((opts) => {
                try {
                    const output = zlib.gunzipSync(opts.body).toString();
                    assert.strictEqual(output, expectedLegacyData.replace(/(\r\n|\n|\r)/g, ''));
                    done();
                } catch (err) {
                    // done() with parameter is treated as an error.
                    // Use catch back to pass thrown error from assert.deepEqual to done() callback
                    done(err);
                }
            });

            splunkIndex(context);
        });

        describe('tmstats', () => {
            it('should replace periods in tmstat key names with underscores', (done) => {
                const context = util.buildConsumerContext({
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
                                'counters.pkts_out': '943520'
                            },
                            {
                                name: 'mgmt',
                                if_index: '32',
                                'counters.bytes_in': '622092889300',
                                'counters.bytes_out': '766030668'
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
                        done();
                    } catch (err) {
                        // done() with parameter is treated as an error.
                        // Use catch back to pass thrown error from assert.deepEqual to done() callback
                        done(err);
                    }
                });

                splunkIndex(context);
            });
        });
    });
});
