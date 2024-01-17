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

describe('Declarations -> Telemetry_Consumer -> OpenTelemetry_Exporter', () => {
    const basicSchemaTestsValidator = (decl) => shared.validateMinimal(decl);

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        common.stubCoreModules()
            .utilMisc
            .getRuntimeInfo.value(() => ({ nodeVersion: '8.12.0' }));
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should pass minimal declaration', () => shared.validateMinimal(
        {
            type: 'OpenTelemetry_Exporter',
            host: 'host',
            port: 55681
        },
        {
            type: 'OpenTelemetry_Exporter',
            host: 'host',
            port: 55681,
            convertBooleansToMetrics: false,
            exporter: 'protobuf',
            protocol: 'http'
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'OpenTelemetry_Exporter',
            host: 'host',
            port: 55681,
            metricsPath: '/v1/metrics',
            headers: [
                {
                    name: 'headerName',
                    value: 'headerValue'
                }
            ],
            convertBooleansToMetrics: true
        },
        {
            type: 'OpenTelemetry_Exporter',
            host: 'host',
            port: 55681,
            metricsPath: '/v1/metrics',
            headers: [
                {
                    name: 'headerName',
                    value: 'headerValue'
                }
            ],
            convertBooleansToMetrics: true,
            exporter: 'protobuf',
            protocol: 'http'
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            host: 'host',
            type: 'OpenTelemetry_Exporter',
            port: 80
        },
        [
            'host',
            'metricsPath',
            {
                property: 'exporter',
                enumTests: {
                    allowed: ['grpc', 'json', 'protobuf'],
                    notAllowed: ['', 'not-grpc', 'not-json', 'not-protobuf']
                },
                ignoreOther: true
            },
            {
                property: 'protocol',
                enumTests: {
                    allowed: ['http', 'https'],
                    notAllowed: ['', 'not-http', 'not-https']
                },
                ignoreOther: true
            }
        ],
        { stringLengthTests: true }
    );

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            host: 'host',
            type: 'OpenTelemetry_Exporter',
            port: 80,
            protocol: 'https',
            exporter: 'json',
            clientCertificate: {
                cipherText: '$M$myCert',
                class: 'Secret',
                protected: 'SecureVault'
            },
            privateKey: {
                cipherText: '$M$myKey',
                class: 'Secret',
                protected: 'SecureVault'
            },
            rootCertificate: {
                cipherText: '$M$myCA',
                class: 'Secret',
                protected: 'SecureVault'
            }
        },
        [
            { property: 'rootCertificate', optionalPropTests: true },
            { property: 'privateKey', dependenciesTests: 'clientCertificate', ignoreOther: true },
            { property: 'clientCertificate', dependenciesTests: 'privateKey', ignoreOther: true }
        ]
    );

    it('should fail when invalid \'convertBooleansToMetrics\' value specified', () => assert.isRejected(
        shared.validateMinimal({
            type: 'OpenTelemetry_Exporter',
            host: 'host',
            port: 55681,
            convertBooleansToMetrics: 'something'
        }),
        /convertBooleansToMetrics\/type.*should be boolean/
    ));

    it('should fail when protocol === https and privateKey and clientCertificate specified', () => assert.isRejected(
        shared.validateMinimal({
            type: 'OpenTelemetry_Exporter',
            host: 'host',
            port: 55681,
            exporter: 'json',
            protocol: 'http',
            clientCertificate: {
                cipherText: '$M$myCert',
                class: 'Secret',
                protected: 'SecureVault'
            },
            privateKey: {
                cipherText: '$M$myKey',
                class: 'Secret',
                protected: 'SecureVault'
            },
            rootCertificate: {
                cipherText: '$M$myCA',
                class: 'Secret',
                protected: 'SecureVault'
            }
        }),
        /should NOT be valid/
    ));

    describe('gRPC exporter', () => {
        it('should pass minimal declaration', () => shared.validateMinimal(
            {
                type: 'OpenTelemetry_Exporter',
                host: 'host',
                port: 55681,
                exporter: 'grpc'
            },
            {
                type: 'OpenTelemetry_Exporter',
                host: 'host',
                port: 55681,
                convertBooleansToMetrics: false,
                exporter: 'grpc',
                useSSL: true
            }
        ));

        it('should allow full declaration', () => shared.validateFull(
            {
                type: 'OpenTelemetry_Exporter',
                host: 'host',
                port: 55681,
                headers: [
                    {
                        name: 'headerName',
                        value: 'headerValue'
                    }
                ],
                convertBooleansToMetrics: true,
                exporter: 'grpc',
                useSSL: true,
                privateKey: {
                    cipherText: 'myKey'
                },
                clientCertificate: {
                    cipherText: 'myCert'
                },
                rootCertificate: {
                    cipherText: 'myCA'
                }
            },
            {
                type: 'OpenTelemetry_Exporter',
                host: 'host',
                port: 55681,
                headers: [
                    {
                        name: 'headerName',
                        value: 'headerValue'
                    }
                ],
                convertBooleansToMetrics: true,
                exporter: 'grpc',
                useSSL: true,
                clientCertificate: {
                    cipherText: '$M$myCert',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                privateKey: {
                    cipherText: '$M$myKey',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                rootCertificate: {
                    cipherText: '$M$myCA',
                    class: 'Secret',
                    protected: 'SecureVault'
                }
            }
        ));

        schemaValidationUtil.generateSchemaBasicTests(
            basicSchemaTestsValidator,
            {
                host: 'host',
                type: 'OpenTelemetry_Exporter',
                port: 80,
                exporter: 'grpc',
                useSSL: true,
                clientCertificate: {
                    cipherText: '$M$myCert',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                privateKey: {
                    cipherText: '$M$myKey',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                rootCertificate: {
                    cipherText: '$M$myCA',
                    class: 'Secret',
                    protected: 'SecureVault'
                }
            },
            [
                { property: 'rootCertificate', optionalPropTests: true },
                { property: 'privateKey', dependenciesTests: 'clientCertificate', ignoreOther: true },
                { property: 'clientCertificate', dependenciesTests: 'privateKey', ignoreOther: true }
            ]
        );

        it('should fail when gRPC options used for non-gRPC exporter', () => assert.isRejected(
            shared.validateMinimal({
                type: 'OpenTelemetry_Exporter',
                host: 'host',
                port: 55681,
                exporter: 'json',
                useSSL: true,
                clientCertificate: {
                    cipherText: '$M$myCert',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                privateKey: {
                    cipherText: '$M$myKey',
                    class: 'Secret',
                    protected: 'SecureVault'
                }
            }),
            /should NOT be valid/
        ));

        it('should fail when non-gRPC options used for gRPC exporter (metricPath)', () => assert.isRejected(
            shared.validateMinimal({
                type: 'OpenTelemetry_Exporter',
                host: 'host',
                port: 55681,
                exporter: 'grpc',
                useSSL: true,
                clientCertificate: {
                    cipherText: '$M$myCert',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                privateKey: {
                    cipherText: '$M$myKey',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                metricsPath: '/v1/metrics'
            }),
            /should NOT be valid/
        ));

        it('should fail when non-gRPC options used for gRPC exporter (protocol)', () => assert.isRejected(
            shared.validateMinimal({
                type: 'OpenTelemetry_Exporter',
                host: 'host',
                port: 55681,
                exporter: 'grpc',
                useSSL: true,
                clientCertificate: {
                    cipherText: '$M$myCert',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                privateKey: {
                    cipherText: '$M$myKey',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                protocol: 'https'
            }),
            /should NOT be valid/
        ));

        it('should fail when useSSL === false and privateKey and clientCertificate specified', () => assert.isRejected(
            shared.validateMinimal({
                type: 'OpenTelemetry_Exporter',
                host: 'host',
                port: 55681,
                exporter: 'grpc',
                useSSL: false,
                clientCertificate: {
                    cipherText: '$M$myCert',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                privateKey: {
                    cipherText: '$M$myKey',
                    class: 'Secret',
                    protected: 'SecureVault'
                },
                rootCertificate: {
                    cipherText: '$M$myCA',
                    class: 'Secret',
                    protected: 'SecureVault'
                }
            }),
            /should NOT be valid/
        ));
    });
});
