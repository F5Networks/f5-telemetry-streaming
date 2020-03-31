/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const crypto = require('crypto');
const util = require('../../util');

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

function getAccessTokenFromMetadata(context) {
    const accessTokenOpts = {
        fullURI: 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/',
        headers: {
            Metadata: 'true'
        },
        allowSelfSignedCert: context.config.allowSelfSignedCert
    };
    return util.makeRequest(accessTokenOpts)
        .then(resp => resp.access_token)
        .catch((err) => {
            context.logger.error(`Unable to generate access token. Error: ${err.message}`);
            return Promise.reject(err);
        });
}

function listSubscriptions(accessToken) {
    const listSubOpts = {
        fullURI: 'https://management.azure.com/subscriptions?api-version=2019-11-01',
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    };

    return util.makeRequest(listSubOpts);
}


function listWorkspaces(context, accessToken) {
    return listSubscriptions(accessToken)
        .then((resp) => {
            const listWorkspaceBySubOpts = resp.value.map(v => ({
                fullURI: `https://management.azure.com/subscriptions/${v.subscriptionId}/providers/Microsoft.OperationalInsights/workspaces?api-version=2015-11-01-preview`,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                allowSelfSignedCert: context.config.allowSelfSignedCert
            }));

            const workspacePromises = listWorkspaceBySubOpts
                .map(o => util.makeRequest(o)
                    .then(items => items.value)
                    .catch((e) => {
                        context.logger.error(`Error when listing workspaces: ${e.stack}`);
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
    return getAccessTokenFromMetadata(context)
        .then((resp) => {
            accessToken = resp;
            return getWorkspaceResourceId(context, accessToken);
        })
        .then((resourceId) => {
            const sharedKeysOpts = {
                method: 'POST',
                fullURI: `https://management.azure.com${resourceId}/sharedKeys?api-version=2015-11-01-preview`,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Length': 0,
                    'Content-Type': 'application/json'
                },
                allowSelfSignedCert: context.config.allowSelfSignedCert
            };
            return util.makeRequest(sharedKeysOpts)
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

function getInstrumentationKeys(context) {
    if (!context.config.useManagedIdentity) {
        const keys = Array.isArray(context.config.instrumentationKey)
            ? context.config.instrumentationKey.map(iKey => ({ instrKey: iKey }))
            : [{ instrKey: context.config.instrumentationKey }];
        return Promise.resolve(keys);
    }

    const aiNamePattern = context.config.appInsightsResourceName;
    let accessToken;

    return getAccessTokenFromMetadata(context)
        .then((resp) => {
            accessToken = resp;
            return listSubscriptions(accessToken);
        })
        .then((resp) => {
            const listAppInsightsBySubOpts = resp.value.map(v => ({
                fullURI: `https://management.azure.com/subscriptions/${v.subscriptionId}/providers/Microsoft.Insights/components?api-version=2015-05-01`,
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                allowSelfSignedCert: context.config.allowSelfSignedCert
            }));

            const aiResourcesPromises = listAppInsightsBySubOpts
                .map(o => util.makeRequest(o)
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
                { name: a.name, instrKey: a.properties.InstrumentationKey }
            ));
            return instrKeys;
        });
}

module.exports = {
    signSharedKey,
    getSharedKey,
    getMetrics,
    getInstrumentationKeys
};
