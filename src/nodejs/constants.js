/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const VERSION = '0.9.0';

module.exports = {
    VERSION,
    STATS_KEY_SEP: '::',
    CONSUMERS_DIR: './consumers',
    LOCAL_HOST: 'localhost',
    DEFAULT_PROTOCOL: 'http',
    DEFAULT_PORT: 8100,
    STRICT_TLS_REQUIRED: false, // for now, default to false
    DEFAULT_EVENT_LISTENER_PORT: 6514,
    USER_AGENT: `f5-telemetry/${VERSION}`,
    SYSTEM_POLLER_CLASS_NAME: 'Telemetry_System_Poller',
    EVENT_LISTENER_CLASS_NAME: 'Telemetry_Listener',
    CONSUMERS_CLASS_NAME: 'Telemetry_Consumer',
    TRACER_DIR: '/var/tmp/telemetry',
    BIG_IP_DEVICE_TYPE: 'BIG-IP',
    CONTAINER_DEVICE_TYPE: 'Container',
    PASSPHRASE_ENVIRONMENT_VAR: 'environmentVar',
    PASSPHRASE_CIPHER_TEXT: 'cipherText'
};
