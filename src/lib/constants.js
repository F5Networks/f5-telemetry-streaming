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

const appInfo = require('./appInfo');

/**
 * Create new Object with value => key mapping from source Object
 *
 * @property {Object} srcObj - source object
 *
 * @returns {Object} new object with value => key mapping
 */
function valuesToKeys(srcObj) {
    const dstObj = {};
    Object.keys(srcObj).forEach((key) => {
        dstObj[srcObj[key]] = key;
    });
    return dstObj;
}

const PROTO_TO_PORT = {
    http: 80,
    https: 443
};
const PORT_TO_PROTO = valuesToKeys(PROTO_TO_PORT);

const DAY_NAME_TO_WEEKDAY = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0
};
const WEEKDAY_TO_DAY_NAME = valuesToKeys(DAY_NAME_TO_WEEKDAY);
WEEKDAY_TO_DAY_NAME[7] = 'sunday';

module.exports = {
    ACTIVITY_RECORDER: {
        DECLARATION_TRACER: {
            MAX_RECORDS: 60,
            PATH: '/var/log/restnoded/telemetryDeclarationHistory'
        }
    },
    APP_NAME: 'Telemetry Streaming',
    APP_THRESHOLDS: {
        MONITOR_DISABLED: 'MONITOR_DISABLED', // TODO: delete
        MEMORY: {
            /** TODO: DELETE */
            DEFAULT_MB: 1433,
            OK: 'MEMORY_USAGE_OK',
            NOT_OK: 'MEMORY_USAGE_HIGH',
            /** TODO: DELETE END */

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
            // node.js default heap size
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
    DAY_NAME_TO_WEEKDAY,
    DEVICE_REST_API: {
        PORT: 8100,
        PROTOCOL: 'http',
        TRANSFER_FILES: {
            BULK: {
                DIR: '/var/config/rest/bulk',
                URI: '/mgmt/shared/file-transfer/bulk/'
            },
            MADM: {
                DIR: '/var/config/rest/madm',
                URI: '/mgmt/shared/file-transfer/madm/'
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
        CGNAT_EVENT: 'CGNAT',
        RAW_EVENT: 'raw',
        SYSLOG_EVENT: 'syslog',
        EVENT_LISTENER: 'event',
        SYSTEM_POLLER: 'systemInfo',
        IHEALTH_POLLER: 'ihealthInfo'
    },
    HTTP_REQUEST: {
        DEFAULT_PORT: 80,
        DEFAULT_PROTOCOL: 'http'
    },
    IHEALTH: {
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
        SERVICE_API: {
            LOGIN: 'https://api.f5.com/auth/pub/sso/login/ihealth-api',
            UPLOAD: 'https://ihealth-api.f5.com/qkview-analyzer/api/qkviews'
        },
        STORAGE_KEY: 'ihealth'
    },
    LOCAL_HOST: 'localhost',
    PASSPHRASE_CIPHER_TEXT: 'cipherText',
    PASSPHRASE_ENVIRONMENT_VAR: 'environmentVar',
    PORT_TO_PROTO,
    PROTO_TO_PORT,
    SECRETS: {
        PROPS: [
            // encrypted or original declaration
            'cipherText',
            // decrypted declaration
            'passphrase'
        ],
        MASK: '*********'
    },
    STATS_KEY_SEP: '::',
    STRICT_TLS_REQUIRED: true,
    TRACER: {
        DIR: '/var/tmp/telemetry',
        ENCODING: 'utf8',
        INACTIVITY_TIMEOUT: 15 * 60, // 15 min.
        MAX_RECORDS_INPUT: 9999,
        MAX_RECORDS_OUTPUT: 10
    },
    USER_AGENT: `f5-telemetry/${appInfo.version}`,
    WEEKDAY_TO_DAY_NAME
};
