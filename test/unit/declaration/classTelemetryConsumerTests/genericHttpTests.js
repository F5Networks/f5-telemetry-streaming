/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../../shared/restoreCache')();

const sinon = require('sinon');

const common = require('../common');
const schemaValidationUtil = require('../../shared/schemaValidation');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> Generic_HTTP', () => {
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
            type: 'Generic_HTTP',
            host: 'host'
        },
        {
            type: 'Generic_HTTP',
            host: 'host',
            protocol: 'https',
            port: 443,
            path: '/',
            method: 'POST',
            outputMode: 'processed',
            compressionType: 'none'
        }
    ));

    it('should pass minimal declaration when using tls options', () => shared.validateMinimal(
        {
            type: 'Generic_HTTP',
            host: 'host',
            privateKey: {
                cipherText: 'myKey'
            },
            clientCertificate: {
                cipherText: 'myCert'
            }
        },
        {
            type: 'Generic_HTTP',
            host: 'host',
            protocol: 'https',
            port: 443,
            path: '/',
            method: 'POST',
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
            outputMode: 'processed',
            compressionType: 'none'
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Generic_HTTP',
            host: 'host',
            fallbackHosts: [
                'host1',
                'host2',
                'host3'
            ],
            protocol: 'http',
            port: 80,
            path: '/path',
            method: 'PUT',
            headers: [
                {
                    name: 'headerName',
                    value: 'headerValue'
                }
            ],
            passphrase: {
                cipherText: 'cipherText'
            },
            allowSelfSignedCert: true,
            enableHostConnectivityCheck: true,
            proxy: {
                host: 'localhost',
                protocol: 'http',
                port: 80,
                allowSelfSignedCert: true,
                enableHostConnectivityCheck: false,
                username: 'username',
                passphrase: {
                    cipherText: 'proxyPassphrase'
                }
            },
            privateKey: {
                cipherText: 'myKey'
            },
            clientCertificate: {
                cipherText: 'myCert'
            },
            rootCertificate: {
                cipherText: 'myCA'
            },
            actions: [
                {
                    JMESPath: {},
                    expression: '{ message: @ }'
                }
            ],
            outputMode: 'raw',
            compressionType: 'gzip',
            customOpts: [
                { name: 'keepAlive', value: true },
                { name: 'keepAliveMsecs', value: 0 },
                { name: 'maxSockets', value: 0 },
                { name: 'maxFreeSockets', value: 0 },
                { name: 'anotherFeatureOption', value: 'test' }
            ]
        },
        {
            type: 'Generic_HTTP',
            host: 'host',
            fallbackHosts: [
                'host1',
                'host2',
                'host3'
            ],
            allowSelfSignedCert: true,
            protocol: 'http',
            port: 80,
            path: '/path',
            method: 'PUT',
            headers: [
                {
                    name: 'headerName',
                    value: 'headerValue'
                }
            ],
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            },
            proxy: {
                host: 'localhost',
                protocol: 'http',
                port: 80,
                allowSelfSignedCert: true,
                enableHostConnectivityCheck: false,
                username: 'username',
                passphrase: {
                    class: 'Secret',
                    protected: 'SecureVault',
                    cipherText: '$M$proxyPassphrase'
                }
            },
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
            },
            actions: [
                {
                    enable: true,
                    JMESPath: {},
                    expression: '{ message: @ }'
                }
            ],
            outputMode: 'raw',
            compressionType: 'gzip',
            customOpts: [
                { name: 'keepAlive', value: true },
                { name: 'keepAliveMsecs', value: 0 },
                { name: 'maxSockets', value: 0 },
                { name: 'maxFreeSockets', value: 0 },
                { name: 'anotherFeatureOption', value: 'test' }
            ]
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            actions: [
                {
                    JMESPath: {},
                    expression: 'test'
                }
            ],
            clientCertificate: {
                cipherText: 'myCert'
            },
            fallbackHosts: ['fallbackHost'],
            host: 'host',
            privateKey: {
                cipherText: 'myKey'
            },
            type: 'Generic_HTTP',
            customOpts: [
                { name: 'keepAlive', value: true },
                { name: 'keepAliveMsecs', value: 0 },
                { name: 'maxSockets', value: 0 },
                { name: 'maxFreeSockets', value: 0 }
            ]
        },
        [
            'actions.0.expression',
            { property: 'clientCertificate', ignoreOther: true, requiredTests: true },
            'fallbackHosts.0',
            {
                property: 'fallbackHosts',
                ignoreOther: true,
                arrayLengthTests: {
                    minItems: 1
                }
            },
            'host',
            'path',
            { property: 'privateKey', ignoreOther: true, requiredTests: true },
            {
                property: ['actions', '1'],
                ignoreOther: true,
                valueTests: {
                    subTitle: 'not allow the excludeData action',
                    invalid: { excludeData: {}, locations: { system: true } }
                }
            },
            {
                property: ['actions', '1'],
                ignoreOther: true,
                valueTests: {
                    subTitle: 'not allow the includeData action',
                    invalid: { includeData: {}, locations: { system: true } }
                }
            },
            {
                property: ['actions', '1'],
                ignoreOther: true,
                valueTests: {
                    subTitle: 'not allow the setTag action',
                    invalid: { setTag: { tag: '`T`' } }
                }
            },
            {
                property: ['actions', '1'],
                ignoreOther: true,
                valueTests: {
                    subTitle: 'allow the JMESPath action',
                    valid: { JMESPath: {}, expression: 'test' }
                }
            },
            {
                property: 'actions',
                ignoreOther: true,
                valueTests: {
                    subTitle: 'allow empty array',
                    valid: []
                }
            },
            {
                property: 'compressionType',
                ignoreOther: true,
                enumTests: {
                    allowed: ['none', 'gzip'],
                    notAllowed: ['compressionType']
                }
            },
            {
                property: 'customOpts',
                ignoreOther: true,
                arrayLengthTests: {
                    minItems: 1
                }
            },
            {
                property: 'customOpts.0.value',
                ignoreOther: true,
                booleanTests: true
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
                numberRangeTests: {
                    minimum: 0
                },
                valueTests: {
                    invalid: 'invalid'
                }
            }
        ],
        { stringLengthTests: true }
    );
});
