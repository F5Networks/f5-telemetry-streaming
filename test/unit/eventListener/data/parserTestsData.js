/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* eslint-disable prefer-template */

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
    process: [
        {
            name: 'simple multi-part data',
            chunks: [
                'chunk1',
                'chunk2$F',
                'chunk3',
                'chunk4',
                'chunk5',
                'chunk6',
                '$F5telemet$yEventCategory',
                'chunk7\n'
            ],
            expectedData: [
                'chunk1chunk2$Fchunk3chunk4chunk5chunk6$F5telemet$yEventCategorychunk7'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                13
            ]
        },
        {
            name: 'work with UTF-8',
            chunks: [
                'привет',
                'chunk2$F',
                'мир',
                'chunk4',
                'chunk5',
                'chunk6',
                '$F5telemet$yEventCategory',
                'chunk7\n'
            ],
            expectedData: [
                'приветchunk2$Fмирchunk4chunk5chunk6$F5telemet$yEventCategorychunk7'
            ],
            mayHaveKeyValuePairs: [
                null
            ]
        },
        {
            name: 'single syslog message',
            chunks: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test $F5telemetryEventCategory="test",BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="off,lin=e",available_members="0",up_members="0",$F5telemetryEventCategory="test"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test $F5telemetryEventCategory="test",BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="off,lin=e",available_members="0",up_members="0",$F5telemetryEventCategory="test"'
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([
                    61, 68, 87, 100, 115, 134,
                    148, 159, 168, 187, 194, 198,
                    214, 220, 235, 241, 251, 278,
                    295, 311, 317, 327, 344, 347,
                    361, 364, 383, 387, 406, 418,
                    436, 440, 451, 455, 481
                ])
            ],
            mayHaveF5EventCategory: [
                37
            ]
        },
        {
            name: 'multiple events with newline preceding a double quote',
            chunks: [
                '<134>Jul  6 22:37:49 bigip14.1.2.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                '\n<87>Jul  6 22:37:49 bigip14.1.2.test debug httpd[13810]: pam_bigip_authz: pam_sm_acct_mgmt returning status SUCCESS\n'
            ],
            expectedData: [
                '<134>Jul  6 22:37:49 bigip14.1.2.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"',
                '<87>Jul  6 22:37:49 bigip14.1.2.test debug httpd[13810]: pam_bigip_authz: pam_sm_acct_mgmt returning status SUCCESS'
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'single event when newline quoted (double quotes)',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms."\n <30>Jul  6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart. \n<30>Jul  6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart."\n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms."\n <30>Jul  6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart. \n<30>Jul  6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart."'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'single event when newline quoted (single quotes)',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms.\'\n <30>Jul  ',
                '6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling ',
                'restart. \n<30>Jul  6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, $F5tel$metryEventCategory="test", scheduling restart.\'\n '
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms.\'\n <30>Jul  6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart. \n<30>Jul  6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, $F5tel$metryEventCategory="test", scheduling restart.\'',
                ' '
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                323, // non-strict match
                0
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
            ],
            mayHaveKeyValuePairs: [
                null,
                null,
                null,
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0,
                0,
                0
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
            ],
            mayHaveKeyValuePairs: [
                null,
                null,
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0,
                0
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
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([4]),
                new Uint16Array([4])
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'without trailing newline',
            chunks: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0=,10"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="1594100235",Microtimestamp="1594100235358418",errdefs_msgno="22327305",Hostname="bigip14.1.2.test",SlotId="0",globalBigiqConf="N/A",ObjectTagsList="N/A",pool_name="/Common/Shared/telemetry",errdefs_msg_name="pool modified",state="enabled",pool_description="",status_reason="",min_active_members="1",availability_state="offline",available_members="0",up_members="0=,10"'
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([
                    54, 67, 82, 101, 115, 126, 135,
                    154, 161, 165, 181, 187, 202, 208,
                    218, 245, 262, 278, 284, 294, 311,
                    314, 328, 331, 350, 354, 373, 383,
                    401, 405, 416
                ])
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'event with trailing newline',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt,  $F5tel$emetryEventCategory="test",  interval 112580ms. \n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt,  $F5tel$emetryEventCategory="test",  interval 112580ms. '
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                82
            ]
        },
        {
            name: 'events with trailing newlines',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n',
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. ',
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. '
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'data with newline within string, multiple chunks  (example 1)',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval ',
                '112580ms. \n<30>Jul  6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... ',
                'and continued here \n<134>Jul  6 22:37:49 bigip14.1.2.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): ',
                'user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"\n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. ',
                '<30>Jul  6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... and continued here ',
                '<134>Jul  6 22:37:49 bigip14.1.2.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"'
            ],
            mayHaveKeyValuePairs: [
                null,
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0
            ]
        },
        {
            name: 'with newline within string, multiple chunks (example 2)',
            chunks: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. \n<30>Jul  6 22:37:35 bigip14.1.2.test ',
                'info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... and continued here \n<134>Jul  ',
                '6 22:37:49 bigip14.1.2.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) ',
                'partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"\n'
            ],
            expectedData: [
                '<30>Jul  6 22:37:26 bigip14.1.2.test info dhclient[4079]: XMT: Solicit on mgmt, interval 112580ms. ',
                '<30>Jul  6 22:37:35 bigip14.1.2.test info systemd[1]: getty@tty0\x20ttyS0.service has no holdoff time, scheduling restart... and continued here ',
                '<134>Jul  6 22:37:49 bigip14.1.2.test info httpd(pam_audit)[13810]: 01070417:6: AUDIT - user admin - RAW: httpd(pam_audit): user=admin(admin) partition=[All] level=Administrator tty=(unknown) host=172.18.5.167 attempts=1 start="Mon Jul  6 22:37:49 2020" end="Mon Jul  6 22:37:49 2020"'
            ],
            mayHaveKeyValuePairs: [
                null,
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0
            ]
        },
        {
            name: 'chunk is too long (> 512 chars but less than limit)',
            chunks: [
                '1'.repeat(520)
            ],
            expectedData: [
                '1'.repeat(520)
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'chunk is too long (more than allowed max limit)',
            chunks: [
                '1'.repeat(70000)
            ],
            expectedData: [
                '1'.repeat(16 * 1024),
                '1'.repeat(16 * 1024),
                '1'.repeat(16 * 1024),
                '1'.repeat(16 * 1024),
                '1'.repeat(70000 - 4 * 16 * 1024)
            ],
            mayHaveKeyValuePairs: [
                null,
                null,
                null,
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0,
                0,
                0
            ]
        },
        {
            name: 'quote opened but field is longer than MAX_BUFFER_SIZE (> 16k chars, without new line)',
            chunks: [
                `<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="${'1'.repeat(20 * 1024)}`,
                '",nextfield="1"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="',
                `${'1'.repeat(16 * 1024)}`,
                `${'1'.repeat(4 * 1024)}",nextfield="1"`
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([54]),
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0
            ]
        },
        {
            name: 'quote opened but field is too long (> 16k chars, without new line)',
            chunks: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="',
                '1'.repeat(16 * 1024),
                '",nextfield="1"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="',
                `${'1'.repeat(16 * 1024)}`,
                '",nextfield="1"'
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([54]),
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0
            ]
        },
        {
            name: 'quote opened but field is too long (> 16k chars, with new line) (example 1)',
            chunks: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="a\n',
                '1'.repeat(16 * 1024),
                '",nextfield="1"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="a',
                `${'1'.repeat(16 * 1024)}`,
                '",nextfield="1"'
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([54]),
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0
            ]
        },
        {
            name: 'quote opened but field is too long (> 16k chars, with new line) (example 2)',
            chunks: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="a\r\n',
                '1'.repeat(16 * 1024),
                '",nextfield="1"'
            ],
            expectedData: [
                '<0>Jul  6 22:37:15 bigip14.1.2.test BigIP:EOCtimestamp="a',
                `${'1'.repeat(16 * 1024)}`,
                '",nextfield="1"'
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([54]),
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0
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
                'line2="value\nanotherPart=test\nanotherLine=anotherValue'
            ],
            mayHaveKeyValuePairs: [
                null,
                new Uint16Array([5])
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'empty line with line separator',
            chunks: [
                '{sep}'
            ],
            expectedData: [],
            mayHaveKeyValuePairs: [],
            mayHaveF5EventCategory: []
        },
        {
            name: 'empty lines with line separator',
            chunks: [
                '{sep}{sep}{sep}{sep}'
            ],
            expectedData: [],
            mayHaveKeyValuePairs: [],
            mayHaveF5EventCategory: []
        },
        {
            name: 'line with trailing spaces',
            chunks: [
                '{sep}{sep}{sep}{sep}  '
            ],
            expectedData: [
                '  '
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'ignore escaped separators',
            chunks: [
                '\\n \\r\\n'
            ],
            expectedData: [
                '\\n \\r\\n'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
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
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'ignore double quoted line separators (\\n)',
            chunks: [
                'line1"\\\\\\nstill line 1\\\\\n"line2\\\\{sep}'
            ],
            expectedData: [
                'line1"\\\\\\nstill line 1\\\\\n"line2\\\\'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'ignore double quoted line separators (\\r\\n)',
            chunks: [
                'line1"\\\\\\nstill line 1\\\\\r\n"line2\\\\{sep}'
            ],
            expectedData: [
                'line1"\\\\\\nstill line 1\\\\\r\n"line2\\\\'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'ignore single quoted line separators (\\n)',
            chunks: [
                'line1\'\\\\\\nstill line 1\\\\\n\'line2\\\\{sep}'
            ],
            expectedData: [
                'line1\'\\\\\\nstill line 1\\\\\n\'line2\\\\'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'ignore single quoted line separators (\\r\\n)',
            chunks: [
                'line1\'\\\\\\nstill line 1\\\\\r\n\'line2\\\\{sep}'
            ],
            expectedData: [
                'line1\'\\\\\\nstill line 1\\\\\r\n\'line2\\\\'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
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
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
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
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'not closed quotes (last line, leading quote)',
            chunks: [
                'line1{sep}"{sep}line3{sep}'
            ],
            expectedData: [
                'line1',
                '"{sep}line3'
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
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
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'single line with opened quote (first line, leading quote)',
            chunks: [
                '"line1{sep}line2'
            ],
            expectedData: [
                '"line1{sep}line2'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'single line with opened quote (first line, trailing quote)',
            chunks: [
                'line1"{sep}line2'
            ],
            expectedData: [
                'line1"{sep}line2'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'combination of complete and incomplete quotes',
            chunks: [
                '\'foo"bar""\none\'\n\'two""thr\nee"'
            ],
            expectedData: [
                '\'foo"bar""\none\'',
                '\'two""thr\nee"'
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
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
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
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
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([4]),
                new Uint16Array([4]),
                new Uint16Array([4])
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0
            ]
        },
        {
            name: 'ASM data (single ASM event)',
            chunks: [
                '<134>May  4 11:01:56 localhost.localdomain ASM:unit_hostname="bigip1",management_ip_address="192.168.2.1",management_ip_address_2="",http_class_name="/Common/ASMTestPolicy",web_application_name="/Common/ASMTestPolicy",policy_name="/Common/ASMTestPolicy",policy_apply_date="2021-04-29 14:20:42",violations="",support_id="2508780119460416236",request_status="passed",response_code="0",ip_client="192.168.2.2",route_domain="0",method="OPTIONS",protocol="HTTP",query_string="param=tomatoes",x_forwarded_for_header_value="N/A",sig_ids="",sig_names="",date_time="2021-05-04 11:01:55",severity="Informational",attack_type="",geo_location="N/A",ip_address_intelligence="N/A",username="N/A",session_id="0",src_port="56022",dest_port="7878",dest_ip="192.168.2.3",sub_violations="",virus_name="N/A",violation_rating="0",websocket_direction="N/A",websocket_message_type="N/A",device_id="N/A",staged_sig_ids="",staged_sig_names="",threat_campaign_names="",staged_threat_campaign_names="",blocking_exception_reason="N/A",captcha_result="not_received",microservice="",vs_name="/Common/testvs",uri="/hello",fragment="",request="OPTIONS /hello?param=tomatoes HTTP/1.1\\r\\nHost: 192.168.2.3:7878\\r\\nUser-Agent: curl/7.64.1\\r\\nAccept: */*\\r\\nContent-Type: application/json\\r\\ntoken: 12341234\\r\\n\\r\\n",response="Response logging disabled"\r\n'
            ],
            expectedData: [
                '<134>May  4 11:01:56 localhost.localdomain ASM:unit_hostname="bigip1",management_ip_address="192.168.2.1",management_ip_address_2="",http_class_name="/Common/ASMTestPolicy",web_application_name="/Common/ASMTestPolicy",policy_name="/Common/ASMTestPolicy",policy_apply_date="2021-04-29 14:20:42",violations="",support_id="2508780119460416236",request_status="passed",response_code="0",ip_client="192.168.2.2",route_domain="0",method="OPTIONS",protocol="HTTP",query_string="param=tomatoes",x_forwarded_for_header_value="N/A",sig_ids="",sig_names="",date_time="2021-05-04 11:01:55",severity="Informational",attack_type="",geo_location="N/A",ip_address_intelligence="N/A",username="N/A",session_id="0",src_port="56022",dest_port="7878",dest_ip="192.168.2.3",sub_violations="",virus_name="N/A",violation_rating="0",websocket_direction="N/A",websocket_message_type="N/A",device_id="N/A",staged_sig_ids="",staged_sig_names="",threat_campaign_names="",staged_threat_campaign_names="",blocking_exception_reason="N/A",captcha_result="not_received",microservice="",vs_name="/Common/testvs",uri="/hello",fragment="",request="OPTIONS /hello?param=tomatoes HTTP/1.1\\r\\nHost: 192.168.2.3:7878\\r\\nUser-Agent: curl/7.64.1\\r\\nAccept: */*\\r\\nContent-Type: application/json\\r\\ntoken: 12341234\\r\\n\\r\\n",response="Response logging disabled"'
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([
                    60, 69, 91, 105, 129, 132, 148, 172,
                    193, 217, 229, 253, 271, 293, 304, 307,
                    318, 340, 355, 364, 378, 382, 392, 406,
                    419, 423, 430, 440, 449, 456, 469, 486,
                    515, 521, 529, 532, 542, 545, 555, 577,
                    586, 602, 614, 617, 630, 636, 660, 666,
                    675, 681, 692, 696, 705, 713, 723, 730,
                    738, 752, 767, 770, 781, 787, 804, 808,
                    828, 834, 857, 863, 873, 879, 894, 897,
                    914, 917, 939, 942, 971, 974, 1000, 1006,
                    1021, 1036, 1049, 1052, 1060, 1077, 1081,
                    1090, 1099, 1102, 1110, 1280, 1289
                ])
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'ASM data (multi-chunk ASM event)',
            chunks: [
                '<134>May  4 11:01:56 localhost.localdomain ASM:unit_hostname="bigip1",management_ip_address="192.168.2.1",management_ip_address_2="",http_class_name="/Common/ASMTestPolicy",web_application_name="/Common/ASMTestPolicy",policy_name="/Common/ASMTestPolicy",policy_apply_date="2021-04-29 14:20:42",violations="",support_id="2508780119460416236",request_status="passed",response_code="0",ip_client="192.168.2.2",route_domain="0",method="OPTIONS",protocol="HTTP",query_string="param=tomatoes",x_forwarded_for_header_value="N/A",sig_ids="",sig_names="",date_time="2021-05-04 11:01:55",severity="Informational",attack_type="",geo_location="N/A",ip_address_intelligence="N/A",username="N/A",session_id="0",src_port="56022",dest_port="7878",dest_ip="192.168.2.3",sub_violations="",virus_name="N/A",violation_rating="0",websocket_direction="N/A",websocket_message_type="N/A",device_id="N/A",staged_sig_ids="",staged_sig_names="",threat_campaign_names="",staged_threat_campaign_names="",blocking_exception_reason="N/A",captcha_result="not_received",microservice="",vs_name="/Common/testvs",uri="/hello",fragment="",request="OPTIONS /hello?param=tomatoes',
                `${'/apples'.repeat(100)}`,
                'HTTP/1.1\\r\\nHost: 192.168.2.3:7878\\r\\nUser-Agent: curl/7.64.1\\r\\nAccept: */*\\r\\nContent-Type: application/json\\r\\ntoken: 12341234\\r\\n\\r\\n",response="Response logging disabled"\r\n'
            ],
            expectedData: [
                '<134>May  4 11:01:56 localhost.localdomain ASM:unit_hostname="bigip1",management_ip_address="192.168.2.1",management_ip_address_2="",http_class_name="/Common/ASMTestPolicy",web_application_name="/Common/ASMTestPolicy",policy_name="/Common/ASMTestPolicy",policy_apply_date="2021-04-29 14:20:42",violations="",support_id="2508780119460416236",request_status="passed",response_code="0",ip_client="192.168.2.2",route_domain="0",method="OPTIONS",protocol="HTTP",query_string="param=tomatoes",x_forwarded_for_header_value="N/A",sig_ids="",sig_names="",date_time="2021-05-04 11:01:55",severity="Informational",attack_type="",geo_location="N/A",ip_address_intelligence="N/A",username="N/A",session_id="0",src_port="56022",dest_port="7878",dest_ip="192.168.2.3",sub_violations="",virus_name="N/A",violation_rating="0",websocket_direction="N/A",websocket_message_type="N/A",device_id="N/A",staged_sig_ids="",staged_sig_names="",threat_campaign_names="",staged_threat_campaign_names="",blocking_exception_reason="N/A",captcha_result="not_received",microservice="",vs_name="/Common/testvs",uri="/hello",fragment="",request="OPTIONS /hello?param=tomatoes'
                + `${'/apples'.repeat(100)}`
                + 'HTTP/1.1\\r\\nHost: 192.168.2.3:7878\\r\\nUser-Agent: curl/7.64.1\\r\\nAccept: */*\\r\\nContent-Type: application/json\\r\\ntoken: 12341234\\r\\n\\r\\n",response="Response logging disabled"'
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([
                    60, 69, 91, 105, 129, 132, 148, 172,
                    193, 217, 229, 253, 271, 293, 304, 307,
                    318, 340, 355, 364, 378, 382, 392, 406,
                    419, 423, 430, 440, 449, 456, 469, 486,
                    515, 521, 529, 532, 542, 545, 555, 577,
                    586, 602, 614, 617, 630, 636, 660, 666,
                    675, 681, 692, 696, 705, 713, 723, 730,
                    738, 752, 767, 770, 781, 787, 804, 808,
                    828, 834, 857, 863, 873, 879, 894, 897,
                    914, 917, 939, 942, 971, 974, 1000, 1006,
                    1021, 1036, 1049, 1052, 1060, 1077, 1081,
                    1090, 1099, 1102, 1110, 1979, 1988
                ])
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'backslash chaos',
            chunks: [
                '\\'.repeat(20 * 1024)
            ],
            expectedData: [
                '\\'.repeat(16 * 1024),
                '\\'.repeat(4 * 1024)
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'new-line chaos',
            chunks: [
                '{sep}'.repeat(20 * 1024)
            ],
            expectedData: [],
            mayHaveKeyValuePairs: [],
            mayHaveF5EventCategory: []
        },
        {
            name: '=, chaos',
            chunks: [
                '=,'.repeat(20 * 1024)
            ],
            expectedData: [
                '=,'.repeat(8 * 1024),
                '=,'.repeat(8 * 1024),
                '=,'.repeat(4 * 1024)
            ],
            mayHaveKeyValuePairs: [
                null,
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0
            ]
        },
        {
            name: '=, chaos',
            chunks: [
                'a' + '=,'.repeat(20 * 1024)
            ],
            expectedData: [
                'a' + '=,'.repeat(8 * 1023) + '=,=,=,=,=,=,=,=',
                ',='.repeat(8 * 1024),
                ',='.repeat(4 * 1024) + ','
            ],
            mayHaveKeyValuePairs: [
                null,
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0
            ]
        },
        {
            name: '"" chaos',
            chunks: [
                '"'.repeat(20 * 1024)
            ],
            expectedData: [
                '"'.repeat(16 * 1024),
                '"'.repeat(4 * 1024)
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: '\'\' chaos',
            chunks: [
                '\''.repeat(20 * 1024)
            ],
            expectedData: [
                '\''.repeat(16 * 1024),
                '\''.repeat(4 * 1024)
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: '"\'"\' chaos',
            chunks: [
                '"\''.repeat(20 * 1024)
            ],
            expectedData: [
                '"\''.repeat(8 * 1023) + '"\'"\'"\'"\'"\'"\'"\'"\'',
                '"\''.repeat(8 * 1023) + '"\'"\'"\'"\'"\'"\'"\'"\'',
                '"\''.repeat(4 * 1024)
            ],
            mayHaveKeyValuePairs: [
                null,
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0,
                0
            ]
        },
        {
            name: 'filter out mayHaveKeyValuePairs according to position (example 1)',
            chunks: [
                'something=test' + '\\'.repeat(10 * 1024) + '"\n"something2=test2,something3=test3' + '\\'.repeat(10 * 1024)
            ],
            expectedData: [
                'something=test' + '\\'.repeat(10 * 1024) + '"',
                '"something2=test2,something3=test3' + '\\'.repeat(10 * 1024)
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([9]),
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'filter out mayHaveKeyValuePairs according to position (example 2)',
            chunks: [
                'something=test' + '\\'.repeat(10 * 1024) + '"\n""something2=test2,something3=test3' + '\\'.repeat(10 * 1024)
            ],
            expectedData: [
                'something=test' + '\\'.repeat(10 * 1024) + '"',
                '""something2=test2,something3=test3' + '\\'.repeat(10 * 1024)
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([9]),
                new Uint16Array([12, 18, 29])
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'filter out mayHaveKeyValuePairs according to position (example 3)',
            chunks: [
                '\\'.repeat(16 * 1023) + 'something=test==='
            ],
            expectedData: [
                '\\'.repeat(16 * 1023) + 'something=test==',
                '='
            ],
            mayHaveKeyValuePairs: [
                null,
                null
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'ignore $F5TelemetryEventCategory at the end of line (short)',
            chunks: [
                'myline $F5Telemetry='
            ],
            expectedData: [
                'myline $F5Telemetry='
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([19])
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'ignore $F5TelemetryEventCategory at the end of line (full)',
            chunks: [
                'myline $F5TelemetryEventCategory='
            ],
            expectedData: [
                'myline $F5TelemetryEventCategory='
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([32])
            ],
            mayHaveF5EventCategory: [
                8
            ]
        },
        {
            name: 'not ignore $F5TelemetryEventCategory at the end of line',
            chunks: [
                'myline $F5TelemetryEventCategory=v'
            ],
            expectedData: [
                'myline $F5TelemetryEventCategory=v'
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([32])
            ],
            mayHaveF5EventCategory: [
                8
            ]
        },
        {
            name: 'not ignore $F5TelemetryEventCategory when split into chunks',
            chunks: [
                'myline $F5Telemetry',
                'EventCategory=v'
            ],
            expectedData: [
                'myline $F5TelemetryEventCategory=v'
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([32])
            ],
            mayHaveF5EventCategory: [
                8
            ]
        },
        {
            name: 'not ignore $F5Telemetry when enclosing with quotes',
            chunks: [
                'myline "something" "$F5TelemetryEventCategory=v'
            ],
            expectedData: [
                'myline "something" "$F5TelemetryEventCategory=v'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                21
            ]
        },
        {
            name: 'ignore $F5Telemetry when out of bounds (example 1)',
            chunks: [
                'something=test"' + '\\'.repeat(10 * 1024) + '\n"$F5TelemetryEventCategory=v""something2=test2,something3=test3' + '\\'.repeat(10 * 1024)
            ],
            expectedData: [
                'something=test"' + '\\'.repeat(10 * 1024),
                '"$F5TelemetryEventCategory=v""something2=test2,something3=test3' + '\\'.repeat(10 * 1024)
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([9]),
                null
            ],
            mayHaveF5EventCategory: [
                0, // ignored first time
                2
            ]
        },
        {
            name: 'ignore $F5Telemetry when out of bounds (example 2)',
            chunks: [
                'something=test"' + '\\'.repeat(10 * 1024) + '$F5Tel\n"etryEventCategory=v""something2=test2,something3=test3' + '\\'.repeat(10 * 1024)
            ],
            expectedData: [
                'something=test"' + '\\'.repeat(10 * 1024) + '$F5Tel',
                '"etryEventCategory=v""something2=test2,something3=test3' + '\\'.repeat(10 * 1024)
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array([9]),
                null
            ],
            mayHaveF5EventCategory: [
                0, // ignored first time
                0
            ]
        },
        {
            name: 'ignore $F5Telemetry when enclosing with quotes (extra backlash)',
            chunks: [
                'myline "something" "$\\F5TelemetryEventCategory=v'
            ],
            expectedData: [
                'myline "something" "$\\F5TelemetryEventCategory=v'
            ],
            mayHaveKeyValuePairs: [
                null
            ],
            mayHaveF5EventCategory: [
                0
            ]
        },
        {
            name: 'process extra backlash in new line',
            chunks: [
                'myline "something" "$\\F5TelemetryEv"entC\r\\\nategory=v'
            ],
            expectedData: [
                'myline "something" "$\\F5TelemetryEv"entC\r\\',
                'ategory=v'
            ],
            mayHaveKeyValuePairs: [
                null,
                new Uint16Array([7])
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        },
        {
            name: 'detect only 2000 key-value pairs per message',
            chunks: [
                'key=val,'.repeat(2030) + 'key=val\n',
                'key=va,'.repeat(2030) + 'key=va\n'
            ],
            expectedData: [
                'key=val,'.repeat(2030) + 'key=val',
                'key=va,'.repeat(2030) + 'key=va'
            ],
            mayHaveKeyValuePairs: [
                new Uint16Array(generateKVOffsets('key=va1,', 2000).slice(0, 8000)),
                new Uint16Array(generateKVOffsets('key=va,', 2000).slice(0, 8000))
            ],
            mayHaveF5EventCategory: [
                0,
                0
            ]
        }
    ]
};

function generateKVOffsets(string, repeat) {
    const eqOffset = string.indexOf('=');
    const cmOffset = string.indexOf(',');
    const slen = string.length;
    const result = [];

    for (let i = 0; i < repeat; i += 1) {
        result.push(eqOffset + slen * i, cmOffset + slen * i);
    }
    return result;
}
