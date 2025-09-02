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

describe('Declarations -> Telemetry_Consumer -> Kafka', () => {
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

    it('should pass minimal declaration', () => shared.validateMinimal(
        {
            type: 'Kafka',
            host: 'host',
            topic: 'topic'
        },
        {
            type: 'Kafka',
            host: 'host',
            topic: 'topic',
            authenticationProtocol: 'None',
            protocol: 'binaryTcpTls',
            port: 9092,
            format: 'default',
            partitionerType: 'default'
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Kafka',
            host: 'host',
            topic: 'topic',
            port: 9094,
            protocol: 'binaryTcp',
            authenticationProtocol: 'SASL-PLAIN',
            username: 'username',
            passphrase: {
                cipherText: 'cipherText'
            },
            format: 'default',
            partitionerType: 'keyed',
            partitionKey: 'thePartition',
            customOpts: [{ name: 'requestTimeout', value: 1999 }]
        },
        {
            type: 'Kafka',
            host: 'host',
            topic: 'topic',
            port: 9094,
            protocol: 'binaryTcp',
            authenticationProtocol: 'SASL-PLAIN',
            username: 'username',
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            },
            format: 'default',
            partitionerType: 'keyed',
            partitionKey: 'thePartition',
            customOpts: [{ name: 'requestTimeout', value: 1999 }]
        }
    ));

    it('should pass minimal declaration with TLS client auth', () => shared.validateMinimal(
        {
            type: 'Kafka',
            host: 'host',
            topic: 'topic',
            authenticationProtocol: 'TLS',
            privateKey: {
                cipherText: 'privateKey'
            },
            clientCertificate: {
                cipherText: 'clientCertificate'
            }
        },
        {
            type: 'Kafka',
            host: 'host',
            topic: 'topic',
            authenticationProtocol: 'TLS',
            protocol: 'binaryTcpTls',
            port: 9092,
            privateKey: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$privateKey'
            },
            clientCertificate: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$clientCertificate'
            },
            format: 'default',
            partitionerType: 'default'
        }
    ));

    it('should pass full declaration with TLS client auth', () => shared.validateFull(
        {
            type: 'Kafka',
            host: ['host.first', 'host.second'],
            topic: 'topic',
            protocol: 'binaryTcpTls',
            port: 90,
            authenticationProtocol: 'TLS',
            privateKey: {
                cipherText: 'privateKey'
            },
            clientCertificate: {
                cipherText: 'clientCertificate'
            },
            rootCertificate: {
                cipherText: 'rootCertificate'
            },
            format: 'split',
            partitionerType: 'keyed',
            partitionKey: 'partitionId',
            customOpts: [{ name: 'requestTimeout', value: 3999 }]
        },
        {
            type: 'Kafka',
            host: ['host.first', 'host.second'],
            topic: 'topic',
            authenticationProtocol: 'TLS',
            protocol: 'binaryTcpTls',
            port: 90,
            privateKey: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$privateKey'
            },
            clientCertificate: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$clientCertificate'
            },
            rootCertificate: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$rootCertificate'
            },
            format: 'split',
            partitionerType: 'keyed',
            partitionKey: 'partitionId',
            customOpts: [{ name: 'requestTimeout', value: 3999 }]
        }
    ));

    it('should require protocol=binaryTcpTls when using TLS client auth', () => assert.isRejected(shared.validateFull(
        {
            type: 'Kafka',
            host: 'host',
            topic: 'topic',
            authenticationProtocol: 'TLS',
            protocol: 'binaryTcp',
            privateKey: {
                cipherText: 'privateKey'
            },
            clientCertificate: {
                cipherText: 'clientCertificate'
            }
        }
    ), /should be equal to constant/));

    it('should not allow username and password when using TLS client auth', () => assert.isRejected(shared.validateFull(
        {
            type: 'Kafka',
            host: 'host',
            topic: 'topic',
            authenticationProtocol: 'TLS',
            protocol: 'binaryTcpTls',
            username: 'myUser',
            passphrase: 'myPass',
            privateKey: {
                cipherText: 'privateKey'
            },
            clientCertificate: {
                cipherText: 'clientCertificate'
            }
        }
    ), /should NOT be valid/));

    describe('authenticationProtocol === SASL-PLAIN', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'Kafka',
                host: ['first.host', 'second.host'],
                topic: 'topic',
                authenticationProtocol: 'SASL-PLAIN',
                username: 'username'
            },
            'username',
            { requiredTests: true, stringLengthTests: true }
        );
    });

    describe('authenticationProtocol === TLS', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'Kafka',
                host: 'host',
                topic: 'topic',
                authenticationProtocol: 'TLS',
                privateKey: {
                    cipherText: 'privateKey'
                },
                clientCertificate: {
                    cipherText: 'clientCertificate'
                }
            },
            'privateKey',
            { requiredTests: true }
        );
    });

    describe('protocol values', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'Kafka',
                host: 'first.host',
                topic: 'topic'
            },
            [
                {
                    property: 'protocol',
                    defaultValueTests: 'binaryTcpTls',
                    enumTests: {
                        allowed: ['binaryTcpTls', 'binaryTcp'],
                        notAllowed: ['http', 'https', 'tcp', 'udp']
                    }
                }
            ]
        );
    });

    describe('multiple hosts with non-default options', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'Kafka',
                host: ['first.host', 'second.host'],
                topic: 'topic',
                authenticationProtocol: 'SASL-PLAIN',
                username: 'username',
                passphrase: {
                    cipherText: 'cipherText'
                },
                format: 'split',
                partitionerType: 'random',
                customOpts: [
                    { name: 'connectTimeout', value: 10000 }
                ]
            },
            [
                { property: 'host', requiredTests: true, arrayLengthTests: true },
                {
                    property: 'format',
                    defaultValueTests: 'default',
                    enumTests: { allowed: ['default', 'split'], notAllowed: ['anything-goes'] }
                },
                {
                    property: 'partitionerType',
                    defaultValueTests: 'default',
                    enumTests: { allowed: ['default', 'random', 'cyclic'], notAllowed: ['customThatMustBeDefined'] }
                },
                { property: 'customOpts', optionalPropTests: true }
            ]
        );
    });

    describe('Kafka Client default options', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'Kafka',
                host: 'first.host',
                topic: 'topic',
                customOpts: [
                    { name: 'connectRetryOptions.factor', value: 3000 },
                    { name: 'connectRetryOptions.maxTimeout', value: 1000 },
                    { name: 'connectRetryOptions.minTimeout', value: 5 },
                    { name: 'connectRetryOptions.randomize', value: true },
                    { name: 'connectRetryOptions.retries', value: 30000 },
                    { name: 'connectTimeout', value: 10000 },
                    { name: 'idleConnection', value: 10000 },
                    { name: 'maxAsyncRequests', value: 14 },
                    { name: 'requestTimeout', value: 30000 }
                ]
            },
            [
                {
                    property: 'customOpts',
                    ignoreOther: true,
                    arrayLengthTests: {
                        minItems: 1
                    }
                },
                {
                    property: 'customOpts.0.name',
                    ignoreOther: true,
                    valueTests: {
                        invalid: 'invalid'
                    }
                },
                {
                    property: 'customOpts.0.value',
                    ignoreOther: true,
                    numberRangeTests: {
                        minimum: 0
                    },
                    valueTests: {
                        invalid: 'invalid'
                    }
                },
                {
                    property: 'customOpts.1.value',
                    ignoreOther: true,
                    numberRangeTests: {
                        minimum: 0
                    },
                    valueTests: {
                        invalid: 'invalid'
                    }
                },
                {
                    property: 'customOpts.2.value',
                    ignoreOther: true,
                    numberRangeTests: {
                        minimum: 0
                    },
                    valueTests: {
                        invalid: 'invalid'
                    }
                },
                {
                    property: 'customOpts.3.value',
                    ignoreOther: true,
                    booleanTests: true
                },
                {
                    property: 'customOpts.4.value',
                    ignoreOther: true,
                    numberRangeTests: {
                        minimum: 0
                    },
                    valueTests: {
                        invalid: 'invalid'
                    }
                },
                {
                    property: 'customOpts.5.value',
                    ignoreOther: true,
                    numberRangeTests: {
                        minimum: 0
                    },
                    valueTests: {
                        invalid: 'invalid'
                    }
                },
                {
                    property: 'customOpts.6.value',
                    ignoreOther: true,
                    numberRangeTests: {
                        minimum: 0
                    },
                    valueTests: {
                        invalid: 'invalid'
                    }
                },
                {
                    property: 'customOpts.7.value',
                    ignoreOther: true,
                    numberRangeTests: {
                        minimum: 0
                    },
                    valueTests: {
                        invalid: 'invalid'
                    }
                }
            ]
        );
    });

    describe('partitionerType == keyed', () => {
        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                type: 'Kafka',
                host: ['first.host'],
                topic: 'topic-on-keyed-partitions',
                authenticationProtocol: 'SASL-PLAIN',
                username: 'username',
                passphrase: {
                    cipherText: 'cipherText'
                },
                format: 'split',
                partitionerType: 'keyed',
                partitionKey: 'partition-id'
            },
            'partitionKey',
            { requiredTests: true, stringLengthTests: true }
        );
    });

    describe('partitionerType != keyed', () => {
        const nonKeyedTypes = ['default', 'random', 'cyclic'];
        nonKeyedTypes.forEach((type) => {
            it(`should not allow partitionKey if partitionerType == ${type}`, () => assert.isRejected(shared.validateFull(
                {
                    type: 'Kafka',
                    host: 'host',
                    topic: 'topic',
                    partitionerType: type,
                    partitionKey: 'myKey'
                }
            ), /should NOT be valid/));
        });
    });
});
