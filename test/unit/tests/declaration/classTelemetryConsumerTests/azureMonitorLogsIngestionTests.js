/**
 * Copyright 2026 F5, Inc.
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

const moduleCache = require('@f5-telemetry-tests/unit-shared/requireCache')();
const assert = require('@f5-telemetry-tests/unit-shared/assert');
const sinon = require('sinon');

const common = require('../common');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> Azure_Monitor_Logs_Ingestion', () => {
    let coreStub;

    const validDeclaration = {
        type: 'Azure_Monitor_Logs_Ingestion',
        tenantId: 'tenant-id',
        clientId: 'client-id',
        clientSecret: {
            cipherText: 'client-secret'
        },
        dataCollectionEndpoint: 'https://example.ingest.monitor.azure.com',
        dataCollectionRuleImmutableId: 'dcr-0123456789abcdef',
        streamMappings: {
            LTM: 'Custom-F5Telemetry_LTM_CL',
            system: 'Custom-F5Telemetry_system_CL',
            ASM: 'Custom-F5Telemetry_ASM_CL',
            AVR: 'Custom-F5Telemetry_AVR_CL'
        }
    };

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

    it('should pass a minimal declaration', () => shared.validateMinimal(
        validDeclaration,
        {
            type: 'Azure_Monitor_Logs_Ingestion',
            tenantId: 'tenant-id',
            clientId: 'client-id',
            clientSecret: {
                class: 'Secret',
                protected: 'SecureVault',
                cipherText: '$M$client-secret'
            },
            dataCollectionEndpoint: 'https://example.ingest.monitor.azure.com',
            dataCollectionRuleImmutableId: 'dcr-0123456789abcdef',
            streamMappings: {
                LTM: 'Custom-F5Telemetry_LTM_CL',
                system: 'Custom-F5Telemetry_system_CL',
                ASM: 'Custom-F5Telemetry_ASM_CL',
                AVR: 'Custom-F5Telemetry_AVR_CL'
            },
            apiVersion: '2023-01-01',
            format: 'default'
        }
    ));

    [
        'tenantId',
        'clientId',
        'clientSecret',
        'dataCollectionEndpoint',
        'dataCollectionRuleImmutableId',
        'streamMappings'
    ].forEach((property) => {
        it(`should require ${property}`, () => {
            const declaration = Object.assign({}, validDeclaration);
            delete declaration[property];
            return assert.isRejected(
                shared.validateMinimal(declaration),
                new RegExp(`required.*${property}|${property}.*required`)
            );
        });
    });

    it('should reject non-HTTPS endpoints', () => {
        const declaration = Object.assign({}, validDeclaration, {
            dataCollectionEndpoint: 'http://example.monitor.azure.com'
        });
        return assert.isRejected(shared.validateMinimal(declaration));
    });

    it('should reject invalid DCR immutable IDs', () => {
        const declaration = Object.assign({}, validDeclaration, {
            dataCollectionRuleImmutableId: 'not-a-dcr-id'
        });
        return assert.isRejected(shared.validateMinimal(declaration));
    });
});
