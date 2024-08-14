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

describe('Declarations -> Telemetry_Consumer -> DataDog', () => {
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
            type: 'DataDog',
            apiKey: 'test'
        },
        {
            type: 'DataDog',
            apiKey: 'test',
            compressionType: 'none',
            region: 'US1',
            service: 'f5-telemetry',
            convertBooleansToMetrics: false
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'DataDog',
            apiKey: 'test',
            compressionType: 'gzip',
            region: 'EU1',
            service: 'my-great-application',
            metricPrefix: ['f5', 'bigip'],
            convertBooleansToMetrics: true,
            customTags: [{ name: 'deploymentName', value: 'best version' }],
            customOpts: [
                { name: 'keepAlive', value: true },
                { name: 'keepAliveMsecs', value: 0 },
                { name: 'maxSockets', value: 0 },
                { name: 'maxFreeSockets', value: 0 }
            ],
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
            }
        },
        {
            type: 'DataDog',
            apiKey: 'test',
            compressionType: 'gzip',
            region: 'EU1',
            service: 'my-great-application',
            metricPrefix: ['f5', 'bigip'],
            convertBooleansToMetrics: true,
            customTags: [{ name: 'deploymentName', value: 'best version' }],
            customOpts: [
                { name: 'keepAlive', value: true },
                { name: 'keepAliveMsecs', value: 0 },
                { name: 'maxSockets', value: 0 },
                { name: 'maxFreeSockets', value: 0 }
            ],
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
            }
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'DataDog',
            apiKey: 'test',
            index: 'index',
            metricPrefix: ['f5', 'bigip'],
            customTags: [{ name: 'deploymentName', value: 'best version' }],
            customOpts: [
                { name: 'keepAlive', value: true },
                { name: 'keepAliveMsecs', value: 0 },
                { name: 'maxSockets', value: 0 },
                { name: 'maxFreeSockets', value: 0 }
            ]
        },
        [
            { property: 'apiKey', requiredTests: true, stringLengthTests: true },
            { property: 'service', stringLengthTests: true },
            {
                property: 'compressionType',
                enumTests: {
                    allowed: ['none', 'gzip'],
                    notAllowed: ['compressionType']
                }
            },
            {
                property: 'region',
                enumTests: {
                    allowed: ['US1', 'US3', 'EU1', 'US1-FED'],
                    notAllowed: ['region']
                }
            },
            {
                property: 'metricPrefix',
                ignoreOther: true,
                arrayLengthTests: {
                    minItems: 1
                }
            },
            {
                property: 'customTags',
                ignoreOther: true,
                arrayLengthTests: {
                    minItems: 1
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
        ]
    );

    it('should fail when invalid \'convertBooleansToMetrics\' value specified', () => assert.isRejected(
        shared.validateMinimal({
            type: 'DataDog',
            apiKey: 'test',
            convertBooleansToMetrics: 'something'
        }),
        /convertBooleansToMetrics\/type.*should be boolean/
    ));
});
