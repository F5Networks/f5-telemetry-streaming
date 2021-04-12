/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');

module.exports = {
    DECL: {
        BASIC: `${__dirname}/basic.json`,
        BASIC_NAMESPACE: `${__dirname}/basic_namespace.json`,
        FILTER: `${__dirname}/filter_system_poller.json`,
        ACTION_CHAINING: `${__dirname}/system_poller_chained_actions.json`,
        FILTERING_WITH_MATCHING: `${__dirname}/system_poller_matched_filtering.json`,
        ENDPOINTLIST: `${__dirname}/system_poller_endpointlist.json`,
        PULL_CONSUMER_BASIC: `${__dirname}/pull_consumer_basic.json`,
        PULL_CONSUMER_WITH_NAMESPACE: `${__dirname}/pull_consumer_with_namespace.json`,
        CONSUMER_NAME: 'My_Consumer',
        SYSTEM_NAME: 'My_System',
        NAMESPACE_NAME: 'My_Namespace',
        SYSTEM_POLLER_SCHEMA: fs.realpathSync(`${__dirname}/../../../shared/output_schemas/system_poller_schema.json`)
    },
    ENV_VARS: {
        ARTIFACTORY_SERVER: 'ARTIFACTORY_SERVER',
        TEST_HARNESS: {
            FILE: 'TEST_HARNESS_FILE',
            IP: 'TEST_HOSTS',
            USER: 'TEST_HOSTS_USER',
            PWD: 'TEST_HOSTS_PWD'
        },
        CONSUMER_HARNESS: {
            FILE: 'TEST_HARNESS_FILE',
            IP: 'CONSUMER_HOSTS',
            USER: 'CONSUMER_HOSTS_USER',
            PWD: 'CONSUMER_HOSTS_PWD',
            TYPE_REGEX: 'CONSUMER_TYPE_REGEX'
        },
        PULL_CONSUMER_HARNESS: {
            TYPE_REGEX: 'PULL_CONSUMER_TYPE_REGEX'
        },
        CLOUD: {
            FILE: 'CLOUD_ENV_FILE'
        },
        AZURE: {
            WORKSPACE_MI: 'AZURE_WORKSPACE_MI',
            WORKSPACE: 'AZURE_WORKSPACE',
            TENANT: 'AZURE_TENANT',
            PASSPHRASE: 'AZURE_PASSPHRASE',
            LOG_KEY: 'AZURE_LOG_KEY',
            CLIENT_ID: 'AZURE_CLIENT_ID',
            VM_HOSTNAME: 'AZURE_VM_HOSTNAME',
            VM_PORT: 'AZURE_VM_PORT',
            VM_IP: 'AZURE_VM_IP',
            VM_USER: 'AZURE_VM_USER',
            VM_PWD: 'AZURE_VM_PWD',
            APPINS_API_DATA: 'AZURE_APPINS_API',
            APPINS_API_KEY: 'AZURE_APPINS_API_KEY',
            APPINS_APP_ID: 'AZURE_APPINS_APP_ID',
            CLOUD_TYPE: 'AZURE_CLOUD_TYPE'
        },
        AWS: {
            VM_PORT: 'AWS_VM_PORT',
            VM_IP: 'AWS_VM_IP',
            VM_USER: 'AWS_VM_USER',
            VM_PWD: 'AWS_VM_PWD',
            BUCKET: 'AWS_BUCKET',
            REGION: 'AWS_REGION',
            ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
            ACCESS_KEY_SECRET: 'AWS_SECRET_ACCESS_KEY',
            METRIC_NAMESPACE: 'AWS_METRIC_NAMESPACE'
        },
        TEST_CONTROLS: {
            REUSE_INSTALLED_PACKAGE: 'REUSE_INSTALLED_PACKAGE',
            SKIP_DUT_TESTS: 'SKIP_DUT_TESTS',
            SKIP_CONSUMER_TESTS: 'SKIP_CONSUMER_TESTS',
            SKIP_PULL_CONSUMER_TESTS: 'SKIP_PULL_CONSUMER_TESTS'
        },
        F5_CLOUD: {
            SERVICE_ACCOUNT: 'F5_CLOUD_GCP_SERVICE_ACCOUNT'
        },
        GCP: {
            PROJECT_ID: 'GCP_PROJECT_ID',
            PRIVATE_KEY_ID: 'GCP_PRIVATE_KEY_ID',
            PRIVATE_KEY: 'GCP_PRIVATE_KEY',
            SERVICE_EMAIL: 'GCP_SERVICE_EMAIL'
        }
    },
    EVENT_LISTENER_DEFAULT_PORT: 6514, // default port
    EVENT_LISTENER_SECONDARY_PORT: 56515,
    EVENT_LISTENER_NAMESPACE_PORT: 56516,
    EVENT_LISTENER_NAMESPACE_SECONDARY_PORT: 56517,
    REQUEST: {
        PORT: 443,
        PROTOCOL: 'https'
    },
    CONSUMERS_DIR: `${__dirname}/../consumersTests`,
    PULL_CONSUMERS_DIR: `${__dirname}/../pullConsumersTests`,
    ARTIFACTS_DIR: `${__dirname}/../../artifacts`,
    BASE_ILX_URI: '/mgmt/shared/telemetry'
};
