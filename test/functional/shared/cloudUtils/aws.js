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

const AWS = require('aws-sdk');

const constants = require('../constants');
const miscUtils = require('../utils/misc');

/**
 * @module test/functional/shared/cloudUtils/aws
 */

/**
 * Configure AWS global config
 *
 * @param {AWSCloudMetadata} metadata
 */
function configureAWSGlobal(metadata) {
    AWS.config.update({
        accessKeyId: metadata.accessKey.id,
        region: metadata.region,
        secretAccessKey: metadata.accessKey.secret
    });
}

/**
 * Gather info about harness from process.env
 *
 * @public
 *
 * @returns {Array<Object>}
 */
function getCloudHarnessJSON() {
    const instance = getEnvFile().instances[0];
    return [{
        admin_ip: instance.mgmt_address,
        f5_hostname: `bigip_${instance.instanceId}.hostname`,
        f5_rest_api_port: instance.mgmt_port,
        f5_rest_user: {
            username: instance.admin_username,
            password: instance.admin_password
        },
        f5_validate_certs: false,
        is_f5_device: true,
        ssh_port: constants.CLOUD.AWS.BIGIP.SSH.DEFAULT_PORT,
        ssh_user: {
            username: instance.admin_username,
            password: instance.admin_password
        }
    }];
}

/**
 * Get Azure API Cloud metadata from process env
 *
 * @public
 *
 * @returns {Promise<AWSCloudMetadata>}
 */
function getCloudMetadataFromProcessEnv() {
    return new Promise((resolve) => {
        const envData = getEnvFile();
        resolve({
            accessKey: {
                id: miscUtils.getEnvArg(constants.ENV_VARS.AWS.ACCESS_KEY_ID),
                secret: miscUtils.getEnvArg(constants.ENV_VARS.AWS.ACCESS_KEY_SECRET)
            },
            bucket: envData.bucket,
            metricNamespace: miscUtils.getEnvArg(constants.ENV_VARS.AWS.METRIC_NAMESPACE),
            region: envData.region
        });
    });
}

/**
 * @public
 *
 * @returns {AWS.CloudWatch} instance
 */
function getCloudWatchClient() {
    return new AWS.CloudWatch({ apiVersion: '2010-08-01' });
}

/**
 * Read and parse AWS Cloud Env file
 *
 * @returns {AWSCloudEnvMetadata}
 */
function getEnvFile() {
    const filePath = miscUtils.getEnvArg(constants.ENV_VARS.AWS.HARNESS_FILE);
    return miscUtils.readJsonFile(filePath, false);
}

/**
 * @public
 *
 * @returns {AWS.S3} instance
 */
function getS3Client() {
    return new AWS.S3({ apiVersion: '2006-03-01' });
}

module.exports = {
    configureAWSGlobal,
    getCloudHarnessJSON,
    getCloudMetadataFromProcessEnv,
    getCloudWatchClient,
    getS3Client
};

/**
 * @typedef AWSCloudInstance
 * @type {Object}
 * @property {string} admin_password
 * @property {string} admin_username
 * @property {string} instanceId
 * @property {string} mgmt_address
 * @property {string} mgmt_port
 * @property {integer} mgmt_port
 */
/**
 * @typedef AWSCloudEnvMetadata
 * @type {Object}
 * @property {string} bucket
 * @property {string} deploymentId
 * @property {string} environment
 * @property {Array<AWSCloudInstance>} instances
 * @property {string} region
 */
/**
 * @typedef AWSCloudMetadata
 * @type {Object}
 * @property {Object} accessKey
 * @property {string} accessKey.id
 * @property {string} accessKey.secret
 * @property {string} bucket
 * @property {string} metricNamespace
 * @property {string} region
 */
