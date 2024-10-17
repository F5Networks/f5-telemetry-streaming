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

const crypto = require('crypto');
const hasProperty = require('lodash/has');
const promiseUtil = require('../../utils/promise');
const requestsUtil = require('../../utils/requests');

/**
 * See {@link ../README.md#Azure} for documentation
 */

const AZURE_API_TYPES = {
    MGMT: 'management',
    OPINSIGHTS: 'opinsights'
};

// This ip is the standard link-local address used by cloud platforms to host info
const METADATA_URL = 'http://169.254.169.254/metadata'; // gitleaks:allow

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

/**
 * Retrieves the custom URL if it was defined by the consumer
 *
 * @param {Object} context - context object including config
 * @param {String} apiType - type of the endpoint URL
 * @returns {String} - a custom URL for 'apiType' endpoint (if set in 'context')
 */
function getCustomUrl(context, apiType) {
    switch (apiType) {
    case AZURE_API_TYPES.MGMT:
        return context.config.managementEndpointUrl;
    case AZURE_API_TYPES.OPINSIGHTS:
        return context.config.odsOpinsightsEndpointUrl;
    default:
        return undefined;
    }
}

function getApiUrl(context, apiType) {
    // custom url overrides everything
    const customUrl = getCustomUrl(context, apiType);
    if (customUrl !== undefined) {
        return customUrl;
    }
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
        .then((resp) => resp.access_token)
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
            const listWorkspaceBySubOpts = resp.value.map((v) => ({
                fullURI: `${mgmtUrl}/subscriptions/${v.subscriptionId}/providers/Microsoft.OperationalInsights/workspaces?api-version=2015-11-01-preview`,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                allowSelfSignedCert: context.config.allowSelfSignedCert
            }));

            const workspacePromises = listWorkspaceBySubOpts
                .map((o) => requestsUtil.makeRequest(o)
                    .then((items) => items.value)
                    .catch((e) => {
                        context.logger.exception('Error when listing workspaces', e);
                        // don't reject right away when one of the subscription list action failed for some reason
                        return e;
                    }));

            return promiseUtil.allSettled(workspacePromises)
                .then((results) => {
                    const values = Array.prototype.concat.apply([], promiseUtil.getValues(results));
                    const workspaces = values.filter((r) => r.properties && r.properties.customerId);
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
            const matched = resp.filter((v) => v.properties.customerId === workspaceGuid);
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
                .then((response) => response.primarySharedKey)
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
                    keys = context.config.instrumentationKey.map((iKey) => ({
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
            const listAppInsightsBySubOpts = resp.value.map((v) => ({
                fullURI: `${mgmtUrl}/subscriptions/${v.subscriptionId}/providers/Microsoft.Insights/components?api-version=2015-05-01`,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                allowSelfSignedCert: context.config.allowSelfSignedCert
            }));

            const aiResourcesPromises = listAppInsightsBySubOpts
                .map((o) => requestsUtil.makeRequest(o)
                    .then((items) => items.value)
                    .catch((e) => {
                        context.logger.error(`Error when listing Application Insights resources: ${e.stack}`);
                        // don't reject right away when one of the subscription list action failed for some reason
                        return e;
                    }));

            return promiseUtil.allSettled(aiResourcesPromises);
        })
        .then((results) => {
            const values = Array.prototype.concat.apply([], promiseUtil.getValues(results));
            const aiResources = values.filter((r) => r.properties && r.properties.InstrumentationKey
                && (aiNamePattern ? r.name.match(aiNamePattern) : true));
            if (aiResources.length === 0) {
                return Promise.reject(new Error(`Unable to find Application Insights resources for subscription(s). Name filter: ${aiNamePattern || 'none'}`));
            }
            const instrKeys = aiResources.map((a) => (
                { name: a.name, instrKey: a.properties.InstrumentationKey, connString: a.properties.ConnectionString }
            ));
            return instrKeys;
        });
}

/**
 *
 * Check if keys of data can be dropped because there is enough info in values.
 * Usually, they originate from TMM configuration and have 'name' property
 *
 * @param {Object} data - data to send to the consumer
 * @param {String} type - type of the data
 * @param {Boolean} isPoolMembersType - true if type is one of pool member types
 *
 * @returns {Boolean} true if keys can be dropped
 */
function isConfigItems(data, type, isPoolMembersType) {
    /* Pool members' top keys are artificially generated in splitMembersFromPools
        in order to handle a pool member participating in several pools.
        Thus, comparison of the top key and the pool member names is useless. */
    if (isPoolMembersType) {
        return true;
    }

    // is it of type sslCerts or keys are of format of format /.../...
    if (type === 'sslCerts' || type === 'asmAttackSignatures' || Object.keys(data).every((key) => /\/[^/]*\/.*/.test(key))) {
        // check that the key is the same as property 'name'
        return Object.keys(data)
            .every((key) => typeof data[key] === 'object' && key === data[key].name);
    }
    return false;
}

/**
 *
 * Drop the keys and return the values of data
 *
 * @param {Object} data - data to send to the consumer
 *
 * @returns {Array} values of data
 */
function transformConfigItems(data) {
    return Object.keys(data).map((key) => data[key]);
}

class ClassPoolToMembersMapping {
    constructor() {
        this.poolToMembersMapping = {
            pools: 'poolMembers',
            aPools: 'aPoolMembers',
            aaaaPools: 'aaaaPoolMembers',
            cnamePools: 'cnamePoolMembers',
            mxPools: 'mxPoolMembers',
            naptrPools: 'naptrPoolMembers',
            srvPools: 'srvPoolMembers'
        };
    }

    /**
     *
     * Check if "type" is a type of a pool
     *
     * @param {String} type - type of a data (a table name in Azure Logs)
     *
     * @returns {Boolean} Returns true iff "type" is a type of a pool
     */
    isPoolType(type) {
        return hasProperty(this.poolToMembersMapping, type);
    }

    /**
     *
     * Check if "type" is a type of a pool members
     *
     * @param {String} type - type of a data (a table name in Azure Logs)
     *
     * @returns {Boolean} Returns true iff "type" is a type of a pool members
     */
    isPoolMembersType(type) {
        return Object.keys(this.poolToMembersMapping)
            .some((poolType) => this.poolToMembersMapping[poolType] === type);
    }

    /**
     *
     * Translate the pool type into the pool members Type
     *
     * @param {String} poolType - type of a pool
     *
     * @returns {String} Returns type of a pool members
     */
    getPoolMembersType(poolType) {
        return this.isPoolType(poolType)
            ? this.poolToMembersMapping[poolType]
            : null;
    }

    /**
     *
     * Build an object that will complete the data received by the consumer.
     * It will eventually contain all the data of pool members.
     * The top keys (e.g. "poolMembers") will become table names in Azure Logs.
     *
     * @param {Object} allPoolMembers - object containing pool member data
     */
    buildPoolMemeberHolder(allPoolMembers) {
        Object.keys(this.poolToMembersMapping).forEach((poolType) => {
            // initially there are no pool members
            allPoolMembers[this.poolToMembersMapping[poolType]] = {};
        });
    }
}

/**
 *
 * Remove pool members from the pools, and add them to the object of all pool members.
 *
 * @param {Object} pool - a pool object that also contains its pool members
 * @param {Object} poolMembersOfAType - the object that contains all pool members of all the pools of a particular type
 */
function splitMembersFromPools(pool, poolMembersOfAType) {
    if (pool.members && typeof pool.members === 'object') {
        Object.keys(pool.members).forEach((poolMember) => {
            const poolMemberObj = pool.members[poolMember];
            if (typeof poolMemberObj === 'object' && poolMemberObj.poolName) {
                /* Create a unique name composed of the pool member name and the pool name
                   in order to handle a pool member participating in several pools.
                   This name will be discarded later by transformConfigItems */
                const compositeName = poolMember.concat('-separator-', poolMemberObj.poolName);
                poolMembersOfAType[compositeName] = poolMemberObj;
                // Pool member name might not be configured
                poolMembersOfAType[compositeName].name = poolMember;
                delete pool.members[poolMember];
            }
        });
        if (Object.keys(pool.members).length === 0) {
            delete pool.members;
        }
    }
}

/**
 *
 * Some columns are reserved for Azure Log Analytics.
 * Rename keys with these names.
 *
 * @param {Object} data - data to send to the consumer
 */
function scrubReservedKeys(data) {
    // rename/prefix certain reserved keywords, this is necessary because Azure LA
    // will accept messages and then silently drop them in post-processing if
    // they contain certain top-level keys such as 'tenant'
    const reserved = ['tenant'];
    reserved.forEach((item) => {
        if (typeof data[item] !== 'undefined') {
            data[`f5${item}`] = data[item];
            delete data[item];
        }
    });
}

module.exports = {
    signSharedKey,
    getSharedKey,
    getMetrics,
    getInstrumentationKeys,
    getApiUrl,
    getInstanceMetadata,
    isConfigItems,
    transformConfigItems,
    ClassPoolToMembersMapping,
    splitMembersFromPools,
    scrubReservedKeys
};
