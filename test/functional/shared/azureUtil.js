/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const util = require('./util');


function getOAuthToken(clientId, clientSecret, tenantId) {
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: [
            'grant_type=client_credentials',
            `client_id=${clientId}`,
            'redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient',
            `client_secret=${encodeURIComponent(clientSecret)}`,
            'resource=https://api.loganalytics.io/'
        ].join('&')
    };
    return util.makeRequest(
        'login.microsoftonline.com',
        `/${tenantId}/oauth2/token`,
        options
    );
}

function queryLogs(oauthToken, workspaceId, queryString) {
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: queryString })

    };
    return util.makeRequest(
        'api.loganalytics.io',
        `/v1/workspaces/${workspaceId}/query`,
        options
    );
}

module.exports = {
    getOAuthToken,
    queryLogs
};
