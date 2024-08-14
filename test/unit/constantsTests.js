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

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const assert = require('./shared/assert');
const sourceCode = require('./shared/sourceCode');

const constants = sourceCode('src/lib/constants');
const packageInfo = sourceCode('package.json');

moduleCache.remember();

describe('Constants', () => {
    function getExpected() {
        const versionInfo = packageInfo.version.split('-');
        if (versionInfo.length === 1) {
            versionInfo.push('1');
        }
        // to be sure that we really have some data
        assert.isNotEmpty(versionInfo[0]);
        assert.isNotEmpty(versionInfo[1]);

        return {
            ACTIVITY_RECORDER: {
                DECLARATION_TRACER: {
                    MAX_RECORDS: 60,
                    PATH: '/var/log/restnoded/telemetryDeclarationHistory'
                }
            },
            APP_NAME: 'Telemetry Streaming',
            APP_THRESHOLDS: {
                MEMORY: {
                    ARGRESSIVE_CHECK_INTERVALS: [
                        { usage: 50, interval: 0.5 },
                        { usage: 60, interval: 0.4 },
                        { usage: 70, interval: 0.3 },
                        { usage: 80, interval: 0.2 },
                        { usage: 90, interval: 0.2 },
                        { usage: 100, interval: 0.1 }
                    ],
                    DEFAULT_CHECK_INTERVALS: [
                        { usage: 50, interval: 1.5 },
                        { usage: 60, interval: 1.0 },
                        { usage: 70, interval: 0.8 },
                        { usage: 80, interval: 0.5 },
                        { usage: 90, interval: 0.2 },
                        { usage: 100, interval: 0.1 }
                    ],
                    // default GC call interval in seconds
                    DEFAULT_GC_INTERVAL: 60,
                    // default check interval in seconds
                    DEFAULT_INTERVAL: 5,
                    DEFAULT_HEAP_SIZE: 1400,
                    // 90% should be enough for everyone
                    DEFAULT_LIMIT_PERCENT: 90,
                    DEFAULT_LOG_FREQ: 10 * 1000,
                    DEFAULT_LOG_LEVEL: 'debug',
                    // min amount of system's free memory
                    DEFAULT_MIN_FREE_MEM: 30,
                    // default minimal check interval in seconds when mem usage is >= 100%
                    DEFAULT_MIN_INTERVAL: 0.1,
                    // default percent, when exceed that value app will disable processing
                    DEFAULT_OK_USAGE_PERCENT: 100,
                    // 90% should be enough to avoid processing state flapping
                    DEFAULT_RELEASE_PERCENT: 90,
                    STATE: {
                        OK: 'MEMORY_USAGE_BELOW_THRESHOLD',
                        NOT_OK: 'MEMORY_USAGE_ABOVE_THRESHOLD'
                    },
                    TREND: {
                        DOWN: 'MEMORY_USAGE_GOES_DOWN',
                        NO_CHANGE: 'MEMORY_USAGE_NO_CHANGE',
                        UP: 'MEMORY_USAGE_GOES_UP'
                    }
                }
            },
            CONFIG_CLASSES: {
                CONSUMER_CLASS_NAME: 'Telemetry_Consumer',
                CONTROLS_CLASS_NAME: 'Controls',
                ENDPOINTS_CLASS_NAME: 'Telemetry_Endpoints',
                EVENT_LISTENER_CLASS_NAME: 'Telemetry_Listener',
                IHEALTH_POLLER_CLASS_NAME: 'Telemetry_iHealth_Poller',
                NAMESPACE_CLASS_NAME: 'Telemetry_Namespace',
                PULL_CONSUMER_CLASS_NAME: 'Telemetry_Pull_Consumer',
                PULL_CONSUMER_SYSTEM_POLLER_GROUP_CLASS_NAME: 'Telemetry_Pull_Consumer_System_Poller_Group',
                ROOT_CLASS: 'Telemetry',
                SECRET_CLASS: 'Secret',
                SYSTEM_CLASS_NAME: 'Telemetry_System',
                SYSTEM_POLLER_CLASS_NAME: 'Telemetry_System_Poller'
            },
            CONFIG_WORKER: {
                STORAGE_KEY: 'config'
            },
            DATA_PIPELINE: {
                PULL_EVENT: 0b01,
                PUSH_EVENT: 0b10,
                PUSH_PULL_EVENT: 0b11
            },
            DAY_NAME_TO_WEEKDAY: {
                monday: 1,
                tuesday: 2,
                wednesday: 3,
                thursday: 4,
                friday: 5,
                saturday: 6,
                sunday: 0
            },
            DEVICE_REST_API: {
                CHUNK_SIZE: 512 * 1024,
                PORT: 8100,
                PROTOCOL: 'http',
                TRANSFER_FILES: {
                    BULK: {
                        DIR: '/var/config/rest/bulk',
                        URI: '/mgmt/shared/file-transfer/bulk/'
                    }
                },
                USER: 'admin'
            },
            DEVICE_TMP_DIR: '/shared/tmp',
            DEVICE_TYPE: {
                BIG_IP: 'BIG-IP',
                CONTAINER: 'Container'
            },
            DEFAULT_EVENT_LISTENER_PORT: 6514,
            DEFAULT_HOSTNAME: 'hostname.unknown',
            DEFAULT_UNNAMED_NAMESPACE: 'f5telemetry_default',
            EVENT_CUSTOM_TIMESTAMP_KEY: 'f5telemetry_timestamp',
            EVENT_LISTENER: {
                PARSER_MODE: 'buffer', // default parsing mode
                PARSER_MAX_ITERS_PER_CHECK: 1000, // how often to check the time spent on data processing
                PARSER_MAX_KV_PAIRS: 2000, // max number of key=value pairs per message
                PARSER_MAX_MSG_SIZE: 16 * 1024, // max message size in chars (string) or bytes (buffer)
                PARSER_PREALLOC: 1000, // preallocated buffer size
                NETWORK_SERVICE_RESTART_DELAY: 10 * 1000, // 10 sec. delay before restart (units - ms.)
                STREAM_STRATEGY: 'ring', // ring buffer as default strategy
                STREAM_MAX_PENDING_BYTES: 256 * 1024, // do not feed more than 256 KB to the parser
                UDP_STALE_CONN_INTERVAL: 5 * 1000, // 5 sec. interval for UDP stale connections check (units - ms.)
                UDP_STALE_CONN_TIMEOUT: 300 * 1e9 // 300 sec. timeout value for UDP stale connections (units - ns.)
            },
            EVENT_TYPES: {
                DEFAULT: 'event',
                AVR_EVENT: 'AVR',
                APM_EVENT: 'APM',
                ASM_EVENT: 'ASM',
                AFM_EVENT: 'AFM',
                LTM_EVENT: 'LTM',
                RAW_EVENT: 'raw',
                CGNAT_EVENT: 'CGNAT',
                SYSLOG_EVENT: 'syslog',
                EVENT_LISTENER: 'event',
                SYSTEM_POLLER: 'systemInfo',
                IHEALTH_POLLER: 'ihealthInfo'
            },
            HTTP_REQUEST: {
                ALLOWED_PROTOCOLS: ['http', 'https'],
                DEFAULT_PORT: 80,
                DEFAULT_PROTOCOL: 'http'
            },
            IHEALTH: {
                DEMO_CLEANUP_TIMEOUT: 5 * 60 * 1000, // 5 min.
                MAX_HISTORY_LEN: 20,
                POLLER_CONF: {
                    QKVIEW_COLLECT: {
                        DELAY: 2 * 60 * 1000, // 2 min.
                        MAX_RETRIES: 5
                    },
                    QKVIEW_REPORT: {
                        DELAY: 2 * 60 * 1000, // 2 min.
                        MAX_RETRIES: 30
                    },
                    QKVIEW_UPLOAD: {
                        DELAY: 2 * 60 * 1000, // 2 min.
                        MAX_RETRIES: 5
                    },
                    SCHEDULING: {
                        DELAY: 5 * 60 * 1000, // 5 min.
                        MAX_PAST_DUE: 2 * 60 * 60 * 1000 // 2 hours
                    }
                },
                SECRETS_TIMEOUT: 60 * 1000, // 1 min.
                SERVICE_API: {
                    LOGIN: 'https://identity.account.f5.com/oauth2/ausp95ykc80HOU7SQ357/v1/token',
                    UPLOAD: 'https://ihealth2-api.f5.com/qkview-analyzer/api/qkviews'
                },
                SLEEP_INTERVAL: 120 * 1000, // max sleep interval per iteration for `waiting` state
                STORAGE_KEY: 'ihealth'
            },
            LOCAL_HOST: 'localhost',
            PASSPHRASE_CIPHER_TEXT: 'cipherText',
            PASSPHRASE_ENVIRONMENT_VAR: 'environmentVar',
            PORT_TO_PROTO: {
                80: 'http',
                443: 'https'
            },
            PROTO_TO_PORT: {
                http: 80,
                https: 443
            },
            SECRETS: {
                PROPS: [
                    'cipherText',
                    'passphrase'
                ],
                MASK: '*********'
            },
            STATS_KEY_SEP: '::',
            STRICT_TLS_REQUIRED: true,
            SYSTEM_POLLER: {
                CHUNK_SIZE: 30,
                DEMO_CLEANUP_TIMEOUT: 300000,
                MAX_HISTORY_LEN: 40,
                SECRETS_TIMEOUT: 60000,
                SLEEP_INTERVAL: 120000,
                WORKERS: 5
            },
            TASK: {
                HIGH_PRIORITY: 1,
                LOW_PRIORITY: 10
            },
            TRACER: {
                DIR: '/var/tmp/telemetry',
                ENCODING: 'utf8',
                INACTIVITY_TIMEOUT: 15 * 60,
                MAX_RECORDS_INPUT: 9999,
                MAX_RECORDS_OUTPUT: 10
            },
            USER_AGENT: `f5-telemetry/${versionInfo[0]}`,
            WEEKDAY_TO_DAY_NAME: {
                0: 'sunday',
                1: 'monday',
                2: 'tuesday',
                3: 'wednesday',
                4: 'thursday',
                5: 'friday',
                6: 'saturday',
                7: 'sunday'
            }
        };
    }

    before(() => {
        moduleCache.restore();
    });

    /**
     * ATTENTION:
     *
     * If this test failed it worth to check other tests and source code
     * that uses that constant(s)
     */
    it('constants verification', () => {
        assert.deepStrictEqual(constants, getExpected());
    });
});
