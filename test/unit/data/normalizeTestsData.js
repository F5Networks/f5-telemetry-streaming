/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const EVENT_TYPES = require('../../../src/lib/constants').EVENT_TYPES;

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
            name: 'valid event with escaped delimiter (3)',
            data: 'key1="value",key2="value\",value",key3="value3',
            expectedData: {
                key1: 'value',
                key2: 'value\",value',
                key3: 'value3',
                telemetryEventCategory: EVENT_TYPES.LTM_EVENT
            }
        },
        {
            name: 'valid event with escaped delimiter (4)',
            data: 'key1="value",key2="value\\",value",key3="value3',
            expectedData: {
                key1: 'value',
                key2: 'value\\",value',
                key3: 'value3',
                telemetryEventCategory: EVENT_TYPES.LTM_EVENT
            }
        },
        {
            name: 'valid CGNAT keys',
            data: 'lsn_event="LSN_DELETE",start="1562092616047",cli="X.X.X.X",nat="Y.Y.Y.Y",duration="8080",pem_subscriber_id="No-lookup"',
            category: EVENT_TYPES.CGNAT_EVENT
        },
        {
            name: 'valid syslog event with double quotes in it',
            data: '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
            expectedData: {
                data: '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                hostname: 'bigip14.1.2.3.test',
                telemetryEventCategory: EVENT_TYPES.SYSLOG_EVENT
            }
        },
        {
            name: 'valid syslog event on a vcmp host',
            data: '<133>Aug 12 12:22:41 slot1/TSGuest1.localdomain notice root[22149]: 01420002:5: AUDIT test mumble grumble syslog entry',
            expectedData: {
                data: '<133>Aug 12 12:22:41 slot1/TSGuest1.localdomain notice root[22149]: 01420002:5: AUDIT test mumble grumble syslog entry',
                hostname: 'slot1/TSGuest1.localdomain',
                telemetryEventCategory: EVENT_TYPES.SYSLOG_EVENT
            }
        }
    ],
    splitEventsData: [
        {
            name: 'empty string',
            data: '',
            expectedData: []
        },
        {
            name: 'empty line with line separator',
            data: '{sep}',
            expectedData: [
                ''
            ]
        },
        {
            name: 'empty lines with line separator',
            data: '{sep}{sep}{sep}{sep}',
            expectedData: [
                '', '', '', ''
            ]
        },
        {
            name: 'line with trailing spaces',
            data: '{sep}{sep}{sep}{sep}  ',
            expectedData: [
                '', '', '', '', '  '
            ]
        },
        {
            name: 'ignore escaped separators',
            data: '\\n \\r\\n',
            expectedData: [
                '\\n \\r\\n'
            ]
        },
        {
            name: 'process escaped sequences correctly',
            data: 'line1\\\\\\nstill line 1\\\\{sep}line2\\\\{sep}',
            expectedData: [
                'line1\\\\\\nstill line 1\\\\',
                'line2\\\\'
            ]
        },
        {
            name: 'ignore double quoted line separators (\\n)',
            data: 'line1"\\\\\\nstill line 1\\\\\n"line2\\\\{sep}',
            expectedData: [
                'line1"\\\\\\nstill line 1\\\\\n"line2\\\\'
            ]
        },
        {
            name: 'ignore double quoted line separators (\\r\\n)',
            data: 'line1"\\\\\\nstill line 1\\\\\r\n"line2\\\\{sep}',
            expectedData: [
                'line1"\\\\\\nstill line 1\\\\\r\n"line2\\\\'
            ]
        },
        {
            name: 'ignore single quoted line separators (\\n)',
            data: 'line1\'\\\\\\nstill line 1\\\\\n\'line2\\\\{sep}',
            expectedData: [
                'line1\'\\\\\\nstill line 1\\\\\n\'line2\\\\'
            ]
        },
        {
            name: 'ignore single quoted line separators (\\r\\n)',
            data: 'line1\'\\\\\\nstill line 1\\\\\r\n\'line2\\\\{sep}',
            expectedData: [
                'line1\'\\\\\\nstill line 1\\\\\r\n\'line2\\\\'
            ]
        },
        {
            name: 'ignore escaped single quoted line separators',
            data: 'line1\\\'\\\\\\nstill line 1\\\\{sep}\'line2\\\\\n',
            expectedData: [
                'line1\\\'\\\\\\nstill line 1\\\\',
                '\'line2\\\\',
                ''
            ]
        },
        {
            name: 'ignore escaped double quoted line separators',
            data: 'line1\\"\\\\\\nstill line 1\\\\{sep}"line2\\\\\n',
            expectedData: [
                'line1\\"\\\\\\nstill line 1\\\\',
                '"line2\\\\',
                ''
            ]
        },
        {
            name: 'process correctly not closed quotes (last line, leading quote)',
            data: 'line1{sep}"{sep}line3{sep}',
            expectedData: [
                'line1',
                '"',
                'line3',
                ''
            ]
        },
        {
            name: 'process correctly not closed quotes (last line, trailing quote)',
            data: 'line1{sep}line2"',
            expectedData: [
                'line1',
                'line2"'
            ]
        },
        {
            name: 'process correctly single line with opened quote (first line, leading quote)',
            data: '"line1{sep}line2',
            expectedData: [
                '"line1',
                'line2'
            ]
        },
        {
            name: 'process correctly single line with opened quote (first line, trailing quote)',
            data: 'line1"{sep}line2',
            expectedData: [
                'line1"',
                'line2'
            ]
        },
        {
            name: 'process combination of complete and incomplete quotes',
            data: '\'foo"bar""\none\'\n\'two""thr\nee"',
            expectedData: [
                '\'foo"bar""\none\'',
                '\'two""thr',
                'ee"'
            ]
        },
        {
            name: 'process combination of single and double quotes',
            data: '\'line_1"still_line_1"\n\'\n"line_2"',
            expectedData: [
                '\'line_1"still_line_1"\n\'',
                '"line_2"'
            ]
        },
        {
            name: 'process combination of single and double quotes without any data in it',
            data: 'key1=""\'\'\nkey2=\'\'\nkey3=""',
            expectedData: [
                'key1=""\'\'',
                'key2=\'\'',
                'key3=""'
            ]
        }
    ]
};
