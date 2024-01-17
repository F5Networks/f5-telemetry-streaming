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

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        common.stubCoreModules();
    });

    afterEach(() => {
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
            port: 9092
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Kafka',
            host: 'host',
            topic: 'topic',
            port: 80,
            protocol: 'binaryTcp',
            authenticationProtocol: 'SASL-PLAIN',
            username: 'username',
            passphrase: {
                cipherText: 'cipherText'
            }
        },
        {
            type: 'Kafka',
            host: 'host',
            topic: 'topic',
            port: 80,
            protocol: 'binaryTcp',
            authenticationProtocol: 'SASL-PLAIN',
            username: 'username',
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            }
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
            }
        }
    ));

    it('should pass full declaration with TLS client auth', () => shared.validateFull(
        {
            type: 'Kafka',
            host: 'host',
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
            }
        },
        {
            type: 'Kafka',
            host: 'host',
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
            }
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
                host: 'host',
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
});
