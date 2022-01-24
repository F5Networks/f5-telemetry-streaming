/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    /**
     * Set of data to check actual and expected results only.
     * If you need some additional check feel free to add additional
     * property or write separate test.
     *
     * Note: you can specify 'testOpts' property on the same level as 'name'.
     * Following options available:
     * - only (bool) - run this test only (it.only)
     * */
    dataHandler: [
        {
            name: 'exceeded number of timeouts',
            chunks: [
                'chunk1', // timeout 1
                'chunk2', // timeout 2
                'chunk3', // timeout 3
                'chunk4', // timeout 4
                'chunk5', // timeout 5
                'chunk6',
                'chunk7\n'
            ],
            expectedData: [
                'chunk1chunk2chunk3chunk4chunk5',
                'chunk6chunk7'
            ]
        },
        {
            name: 'single syslog message',
            chunks: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.3.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.3.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"'
            ]
        },
        {
            name: 'multiple events with newline preceding a double quote',
            chunks: [
                '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                '\n<87>Jul  6 22:37:49 bigip14.1.2.3.test debug httpd[13810]: pam_bigip_authz: pam_sm_acct_mgmt returning status SUCCESS\n'
            ],
            expectedData: [
                '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                '<87>Jul  6 22:37:49 bigip14.1.2.3.test debug httpd[13810]: pam_bigip_authz: pam_sm_acct_mgmt returning status SUCCESS'
            ]
        },
        {
            name: 'single event when newline quoted (double quotes)',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms."\n <30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart."\n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms."\n <30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart."'
            ]
        },
        {
            name: 'single event when newline quoted (single quotes)',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms.\'\n <30>Jul  ',
                '6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling ',
                'restart. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart.\'\n '
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms.\'\n <30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart.\'',
                ' '
            ]
        },
        {
            name: 'not omit empty lines',
            chunks: [
                'line1\n    \n   line3\n    \n line5'
            ],
            expectedData: [
                'line1',
                '    ',
                '   line3',
                '    ',
                ' line5'
            ]
        },
        {
            name: 'mixed new line chars in data',
            chunks: [
                'line1\r\nline2\nline3\r\nline4'
            ],
            expectedData: [
                'line1',
                'line2',
                'line3',
                'line4'
            ]
        },
        {
            name: 'mixed event separators',
            chunks: [
                'key1="value\n"\nkey2=\\"value\n'
            ],
            expectedData: [
                'key1="value\n"',
                'key2=\\"value'
            ]
        },
        {
            name: 'without trailing newline',
            chunks: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.3.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.3.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0"'
            ]
        },
        {
            name: 'event with trailing newline',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. '
            ]
        },
        {
            name: 'events with trailing newlines',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n',
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. ',
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. '
            ]
        },
        {
            name: 'data with newline within string, multiple chunks  (example 1)',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval ',
                '112580ms. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... ',
                'and continued here \n<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): ',
                'user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"\n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. ',
                '<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... and continued here ',
                '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"'
            ]
        },
        {
            name: 'with newline within string, multiple chunks (example 2)',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n<30>Jul  6 22:37:35 bigip14.1.2.3.test ',
                'info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... and continued here \n<134>Jul  ',
                '6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) ',
                'partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"\n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.3.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. ',
                '<30>Jul  6 22:37:35 bigip14.1.2.3.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... and continued here ',
                '<134>Jul  6 22:37:49 bigip14.1.2.3.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"'
            ]
        },
        {
            name: 'chunk is too long (> 512 chars but less than limit)',
            chunks: [
                '1'.repeat(520)
            ],
            expectedData: [
                '1'.repeat(520)
            ]
        },
        {
            name: 'chunk is too long (more than allowed max limit)',
            chunks: [
                '1'.repeat(70000)
            ],
            expectedData: [
                '1'.repeat(70000)
            ]
        },
        {
            name: 'quote opened but field is longer than MAX_BUFFER_SIZE (> 16k chars, without new line)',
            chunks: [
                `<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="${'1'.repeat(20 * 1024)}`,
                '",nextfield="1"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="',
                `${'1'.repeat(20 * 1024)}`,
                '",nextfield="1"'
            ]
        },
        {
            name: 'quote opened but field is too long (> 16k chars, without new line)',
            chunks: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="',
                '1'.repeat(16 * 1024),
                '",nextfield="1"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="',
                `${'1'.repeat(16 * 1024)}`,
                '",nextfield="1"'
            ]
        },
        {
            name: 'quote opened but field is too long (> 16k chars, with new line) (example 1)',
            chunks: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="a\n',
                '1'.repeat(16 * 1024),
                '",nextfield="1"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="a',
                `${'1'.repeat(16 * 1024)}`,
                '",nextfield="1"'
            ]
        },
        {
            name: 'quote opened but field is too long (> 16k chars, with new line) (example 2)',
            chunks: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="a\r\n',
                '1'.repeat(16 * 1024),
                '",nextfield="1"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.3.test BigIP:EOCtimestamp="a',
                `${'1'.repeat(16 * 1024)}`,
                '",nextfield="1"'
            ]
        },
        {
            name: 'no trailing new line',
            chunks: [
                'line1\n',
                'line2="value\nanotherPart=test\nanotherLine=anotherValue'
            ],
            expectedData: [
                'line1',
                'line2="value',
                'anotherPart=test',
                'anotherLine=anotherValue'
            ]
        },
        {
            name: 'empty string',
            chunks: [
                ''
            ],
            expectedData: [] // no data expected
        },
        {
            name: 'empty line with line separator',
            chunks: [
                '{sep}'
            ],
            expectedData: [
                ''
            ]
        },
        {
            name: 'empty lines with line separator',
            chunks: [
                '{sep}{sep}{sep}{sep}'
            ],
            expectedData: [
                '',
                '',
                '',
                ''
            ]
        },
        {
            name: 'line with trailing spaces',
            chunks: [
                '{sep}{sep}{sep}{sep}  '
            ],
            expectedData: [
                '',
                '',
                '',
                '',
                '  '
            ]
        },
        {
            name: 'ignore escaped separators',
            chunks: [
                '\\n \\r\\n'
            ],
            expectedData: [
                '\\n \\r\\n'
            ]
        },
        {
            name: 'escaped sequences correctly',
            chunks: [
                'line1\\\\\\nstill line 1\\\\{sep}line2\\\\{sep}'
            ],
            expectedData: [
                'line1\\\\\\nstill line 1\\\\',
                'line2\\\\'
            ]
        },
        {
            name: 'ignore double quoted line separators (\\n)',
            chunks: [
                'line1"\\\\\\nstill line 1\\\\\n"line2\\\\{sep}'
            ],
            expectedData: [
                'line1"\\\\\\nstill line 1\\\\\n"line2\\\\'
            ]
        },
        {
            name: 'ignore double quoted line separators (\\r\\n)',
            chunks: [
                'line1"\\\\\\nstill line 1\\\\\r\n"line2\\\\{sep}'
            ],
            expectedData: [
                'line1"\\\\\\nstill line 1\\\\\r\n"line2\\\\'
            ]
        },
        {
            name: 'ignore single quoted line separators (\\n)',
            chunks: [
                'line1\'\\\\\\nstill line 1\\\\\n\'line2\\\\{sep}'
            ],
            expectedData: [
                'line1\'\\\\\\nstill line 1\\\\\n\'line2\\\\'
            ]
        },
        {
            name: 'ignore single quoted line separators (\\r\\n)',
            chunks: [
                'line1\'\\\\\\nstill line 1\\\\\r\n\'line2\\\\{sep}'
            ],
            expectedData: [
                'line1\'\\\\\\nstill line 1\\\\\r\n\'line2\\\\'
            ]
        },
        {
            name: 'ignore escaped single quoted line separators',
            chunks: [
                'line1\\\'\\\\\\nstill line 1\\\\{sep}\'line2\\\\\n'
            ],
            expectedData: [
                'line1\\\'\\\\\\nstill line 1\\\\',
                '\'line2\\\\'
            ]
        },
        {
            name: 'ignore escaped double quoted line separators',
            chunks: [
                'line1\\"\\\\\\nstill line 1\\\\{sep}"line2\\\\\n'
            ],
            expectedData: [
                'line1\\"\\\\\\nstill line 1\\\\',
                '"line2\\\\'
            ]
        },
        {
            name: 'correctly not closed quotes (last line, leading quote)',
            chunks: [
                'line1{sep}"{sep}line3{sep}'
            ],
            expectedData: [
                'line1',
                '"',
                'line3'
            ]
        },
        {
            name: 'correctly not closed quotes (last line, trailing quote)',
            chunks: [
                'line1{sep}line2"'
            ],
            expectedData: [
                'line1',
                'line2"'
            ]
        },
        {
            name: 'correctly single line with opened quote (first line, leading quote)',
            chunks: [
                '"line1{sep}line2'
            ],
            expectedData: [
                '"line1',
                'line2'
            ]
        },
        {
            name: 'correctly single line with opened quote (first line, trailing quote)',
            chunks: [
                'line1"{sep}line2'
            ],
            expectedData: [
                'line1"',
                'line2'
            ]
        },
        {
            name: 'combination of complete and incomplete quotes',
            chunks: [
                '\'foo"bar""\none\'\n\'two""thr\nee"'
            ],
            expectedData: [
                '\'foo"bar""\none\'',
                '\'two""thr',
                'ee"'
            ]
        },
        {
            name: 'combination of single and double quotes',
            chunks: [
                '\'line_1"still_line_1"\n\'\n"line_2"'
            ],
            expectedData: [
                '\'line_1"still_line_1"\n\'',
                '"line_2"'
            ]
        },
        {
            name: 'combination of single and double quotes without any data in it',
            chunks: [
                'key1=""\'\'\nkey2=\'\'\nkey3=""'
            ],
            expectedData: [
                'key1=""\'\'',
                'key2=\'\'',
                'key3=""'
            ]
        },
        {
            name: 'ASM data (single ASM event)',
            chunks: [
                '<134>May  4 11:01:56 localhost.localdomain ASM:unit_hostname="bigip1",management_ip_address="192.0.2.1",management_ip_address_2="",http_class_name="/Common/ASMTestPolicy",web_application_name="/Common/ASMTestPolicy",policy_name="/Common/ASMTestPolicy",policy_apply_date="2021-04-29 14:20:42",violations="",support_id="2508780119460416236",request_status="passed",response_code="0",ip_client="192.0.2.2",route_domain="0",method="OPTIONS",protocol="HTTP",query_string="param=tomatoes",x_forwarded_for_header_value="N/A",sig_ids="",sig_names="",date_time="2021-05-04 11:01:55",severity="Informational",attack_type="",geo_location="N/A",ip_address_intelligence="N/A",username="N/A",session_id="0",src_port="56022",dest_port="7878",dest_ip="192.0.2.3",sub_violations="",virus_name="N/A",violation_rating="0",websocket_direction="N/A",websocket_message_type="N/A",device_id="N/A",staged_sig_ids="",staged_sig_names="",threat_campaign_names="",staged_threat_campaign_names="",blocking_exception_reason="N/A",captcha_result="not_received",microservice="",vs_name="/Common/testvs",uri="/hello",fragment="",request="OPTIONS /hello?param=tomatoes HTTP/1.1\\r\\nHost: 192.0.2.3:7878\\r\\nUser-Agent: curl/7.64.1\\r\\nAccept: */*\\r\\nContent-Type: application/json\\r\\ntoken: 12341234\\r\\n\\r\\n",response="Response logging disabled"\r\n'
            ],
            expectedData: [
                '<134>May  4 11:01:56 localhost.localdomain ASM:unit_hostname="bigip1",management_ip_address="192.0.2.1",management_ip_address_2="",http_class_name="/Common/ASMTestPolicy",web_application_name="/Common/ASMTestPolicy",policy_name="/Common/ASMTestPolicy",policy_apply_date="2021-04-29 14:20:42",violations="",support_id="2508780119460416236",request_status="passed",response_code="0",ip_client="192.0.2.2",route_domain="0",method="OPTIONS",protocol="HTTP",query_string="param=tomatoes",x_forwarded_for_header_value="N/A",sig_ids="",sig_names="",date_time="2021-05-04 11:01:55",severity="Informational",attack_type="",geo_location="N/A",ip_address_intelligence="N/A",username="N/A",session_id="0",src_port="56022",dest_port="7878",dest_ip="192.0.2.3",sub_violations="",virus_name="N/A",violation_rating="0",websocket_direction="N/A",websocket_message_type="N/A",device_id="N/A",staged_sig_ids="",staged_sig_names="",threat_campaign_names="",staged_threat_campaign_names="",blocking_exception_reason="N/A",captcha_result="not_received",microservice="",vs_name="/Common/testvs",uri="/hello",fragment="",request="OPTIONS /hello?param=tomatoes HTTP/1.1\\r\\nHost: 192.0.2.3:7878\\r\\nUser-Agent: curl/7.64.1\\r\\nAccept: */*\\r\\nContent-Type: application/json\\r\\ntoken: 12341234\\r\\n\\r\\n",response="Response logging disabled"'
            ]
        },
        {
            name: 'ASM data (multi-chunk ASM event)',
            chunks: [
                '<134>May  4 11:01:56 localhost.localdomain ASM:unit_hostname="bigip1",management_ip_address="192.0.2.1",management_ip_address_2="",http_class_name="/Common/ASMTestPolicy",web_application_name="/Common/ASMTestPolicy",policy_name="/Common/ASMTestPolicy",policy_apply_date="2021-04-29 14:20:42",violations="",support_id="2508780119460416236",request_status="passed",response_code="0",ip_client="192.0.2.2",route_domain="0",method="OPTIONS",protocol="HTTP",query_string="param=tomatoes",x_forwarded_for_header_value="N/A",sig_ids="",sig_names="",date_time="2021-05-04 11:01:55",severity="Informational",attack_type="",geo_location="N/A",ip_address_intelligence="N/A",username="N/A",session_id="0",src_port="56022",dest_port="7878",dest_ip="192.0.2.3",sub_violations="",virus_name="N/A",violation_rating="0",websocket_direction="N/A",websocket_message_type="N/A",device_id="N/A",staged_sig_ids="",staged_sig_names="",threat_campaign_names="",staged_threat_campaign_names="",blocking_exception_reason="N/A",captcha_result="not_received",microservice="",vs_name="/Common/testvs",uri="/hello",fragment="",request="OPTIONS /hello?param=tomatoes',
                `${'/apples'.repeat(100)}`,
                'HTTP/1.1\\r\\nHost: 192.0.2.3:7878\\r\\nUser-Agent: curl/7.64.1\\r\\nAccept: */*\\r\\nContent-Type: application/json\\r\\ntoken: 12341234\\r\\n\\r\\n",response="Response logging disabled"\r\n'
            ],
            expectedData: [
                '<134>May  4 11:01:56 localhost.localdomain ASM:unit_hostname="bigip1",management_ip_address="192.0.2.1",management_ip_address_2="",http_class_name="/Common/ASMTestPolicy",web_application_name="/Common/ASMTestPolicy",policy_name="/Common/ASMTestPolicy",policy_apply_date="2021-04-29 14:20:42",violations="",support_id="2508780119460416236",request_status="passed",response_code="0",ip_client="192.0.2.2",route_domain="0",method="OPTIONS",protocol="HTTP",query_string="param=tomatoes",x_forwarded_for_header_value="N/A",sig_ids="",sig_names="",date_time="2021-05-04 11:01:55",severity="Informational",attack_type="",geo_location="N/A",ip_address_intelligence="N/A",username="N/A",session_id="0",src_port="56022",dest_port="7878",dest_ip="192.0.2.3",sub_violations="",virus_name="N/A",violation_rating="0",websocket_direction="N/A",websocket_message_type="N/A",device_id="N/A",staged_sig_ids="",staged_sig_names="",threat_campaign_names="",staged_threat_campaign_names="",blocking_exception_reason="N/A",captcha_result="not_received",microservice="",vs_name="/Common/testvs",uri="/hello",fragment="",request="OPTIONS /hello?param=tomatoes'
                + `${'/apples'.repeat(100)}`
                + 'HTTP/1.1\\r\\nHost: 192.0.2.3:7878\\r\\nUser-Agent: curl/7.64.1\\r\\nAccept: */*\\r\\nContent-Type: application/json\\r\\ntoken: 12341234\\r\\n\\r\\n",response="Response logging disabled"'
            ]
        }
    ]
};
