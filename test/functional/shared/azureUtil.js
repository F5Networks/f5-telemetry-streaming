/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const util = require('./util');


function getOAuthToken(clientId, clientSecret, tenantId, cloudType) {
    const loginDomain = cloudType === 'gov' ? 'login.microsoftonline.us' : 'login.microsoftonline.com';
    const resource = cloudType === 'gov' ? 'https://api.loganalytics.us/' : 'https://api.loganalytics.io/';
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: [
            'grant_type=client_credentials',
            `client_id=${clientId}`,
            `redirect_uri=https://${loginDomain}/common/oauth2/nativeclient`,
            `client_secret=${encodeURIComponent(clientSecret)}`,
            `resource=${resource}`
        ].join('&')
    };
    return util.makeRequest(
        loginDomain,
        `/${tenantId}/oauth2/token`,
        options
    );
}

function queryLogs(oauthToken, workspaceId, queryString, cloudType) {
    const apiDomain = cloudType === 'gov' ? 'api.loganalytics.us' : 'api.loganalytics.io';
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: queryString })

    };
    return util.makeRequest(
        apiDomain,
        `/v1/workspaces/${workspaceId}/query`,
        options
    );
}

function queryAppInsights(appId, apiKey, cloudType) {
    const apiDomain = cloudType === 'gov' ? 'api.applicationinsights.us' : 'api.applicationinsights.io';
    const options = {
        headers: {
            'x-api-key': apiKey
        }
    };
    return util.makeRequest(
        apiDomain,
        `/v1/apps/${appId}/metrics/customMetrics/F5_system_tmmMemory?timespan=PT3M`,
        options
    );
}

module.exports = {
    getOAuthToken,
    queryLogs,
    queryAppInsights
};
