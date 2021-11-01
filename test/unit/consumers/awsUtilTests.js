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

const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const aws = require('aws-sdk');
const https = require('https');

const testUtil = require('./../shared/util');
const awsUtil = require('../../../src/lib/consumers/shared/awsUtil');
const awsUtilTestsData = require('./data/awsUtilTestsData');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('AWS Util Tests', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('SDK Config', () => {
        let actualParams;

        beforeEach(() => {
            sinon.stub(aws.config, 'update').callsFake((options) => {
                actualParams = options;
            });
        });

        it('should initialize config with creds', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    region: 'us-east-1',
                    username: 'awsuser',
                    passphrase: 'awssecret'
                }
            });
            return awsUtil.initializeConfig(context)
                .then(() => {
                    assert.strictEqual(actualParams.region, 'us-east-1');
                    assert.deepStrictEqual(actualParams.credentials,
                        new aws.Credentials({ accessKeyId: 'awsuser', secretAccessKey: 'awssecret' }));
                });
        });

        it('should initialize config without creds', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    region: 'us-west-1'
                }
            });
            return awsUtil.initializeConfig(context)
                .then(() => {
                    assert.strictEqual(actualParams.region, 'us-west-1');
                });
        });

        it('should initialize config with custom agent', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    region: 'us-west-1'
                }
            });
            return awsUtil.initializeConfig(context)
                .then(() => {
                    const agent = actualParams.httpOptions.agent;
                    assert.ok(agent instanceof https.Agent, 'agent should be instance of https.Agent');
                    assert.isNotEmpty(agent.options.ca, 'should have at least 1 certificate');
                    assert.strictEqual(agent.options.rejectUnauthorized, true);
                });
        });

        it('should initialize config with custom https agent', () => {
            const context = testUtil.buildConsumerContext({
                config: {
                    region: 'us-west-1'
                }
            });
            const configOptions = {
                httpAgent: 'myAgent'
            };
            return awsUtil.initializeConfig(context, configOptions)
                .then(() => {
                    assert.deepStrictEqual(actualParams,
                        { region: 'us-west-1', httpOptions: { agent: 'myAgent' } });
                });
        });

        it('should return a valid array when getting AWS root certs', () => {
            const certs = awsUtil.getAWSRootCerts();
            assert.ok(Array.isArray(certs), 'certs should be a valid array');
            assert.ok(certs.every(
                i => i.startsWith('-----BEGIN CERTIFICATE-----')
            ), 'certs should have \'BEGIN CERTIFICATE\' header');
        });
    });

    describe('Metrics', () => {
        let clock;
        beforeEach(() => {
            clock = sinon.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        describe('getDefaultDimensions', () => {
            const testSet = awsUtilTestsData.getDefaultDimensions;
            testSet.tests.forEach(testConf => testUtil.getCallableIt(testConf)(testConf.name, () => {
                const actualMetrics = awsUtil.getDefaultDimensions(testConf.input.data);
                return assert.deepStrictEqual(actualMetrics, testConf.expected);
            }));
        });

        describe('getMetrics', () => {
            const testSet = awsUtilTestsData.getMetrics;
            testSet.tests.forEach(testConf => testUtil.getCallableIt(testConf)(testConf.name, () => {
                clock = sinon.useFakeTimers(new Date(testSet.timestamp));
                const actualMetrics = awsUtil.getMetrics(testConf.input.data, testConf.input.defDimensions);
                return assert.deepStrictEqual(actualMetrics, testConf.expected);
            }));
        });

        describe('sendMetrics', () => {
            let batches;
            let putMetricsStub;

            beforeEach(() => {
                batches = [];
                sinon.stub(aws, 'CloudWatch').returns({
                    putMetricData: batch => ({
                        promise: () => putMetricsStub(batch)
                    })
                });
                putMetricsStub = (batch) => {
                    batches.push(batch);
                    return Promise.resolve();
                };
            });

            const testSet = awsUtilTestsData.sendMetrics;
            testSet.tests.forEach(testConf => testUtil.getCallableIt(testConf)(testConf.name, () => {
                clock = sinon.useFakeTimers(testSet.timestamp);
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: {
                        region: 'us-west-2',
                        metricNamespace: 'lemonade'
                    }
                });
                const metrics = awsUtil.getMetrics(testConf.input.data, testConf.input.defDimensions);
                return awsUtil.sendMetrics(context, metrics)
                    .then((result) => {
                        assert.strictEqual(result, `: processed total batch(es): ${testConf.expected.length}`);
                        assert.deepStrictEqual(batches, testConf.expected);
                    });
            }));
        });

        describe('sendMetrics - exceptions', () => {
            const allReqs = [];
            const successfulReqs = [];
            let putMetricsStub;

            beforeEach(() => {
                sinon.stub(aws, 'CloudWatch').returns({
                    putMetricData: batch => ({
                        promise: () => putMetricsStub(batch)
                    })
                });
                putMetricsStub = (req) => {
                    allReqs.push(req);
                    if (allReqs.length === 2 || allReqs.length === 3) {
                        const batch = req.MetricData;
                        return Promise.reject(new Error(
                            `Error req: ${allReqs.length} idxMin: ${batch[0].idx} idxMax: ${batch[batch.length - 1].idx}`
                        ));
                    }
                    successfulReqs.push(req);
                    return Promise.resolve();
                };
            });

            it('should handle both successful and failed putMetricData requests', () => {
                const context = testUtil.buildConsumerContext({
                    eventType: 'systemInfo',
                    config: {
                        region: 'us-west-2',
                        metricNamespace: 'thingsGoAwry'
                    }
                });
                // simulate 4 batches
                const mockMetrics = [];
                for (let i = 0; i <= 70; i += 1) {
                    mockMetrics.push({ idx: i });
                }
                return awsUtil.sendMetrics(context, mockMetrics)
                    .catch((err) => {
                        assert.strictEqual(err.message, 'At least one batch encountered an error while sending metrics data');
                        assert.lengthOf(allReqs, 4);
                        // should log exception for errored out requests
                        assert.isTrue(context.logger.exception.calledTwice);
                        assert.deepStrictEqual(context.logger.exception.getCalls()[0].args[1].message, 'Error req: 2 idxMin: 20 idxMax: 39');
                        assert.deepStrictEqual(context.logger.exception.getCalls()[1].args[1].message, 'Error req: 3 idxMin: 40 idxMax: 59');
                        // should handle all requests even if at least one fails
                        assert.lengthOf(successfulReqs, 2);
                        assert.deepStrictEqual(successfulReqs[0].MetricData[0], { idx: 0 });
                        assert.deepStrictEqual(successfulReqs[0].MetricData[19], { idx: 19 });
                        assert.deepStrictEqual(successfulReqs[1].MetricData[0], { idx: 60 });
                        assert.deepStrictEqual(successfulReqs[1].MetricData[10], { idx: 70 });
                    });
            });
        });
    });
});
