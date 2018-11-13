/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    STATS_KEY_SEP: '::',
    CONSUMERS_DIR: './consumers',
    DEFAULT_HOST: 'localhost',
    DEFAULT_PORT: 8100,
    STRICT_TLS_REQUIRED: false, // for now, default to false
    DEFAULT_EVENT_LISTENER_PORT: 6514,
    USER_AGENT: 'f5-telemetry/1.0'
};
