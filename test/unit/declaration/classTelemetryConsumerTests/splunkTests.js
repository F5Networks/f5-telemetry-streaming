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

const common = require('../common');
const schemaValidationUtil = require('../../shared/schemaValidation');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> Splunk', () => {
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
            type: 'Splunk',
            host: 'host',
            passphrase: {
                cipherText: 'cipherText'
            }
        },
        {
            type: 'Splunk',
            host: 'host',
            protocol: 'https',
            port: 8088,
            format: 'default',
            passphrase: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$cipherText'
            },
            compressionType: 'gzip'
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Splunk',
            host: 'host',
            protocol: 'http',
            port: 80,
            format: 'legacy',
            passphrase: {
                cipherText: 'cipherText'
            },
            proxy: {
                host: 'localhost',
                protocol: 'http',
                port: 80,
                allowSelfSignedCert: true,
                enableHostConnectivityCheck: false,
                username: 'username',
                passphrase: {
                    cipherText: 'passphrase'
                }
            },
            compressionType: 'gzip'
        },
        {
            type: 'Splunk',
            host: 'host',
            protocol: 'http',
            port: 80,
            format: 'legacy',
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
                    cipherText: '$M$passphrase'
                }
            },
            compressionType: 'gzip'
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'Splunk',
            host: 'host',
            passphrase: {
                cipherText: 'cipherText'
            },
            compressionType: 'none',
            customOpts: [
                { name: 'keepAlive', value: true },
                { name: 'keepAliveMsecs', value: 0 },
                { name: 'maxSockets', value: 0 },
                { name: 'maxFreeSockets', value: 0 }
            ]
        },
        [
            {
                property: 'compressionType',
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
        ]
    );
});
