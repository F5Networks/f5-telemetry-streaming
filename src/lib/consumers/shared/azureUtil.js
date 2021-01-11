/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const crypto = require('crypto');
const requestsUtil = require('../../utils/requests');

/**
 * See {@link ../README.md#Azure} for documentation
 */

const AZURE_API_TYPES = {
    MGMT: 'management',
    OPINSIGHTS: 'opinsights'
};

// This ip is the standard link-local address used by cloud platforms to host info
const METADATA_URL = 'http://169.254.169.254/metadata';

function getInstanceMetadata(context) {
    const metadataOpts = {
        fullURI: `${METADATA_URL}/instance?api-version=2019-03-11`,
        headers: {
            Metadata: true
        },
        allowSelfSignedCert: context.config.allowSelfSignedCert,
        // by default request lib will reuse connections
        // which is problematic when instance is not on cloud and no metadata
        // ECONNRESETs happen and sockets not managed correctly resulting in memory leak
        // apparent when we process event listener data due to volume and number of calls
        agentOptions: { keepAlive: false },
        timeout: 5 * 1000 // Only wait 5s for Metadata Service response
    };

    return requestsUtil.makeRequest(metadataOpts);
}

function getInstanceRegion(context) {
    if (context.config.region) {
        return context.config.region.toLowerCase();
    }
    if (context.metadata && context.metadata.compute) {
        return context.metadata.compute.location.toLowerCase();
    }
    return '';
}

function isGovCloud(region) {
    return region.startsWith('usgov') || region.startsWith('usdod');
}

function getApiDomain(region, apiType) {
    const isGov = isGovCloud(region);

    switch (apiType) {
    case AZURE_API_TYPES.MGMT:
        return isGov ? 'usgovcloudapi.net' : 'azure.com';
    case AZURE_API_TYPES.OPINSIGHTS:
        return isGov ? 'azure.us' : 'azure.com';
    default:
        return 'azure.com';
    }
}

function getApiUrl(context, apiType) {
    const region = getInstanceRegion(context);
    const domain = getApiDomain(region, apiType);
    if (apiType === AZURE_API_TYPES.OPINSIGHTS) {
        return `https://${context.config.workspaceId}.ods.opinsights.${domain}/api/logs?api-version=2016-04-01`;
    }
    return `https://management.${domain}`;
}

/**
 * Generates a signature for sharedKey to use for authentication
 *
 * @param {String} keyToUse sharedKey
 * @param {String} date date in UTC
 * @param {String} httpBody JSON request body
 * @returns {String} signature
 */
function signSharedKey(keyToUse, date, httpBody) {
    const contentLength = Buffer.byteLength(httpBody, 'utf8');
    const stringToSign = `POST\n${contentLength}\napplication/json\nx-ms-date:${date}\n/api/logs`;
    return crypto.createHmac('sha256', Buffer.from(keyToUse, 'base64')).update(stringToSign, 'utf-8').digest('base64');
}

function getAccessTokenFromMetadata(context, mgmtUrl) {
    const accessTokenOpts = {
        fullURI: `${METADATA_URL}/identity/oauth2/token?api-version=2018-02-01&resource=${mgmtUrl}/`,
        headers: {
            Metadata: 'true'
        },
        allowSelfSignedCert: context.config.allowSelfSignedCert
    };
    return requestsUtil.makeRequest(accessTokenOpts)
        .then(resp => resp.access_token)
        .catch((err) => {
            context.logger.error(`Unable to generate access token. Error: ${err.message}`);
            return Promise.reject(err);
        });
}

function listSubscriptions(accessToken, url) {
    const listSubOpts = {
        fullURI: `${url}/subscriptions?api-version=2019-11-01`,
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    };

    return requestsUtil.makeRequest(listSubOpts);
}


function listWorkspaces(context, accessToken) {
    const mgmtUrl = getApiUrl(context, AZURE_API_TYPES.MGMT);

    return listSubscriptions(accessToken, mgmtUrl)
        .then((resp) => {
            const listWorkspaceBySubOpts = resp.value.map(v => ({
                fullURI: `${mgmtUrl}/subscriptions/${v.subscriptionId}/providers/Microsoft.OperationalInsights/workspaces?api-version=2015-11-01-preview`,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                allowSelfSignedCert: context.config.allowSelfSignedCert
            }));

            const workspacePromises = listWorkspaceBySubOpts
                .map(o => requestsUtil.makeRequest(o)
                    .then(items => items.value)
                    .catch((e) => {
                        context.logger.exception('Error when listing workspaces', e);
                        // don't reject right away when one of the subscription list action failed for some reason
                        return e;
                    }));

            return Promise.all(workspacePromises)
                .then((results) => {
                    const values = Array.prototype.concat.apply([], results);
                    const workspaces = values.filter(r => r.properties && r.properties.customerId);
                    if (workspaces.length === 0) {
                        return Promise.reject(new Error('Unable to list workspaces for subscription(s)'));
                    }
                    return workspaces;
                });
        });
}

function getWorkspaceResourceId(context, accessToken) {
    const workspaceGuid = context.config.workspaceId;
    return listWorkspaces(context, accessToken)
        .then((resp) => {
            const matched = resp.filter(v => v.properties.customerId === workspaceGuid);
            if (!matched) {
                return Promise.reject(new Error(`Unable to find matching workspace with id ${workspaceGuid}`));
            }
            return matched[0].id;
        });
}

