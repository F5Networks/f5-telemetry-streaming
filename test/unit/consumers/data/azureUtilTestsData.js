/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    getApiUrlWithRegion: {
        name: '.getApiUrl - region specified in config',
        tests: [
            {
                name: 'should return management URL - public cloud',
                config: {
                    region: 'japaneast'
                },
                apiType: 'management',
                expected: 'https://management.azure.com'
            },
            {
                name: 'should return management URL - gov cloud',
                config: {
                    region: 'usdodcentral'
                },
                apiType: 'management',
                expected: 'https://management.usgovcloudapi.net'
            },
            {
                name: 'should return management URL based on metadata available if no region in config',
                config: {},
                metadata: {
                    compute: { location: 'usdodcentral' }
                },
                apiType: 'management',
                expected: 'https://management.usgovcloudapi.net'
            },
            {
                name: 'should return opinsights URL - public cloud',
                config: {
                    region: 'USEast',
                    workspaceId: 'public-cloud-workspace-id'
                },
                apiType: 'opinsights',
                expected: 'https://public-cloud-workspace-id.ods.opinsights.azure.com/api/logs?api-version=2016-04-01'
            },
            {
                name: 'should return opinsights URL - gov cloud',
                config: {
                    region: 'usdodeast',
                    workspaceId: 'gov-cloud-workspace-id'
                },
                apiType: 'opinsights',
                expected: 'https://gov-cloud-workspace-id.ods.opinsights.azure.us/api/logs?api-version=2016-04-01'
            },
            {
                name: 'should return opinsights URL based on metadata available if no region in config',
                config: {
                    workspaceId: 'public-cloud-workspace-id'
                },
                metadata: {
                    compute: { location: 'centralus' }
                },
                apiType: 'opinsights',
                expected: 'https://public-cloud-workspace-id.ods.opinsights.azure.com/api/logs?api-version=2016-04-01'
            }
        ]
    },
    getApiUrlWithRegionFromContextMetadata: {
        name: '.getApiUrl - region from context.metadata',
        tests: [
            {
                name: 'should return management URL - public cloud',
                metadata: { compute: { location: 'germanynorth' } },
                config: {},
                apiType: 'management',
                expected: 'https://management.azure.com'
            },
            {
                name: 'should return management URL - gov cloud',
                metadata: { compute: { location: 'UsGovVirginia' } },
                config: {},
                apiType: 'management',
                expected: 'https://management.usgovcloudapi.net'
            },
            {
                name: 'should return default management URL when unable to retrieve region from context.metadata',
                config: {},
                apiType: 'management',
                expected: 'https://management.azure.com'
            },
            {
                name: 'should return opinsights URL - public cloud',
                metadata: { compute: { location: 'centralus' } },
                config: { workspaceId: 'metadata-pub-cloud1' },
                apiType: 'opinsights',
                expected: 'https://metadata-pub-cloud1.ods.opinsights.azure.com/api/logs?api-version=2016-04-01'
            },
            {
                name: 'should return opinsights URL - gov cloud',
                metadata: { compute: { location: 'usgovarizona' } },
                config: { workspaceId: 'metadata-gov-cloud1' },
                apiType: 'opinsights',
                expected: 'https://metadata-gov-cloud1.ods.opinsights.azure.us/api/logs?api-version=2016-04-01'
            },
            {
                name: 'should return default opinsights URL when unable to retrieve region from context.metadata',
                config: { workspaceId: 'metadata-pub-cloud2' },
                apiType: 'opinsights',
                expected: 'https://metadata-pub-cloud2.ods.opinsights.azure.com/api/logs?api-version=2016-04-01'
            }
        ]
    },
    getApiUrlNoRegionNoMetadata: {
        name: '.getApiUrl - no region from config or context.metadata',
        tests: [
            {
                name: 'should return default management URL - public cloud',
                metadata: {},
                config: {},
                apiType: 'management',
                expected: 'https://management.azure.com'
            },
            {
                name: 'should return opinsights URL - public cloud',
                config: {
                    workspaceId: 'public-cloud-workspace-id'
                },
                metadata: {},
                apiType: 'opinsights',
                expected: 'https://public-cloud-workspace-id.ods.opinsights.azure.com/api/logs?api-version=2016-04-01'
            }
        ]
    },
    getCustomUrl: {
        name: '.getCustomUrl via .getApiUrl',
        tests: [
            {
                name: 'custom management endpoint url',
                config: {
                    managementEndpointUrl: 'customManagementEndpointUrl.com'
                },
                apiType: 'management',
                expected: 'customManagementEndpointUrl.com'
            },
            {
                name: 'custom ods opinsights endpoint url',
                config: {
                    odsOpinsightsEndpointUrl: 'customodsOpinsightsEndpointUrl.com'
                },
                apiType: 'opinsights',
                expected: 'customodsOpinsightsEndpointUrl.com'
            },
            {
                name: 'unknown apiType ignores the custom endpoints',
                config: {
                    managementEndpointUrl: 'customManagementEndpointUrl.com',
                    odsOpinsightsEndpointUrl: 'customodsOpinsightsEndpointUrl.com'
                },
                apiType: 'somethingElse',
                expected: 'https://management.azure.com'
            }
        ]
    }
};
