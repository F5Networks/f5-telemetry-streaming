/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const azureUtil = require('../../../src/lib/consumers/shared/azureUtil');
const gcpUtil = require('../../../src/lib/consumers/shared/gcpUtil');
const metadataUtil = require('../../../src/lib/utils/metadata');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Metadata Util', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('.getInstanceMetadata', () => {
        const azureMetadata = {
            compute: {
                azEnvironment: 'AZUREPUBLICCLOUD',
                location: 'westus',
                name: 'examplevmname',
                offer: 'Windows',
                osType: 'linux',
                placementGroupId: 'f67c14ab-e92c-408c-ae2d-da15866ec79a',
                plan: {
                    name: 'planName',
                    product: 'planProduct',
                    publisher: 'planPublisher'
                },
                publisher: 'RDFE-Test-Microsoft-Windows-Server-Group',
                resourceGroupName: 'test-rg',
                resourceId: '/subscriptions/8d10da13-8125-4ba9-a717-bf7490507b3d/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/examplevmname',
                subscriptionId: '8d10da13-8125-4ba9-a717-bf7490507b3d',
                tags: 'baz:bash;foo:bar',
                version: '15.05.22',
                vmId: '02aab8a4-74ef-476e-8182-f6d2ba4166a6',
                vmScaleSetName: 'crpteste9vflji9',
                vmSize: 'Standard_A3',
                zone: ''
            }
        };

        const googleMetadata = {
            attributes: {},
            cpuPlatform: 'Intel Broadwell',
            description: '',
            hostname: 'myHost.a.project.internal',
            id: 12345678,
            image: 'projects/ubuntu-os-cloud/global/images/ubuntu',
            machineType: 'projects/1234/machineTypes/n1-standard-1',
            maintenanceEvent: 'NONE',
            name: 'myHost',
            tags: [],
            zone: 'projects/1234/zones/us-west1-b'
        };

        it('should return metadata available for applicable consumer (Azure Log Analytics)', () => {
            sinon.stub(azureUtil, 'getInstanceMetadata').resolves(azureMetadata);
            const mockConsumer = {
                config: {
                    type: 'Azure_Log_Analytics'
                }
            };
            return metadataUtil.getInstanceMetadata(mockConsumer)
                .then((metadata) => {
                    assert.deepStrictEqual(metadata, azureMetadata);
                });
        });

        it('should return metadata available for applicable consumer (Google Cloud Monitoring)', () => {
            sinon.stub(gcpUtil, 'getInstanceMetadata').resolves(googleMetadata);
            const mockConsumer = {
                config: {
                    type: 'Google_Cloud_Monitoring'
                }
            };
            return metadataUtil.getInstanceMetadata(mockConsumer)
                .then((metadata) => {
                    assert.deepStrictEqual(metadata, googleMetadata);
                });
        });

        it('should return null and not throw an error if lookup fails', () => {
            sinon.stub(azureUtil, 'getInstanceMetadata').rejects({ message: 'Let\'s say this failed' });
            const mockConsumer = {
                config: {
                    type: 'Azure_Log_Analytics'
                }
            };

            return metadataUtil.getInstanceMetadata(mockConsumer)
                .then((metadata) => {
                    assert.strictEqual(metadata, null);
                });
        });

        it('should return null if lookup returns empty', () => {
            sinon.stub(azureUtil, 'getInstanceMetadata').resolves({});
            const mockConsumer = {
                config: {
                    type: 'Azure_Log_Analytics'
                }
            };

            return metadataUtil.getInstanceMetadata(mockConsumer)
                .then((metadata) => {
                    assert.strictEqual(metadata, null);
                });
        });

        it('should retry once if first lookup fails', () => {
            const apiCallStub = sinon.stub(azureUtil, 'getInstanceMetadata');
            apiCallStub.onCall(0).rejects({ message: 'Let\'s say this failed' });
            apiCallStub.onCall(1).rejects({ message: 'Let\'s say this failed yet again' });
            apiCallStub.onCall(2).resolves(azureMetadata);
            const mockConsumer = {
                config: {
                    type: 'Azure_Log_Analytics'
                }
            };

            return metadataUtil.getInstanceMetadata(mockConsumer)
                .then((metadata) => {
                    assert.strictEqual(apiCallStub.callCount, 2);
                    assert.strictEqual(metadata, null);
                });
        });
    });
});
