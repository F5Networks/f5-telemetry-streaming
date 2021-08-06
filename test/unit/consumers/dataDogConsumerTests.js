/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const nock = require('nock');

const dataDogIndex = require('../../../src/lib/consumers/DataDog/index');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('DataDog', () => {
    // Note: if a test has no explicit assertions then it relies on 'checkNockActiveMocks' in 'afterEach'
    const DATA_DOG_API_KEY = 'test';
    const DATA_DOG_GATEWAYS = {
        logs: {
            host: 'https://http-intake.logs.datadoghq.com',
            path: '/v1/input',
            response: {
                success: {
                    code: 200,
                    data: '{}'
                }
            }
        },
        metrics: {
            host: 'https://api.datadoghq.com',
            path: '/api/v1/series',
            response: {
                success: {
                    code: 202,
                    data: '{"status":"ok"}'
                }
            }
        }
    };
    const DATA_DOG_NOCK_OPTS = {
        reqheaders: {
            'Content-Type': 'application/json',
            'DD-API-KEY': DATA_DOG_API_KEY
        }
    };

    const defaultConsumerConfig = {
        apiKey: DATA_DOG_API_KEY
    };

    afterEach(() => {
        testUtil.checkNockActiveMocks(nock);
        nock.cleanAll();
    });

    describe('process', () => {
        it('should process systemInfo data', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'systemInfo',
                config: defaultConsumerConfig
            });
            nock(DATA_DOG_GATEWAYS.metrics.host, DATA_DOG_NOCK_OPTS)
                .post(DATA_DOG_GATEWAYS.metrics.path)
                .reply(
                    DATA_DOG_GATEWAYS.metrics.response.success.code,
                    DATA_DOG_GATEWAYS.metrics.response.success.data
                );
            return dataDogIndex(context);
        });

        it('should process event listener event with metrics (AVR)', () => {
            const context = testUtil.buildConsumerContext({
                eventType: 'AVR',
                config: defaultConsumerConfig
            });
            nock(DATA_DOG_GATEWAYS.metrics.host, DATA_DOG_NOCK_OPTS)
                .post(DATA_DOG_GATEWAYS.metrics.path)
                .reply(
                    DATA_DOG_GATEWAYS.metrics.response.success.code,
                    DATA_DOG_GATEWAYS.metrics.response.success.data
                );
            return dataDogIndex(context);
        });

        it('should process event listener event without metrics (LTM)', () => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });
            context.event.type = 'LTM';
            context.event.data = {
                key: 'value',
                telemetryEventCategory: 'LTM'
            };
            nock(DATA_DOG_GATEWAYS.logs.host, DATA_DOG_NOCK_OPTS)
                .post(DATA_DOG_GATEWAYS.logs.path)
                .reply(
                    DATA_DOG_GATEWAYS.logs.response.success.code,
                    DATA_DOG_GATEWAYS.logs.response.success.data
                );
            return dataDogIndex(context);
        });

        it('should process event listener event without metrics (syslog)', () => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });
            context.event.type = 'syslog';
            context.event.data = {
                data: '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                hostname: 'bigip14.1.2.3.test',
                telemetryEventCategory: 'syslog'
            };
            nock(DATA_DOG_GATEWAYS.logs.host, DATA_DOG_NOCK_OPTS)
                .post(DATA_DOG_GATEWAYS.logs.path)
                .reply(
                    DATA_DOG_GATEWAYS.logs.response.success.code,
                    DATA_DOG_GATEWAYS.logs.response.success.data
                );
            return dataDogIndex(context);
        });

        it('should process event listener event without metrics (plain event)', () => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });
            context.event.type = 'syslog';
            context.event.data = {
                data: 'plain data',
                telemetryEventCategory: 'event'
            };
            nock(DATA_DOG_GATEWAYS.logs.host, DATA_DOG_NOCK_OPTS)
                .post(DATA_DOG_GATEWAYS.logs.path)
                .reply(
                    DATA_DOG_GATEWAYS.logs.response.success.code,
                    DATA_DOG_GATEWAYS.logs.response.success.data
                );
            return dataDogIndex(context);
        });

        it('should trace data', () => {
            const context = testUtil.buildConsumerContext({
                config: defaultConsumerConfig
            });
            context.event.type = 'syslog';
            context.event.data = {
                data: 'plain data',
                telemetryEventCategory: 'event'
            };
            nock(DATA_DOG_GATEWAYS.logs.host, DATA_DOG_NOCK_OPTS)
                .post(DATA_DOG_GATEWAYS.logs.path)
                .reply(
                    DATA_DOG_GATEWAYS.logs.response.success.code,
                    DATA_DOG_GATEWAYS.logs.response.success.data
                );
            return dataDogIndex(context)
                .then(() => {
                    const traceData = context.tracer.write.firstCall.args[0];
                    assert.deepStrictEqual(traceData.data.ddsource, 'syslog');
                });
        });
    });
});
