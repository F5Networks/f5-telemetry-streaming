/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    DECL: {
        BASIC_EXAMPLE: `${__dirname}/basic.json`,
        CONSUMER_NAME: 'My_Consumer',
        POLLER_NAME: 'My_Poller'
    },
    ENV_VARS: {
        TEST_HARNESS: {
            FILE: 'TEST_HARNESS_FILE',
            IP: 'TEST_HOSTS',
            USER: 'TEST_HOSTS_USER',
            PWD: 'TEST_HOSTS_PWD'
        },
        CONSUMER_HARNESS: {
            FILE: 'CONSUMER_HARNESS_FILE',
            IP: 'CONSUMER_HOSTS',
            USER: 'CONSUMER_HOSTS_USER',
            PWD: 'CONSUMER_HOSTS_PWD'
        }
    }
};
