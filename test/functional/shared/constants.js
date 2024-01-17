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

const fs = require('fs');

/**
 * @module test/functional/shared/constants
 */

/**
 * Add trailing char to the string if not set
 *
 * @param {string} str
 * @param {string} char
 *
 * @returns {string}
 */
function trailingChar(str, char) {
    if (!str.endsWith(char)) {
        str = `${str}${char}`;
    }
    return str;
}

module.exports = {
    ENV_VARS: {
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
            APPINS_API_KEY: 'AZURE_APPINS_API_KEY',
            APPINS_APP_ID: 'AZURE_APPINS_APP_ID',
            CLOUD_TYPE: 'AZURE_CLOUD_TYPE',
            LA_API_DATA: 'AZURE_LA_API', // value of env var should be path to a file
            APPINS_API_DATA: 'AZURE_APPINS_API' // value of env var should be path to a file
        },
        AWS: {
            ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
            ACCESS_KEY_SECRET: 'AWS_SECRET_ACCESS_KEY',
            HARNESS_FILE: 'CLOUD_ENV_FILE',
            METRIC_NAMESPACE: 'AWS_METRIC_NAMESPACE'
        },
        TEST_CONTROLS: {
            CONSUMER: {
                DOCKER_CLEANUP: 'CONSUMER_DOCKER_CLEANUP',
                EXCLUDE: 'CONSUMER_EXCLUDE_REGEX',
                INCLUDE: 'CONSUMER_INCLUDE_REGEX'
            },
            DUT: {
                EXCLUDE: 'DUT_EXCLUDE_REGEX',
                INCLUDE: 'DUT_INCLUDE_REGEX'
            },
            HARNESS: {
                FILE: 'TEST_HARNESS_FILE'
            },
            TESTS: {
                DEV_ENV: 'TS_DEV_ENV',
                SKIP_CONSUMER_TESTS: 'SKIP_CONSUMER_TESTS',
                SKIP_DUT_SETUP: 'SKIP_DUT_SETUP',
                SKIP_DUT_TEARDOWN: 'SKIP_DUT_TEARDOWN',
                SKIP_DUT_TESTS: 'SKIP_DUT_TESTS'
            }
        },
        F5_CLOUD: {
            SERVICE_ACCOUNT: 'F5_CLOUD_GCP_SERVICE_ACCOUNT' // value of env var should be path to a file
        },
        GCP: {
            CM_API_DATA: 'GCP_CM_API_DATA' // value of env var should be path to a file
        }
    },
    ARTIFACTORY_DOCKER_HUB_PREFIX: process.env.ATG_IMG_REGISTRY_URL ? trailingChar(process.env.ATG_IMG_REGISTRY_URL, '/') : '',
    ARTIFACTS_DIR: `${__dirname}/../../artifacts`,
    BIGIP: {
        RESTNODED: {
            LOGS_DIR: '/var/log/restnoded',
            TELEMETRY_DIR: '/var/config/rest/iapps/f5-telemetry'
        }
    },
    CLOUD: {
        AWS: {
            BIGIP: {
                SSH: {
                    DEFAULT_PORT: 2222
                }
            }
        },
        AZURE: {
            BIGIP: {
                REST_API: {
                    DEFAULT_PORT: 8443,
                    DEFAULT_USER: 'admin'
                },
                SSH: {
                    DEFAULT_PORT: 2222
                }
            }
        }
    },
    CONSUMERS_DIR: `${__dirname}/../consumersTests`,
    DECL: {
        ACTION_CHAINING: `${__dirname}/data/declarations/system_poller_chained_actions.json`,
        BASIC: `${__dirname}/data/declarations/basic.json`,
        BASIC_NAMESPACE: `${__dirname}/data/declarations/basic_namespace.json`,
        CONSUMER_NAME: 'My_Consumer',
        ENDPOINTLIST: `${__dirname}/data/declarations/system_poller_endpointlist.json`,
        FILTER: `${__dirname}/data/declarations/filter_system_poller.json`,
        FILTERING_WITH_MATCHING: `${__dirname}/data/declarations/system_poller_matched_filtering.json`,
        NAMESPACE_NAME: 'My_Namespace',
        PULL_CONSUMER_BASIC: `${__dirname}/data/declarations/pull_consumer_basic.json`,
        PULL_CONSUMER_WITH_NAMESPACE: `${__dirname}/data/declarations/pull_consumer_with_namespace.json`,
        SNMP_METRICS: `${__dirname}/data/declarations/system_poller_snmp_metrics.json`,
        SYSTEM_NAME: 'My_System',
        SYSTEM_POLLER_SCHEMA: fs.realpathSync(`${__dirname}/../../../shared/output_schemas/system_poller_schema.json`)
    },
    HTTP_REQUEST: {
        PORT: 443,
        PROTOCOL: 'https',
        STRICT_SSL: true
    },
    TELEMETRY: {
        API: {
            URI: {
                PREFIX: '/mgmt/shared/telemetry'
            }
        },
        LISTENER: {
            PORT: {
                DEFAULT: 6514,
                NAMESPACE: 56516,
                NAMESPACE_SECONDARY: 56517,
                SECONDARY: 56515
            },
            PROTOCOLS: [
                'tcp',
                'udp'
            ]
        },
        NAMESPACE: {
            DEFAULT: 'f5telemetry_default'
        },
        SYSTEM_POLLER: {
            POLLING_INTERVAL: {
                DEFAULT: 60,
                DEV: 5
            },
            WAIT_TIME: {
                DEFAULT: 20000,
                DEV: 5000
            }
        }
    }
};
