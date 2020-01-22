/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EVENT_TYPES = require('../../src/lib/constants.js').EVENT_TYPES;

/* eslint-disable no-useless-escape */

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
            name: 'invalid APM event',
            data: 'Access_Profile1="APM_ACCESS_PROFILE",key1="value",key2="value2"',
            category: EVENT_TYPES.LTM_EVENT
        },
        {
            name: 'incomplete AFM event',
            data: 'acl_policy_name="AFM_PROFILE_NAME",key1="value",key2="value2"',
            category: EVENT_TYPES.AFM_EVENT
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
            name: 'valid AFM DoS event',
            data: 'action="Allow",hostname="bigip1.velasco",bigip_mgmt_ip="10.201.198.70",context_name="/Common/10.10.10.140",date_time="2019-12-18T03:37:19.000Z",dest_ip="10.10.10.140",dest_port="80",device_product="Advanced Firewall Module",device_vendor="F5",device_version="13.1.1.0.0.4",dos_attack_event="Attack Sampled",dos_attack_id="710253591",dos_attack_name="TCP RST flood",dos_packets_dropped="0",dos_packets_received="1",errdefs_msgno="23003138",errdefs_msg_name="Network DoS Event",flow_id="0000000000000000",severity="4",dos_mode="Enforced",dos_src="Volumetric, Aggregated across all SrcIP\'s, VS-Specific attack, metric:PPS",partition_name="Common",route_domain="0",source_ip="10.10.10.210",source_port="9607",vlan="/Common/internal",telemetryEventCategory="LTM",tenant="Common',
            category: EVENT_TYPES.AFM_EVENT
        },
        {
            name: 'incomplete ASM event',
            data: 'policy_name="ASM_PROFILE_NAME",key1="value",key2="value2"',
            category: EVENT_TYPES.ASM_EVENT
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
            name: 'incomplete AVR event',
            data: 'EOCTimestamp="1231232",key1="value",key2="value2"',
            category: EVENT_TYPES.AVR_EVENT
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
        },
        {
            name: 'valid CGNAT keys',
            data: 'lsn_event="LSN_DELETE",start="1562092616047",cli="X.X.X.X",nat="Y.Y.Y.Y",duration="8080",pem_subscriber_id="No-lookup"',
            category: EVENT_TYPES.CGNAT_EVENT
        }
    ]
};
