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
        BASIC_EXAMPLE: `${__dirname}/basic.json`,
        FILTER_EXAMPLE: `${__dirname}/filter_system_poller.json`,
        ACTION_CHAINING_EXAMPLE: `${__dirname}/system_poller_chained_actions.json`,
        FILTERING_WITH_MATCHING_EXAMPLE: `${__dirname}/system_poller_matched_filtering.json`,
        ENDPOINTLIST_EXAMPLE: `${__dirname}/system_poller_endpointlist.json`,
        BASIC_PULL_CONSUMER_EXAMPLE: `${__dirname}/basic_pull_consumer.json`,
        CONSUMER_NAME: 'My_Consumer',
        SYSTEM_NAME: 'My_System',
        SYSTEM_POLLER_SCHEMA: fs.realpathSync(`${__dirname}/../../../shared/output_schemas/system_poller_schema.json`)
    },
    ENV_VARS: {
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
            APPINS_INSTR_KEY: 'AZURE_APPINS_INSTR_KEY',
            APPINS_API_KEY: 'AZURE_APPINS_API_KEY',
            APPINS_APP_ID: 'AZURE_APPINS_APP_ID',
            CLOUD_TYPE: 'AZURE_CLOUD_TYPE'
        },
        TEST_CONTROLS: {
            REUSE_INSTALLED_PACKAGE: 'REUSE_INSTALLED_PACKAGE',
            SKIP_DUT_TESTS: 'SKIP_DUT_TESTS',
            SKIP_CONSUMER_TESTS: 'SKIP_CONSUMER_TESTS',
            SKIP_PULL_CONSUMER_TESTS: 'SKIP_PULL_CONSUMER_TESTS'
        },
        GCP_PROJECT_ID: 'GCP_PROJECT_ID',
        GCP_PRIVATE_KEY_ID: 'GCP_PRIVATE_KEY_ID',
        GCP_PRIVATE_KEY: 'GCP_PRIVATE_KEY',
        GCP_SERVICE_EMAIL: 'GCP_SERVICE_EMAIL'
    },
    EVENT_LISTENER_PORT: 6514,
    REQUEST: {
        PORT: 443,
        PROTOCOL: 'https'
    },
    CONSUMERS_DIR: `${__dirname}/../consumersTests`,
    PULL_CONSUMERS_DIR: `${__dirname}/../pullConsumersTests`,
    ARTIFACTS_DIR: `${__dirname}/../../artifacts`,
    BASE_ILX_URI: '/mgmt/shared/telemetry'
};
