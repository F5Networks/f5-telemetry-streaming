/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const constants = require('../../src/lib/constants');
const packageInfo = require('../../package.json');
const schemaInfo = require('../../src/schema/latest/base_schema.json').properties.schemaVersion.enum;

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Constants', () => {
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
        const versionInfo = packageInfo.version.split('-');
        if (versionInfo.length === 1) {
            versionInfo.push('1');
        }
        // to be sure that we really have some data
        assert.isNotEmpty(versionInfo[0]);
        assert.isNotEmpty(versionInfo[1]);

        // TODO: add other constants later
        assert.deepStrictEqual(constants, {
            RELEASE: versionInfo[1],
            VERSION: versionInfo[0],
            APP_NAME: 'Telemetry Streaming',
            APP_THRESHOLDS: {
                MONITOR_DISABLED: 'MONITOR_DISABLED',
                MEMORY: {
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
                SYSTEM_CLASS_NAME: 'Telemetry_System',
                SYSTEM_POLLER_CLASS_NAME: 'Telemetry_System_Poller'
            },
            CONFIG_WORKER: {
                STORAGE_KEY: 'config'
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
                RAW_EVENT: 'raw',
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
            PORT_TO_PROTO: {
                80: 'http',
                443: 'https'
            },
            PROTO_TO_PORT: {
                http: 80,
                https: 443
            },
            SCHEMA_INFO: {
                CURRENT: schemaInfo[0],
                MINIMUM: '0.9.0'
            },
            STATS_KEY_SEP: '::',
            STRICT_TLS_REQUIRED: true,
            TRACER: {
                DIR: '/var/tmp/telemetry',
                ENCODING: 'utf8',
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
        });
    });
});
