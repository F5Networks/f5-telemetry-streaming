/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const jwt = require('jsonwebtoken');

const constants = require('../constants');
const logger = require('../utils/logger').getChild('gcpUtils');
const miscUtils = require('../utils/misc');
const request = require('../utils/request');

/**
 * @module test/functional/shared/cloudUtils/gcp
 */

const GCP = {
    PUBLIC: {
        login: 'oauth2.googleapis.com',
        monitoring: 'monitoring.googleapis.com',
        scope: 'https://www.googleapis.com/auth/monitoring'
    }
};

/**
 * Get GCP constants by cloud type
 *
 * @private
 *
 * @param {string} cloudType
 *
 * @returns {Object}
 */
function getGCP() {
    return GCP.PUBLIC;
}

/**
 * Get GCP API metadata from process env
 *
 * @public
 *
 * @returns {Promise<GCPMetadata>}
 */
function getMetadataFromProcessEnv() {
    return new Promise((resolve, reject) => {
        const envVar = constants.ENV_VARS.GCP.CM_API_DATA;
        logger.info('Reading GCP Cloud Monitoring API data env variable', { envVar });

        const apiDataFilePath = miscUtils.getEnvArg(envVar);
        logger.info('Reading GCP Cloud Monitoring API data from file', { apiDataFilePath });

        miscUtils.readJsonFile(apiDataFilePath, true)
            .then(resolve, reject);
    });
}

/**
 * Get auth token
 *
 * @public
 *
 * @param {string} serviceEmail
 * @param {string} privateKey
 * @param {string} privateKeyID
 * @param {'GOV' | 'PUBLIC'} [cloudType = 'PUBLIC']
 *
 * @returns {Promise<string>} resolved with access token
 */
function getOAuthToken(serviceEmail, privateKey, privateKeyID, cloudType) {
    const gcp = getGCP(cloudType);
    const port = 443;
    const protocol = 'https';
    const uri = '/token';
    const newJwt = jwt.sign(
        {
            iss: serviceEmail,
            scope: gcp.scope,
            aud: `${protocol}://${gcp.login}${uri}`,
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000)
        },
        privateKey,
        {
            algorithm: 'RS256',
            header: {
                kid: privateKeyID,
                typ: 'JWT',
                alg: 'RS256'
            }
        }
    );
    return request({
        form: {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: newJwt
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        host: gcp.login,
        method: 'POST',
        port,
        protocol,
        uri: '/token'
    })
        .then((response) => response.access_token);
}

/**
 * Query Google Cloud Monitoring
 *
 * @public
 *
 * @param {string} accessToken
 * @param {string} projectID
 * @param {string} query
 * @param {'GOV' | 'PUBLIC'} [cloudType = 'PUBLIC']
 *
 * @returns {Promise} query results
 */
function queryCloudMonitoring(accessToken, projectID, query, cloudType) {
    const gcp = getGCP(cloudType);
    return request({
        headers: {
            Authorization: `Bearer ${accessToken}`
        },
        host: gcp.monitoring,
        port: 443,
        protocol: 'https',
        uri: `/v3/projects/${projectID}/timeSeries?${query}`
    });
}

module.exports = {
    getOAuthToken,
    getMetadataFromProcessEnv,
    queryCloudMonitoring
};

/**
 * @typedef GCPMetadata
 * @type {Object}
 * @property {string} privateKey
 * @property {string} privateKeyID
 * @property {string} projectID
 * @property {string} serviceEmail
 */
