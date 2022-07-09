/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const constants = require('../constants');
const logger = require('../utils/logger').getChild('azureUtils');
const miscUtils = require('../utils/misc');
const request = require('../utils/request');

/**
 * @module test/functional/shared/cloudUtils/azure
 */

const AZURE = {
    GOV: {
        appInsights: {
            api: 'api.applicationinsights.us'
        },
        logAnalytics: {
            api: 'api.loganalytics.us'
        },
        login: 'login.microsoftonline.us',
        resource: 'https://api.loganalytics.us/'
    },
    PUBLIC: {
        appInsights: {
            api: 'api.applicationinsights.io'
        },
        logAnalytics: {
            api: 'api.loganalytics.io'
        },
        login: 'login.microsoftonline.com',
        resource: 'https://api.loganalytics.io/'
    }
};

const SERVICE_TYPE = Object.freeze({
    AI: 'AppInsights',
    LA: 'LogAnalytics'
});

/**
 * Get Azure constants by cloud type
 *
 * @private
 *
 * @param {string} [cloudType = 'PUBLIC']
 *
 * @returns {Object}
 */
function getAzure(cloudType) {
    return AZURE[typeof cloudType === 'string' && cloudType.toLowerCase() === 'gov' ? 'GOV' : 'PUBLIC'];
}

/**
 * Gather info about harness from process.env
 *
 * @public
 *
 * @returns {Array<Object>}
 */
function getCloudHarnessJSON() {
    return [{
        admin_ip: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.VM_IP),
        f5_hostname: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.VM_HOSTNAME),
        f5_rest_api_port: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.VM_PORT, {
            defaultValue: constants.CLOUD.AZURE.BIGIP.REST_API.DEFAULT_PORT
        }),
        f5_rest_user: {
            username: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.VM_USER, {
                defaultValue: constants.CLOUD.AZURE.BIGIP.REST_API.DEFAULT_USER
            }),
            password: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.VM_PWD)
        },
        f5_validate_certs: false,
        is_f5_device: true,
        ssh_port: constants.CLOUD.AZURE.BIGIP.SSH.DEFAULT_PORT,
        ssh_user: {
            username: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.VM_USER, {
                defaultValue: constants.CLOUD.AZURE.BIGIP.REST_API.DEFAULT_USER
            }),
            password: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.VM_PWD)
        }
    }];
}

/**
 * Get Azure API Cloud metadata from process env
 *
 * @public
 *
 * @param {'LogAnalytics' | 'AppInsights'} serviceType - service type
 *
 * @returns {Promise<AzureAppInsightsCloudMetadata | AzureLACloudMetadata>}
 */
function getCloudMetadataFromProcessEnv(serviceType) {
    return new Promise((resolve) => {
        if (serviceType === SERVICE_TYPE.LA) {
            resolve({
                clientID: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.CLIENT_ID),
                cloudType: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.CLOUD_TYPE, {
                    defaultValue: 'PUBLIC'
                }),
                logKey: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.LOG_KEY),
                tenant: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.TENANT),
                workspace: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.WORKSPACE_MI)
            });
        } else {
            resolve({
                apiKey: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.APPINS_API_KEY),
                appID: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.APPINS_APP_ID),
                cloudType: miscUtils.getEnvArg(constants.ENV_VARS.AZURE.CLOUD_TYPE, {
                    defaultValue: 'PUBLIC'
                })
            });
        }
    });
}

/**
 * Get Azure API metadata from process env
 *
 * @public
 *
 * @param {'LogAnalytics' | 'AppInsights'} serviceType - service type
 *
 * @returns {Promise<AzureLAMetadata | Array<AzureAppInsightsMetadata>>}
 */
function getMetadataFromProcessEnv(serviceType) {
    return new Promise((resolve, reject) => {
        const envVar = serviceType === SERVICE_TYPE.LA
            ? constants.ENV_VARS.AZURE.LA_API_DATA
            : constants.ENV_VARS.AZURE.APPINS_API_DATA;

        logger.info('Reading Azure API data env variable', { envVar, serviceType });

        const apiDataFilePath = miscUtils.getEnvArg(envVar);
        logger.info('Reading Azure API data from file', { apiDataFilePath, serviceType });

        miscUtils.readJsonFile(apiDataFilePath, true)
            .then(resolve, reject);
    });
}

/**
 * Get auth token
 *
 * @public
 *
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} tenantId
 * @param {'GOV' | 'PUBLIC'} [cloudType = 'PUBLIC']
 *
 * @returns {Promise<string>} resolved with access token
 */
function getOAuthToken(clientId, clientSecret, tenantId, cloudType) {
    const azure = getAzure(cloudType);
    return request({
        body: [
            'grant_type=client_credentials',
            `client_id=${clientId}`,
            `redirect_uri=https://${azure.login}/common/oauth2/nativeclient`,
            `client_secret=${encodeURIComponent(clientSecret)}`,
            `resource=${azure.resource}`
        ].join('&'),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        host: azure.login,
        json: false,
        method: 'POST',
        port: 443,
        protocol: 'https',
        uri: `/${tenantId}/oauth2/token`
    })
        .then((data) => data.access_token);
}

/**
 * Query Application Insights service
 *
 * @public
 *
 * @param {string} appId
 * @param {string} apiKey
 * @param {'GOV' | 'PUBLIC'} [cloudType = 'PUBLIC']
 *
 * @returns {Promise}
 */
function queryAppInsights(appId, apiKey, cloudType) {
    const azure = getAzure(cloudType);
    return request({
        headers: {
            'x-api-key': apiKey
        },
        host: azure.appInsights.api,
        port: 443,
        protocol: 'https',
        uri: `/v1/apps/${appId}/metrics/customMetrics/F5_system_tmmMemory?timespan=PT5M`
    });
}

/**
 * Query Azure Log Analytics service
 *
 * @public
 *
 * @param {string} oauthToken
 * @param {string} workspaceId
 * @param {string} queryString
 * @param {'GOV' | 'PUBLIC'} [cloudType = 'PUBLIC']
 *
 * @returns {Promise}
 */
function queryLogs(oauthToken, workspaceId, queryString, cloudType) {
    const azure = getAzure(cloudType);
    return request({
        body: { query: queryString },
        headers: {
            Authorization: `Bearer ${oauthToken}`,
            'Content-Type': 'application/json'
        },
        host: azure.logAnalytics.api,
        json: true,
        method: 'POST',
        port: 443,
        protocol: 'https',
        uri: `/v1/workspaces/${workspaceId}/query`
    });
}

module.exports = {
    getOAuthToken,
    getCloudHarnessJSON,
    getCloudMetadataFromProcessEnv,
    getMetadataFromProcessEnv,
    queryLogs,
    queryAppInsights,
    SERVICE_TYPE
};

/**
 * @typedef AzureAppInsightsMetadata
 * @type {Object}
 * @property {string} apiKey
 * @property {string} appID
 * @property {string} instrKey
 * @property {string} region
 */
/**
 * @typedef AzureAppInsightsCloudMetadata
 * @type {AzureLAMetadata}
 * @property {string} cloudType
 * @property {string} [instrKey]
 * @property {string} [region]
 */
/**
 * @typedef AzureLAMetadata
 * @type {Object}
 * @property {string} clientID
 * @property {string} logKey
 * @property {string} passphrase
 * @property {string} tenant
 * @property {string} workspace
 */
/**
 * @typedef AzureLACloudMetadata
 * @type {AzureLAMetadata}
 * @property {string} cloudType
 * @property {string} [passphrase]
 */
