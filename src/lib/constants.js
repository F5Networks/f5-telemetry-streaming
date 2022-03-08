/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const packageVersionInfo = (function () {
    let packageVersion = '0.0.0-0';
    ['../package.json', '../../package.json'].some((fname) => {
        try {
            packageVersion = require(fname).version; // eslint-disable-line global-require,import/no-dynamic-require
            delete require.cache[require.resolve(fname)];
        } catch (err) {
            return false;
        }
        return true;
    });
    packageVersion = packageVersion.split('-');
    if (packageVersion.length === 1) {
        // push RELEASE number
        packageVersion.push('1');
    }
    return packageVersion;
}());

const schemaInfo = (function () {
    const fname = `${__dirname}/../schema/latest/base_schema.json`;
    let schemaCurrentVersion;
    let schemaMinimumVersion;

    try {
        // eslint-disable-next-line global-require,import/no-dynamic-require
        const schemaVersionEnum = require(fname).properties.schemaVersion.enum;
        delete require.cache[require.resolve(fname)];

        schemaCurrentVersion = schemaVersionEnum[0];
        schemaMinimumVersion = schemaVersionEnum[schemaVersionEnum.length - 1];
    } catch (err) {
        schemaCurrentVersion = '0.0.0';
        schemaMinimumVersion = '0.0.0';
    }
    return [schemaCurrentVersion, schemaMinimumVersion];
}());

const VERSION = packageVersionInfo[0];
const RELEASE = packageVersionInfo[1];

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
    RELEASE,
    VERSION,
    ACTIVITY_RECORDER: {
        DECLARATION_TRACER: {
            MAX_RECORDS: 60,
            PATH: '/shared/tmp/telemetry/declarationHistory'
        }
    },
    APP_NAME: 'Telemetry Streaming',
    APP_THRESHOLDS: {
        MONITOR_DISABLED: 'MONITOR_DISABLED',
        MEMORY: {
            // node default max is 1.4 GB
            // assume this is the default provisioning
            // value can vary according to db variables, handled by restjavad
            DEFAULT_MB: 1433,
            DEFAULT_LIMIT_PERCENT: 90,
            OK: 'MEMORY_USAGE_OK',
            NOT_OK: 'MEMORY_USAGE_HIGH'
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
    SCHEMA_INFO: {
        CURRENT: schemaInfo[0],
        MINIMUM: schemaInfo[1]
    },
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
    USER_AGENT: `f5-telemetry/${VERSION}`,
    WEEKDAY_TO_DAY_NAME
};
