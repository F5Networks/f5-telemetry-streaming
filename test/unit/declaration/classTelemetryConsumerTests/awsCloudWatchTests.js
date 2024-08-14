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
const moduleCache = require('../../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../../shared/assert');
const common = require('../common');
const schemaValidationUtil = require('../../shared/schemaValidation');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> AWS_CloudWatch', () => {
    const basicSchemaTestsValidator = (decl) => shared.validateMinimal(decl);
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = common.stubCoreModules();
        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        sinon.restore();
    });

    describe('dataType', () => {
        describe('dataType === logs', () => {
            schemaValidationUtil.generateSchemaBasicTests(
                basicSchemaTestsValidator,
                {
                    type: 'AWS_CloudWatch',
                    dataType: 'logs',
                    region: 'PNW',
                    logGroup: 'pine',
                    logStream: 'tree',
                    username: 'username',
                    passphrase: {
                        cipherText: 'sshSecret'
                    },
                    endpointUrl: 'userDefinedUrl'
                },
                [
                    {
                        property: 'dataType',
                        enumTests: {
                            allowed: ['logs'],
                            notAllowed: ['', 'metrics', 'newlyInvented']
                        },
                        ignoreOther: true
                    },
                    {
                        property: 'maxAwsLogBatchSize',
                        ignoreOther: true,
                        numberRangeTests: {
                            minimum: 1,
                            maximum: 10000
                        }
                    },
                    'logGroup',
                    'logStream',
                    'region',
                    'username',
                    'endpointUrl'
                ],
                { stringLengthTests: true }
            );
        });

        describe('dataType === metric', () => {
            schemaValidationUtil.generateSchemaBasicTests(
                basicSchemaTestsValidator,
                {
                    type: 'AWS_CloudWatch',
                    region: 'region',
                    dataType: 'metrics',
                    metricNamespace: 'metricNamespace'
                },
                {
                    property: 'dataType',
                    enumTests: {
                        allowed: ['metrics'],
                        notAllowed: ['logs', 'newlyInvented', '', 'null']
                    }
                }
            );
        });
    });

    describe('username and passphrase', () => {
        it('should require passphrase when username is specified', () => assert.isRejected(
            shared.validateMinimal({
                type: 'AWS_CloudWatch',
                dataType: 'metrics',
                region: 'region',
                username: 'username'
            }),
            /should NOT be valid/
        ));

        it('should require username when passphrase is specified', () => assert.isRejected(
            shared.validateMinimal({
                type: 'AWS_CloudWatch',
                dataType: 'metrics',
                region: 'region',
                passphrase: {
                    cipherText: 'passphrase'
                }
            }),
            /should NOT be valid/
        ));
    });

    describe('Logs (default)', () => {
        it('should pass minimal declaration', () => shared.validateMinimal(
            {
                type: 'AWS_CloudWatch',
                region: 'region',
                logGroup: 'logGroup',
                logStream: 'logStream'
            },
            {
                type: 'AWS_CloudWatch',
                region: 'region',
                logGroup: 'logGroup',
                logStream: 'logStream',
                maxAwsLogBatchSize: 100,
                dataType: 'logs'
            }
        ));

        it('should allow full declaration', () => shared.validateFull(
            {
                type: 'AWS_CloudWatch',
                maxAwsLogBatchSize: 111,
                region: 'region',
                logGroup: 'logGroup',
                logStream: 'logStream',
                username: 'username',
                passphrase: {
                    cipherText: 'cipherText'
                },
                dataType: 'logs',
                endpointUrl: 'userDefinedUrl'
            },
            {
                type: 'AWS_CloudWatch',
                maxAwsLogBatchSize: 111,
                region: 'region',
                logGroup: 'logGroup',
                logStream: 'logStream',
                username: 'username',
                passphrase: {
                    class: 'Secret',
                    protected: 'SecureVault',
                    cipherText: '$M$cipherText'
                },
                dataType: 'logs',
                endpointUrl: 'userDefinedUrl'
            }
        ));

        it('should not allow non-log related properties', () => assert.isRejected(
            shared.validateMinimal({
                type: 'AWS_CloudWatch',
                region: 'regionThingee',
                logStream: 'logStreamThingee',
                logGroup: 'logGroupThingee',
                metricNamespace: 'oddOneOut'
            }),
            /should match exactly one schema in oneOf/
        ));

        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'AWS_CloudWatch',
                region: 'region',
                logGroup: 'logGroup',
                logStream: 'logStream'
            },
            [
                'logGroup',
                'logStream'
            ],
            { requiredTests: true }
        );
    });

    describe('Metrics', () => {
        it('should pass minimal declaration', () => shared.validateMinimal(
            {
                type: 'AWS_CloudWatch',
                region: 'region',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee'
            },
            {
                type: 'AWS_CloudWatch',
                region: 'region',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee'
            }
        ));

        it('should allow full declaration', () => shared.validateFull(
            {
                type: 'AWS_CloudWatch',
                region: 'region',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee',
                username: 'username',
                passphrase: {
                    cipherText: 'cipherText'
                },
                endpointUrl: 'userDefinedUrl'
            },
            {
                type: 'AWS_CloudWatch',
                region: 'region',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee',
                username: 'username',
                passphrase: {
                    class: 'Secret',
                    protected: 'SecureVault',
                    cipherText: '$M$cipherText'
                },
                endpointUrl: 'userDefinedUrl'
            }
        ));

        it('should not allow non-metrics properties logStream/logGroup', () => assert.isRejected(
            shared.validateMinimal({
                type: 'AWS_CloudWatch',
                dataType: 'metrics',
                region: 'region',
                metricNamespace: 'metricsThingee',
                logStream: 'extraOne',
                logGroup: 'extraTwo'
            }),
            /should match exactly one schema in oneOf/
        ));

        it('should not allow non-metrics property maxAwsLogBatchSize', () => assert.isRejected(
            shared.validateMinimal({
                type: 'AWS_CloudWatch',
                dataType: 'metrics',
                region: 'region',
                metricNamespace: 'metricsThingee',
                maxAwsLogBatchSize: 77
            }),
            /should match exactly one schema in oneOf/
        ));

        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'AWS_CloudWatch',
                region: 'region',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee'
            },
            'metricNamespace',
            { stringLengthTests: true, requiredTests: true }
        );

        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'AWS_CloudWatch',
                region: 'region',
                dataType: 'metrics',
                metricNamespace: 'metricsThingee',
                endpointUrl: 'userDefinedUrl'
            },
            'endpointUrl',
            { stringLengthTests: true }
        );
    });
});
