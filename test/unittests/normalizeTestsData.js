/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EVENT_TYPES = require('../../src/nodejs/constants.js').EVENT_TYPES;

module.exports = {
    normalizeEventData: [
        {
            name: 'valid event',
            data: 'some data',
            category: EVENT_TYPES.EVENT_LISTENER
        },
        {
            name: 'valid syslog event',
            data: '<182>Apr 1 00:00:00 hostname info logger: some syslog message',
            category: EVENT_TYPES.SYSLOG_EVENT
        },
        {
            name: 'valid LTM event',
            data: 'key1="value",key2="value2"',
            category: EVENT_TYPES.LTM_EVENT
        },
        {
            name: 'valid APM event',
            data: 'Access_Profile="APM_ACCESS_PROFILE",key1="value",key2="value2"',
            category: EVENT_TYPES.APM_EVENT
        },
        {
            name: 'valid AFM event (1)',
            data: 'acl_policy_name="AFM_PROFILE_NAME",acl_policy_type="AFM_POLICY_TYPE",key1="value",key2="value2"',
            category: EVENT_TYPES.AFM_EVENT
        },
        {
            name: 'valid AFM event (2)',
            data: 'acl_policy_name="AFM_PROFILE_NAME",acl_rule_name="AFM_RULE_NAME",key1="value",key2="value2"',
            category: EVENT_TYPES.AFM_EVENT
        },
        {
            name: 'valid ASM event (1)',
            data: 'policy_name="ASM_PROFILE_NAME",policy_apply_date="ASM_APPLY_DATE",key1="value",key2="value2"',
            category: EVENT_TYPES.ASM_EVENT
        },
        {
            name: 'valid ASM event (2)',
            data: 'policy_name="ASM_PROFILE_NAME",request_status="REQUEST_STATUS",key1="value",key2="value2"',
            category: EVENT_TYPES.ASM_EVENT
        },
        {
            name: 'valid AVR event (1)',
            data: 'EOCTimestamp="1231232",AggrInterval="30",key1="value",key2="value2"',
            category: EVENT_TYPES.AVR_EVENT
        },
        {
            name: 'valid AVR event (2)',
            data: 'EOCTimestamp="1231232",Microtimestamp="30",key1="value",key2="value2"',
            category: EVENT_TYPES.AVR_EVENT
        },
        {
            name: 'valid AVR event (3)',
            data: 'EOCTimestamp="1231232",STAT_SRC="STAT_SRC",key1="value",key2="value2"',
            category: EVENT_TYPES.AVR_EVENT
        },
        {
            name: 'valid AVR event (4)',
            data: 'EOCTimestamp="1231232",errdefs_msgno="errdefs_msgno",key1="value",key2="value2"',
            category: EVENT_TYPES.AVR_EVENT
        },
        {
            name: 'valid AVR event (5)',
            data: 'EOCTimestamp="1231232",Entity="Entity",key1="value",key2="value2"',
            category: EVENT_TYPES.AVR_EVENT
        },
        {
            name: 'valid event with escaped delimiter (1)',
            data: 'key1="value",key2="value\\",value"',
            expectedData: {
                key1: 'value',
                key2: 'value\\",value',
                telemetryEventCategory: EVENT_TYPES.LTM_EVENT
            }
        },
        {
            name: 'valid event with escaped delimiter (2)',
            data: 'key1="value",key2="value\",value"',
            expectedData: {
                key1: 'value',
                key2: 'value\",value',
                telemetryEventCategory: EVENT_TYPES.LTM_EVENT
            }
        }
    ]
};
