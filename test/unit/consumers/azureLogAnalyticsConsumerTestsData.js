/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    systemData: [
        {
            expectedData: [
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_system',
                        Authorization: 'SharedKey myWorkspace:nDogw1h5zf0gHMunXar92Iy8JkPgOnoDac8dIVH8e3U='
                    },
                    body: '[{"hostname":"bigip1","version":"14.1.0.6","versionBuild":"0.0.9","location":"missing data","description":"missing data","marketingName":"missing data","platformId":"missing data","chassisId":"missing data","baseMac":"fa:16:3e:da:e9:7b","callBackUrl":"https://192.0.2.0","configReady":"yes","licenseReady":"yes","provisionReady":"yes","syncMode":"standalone","syncColor":"green","syncStatus":"Standalone","syncSummary":" ","failoverStatus":"OFFLINE","failoverColor":"red","systemTimestamp":"2019-12-10T18:13:35.000Z","cpu":3,"memory":36,"tmmCpu":1,"tmmMemory":6,"tmmTraffic":{"clientSideTraffic.bitsIn":504279640,"clientSideTraffic.bitsOut":226516176,"serverSideTraffic.bitsIn":133672632,"serverSideTraffic.bitsOut":226515224},"diskStorage":{"/":{"1024-blocks":"428150","Capacity":"20%","name":"/"},"/dev":{"1024-blocks":"4079780","Capacity":"1%","name":"/dev"},"/dev/shm":{"1024-blocks":"4088828","Capacity":"1%","name":"/dev/shm"},"/run":{"1024-blocks":"4088828","Capacity":"1%","name":"/run"},"/sys/fs/cgroup":{"1024-blocks":"4088828","Capacity":"0%","name":"/sys/fs/cgroup"},"/usr":{"1024-blocks":"5186648","Capacity":"84%","name":"/usr"},"/shared":{"1024-blocks":"15350768","Capacity":"2%","name":"/shared"},"/shared/rrd.1.2":{"1024-blocks":"4088828","Capacity":"2%","name":"/shared/rrd.1.2"},"/var":{"1024-blocks":"3030800","Capacity":"34%","name":"/var"},"/config":{"1024-blocks":"2171984","Capacity":"2%","name":"/config"},"/var/tmstat":{"1024-blocks":"4088828","Capacity":"1%","name":"/var/tmstat"},"/var/prompt":{"1024-blocks":"4096","Capacity":"1%","name":"/var/prompt"},"/var/log":{"1024-blocks":"2958224","Capacity":"8%","name":"/var/log"},"/appdata":{"1024-blocks":"25717852","Capacity":"4%","name":"/appdata"},"/var/loipc":{"1024-blocks":"4088828","Capacity":"0%","name":"/var/loipc"},"/run/user/91":{"1024-blocks":"817768","Capacity":"0%","name":"/run/user/91"}},"diskLatency":{"sda":{"r/s":"6.30","w/s":"3.81","%util":"0.61","name":"sda"},"dm-0":{"r/s":"0.00","w/s":"0.00","%util":"0.00","name":"dm-0"},"dm-1":{"r/s":"0.02","w/s":"1.65","%util":"0.09","name":"dm-1"},"dm-2":{"r/s":"0.74","w/s":"1.15","%util":"0.10","name":"dm-2"},"dm-3":{"r/s":"0.07","w/s":"2.09","%util":"0.10","name":"dm-3"},"dm-4":{"r/s":"0.28","w/s":"0.28","%util":"0.01","name":"dm-4"},"dm-5":{"r/s":"0.08","w/s":"0.36","%util":"0.04","name":"dm-5"},"dm-6":{"r/s":"3.97","w/s":"0.00","%util":"0.18","name":"dm-6"},"dm-7":{"r/s":"0.03","w/s":"0.01","%util":"0.00","name":"dm-7"},"dm-8":{"r/s":"0.38","w/s":"1.37","%util":"0.10","name":"dm-8"}},"networkInterfaces":{"1.0":{"counters.bitsIn":711490452056,"counters.bitsOut":142743816,"status":"up","name":"1.0"},"mgmt":{"counters.bitsIn":54414035630272,"counters.bitsOut":54168776048,"status":"up","name":"mgmt"}},"provisioning":{"afm":{"name":"afm","level":"none"},"am":{"name":"am","level":"none"},"apm":{"name":"apm","level":"none"},"asm":{"name":"asm","level":"none"},"avr":{"name":"avr","level":"nominal"},"dos":{"name":"dos","level":"none"},"fps":{"name":"fps","level":"none"},"gtm":{"name":"gtm","level":"none"},"ilx":{"name":"ilx","level":"none"},"lc":{"name":"lc","level":"none"},"ltm":{"name":"ltm","level":"nominal"},"pem":{"name":"pem","level":"none"},"sslo":{"name":"sslo","level":"none"},"swg":{"name":"swg","level":"none"},"urldb":{"name":"urldb","level":"none"}},"ltmConfigTime":"2019-12-10T18:13:26.000Z"}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_virtualServers',
                        Authorization: 'SharedKey myWorkspace:BkS4afzvOJG7fnXwKVd95oR3dh+l9pCZV214RQICgsc='
                    },
                    body: '[{"/Common/Shared/telemetry_local":{"clientside.bitsIn":0,"clientside.bitsOut":0,"clientside.curConns":0,"destination":"255.255.255.254:6514","availabilityState":"unknown","enabledState":"enabled","name":"/Common/Shared/telemetry_local","ipProtocol":"tcp","mask":"255.255.255.255","tenant":"Common","application":"Shared","profiles":{"/Common/tcp":{"name":"/Common/tcp","tenant":"Common"},"/Common/app/http":{"name":"/Common/app/http","tenant":"Common","application":"app"}}},"/Common/something":{"clientside.bitsIn":0,"clientside.bitsOut":0,"clientside.curConns":0,"destination":"192.0.2.0:8787","availabilityState":"unknown","enabledState":"enabled","name":"/Common/something","ipProtocol":"tcp","mask":"255.255.255.255","pool":"/Common/static","tenant":"Common","profiles":{"/Common/tcpCustom":{"name":"/Common/tcpCustom","tenant":"Common"},"/Common/app/http":{"name":"/Common/app/http","tenant":"Common","application":"app"}}},"/Common/telemetry_gjd":{"clientside.bitsIn":0,"clientside.bitsOut":0,"clientside.curConns":0,"destination":"255.255.255.254:1234","availabilityState":"unknown","enabledState":"enabled","name":"/Common/telemetry_gjd","ipProtocol":"tcp","mask":"255.255.255.255","tenant":"Common"},"/Common/testvs":{"clientside.bitsIn":0,"clientside.bitsOut":0,"clientside.curConns":0,"destination":"192.0.2.0:7788","availabilityState":"unknown","enabledState":"enabled","name":"/Common/testvs","ipProtocol":"tcp","mask":"255.255.255.255","pool":"/Common/static","tenant":"Common"}}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_pools',
                        Authorization: 'SharedKey myWorkspace:oRcIK72J2ErLv7Q7qRL8hpgtNXfKaMIp5cts5cyOyvE='
                    },
                    body: '[{"/Common/Shared/telemetry":{"activeMemberCnt":0,"curPriogrp":0,"highestPriogrp":0,"lowestPriogrp":0,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled","name":"/Common/Shared/telemetry","members":{"/Common/Shared/255.255.255.254:6514":{"addr":"255.255.255.254","port":6514,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled"}},"tenant":"Common","application":"Shared"},"/Common/static":{"activeMemberCnt":0,"curPriogrp":0,"highestPriogrp":0,"lowestPriogrp":0,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled","name":"/Common/static","members":{"/Common/192.0.2.0:8081":{"addr":"192.0.2.0","port":8081,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled"}},"tenant":"Common"},"/Common/telemetry-local":{"activeMemberCnt":0,"curPriogrp":0,"highestPriogrp":0,"lowestPriogrp":0,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled","name":"/Common/telemetry-local","members":{"/Common/192.0.2.1:6514":{"addr":"192.0.2.1","port":6514,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled"}},"tenant":"Common"},"/Sample_01/A1/web_pool":{"activeMemberCnt":0,"curPriogrp":0,"highestPriogrp":0,"lowestPriogrp":0,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled","name":"/Sample_01/A1/web_pool","members":{"/Sample_01/192.0.1.10:80":{"addr":"192.0.1.10","port":80,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled"},"/Sample_01/192.0.1.11:80":{"addr":"192.0.1.11","port":80,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled"},"/Sample_01/192.0.1.12:80":{"addr":"192.0.1.12","port":80,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled"},"/Sample_01/192.0.1.13:80":{"addr":"192.0.1.13","port":80,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled"}},"tenant":"Sample_01","application":"A1"},"/Sample_event_sd/My_app/My_pool":{"activeMemberCnt":0,"curPriogrp":0,"highestPriogrp":0,"lowestPriogrp":0,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled","name":"/Sample_event_sd/My_app/My_pool","members":{"/Sample_event_sd/192.0.2.6:80":{"addr":"192.0.2.6","port":80,"serverside.bitsIn":0,"serverside.bitsOut":0,"serverside.curConns":0,"availabilityState":"unknown","enabledState":"enabled"}},"tenant":"Sample_event_sd","application":"My_app"}}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_ltmPolicies',
                        Authorization: 'SharedKey myWorkspace:p7QbfHdBTldEs3Y8oQnk1IqemzIvL6HVPUuf01ZrYQU='
                    },
                    body: '[{"items":[]}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_httpProfiles',
                        Authorization: 'SharedKey myWorkspace:/HGE4aiKJzHChgGm6ywtu6HKhAAOHW1ZtAZP7L9RUHY='
                    },
                    body: '[{"/Common/http":{"cookiePersistInserts":0,"getReqs":0,"maxKeepaliveReq":0,"numberReqs":0,"postReqs":0,"2xxResp":0,"3xxResp":0,"4xxResp":0,"5xxResp":0,"respLessThan2m":0,"respGreaterThan2m":0,"v10Reqs":0,"v10Resp":0,"v11Reqs":0,"v11Resp":0,"v9Reqs":0,"v9Resp":0,"name":"/Common/http","tenant":"Common"},"/Common/http-explicit":{"cookiePersistInserts":0,"getReqs":0,"maxKeepaliveReq":0,"numberReqs":0,"postReqs":0,"2xxResp":0,"3xxResp":0,"4xxResp":0,"5xxResp":0,"respLessThan2m":0,"respGreaterThan2m":0,"v10Reqs":0,"v10Resp":0,"v11Reqs":0,"v11Resp":0,"v9Reqs":0,"v9Resp":0,"name":"/Common/http-explicit","tenant":"Common"},"/Common/http-transparent":{"cookiePersistInserts":0,"getReqs":0,"maxKeepaliveReq":0,"numberReqs":0,"postReqs":0,"2xxResp":0,"3xxResp":0,"4xxResp":0,"5xxResp":0,"respLessThan2m":0,"respGreaterThan2m":0,"v10Reqs":0,"v10Resp":0,"v11Reqs":0,"v11Resp":0,"v9Reqs":0,"v9Resp":0,"name":"/Common/http-transparent","tenant":"Common"}}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_clientSslProfiles',
                        Authorization: 'SharedKey myWorkspace:NH+4mwriTW7G9yHgnETHcHvwo5eyQ9GMzknOTm4nKAU='
                    },
                    body: '[{"/Common/clientssl":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"sniRejects":0,"name":"/Common/clientssl","tenant":"Common"},"/Common/clientssl-insecure-compatible":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"sniRejects":0,"name":"/Common/clientssl-insecure-compatible","tenant":"Common"},"/Common/clientssl-secure":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"sniRejects":0,"name":"/Common/clientssl-secure","tenant":"Common"},"/Common/crypto-server-default-clientssl":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"sniRejects":0,"name":"/Common/crypto-server-default-clientssl","tenant":"Common"},"/Common/splitsession-default-clientssl":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"sniRejects":0,"name":"/Common/splitsession-default-clientssl","tenant":"Common"},"/Common/wom-default-clientssl":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"sniRejects":0,"name":"/Common/wom-default-clientssl","tenant":"Common"}}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_serverSslProfiles',
                        Authorization: 'SharedKey myWorkspace:nnMsCgJoxGaPakViInNsQjSWrkql3qGIFHaVYMi1TXs='
                    },
                    body: '[{"/Common/apm-default-serverssl":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"name":"/Common/apm-default-serverssl","tenant":"Common"},"/Common/crypto-client-default-serverssl":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"name":"/Common/crypto-client-default-serverssl","tenant":"Common"},"/Common/pcoip-default-serverssl":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"name":"/Common/pcoip-default-serverssl","tenant":"Common"},"/Common/serverssl":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"name":"/Common/serverssl","tenant":"Common"},"/Common/serverssl-insecure-compatible":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"name":"/Common/serverssl-insecure-compatible","tenant":"Common"},"/Common/splitsession-default-serverssl":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"name":"/Common/splitsession-default-serverssl","tenant":"Common"},"/Common/wom-default-serverssl":{"activeHandshakeRejected":0,"cipherUses.chacha20Poly1305Bulk":0,"currentCompatibleConnections":0,"currentConnections":0,"currentNativeConnections":0,"currentActiveHandshakes":0,"decryptedBytesIn":0,"decryptedBytesOut":0,"encryptedBytesIn":0,"encryptedBytesOut":0,"fatalAlerts":0,"handshakeFailures":0,"peercertInvalid":0,"peercertNone":0,"peercertValid":0,"protocolUses.dtlsv1":0,"protocolUses.sslv2":0,"protocolUses.sslv3":0,"protocolUses.tlsv1":0,"protocolUses.tlsv1_1":0,"protocolUses.tlsv1_2":0,"protocolUses.tlsv1_3":0,"recordsIn":0,"recordsOut":0,"name":"/Common/wom-default-serverssl","tenant":"Common"}}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_sslCerts',
                        Authorization: 'SharedKey myWorkspace:pAbl6FbCqKaKQA69WFS2Zn9CdDTzmGtLz56RRKYODyc='
                    },
                    body: '[{"ca-bundle.crt":{"expirationDate":1893455999,"expirationString":"2029-12-31T23:59:59.000Z","issuer":"CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US","subject":"CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US","name":"ca-bundle.crt"},"default.crt":{"email":"root@localhost.localdomain","expirationDate":1887142817,"expirationString":"2029-10-19T22:20:17.000Z","issuer":"emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US","subject":"emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US","name":"default.crt"},"f5-ca-bundle.crt":{"expirationDate":1922896554,"expirationString":"2030-12-07T17:55:54.000Z","issuer":"CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US","subject":"CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US","name":"f5-ca-bundle.crt"},"f5-irule.crt":{"email":"support@f5.com","expirationDate":1815944413,"expirationString":"2027-07-18T21:00:13.000Z","issuer":"emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US","subject":"emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US","name":"f5-irule.crt"}}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_networkTunnels',
                        Authorization: 'SharedKey myWorkspace:EMRLco9aJSu/DkGzNRwEGbsAixbZEQJZ5sJcsw0Kohc='
                    },
                    body: '[{"/Common/http-tunnel":{"hcInBroadcastPkts":0,"hcInMulticastPkts":0,"hcInOctets":0,"hcInUcastPkts":0,"hcOutBroadcastPkts":0,"hcOutMulticastPkts":0,"hcOutOctets":0,"hcOutUcastPkts":0,"inDiscards":0,"inErrors":0,"inUnknownProtos":0,"outDiscards":0,"outErrors":0,"name":"/Common/http-tunnel","tenant":"Common"},"/Common/socks-tunnel":{"hcInBroadcastPkts":0,"hcInMulticastPkts":0,"hcInOctets":0,"hcInUcastPkts":0,"hcOutBroadcastPkts":0,"hcOutMulticastPkts":0,"hcOutOctets":0,"hcOutUcastPkts":0,"inDiscards":0,"inErrors":0,"inUnknownProtos":0,"outDiscards":0,"outErrors":0,"name":"/Common/socks-tunnel","tenant":"Common"}}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_deviceGroups',
                        Authorization: 'SharedKey myWorkspace:hDILHfXzGvIMpiLrc/RXp2JW9XqE9LCPNouiqGaJ4C4='
                    },
                    body: '[{"/Common/datasync-device-bigip2.gjd.com-dg":{"commitIdTime":"2019-12-08T16:01:32.000Z","lssTime":"-","timeSinceLastSync":"-","name":"/Common/datasync-device-bigip2.gjd.com-dg","type":"sync-only","tenant":"Common"},"/Common/datasync-global-dg":{"commitIdTime":"2019-12-08T16:01:31.000Z","lssTime":"-","timeSinceLastSync":"-","name":"/Common/datasync-global-dg","type":"sync-only","tenant":"Common"},"/Common/device_trust_group":{"commitIdTime":"2019-12-08T16:01:31.000Z","lssTime":"-","timeSinceLastSync":"-","name":"/Common/device_trust_group","type":"sync-only","tenant":"Common"},"/Common/gtm":{"commitIdTime":"2019-12-03T04:35:17.000Z","lssTime":"-","timeSinceLastSync":"-","name":"/Common/gtm","type":"sync-only","tenant":"Common"}}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_iRules',
                        Authorization: 'SharedKey myWorkspace:NaHIh1WG44+X730fujM+21IAp18E42Z3VlVyrBsiTj0='
                    },
                    body: '[{"/Common/Shared/telemetry_local_rule":{"events":{"CLIENT_ACCEPTED":{"aborts":0,"avgCycles":0,"failures":0,"maxCycles":0,"minCycles":0,"priority":500,"totalExecutions":0}},"name":"/Common/Shared/telemetry_local_rule","tenant":"Common","application":"Shared"},"/Common/_sys_APM_ExchangeSupport_OA_BasicAuth":{"events":{"RULE_INIT":{"aborts":0,"avgCycles":48591,"failures":0,"maxCycles":48591,"minCycles":26910,"priority":500,"totalExecutions":2}},"name":"/Common/_sys_APM_ExchangeSupport_OA_BasicAuth","tenant":"Common"},"/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth":{"events":{"RULE_INIT":{"aborts":0,"avgCycles":101691,"failures":0,"maxCycles":101691,"minCycles":70938,"priority":500,"totalExecutions":2}},"name":"/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth","tenant":"Common"},"/Common/_sys_APM_ExchangeSupport_helper":{"events":{"HTTP_REQUEST_DATA":{"aborts":0,"avgCycles":0,"failures":0,"maxCycles":0,"minCycles":0,"priority":500,"totalExecutions":0}},"name":"/Common/_sys_APM_ExchangeSupport_helper","tenant":"Common"},"/Common/_sys_APM_ExchangeSupport_main":{"events":{"RULE_INIT":{"aborts":0,"avgCycles":61059,"failures":0,"maxCycles":61059,"minCycles":52359,"priority":500,"totalExecutions":2}},"name":"/Common/_sys_APM_ExchangeSupport_main","tenant":"Common"},"/Common/_sys_APM_MS_Office_OFBA_Support":{"events":{"RULE_INIT":{"aborts":0,"avgCycles":44547,"failures":0,"maxCycles":44547,"minCycles":42075,"priority":500,"totalExecutions":2}},"name":"/Common/_sys_APM_MS_Office_OFBA_Support","tenant":"Common"},"/Common/_sys_APM_Office365_SAML_BasicAuth":{"events":{"RULE_INIT":{"aborts":0,"avgCycles":4290,"failures":0,"maxCycles":4290,"minCycles":4284,"priority":500,"totalExecutions":2}},"name":"/Common/_sys_APM_Office365_SAML_BasicAuth","tenant":"Common"},"/Common/_sys_APM_activesync":{"events":{"RULE_INIT":{"aborts":0,"avgCycles":10371,"failures":0,"maxCycles":10371,"minCycles":6153,"priority":500,"totalExecutions":2}},"name":"/Common/_sys_APM_activesync","tenant":"Common"},"/Common/_sys_auth_krbdelegate":{"events":{"HTTP_RESPONSE":{"aborts":0,"avgCycles":0,"failures":0,"maxCycles":0,"minCycles":0,"priority":500,"totalExecutions":0}},"name":"/Common/_sys_auth_krbdelegate","tenant":"Common"},"/Common/_sys_auth_ldap":{"events":{"HTTP_REQUEST":{"aborts":0,"avgCycles":0,"failures":0,"maxCycles":0,"minCycles":0,"priority":500,"totalExecutions":0}},"name":"/Common/_sys_auth_ldap","tenant":"Common"},"/Common/_sys_auth_radius":{"events":{"HTTP_REQUEST":{"aborts":0,"avgCycles":0,"failures":0,"maxCycles":0,"minCycles":0,"priority":500,"totalExecutions":0}},"name":"/Common/_sys_auth_radius","tenant":"Common"},"/Common/_sys_auth_ssl_cc_ldap":{"events":{"CLIENT_ACCEPTED":{"aborts":0,"avgCycles":0,"failures":0,"maxCycles":0,"minCycles":0,"priority":500,"totalExecutions":0}},"name":"/Common/_sys_auth_ssl_cc_ldap","tenant":"Common"},"/Common/_sys_auth_ssl_crldp":{"events":{"CLIENT_ACCEPTED":{"aborts":0,"avgCycles":0,"failures":0,"maxCycles":0,"minCycles":0,"priority":500,"totalExecutions":0}},"name":"/Common/_sys_auth_ssl_crldp","tenant":"Common"},"/Common/_sys_auth_ssl_ocsp":{"events":{"CLIENT_ACCEPTED":{"aborts":0,"avgCycles":0,"failures":0,"maxCycles":0,"minCycles":0,"priority":500,"totalExecutions":0}},"name":"/Common/_sys_auth_ssl_ocsp","tenant":"Common"},"/Common/_sys_auth_tacacs":{"events":{"HTTP_REQUEST":{"aborts":0,"avgCycles":0,"failures":0,"maxCycles":0,"minCycles":0,"priority":500,"totalExecutions":0}},"name":"/Common/_sys_auth_tacacs","tenant":"Common"},"/Common/_sys_https_redirect":{"events":{"HTTP_REQUEST":{"aborts":0,"avgCycles":0,"failures":0,"maxCycles":0,"minCycles":0,"priority":500,"totalExecutions":0}},"name":"/Common/_sys_https_redirect","tenant":"Common"}}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_tmstats',
                        Authorization: 'SharedKey myWorkspace:IgLqh4h7Kx4h2lCFDKREexDCUMuACuGlZFi1bOl6sfI='
                    },
                    body: '[{}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_telemetryServiceInfo',
                        Authorization: 'SharedKey myWorkspace:CI8euMJZE46Tkvr1xQxQ5KtvLvNSLMn6pmZoUmxiVbE='
                    },
                    body: '[{"pollingInterval":60,"cycleStart":"2019-12-10T18:13:35.129Z","cycleEnd":"2019-12-10T18:13:36.285Z"}]',
                    strictSSL: true
                },
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_telemetryEventCategory',
                        Authorization: 'SharedKey myWorkspace:HTlS6jtEi0oPBWJtKIlQOpx/IaXTjG4RxnFXr7aE0DY='
                    },
                    body: '[{"value":"systemInfo"}]',
                    strictSSL: true
                }
            ]
        }
    ],
    eventData: [
        {
            expectedData: [
                {
                    url: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT',
                        'Log-Type': 'F5Telemetry_AVR',
                        Authorization: 'SharedKey myWorkspace:LQBkGGgH9JojDsje7xD+EiAXz6SQrcTXlENkjbNzLKU='
                    },
                    body: '[{"hostname":"bigip1","errdefs_msgno":"22282286","Entity":"SystemMonitor","AggrInterval":"300","EOCTimestamp":"1576002300","HitCount":"1","SlotId":"0","CpuHealth":"10","AvgCpu":"1096","AvgCpuDataPlane":"0","AvgCpuControlPlane":"0","AvgCpuAnalysisPlane":"0","MaxCpu":"1096","MemoryHealth":"37","AvgMemory":"3751","ThroughputHealth":"0","TotalBytes":"2379912","AvgThroughput":"237991","ConcurrentConnectionsHealth":"0","AvgConcurrentConnections":"66","MaxConcurrentConnections":"66","telemetryEventCategory":"AVR"}]',
                    strictSSL: true
                }
            ]
        }
    ]
};
