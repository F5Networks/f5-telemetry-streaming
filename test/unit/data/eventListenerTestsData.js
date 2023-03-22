/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    onMessagesHandler: [
        {
            name: 'should normalize and classify events',
            rawEvents: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"',
                '<134>Jul  6 22:37:49 bigip14.1.2.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                ' <87>Jul  6 22:37:49 bigip14.1.2.test debug httpd[13810]: pam_bigip_authz: pam_sm_acct_mgmt returning status SUCCESS\n',
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235370475",errdefs_msgno="22327308",Hostname="bigip14.1.2.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_member="/Common/Shared/255.255.255.254",pool_name="/Common/Shared/telemetry",POOLIP="255.255.255.254",POOLPort="6514",errdefs_msg_name="pool member modified",description="",monitor_state="down",monitor_status="AVAIL_RED",session_status="enabled",enabled_state="enabled",status_reason="/Common/tcp: No successful responses received before deadline. @2020/07/06 22:37:15. ",availability_state="offline"',
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"',
                '    ' // should skip empty events
            ],
            expectedData: [
                {
                    EOCTimestamp: '1594100235',
                    Microtimestamp: '1594100235358418',
                    ObjectTagsList: 'N/A',
                    SlotId: '0',
                    application: 'Shared',
                    availability_state: 'offline',
                    available_members: '0',
                    errdefs_msg_name: 'pool modified',
                    errdefs_msgno: '22327305',
                    globalBigiqConf: 'N/A',
                    hostname: 'bigip14.1.2.test',
                    min_active_members: '1',
                    originalRawData: '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"',
                    pool_description: '',
                    pool_name: '/Common/Shared/telemetry',
                    state: 'enabled',
                    status_reason: '',
                    telemetryEventCategory: 'AVR',
                    tenant: 'Common',
                    up_members: '0'
                },
                {
                    data: '<134>Jul  6 22:37:49 bigip14.1.2.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                    originalRawData: '<134>Jul  6 22:37:49 bigip14.1.2.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                    telemetryEventCategory: 'syslog',
                    hostname: 'bigip14.1.2.test'
                },
                {
                    data: '<87>Jul  6 22:37:49 bigip14.1.2.test debug httpd[13810]: pam_bigip_authz: pam_sm_acct_mgmt returning status SUCCESS',
                    originalRawData: '<87>Jul  6 22:37:49 bigip14.1.2.test debug httpd[13810]: pam_bigip_authz: pam_sm_acct_mgmt returning status SUCCESS',
                    hostname: 'bigip14.1.2.test',
                    telemetryEventCategory: 'syslog'
                },
                {
                    EOCTimestamp: '1594100235',
                    Microtimestamp: '1594100235370475',
                    ObjectTagsList: 'N/A',
                    POOLIP: '255.255.255.254',
                    POOLPort: '6514',
                    SlotId: '0',
                    application: 'Shared',
                    availability_state: 'offline',
                    description: '',
                    enabled_state: 'enabled',
                    errdefs_msg_name: 'pool member modified',
                    errdefs_msgno: '22327308',
                    globalBigiqConf: 'N/A',
                    hostname: 'bigip14.1.2.test',
                    monitor_state: 'down',
                    monitor_status: 'AVAIL_RED',
                    originalRawData: '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235370475",errdefs_msgno="22327308",Hostname="bigip14.1.2.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_member="/Common/Shared/255.255.255.254",pool_name="/Common/Shared/telemetry",POOLIP="255.255.255.254",POOLPort="6514",errdefs_msg_name="pool member modified",description="",monitor_state="down",monitor_status="AVAIL_RED",session_status="enabled",enabled_state="enabled",status_reason="/Common/tcp: No successful responses received before deadline. @2020/07/06 22:37:15. ",availability_state="offline"',
                    pool_member: '/Common/Shared/255.255.255.254',
                    pool_name: '/Common/Shared/telemetry',
                    session_status: 'enabled',
                    status_reason: '/Common/tcp: No successful responses received before deadline. @2020/07/06 22:37:15. ',
                    telemetryEventCategory: 'AVR',
                    tenant: 'Common'
                },
                {
                    EOCTimestamp: '1594100235',
                    Microtimestamp: '1594100235358418',
                    ObjectTagsList: 'N/A',
                    SlotId: '0',
                    application: 'Shared',
                    availability_state: 'offline',
                    available_members: '0',
                    errdefs_msg_name: 'pool modified',
                    errdefs_msgno: '22327305',
                    globalBigiqConf: 'N/A',
                    hostname: 'bigip14.1.2.test',
                    min_active_members: '1',
                    originalRawData: '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"',
                    pool_description: '',
                    pool_name: '/Common/Shared/telemetry',
                    state: 'enabled',
                    status_reason: '',
                    telemetryEventCategory: 'AVR',
                    tenant: 'Common',
                    up_members: '0'
                }
            ]
        }
    ]
};