/**
 * Generate sharedKey for a vm with enabled permissions
 * using managed identities
 *
 * @param {Object} context
 * @returns {String} sharedKey
 */
function getSharedKey(context) {
    let accessToken;
    const mgmtUrl = getApiUrl(context, AZURE_API_TYPES.MGMT);

    return getAccessTokenFromMetadata(context, mgmtUrl)
        .then((resp) => {
            accessToken = resp;
            return getWorkspaceResourceId(context, accessToken);
        })
        .then((resourceId) => {
            const sharedKeysOpts = {
                method: 'POST',
                fullURI: `${mgmtUrl}${resourceId}/sharedKeys?api-version=2015-11-01-preview`,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Length': 0,
                    'Content-Type': 'application/json'
                },
                allowSelfSignedCert: context.config.allowSelfSignedCert
            };
            return requestsUtil.makeRequest(sharedKeysOpts)
                .then(response => response.primarySharedKey)
                .catch((err) => {
                    context.logger.error(`Unable to get sharedKey. err: ${err.message}`);
                    return Promise.reject(err);
                });
        });
}

/**
 * Converts a data object into an array of metric objects
 * Non numeric values are skipped
 * Names will be in the format F5_{keyLevel1}_{keyLevel2}...{propName}.
 *
 * For arrays:
 *   if item contains a name prop, it will be used as key,
 *   otherwise, index will be used
 *
 * @param {Object} data The data to convert into metrics format
 * @param {String} key The key for the current data
 * @param {Array} metrics The array containing transformed data
 * @returns {Array} Data converted array of { name: 'name', value: val }
 */
function getMetrics(data, key, metrics) {
    metrics = metrics || [];

    if (typeof data === 'number') {
        metrics.push({ name: `F5_${key}`, value: data });
    }

    if (typeof data === 'string') {
        const numData = Number(data);
        if (!Number.isNaN(numData)) {
            metrics.push({ name: `F5_${key}`, value: numData });
        }
    }

    if (typeof data === 'object') {
        if (Array.isArray(data)) {
            data.forEach((d, index) => getMetrics(d, d.name ? `${key}_${d.name}` : `${key}_${index}`, metrics));
        } else {
            Object.keys(data).forEach((dataKey) => {
                const newKey = key ? `${key}_${dataKey}` : dataKey;
                getMetrics(data[dataKey], newKey, metrics);
            });
        }
    }

    return metrics;
}

function buildAppInsConnString(instrKey, region) {
    let connString;
    // default commercial endpoint instances don't need/have EndpointSuffix
    if (isGovCloud(region)) {
        connString = `InstrumentationKey=${instrKey};EndpointSuffix=applicationinsights.us`;
    }
    return connString;
}
/**
 * Retrieves the instrumentations key info to use to connect to Azure App Insights resource
 *
 * @param {Object} context - context object including config
 * @returns {Array} An array of objects { instrKey: 'string', connString: 'string' }
 */
function getInstrumentationKeys(context) {
    if (!context.config.useManagedIdentity) {
        return Promise.resolve()
            .then(() => {
                const region = getInstanceRegion(context);
                let keys;
                if (Array.isArray(context.config.instrumentationKey)) {
                    keys = context.config.instrumentationKey.map(iKey => ({
                        instrKey: iKey,
                        connString: buildAppInsConnString(iKey, region)
                    }));
                } else {
                    keys = [{
                        instrKey: context.config.instrumentationKey,
                        connString: buildAppInsConnString(context.config.instrumentationKey, region)
                    }];
                }
                return Promise.resolve(keys);
            });
    }

    const aiNamePattern = context.config.appInsightsResourceName;
    let accessToken;
    const mgmtUrl = getApiUrl(context, AZURE_API_TYPES.MGMT);

    return getAccessTokenFromMetadata(context, mgmtUrl)
        .then((resp) => {
            accessToken = resp;
            return listSubscriptions(accessToken, mgmtUrl);
        })
        .then((resp) => {
            const listAppInsightsBySubOpts = resp.value.map(v => ({
                fullURI: `${mgmtUrl}/subscriptions/${v.subscriptionId}/providers/Microsoft.Insights/components?api-version=2015-05-01`,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                allowSelfSignedCert: context.config.allowSelfSignedCert
            }));

            const aiResourcesPromises = listAppInsightsBySubOpts
                .map(o => requestsUtil.makeRequest(o)
                    .then(items => items.value)
                    .catch((e) => {
                        context.logger.error(`Error when listing Application Insights resources: ${e.stack}`);
                        // don't reject right away when one of the subscription list action failed for some reason
                        return e;
                    }));

            return Promise.all(aiResourcesPromises);
        })
        .then((results) => {
            const values = Array.prototype.concat.apply([], results);
            const aiResources = values.filter(r => r.properties && r.properties.InstrumentationKey
                && (aiNamePattern ? r.name.match(aiNamePattern) : true));
            if (aiResources.length === 0) {
                return Promise.reject(new Error(`Unable to find Application Insights resources for subscription(s). Name filter: ${aiNamePattern || 'none'}`));
            }
            const instrKeys = aiResources.map(a => (
                { name: a.name, instrKey: a.properties.InstrumentationKey, connString: a.properties.ConnectionString }
            ));
            return instrKeys;
        });
}

module.exports = {
    signSharedKey,
    getSharedKey,
    getMetrics,
    getInstrumentationKeys,
    getApiUrl,
    getInstanceMetadata
};
