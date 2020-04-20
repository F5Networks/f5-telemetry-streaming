/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
            }
        ]
    },
    getApiUrlWithRegionFromMetadata: {
        name: '.getApiUrl - region from metadata',
        tests: [
            {
                name: 'should return management URL - public cloud',
                stub: { compute: { location: 'germanynorth' } },
                config: {},
                apiType: 'management',
                expected: 'https://management.azure.com'
            },
            {
                name: 'should return management URL - gov cloud',
                stub: { compute: { location: 'UsGovVirginia' } },
                config: {},
                apiType: 'management',
                expected: 'https://management.usgovcloudapi.net'
            },
            {
                name: 'should return default management URL when unable to retrieve region from metadata',
                config: {},
                apiType: 'management',
                expected: 'https://management.azure.com'
            },
            {
                name: 'should return opinsights URL - public cloud',
                stub: { compute: { location: 'centralus' } },
                config: { workspaceId: 'metadata-pub-cloud1' },
                apiType: 'opinsights',
                expected: 'https://metadata-pub-cloud1.ods.opinsights.azure.com/api/logs?api-version=2016-04-01'
            },
            {
                name: 'should return opinsights URL - gov cloud',
                stub: { compute: { location: 'usgovarizona' } },
                config: { workspaceId: 'metadata-gov-cloud1' },
                apiType: 'opinsights',
                expected: 'https://metadata-gov-cloud1.ods.opinsights.azure.us/api/logs?api-version=2016-04-01'
            },
            {
                name: 'should return default opinsights URL when unable to retrieve region from metadata',
                config: { workspaceId: 'metadata-pub-cloud2' },
                apiType: 'opinsights',
                expected: 'https://metadata-pub-cloud2.ods.opinsights.azure.com/api/logs?api-version=2016-04-01'
            }
        ]
    }
};
