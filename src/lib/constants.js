/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
    APP_NAME: 'Telemetry Streaming',
    CONFIG_CLASSES: {
        CONSUMER_CLASS_NAME: 'Telemetry_Consumer',
        PULL_CONSUMER_CLASS_NAME: 'Telemetry_Pull_Consumer',
        CONTROLS_CLASS_NAME: 'Controls',
        ENDPOINTS_CLASS_NAME: 'Telemetry_Endpoints',
        EVENT_LISTENER_CLASS_NAME: 'Telemetry_Listener',
        IHEALTH_POLLER_CLASS_NAME: 'Telemetry_iHealth_Poller',
        SYSTEM_CLASS_NAME: 'Telemetry_System',
        SYSTEM_POLLER_CLASS_NAME: 'Telemetry_System_Poller',
        NAMESPACE_CLASS_NAME: 'Telemetry_Namespace'
    },
    CONSUMERS_DIR: './consumers',
    DAY_NAME_TO_WEEKDAY,
    DEVICE_DEFAULT_PORT: 8100,
    DEVICE_DEFAULT_PROTOCOL: 'http',
    DEVICE_DEFAULT_USER: 'admin',
    DEVICE_REST_BULK_DIR: '/var/config/rest/bulk',
    DEVICE_REST_BULK_URI: '/mgmt/shared/file-transfer/bulk/',
    DEVICE_REST_MAMD_DIR: '/var/config/rest/madm',
    DEVICE_REST_MADM_URI: '/mgmt/shared/file-transfer/madm/',
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
        SYSLOG_EVENT: 'syslog',
        EVENT_LISTENER: 'event',
        SYSTEM_POLLER: 'systemInfo',
        IHEALTH_POLLER: 'ihealthInfo'
    },
    HTTP_REQUEST: {
        DEFAULT_PORT: 80,
        DEFAULT_PROTOCOL: 'http'
    },
    IHEALTH_API_LOGIN: 'https://api.f5.com/auth/pub/sso/login/ihealth-api',
    IHEALTH_API_UPLOAD: 'https://ihealth-api.f5.com/qkview-analyzer/api/qkviews',
    LOCAL_HOST: 'localhost',
    PASSPHRASE_CIPHER_TEXT: 'cipherText',
    PASSPHRASE_ENVIRONMENT_VAR: 'environmentVar',
    PORT_TO_PROTO,
    PROTO_TO_PORT,
    PULL_CONSUMERS_DIR: './pullConsumers',
    QKVIEW_CMD_LOCAL_TIMEOUT: 1 * 60 * 60 * 1000, // 1 hour in milliseconds
    STATS_KEY_SEP: '::',
    STRICT_TLS_REQUIRED: true,
    TRACER: {
        DIR: '/var/tmp/telemetry',
        ENCODING: 'utf8',
        LIST_SIZE: 10
    },
    USER_AGENT: `f5-telemetry/${VERSION}`,
    WEEKDAY_TO_DAY_NAME
};
