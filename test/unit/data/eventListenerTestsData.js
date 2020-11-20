/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    processData: [
        {
            name: 'should process data as single event without newline',
            rawData: '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.3.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"',
            expectedData: [
                {
                    EOCTimestamp: '1594100235',
                    Microtimestamp: '1594100235358418',
                    errdefs_msgno: '22327305',
                    hostname: 'bigip14.1.2.3.test',
                    SlotId: '0',
                    globalBigiqConf: 'N/A',
                    ObjectTagsList: 'N/A',
                    pool_name: '/Common/Shared/telemetry',
                    errdefs_msg_name: 'pool modified',
                    state: 'enabled',
                    pool_description: '',
                    status_reason: '',
                    min_active_members: '1',
                    availability_state: 'offline',
                    available_members: '0',
                    up_members: '0',
                    telemetryEventCategory: 'AVR'
                }
            ]
        },
        {
            name: 'should process data as multiple events with newline preceding a double quote AND no classified keys',
            rawData: '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"\n <87>Jul  6 22:37:49 bigip14.1.2.3.test debug httpd[13810]: pam_bigip_authz: pam_sm_acct_mgmt returning status SUCCESS\n',
            expectedData: [
                {
                    data: '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                    telemetryEventCategory: 'syslog',
                    hostname: 'bigip14.1.2.3.test'
                },
                {
                    data: '<87>Jul  6 22:37:49 bigip14.1.2.3.test debug httpd[13810]: pam_bigip_authz: pam_sm_acct_mgmt returning status SUCCESS',
                    hostname: 'bigip14.1.2.3.test',
                    telemetryEventCategory: 'syslog'
                }
            ]
        },
        {
            name: 'should process data as multiple events with newline preceding a double quote AND with classified keys',
            rawData: '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235370475",errdefs_msgno="22327308",Hostname="bigip14.1.2.3.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_member="/Common/Shared/255.255.255.254",pool_name="/Common/Shared/telemetry",POOLIP="255.255.255.254",POOLPort="6514",errdefs_msg_name="pool member modified",description="",monitor_state="down",monitor_status="AVAIL_RED",session_status="enabled",enabled_state="enabled",status_reason="/Common/tcp: No successful responses received before deadline. @2020/07/06 22:37:15. ",availability_state="offline"\n<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.3.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"',
            expectedData: [
                {
                    EOCTimestamp: '1594100235',
                    Microtimestamp: '1594100235370475',
                    errdefs_msgno: '22327308',
                    hostname: 'bigip14.1.2.3.test',
                    SlotId: '0',
                    globalBigiqConf: 'N/A',
                    ObjectTagsList: 'N/A',
                    pool_member: '/Common/Shared/255.255.255.254',
                    pool_name: '/Common/Shared/telemetry',
                    POOLIP: '255.255.255.254',
                    POOLPort: '6514',
                    errdefs_msg_name: 'pool member modified',
                    description: '',
                    monitor_state: 'down',
                    monitor_status: 'AVAIL_RED',
                    session_status: 'enabled',
                    enabled_state: 'enabled',
                    status_reason: '/Common/tcp: No successful responses received before deadline. @2020/07/06 22:37:15. ',
                    availability_state: 'offline',
                    telemetryEventCategory: 'AVR'
                },
                {
                    EOCTimestamp: '1594100235',
                    Microtimestamp: '1594100235358418',
                    errdefs_msgno: '22327305',
                    hostname: 'bigip14.1.2.3.test',
                    SlotId: '0',
                    globalBigiqConf: 'N/A',
                    ObjectTagsList: 'N/A',
                    pool_name: '/Common/Shared/telemetry',
                    errdefs_msg_name: 'pool modified',
                    state: 'enabled',
                    pool_description: '',
                    status_reason: '',
                    min_active_members: '1',
                    availability_state: 'offline',
                    available_members: '0',
                    up_members: '0',
                    telemetryEventCategory: 'AVR'
                }
            ]
        },
        {
            name: 'should process data as single event when newline quoted (double quotes)',
            rawData: '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms."\n <30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart."\n ',
            expectedData: [
                {
                    data: '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms."\n <30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart."',
                    hostname: 'bigip14.1.2.3.test',
                    telemetryEventCategory: 'syslog'
                }
            ]
        },
        {
            name: 'should process data as single event when newline quoted (single quotes)',
            rawData: '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms.\'\n <30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart.\'\n ',
            expectedData: [
                {
                    data: '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms.\'\n <30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart.\'',
                    hostname: 'bigip14.1.2.3.test',
                    telemetryEventCategory: 'syslog'
                }
            ]
        },
        {
            name: 'should omit empty lines',
            rawData: 'line1\n    \n   line3\n    \n line5',
            expectedData: [
                {
                    data: 'line1',
                    telemetryEventCategory: 'event'
                },
                {
                    data: 'line3',
                    telemetryEventCategory: 'event'
                },
                {
                    data: 'line5',
                    telemetryEventCategory: 'event'
                }
            ]
        },
        {
            name: 'should process data when mixed new line chars in data',
            rawData: 'line1\r\nline2\nline3\r\nline4',
            expectedData: [
                {
                    data: 'line1',
                    telemetryEventCategory: 'event'
                },
                {
                    data: 'line2',
                    telemetryEventCategory: 'event'
                },
                {
                    data: 'line3',
                    telemetryEventCategory: 'event'
                },
                {
                    data: 'line4',
                    telemetryEventCategory: 'event'
                }
            ]
        },
        {
            name: 'should process data when mixed event separators',
            rawData: 'key1="value\n"\nkey2=\\"value\n',
            expectedData: [
                {
                    key1: 'value\n',
                    telemetryEventCategory: 'LTM'
                },
                {
                    data: 'key2=\\"value',
                    telemetryEventCategory: 'event'
                }
            ]
        }
    ],
    processRawData: [
        {
            name: 'should process data without trailing newline',
            rawData: ['<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.3.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"'],
            expectedData: ['<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.3.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"']
        },
        {
            name: 'should process single data with trailing newline',
            rawData: ['<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n'],
            expectedData: ['<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n']
        },
        {
            name: 'should process multiple data with trailing newline',
            rawData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n',
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n',
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n'
            ]
        },
        {
            name: 'should process single input as single data with newline within string (index < 70% string length)',
            rawData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... ',
                'and continued here \n<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"\n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... and continued here \n<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"\n'
            ]
        },
        {
            name: 'should process single input as multiple data with newline within string (index > 70% string length)',
            rawData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test ',
                'info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... and continued here \n<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"\n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n',
                '<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... and continued here \n<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"\n'
            ]
        }
    ]
};
