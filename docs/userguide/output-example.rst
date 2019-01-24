Example Output
==============

System Information
------------------

.. code-block:: json
   :linenos:

    {
        "hostname": "telemetry.bigip.com",
        "version": "14.0.0.1",
        "versionBuild": "0.0.2",
        "location": "Seattle",
        "description": "Telemetry BIG-IP",
        "marketingName": "BIG-IP Virtual Edition",
        "platformId": "Z100",
        "chassisId": "9c3abad5-513a-1c43-5bc2be62e957",
        "baseMac": "00:0d:3a:30:34:51",
        "callBackUrl": "https://192.0.2.1",
        "configReady": "yes",
        "licenseReady": "yes",
        "provisionReady": "yes",
        "syncMode": "standalone",
        "syncColor": "green",
        "syncStatus": "Standalone",
        "syncSummary": " ",
        "failoverStatus": "ACTIVE",
        "failoverColor": "green",
        "deviceTimestamp": "2018-12-13T20:24:20Z",
        "cpu": 1,
        "memory": 15,
        "tmmCpu": 1,
        "tmmMemory": 4,
        "tmmTraffic": {
            "clientSideTraffic.bitsIn": 5682858224,
            "clientSideTraffic.bitsOut": 18756943624
        },
        "diskStorage": {
            "/": {
                "1024-blocks": "436342",
                "Capacity": "55%",
                "name": "/"
            },
            "/dev/shm": {
                "1024-blocks": "7181064",
                "Capacity": "1%",
                "name": "/dev/shm"
            },
            "/config": {
                "1024-blocks": "3269592",
                "Capacity": "3%",
                "name": "/config"
            },
            "/usr": {
                "1024-blocks": "4136432",
                "Capacity": "83%",
                "name": "/usr"
            },
            "/var": {
                "1024-blocks": "3096336",
                "Capacity": "28%",
                "name": "/var"
            },
            "/shared": {
                "1024-blocks": "20642428",
                "Capacity": "2%",
                "name": "/shared"
            },
            "/var/log": {
                "1024-blocks": "3023760",
                "Capacity": "5%",
                "name": "/var/log"
            },
            "/appdata": {
                "1024-blocks": "25717852",
                "Capacity": "1%",
                "name": "/appdata"
            },
            "/shared/rrd.1.2": {
                "1024-blocks": "7181064",
                "Capacity": "1%",
                "name": "/shared/rrd.1.2"
            },
            "/var/run": {
                "1024-blocks": "7181064",
                "Capacity": "1%",
                "name": "/var/run"
            },
            "/var/tmstat": {
                "1024-blocks": "7181064",
                "Capacity": "1%",
                "name": "/var/tmstat"
            },
            "/var/prompt": {
                "1024-blocks": "4096",
                "Capacity": "1%",
                "name": "/var/prompt"
            },
            "/var/loipc": {
                "1024-blocks": "7181064",
                "Capacity": "0%",
                "name": "/var/loipc"
            }
        },
        "diskLatency": {
            "sda": {
                "rsec/s": "356.44",
                "wsec/s": "109.09",
                "name": "sda"
            },
            "sdb": {
                "rsec/s": "1.03",
                "wsec/s": "0.00",
                "name": "sdb"
            },
            "dm-0": {
                "rsec/s": "0.02",
                "wsec/s": "0.00",
                "name": "dm-0"
            },
            "dm-1": {
                "rsec/s": "1.16",
                "wsec/s": "64.68",
                "name": "dm-1"
            },
            "dm-2": {
                "rsec/s": "0.02",
                "wsec/s": "0.00",
                "name": "dm-2"
            },
            "dm-3": {
                "rsec/s": "0.83",
                "wsec/s": "26.54",
                "name": "dm-3"
            },
            "dm-4": {
                "rsec/s": "1.16",
                "wsec/s": "5.80",
                "name": "dm-4"
            },
            "dm-5": {
                "rsec/s": "19.59",
                "wsec/s": "2.23",
                "name": "dm-5"
            },
            "dm-6": {
                "rsec/s": "327.64",
                "wsec/s": "0.00",
                "name": "dm-6"
            },
            "dm-7": {
                "rsec/s": "0.62",
                "wsec/s": "0.80",
                "name": "dm-7"
            },
            "dm-8": {
                "rsec/s": "4.28",
                "wsec/s": "9.04",
                "name": "dm-8"
            }
        },
        "networkInterfaces": {
            "1.1": {
                "counters.bitsIn": 18226797032,
                "counters.bitsOut": 5242940808,
                "status": "up",
                "name": "1.1"
            },
            "1.2": {
                "counters.bitsIn": 1534110872,
                "counters.bitsOut": 84389728,
                "status": "up",
                "name": "1.2"
            },
            "mgmt": {
                "counters.bitsIn": 2242676328,
                "counters.bitsOut": 1143046952,
                "status": "up",
                "name": "mgmt"
            }
        },
        "provisionState": {
            "afm": {
                "level": "none",
                "name": "afm"
            },
            "am": {
                "level": "none",
                "name": "am"
            },
            "apm": {
                "level": "none",
                "name": "apm"
            },
            "asm": {
                "level": "none",
                "name": "asm"
            },
            "avr": {
                "level": "none",
                "name": "avr"
            },
            "dos": {
                "level": "none",
                "name": "dos"
            },
            "fps": {
                "level": "none",
                "name": "fps"
            },
            "gtm": {
                "level": "none",
                "name": "gtm"
            },
            "ilx": {
                "level": "none",
                "name": "ilx"
            },
            "lc": {
                "level": "none",
                "name": "lc"
            },
            "ltm": {
                "level": "nominal",
                "name": "ltm"
            },
            "pem": {
                "level": "none",
                "name": "pem"
            },
            "sslo": {
                "level": "none",
                "name": "sslo"
            },
            "swg": {
                "level": "none",
                "name": "swg"
            },
            "urldb": {
                "level": "none",
                "name": "urldb"
            }
        },
        "virtualServerStats": {
            "/Common/app.app/app_vs": {
                "clientside.bitsIn": 31417200,
                "clientside.bitsOut": 297731408,
                "clientside.curConns": 0,
                "destination": "/Common/10.0.2.101:80",
                "availabilityState": "available",
                "enabledState": "enabled",
                "name": "/Common/app.app/app_vs",
                "tenant": "Common",
                "application": "app.app"
            },
            "/Sample_02/A1/serviceMain": {
                "clientside.bitsIn": 0,
                "clientside.bitsOut": 0,
                "clientside.curConns": 0,
                "destination": "/Sample_02/192.0.2.11:443",
                "availabilityState": "offline",
                "enabledState": "enabled",
                "name": "/Sample_02/A1/serviceMain",
                "tenant": "Sample_02",
                "application": "A1"
            },
            "/Sample_02/A1/serviceMain-Redirect": {
                "clientside.bitsIn": 0,
                "clientside.bitsOut": 0,
                "clientside.curConns": 0,
                "destination": "/Sample_02/192.0.2.11:80",
                "availabilityState": "unknown",
                "enabledState": "enabled",
                "name": "/Sample_02/A1/serviceMain-Redirect",
                "tenant": "Sample_02",
                "application": "A1"
            }
        },
        "poolStats": {
            "/Common/app.app/app_pool": {
                "serverside.bitsIn": 39075976,
                "serverside.bitsOut": 299502400,
                "serverside.curConns": 0,
                "availabilityState": "available",
                "enabledState": "enabled",
                "status.statusReason": "The pool is available",
                "members": {
                    "/Common/10.0.3.5:80": {
                        "addr": "10.0.3.5",
                        "port": 80,
                        "serverside.bitsIn": 39075976,
                        "serverside.bitsOut": 299502400,
                        "serverside.curConns": 0,
                        "sessionStatus": "enabled",
                        "availabilityState": "available",
                        "enabledState": "enabled",
                        "status.statusReason": "Pool member is available"
                    }
                },
                "name": "/Common/app.app/app_pool",
                "tenant": "Common",
                "application": "app.app"
            },
            "/Common/telemetry-local": {
                "serverside.bitsIn": 14780176,
                "serverside.bitsOut": 3354112,
                "serverside.curConns": 1,
                "availabilityState": "available",
                "enabledState": "enabled",
                "status.statusReason": "The pool is available",
                "members": {
                    "/Common/10.0.1.100:6514": {
                        "addr": "10.0.1.100",
                        "port": 6514,
                        "serverside.bitsIn": 14780176,
                        "serverside.bitsOut": 3354112,
                        "serverside.curConns": 1,
                        "sessionStatus": "enabled",
                        "availabilityState": "available",
                        "enabledState": "enabled",
                        "status.statusReason": "Pool member is available"
                    }
                },
                "name": "/Common/telemetry-local",
                "tenant": "Common",
                "application": ""
            },
            "/Sample_02/A1/web_pool": {
                "serverside.bitsIn": 0,
                "serverside.bitsOut": 0,
                "serverside.curConns": 0,
                "availabilityState": "offline",
                "enabledState": "enabled",
                "status.statusReason": "The children pool member(s) are down",
                "members": {
                    "/Sample_02/192.0.2.12:80": {
                        "addr": "192.0.2.12",
                        "port": 80,
                        "serverside.bitsIn": 0,
                        "serverside.bitsOut": 0,
                        "serverside.curConns": 0,
                        "sessionStatus": "enabled",
                        "availabilityState": "offline",
                        "enabledState": "enabled",
                        "status.statusReason": "/Common/http: No successful responses received before deadline. @2018/12/17 21:07:54. "
                    },
                    "/Sample_02/192.0.2.13:80": {
                        "addr": "192.0.2.13",
                        "port": 80,
                        "serverside.bitsIn": 0,
                        "serverside.bitsOut": 0,
                        "serverside.curConns": 0,
                        "sessionStatus": "enabled",
                        "availabilityState": "offline",
                        "enabledState": "enabled",
                        "status.statusReason": "/Common/http: No successful responses received before deadline. @2018/12/17 21:07:54. "
                    }
                },
                "name": "/Sample_02/A1/web_pool",
                "tenant": "Sample_02",
                "application": "A1"
            }
        },
        "ltmPolicyStats": {
            "/Common/app.app/app_policy": {
                "invoked": 15034,
                "succeeded": 15034,
                "actions": {
                    "default:1": {
                        "invoked": 15034,
                        "succeeded": 15034
                    }
                },
                "name": "/Common/app.app/app_policy",
                "tenant": "Common",
                "application": "app.app"
            },
            "/Common/telemetry": {
                "invoked": 0,
                "succeeded": 0,
                "actions": {
                    "default:0": {
                        "invoked": 0,
                        "succeeded": 0
                    }
                },
                "name": "/Common/telemetry",
                "tenant": "Common",
                "application": ""
            }
        },
        "httpProfileStats": {
            "/Common/app.app/app_http": {
                "cookiePersistInserts": 17289,
                "getReqs": 8135,
                "maxKeepaliveReq": 336,
                "numberReqs": 17397,
                "postReqs": 9166,
                "proxyReqs": 0,
                "2xxResp": 1340,
                "3xxResp": 39,
                "4xxResp": 15995,
                "5xxResp": 0,
                "respLessThan2m": 0,
                "respGreaterThan2m": 0,
                "v10Reqs": 351,
                "v10Resp": 48,
                "v11Reqs": 17036,
                "v11Resp": 17326,
                "v9Reqs": 10,
                "v9Resp": 0,
                "name": "/Common/app.app/app_http",
                "tenant": "Common",
                "application": "app.app"
            },
            "/Common/http": {
                "cookiePersistInserts": 0,
                "getReqs": 0,
                "maxKeepaliveReq": 0,
                "numberReqs": 0,
                "postReqs": 0,
                "proxyReqs": 0,
                "2xxResp": 0,
                "3xxResp": 0,
                "4xxResp": 0,
                "5xxResp": 0,
                "respLessThan2m": 0,
                "respGreaterThan2m": 0,
                "v10Reqs": 0,
                "v10Resp": 0,
                "v11Reqs": 0,
                "v11Resp": 0,
                "v9Reqs": 0,
                "v9Resp": 0,
                "name": "/Common/http",
                "tenant": "Common",
                "application": ""
            },
            "/Sample_02/A1/custom_http_profile": {
                "cookiePersistInserts": 0,
                "getReqs": 0,
                "maxKeepaliveReq": 0,
                "numberReqs": 0,
                "postReqs": 0,
                "proxyReqs": 0,
                "2xxResp": 0,
                "3xxResp": 0,
                "4xxResp": 0,
                "5xxResp": 0,
                "respLessThan2m": 0,
                "respGreaterThan2m": 0,
                "v10Reqs": 0,
                "v10Resp": 0,
                "v11Reqs": 0,
                "v11Resp": 0,
                "v9Reqs": 0,
                "v9Resp": 0,
                "name": "/Sample_02/A1/custom_http_profile",
                "tenant": "Sample_02",
                "application": "A1"
            }
        },
        "clientSSLProfileStats": {
            "/Common/clientssl": {
                "currentCompatibleConnections": 0,
                "currentConnections": 0,
                "currentNativeConnections": 0,
                "currentActiveHandshakes": 0,
                "decryptedBytesIn": 0,
                "decryptedBytesOut": 0,
                "encryptedBytesIn": 0,
                "encryptedBytesOut": 0,
                "fatalAlerts": 0,
                "handshakeFailures": 0,
                "peercertInvalid": 0,
                "peercertNone": 0,
                "peercertValid": 0,
                "protocolUses.dtlsv1": 0,
                "protocolUses.sslv2": 0,
                "protocolUses.sslv3": 0,
                "protocolUses.tlsv1": 0,
                "protocolUses.tlsv1_1": 0,
                "protocolUses.tlsv1_2": 0,
                "protocolUses.tlsv1_3": 0,
                "recordsIn": 0,
                "recordsOut": 0,
                "name": "/Common/clientssl",
                "tenant": "Common",
                "application": ""
            },
            "/Sample_02/A1/webtls": {
                "currentCompatibleConnections": 0,
                "currentConnections": 0,
                "currentNativeConnections": 0,
                "currentActiveHandshakes": 0,
                "decryptedBytesIn": 0,
                "decryptedBytesOut": 0,
                "encryptedBytesIn": 0,
                "encryptedBytesOut": 0,
                "fatalAlerts": 0,
                "handshakeFailures": 0,
                "peercertInvalid": 0,
                "peercertNone": 0,
                "peercertValid": 0,
                "protocolUses.dtlsv1": 0,
                "protocolUses.sslv2": 0,
                "protocolUses.sslv3": 0,
                "protocolUses.tlsv1": 0,
                "protocolUses.tlsv1_1": 0,
                "protocolUses.tlsv1_2": 0,
                "protocolUses.tlsv1_3": 0,
                "recordsIn": 0,
                "recordsOut": 0,
                "name": "/Sample_02/A1/webtls",
                "tenant": "Sample_02",
                "application": "A1"
            }
        },
        "serverSSLProfileStats": {
            "/Common/serverssl": {
                "currentCompatibleConnections": 0,
                "currentConnections": 0,
                "currentNativeConnections": 0,
                "currentActiveHandshakes": 0,
                "decryptedBytesIn": 0,
                "decryptedBytesOut": 0,
                "encryptedBytesIn": 0,
                "encryptedBytesOut": 0,
                "fatalAlerts": 0,
                "handshakeFailures": 0,
                "peercertInvalid": 0,
                "peercertNone": 0,
                "peercertValid": 0,
                "protocolUses.dtlsv1": 0,
                "protocolUses.sslv2": 0,
                "protocolUses.sslv3": 0,
                "protocolUses.tlsv1": 0,
                "protocolUses.tlsv1_1": 0,
                "protocolUses.tlsv1_2": 0,
                "protocolUses.tlsv1_3": 0,
                "recordsIn": 0,
                "recordsOut": 0,
                "name": "/Common/serverssl",
                "tenant": "Common",
                "application": ""
            }
        },
        "tlsCerts": {
            "ca-bundle.crt": {
                "expirationDate": 1893455999,
                "expirationString": "Dec 31 23:59:59 2029 GMT",
                "issuer": "CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US",
                "subject": "CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US",
                "name": "ca-bundle.crt"
            },
            "default.crt": {
                "email": "root@localhost.localdomain",
                "expirationDate": 1859497229,
                "expirationString": "Dec  3 23:00:29 2028 GMT",
                "issuer": "emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US",
                "subject": "emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US",
                "name": "default.crt"
            },
            "f5-ca-bundle.crt": {
                "expirationDate": 1922896554,
                "expirationString": "Dec  7 17:55:54 2030 GMT",
                "issuer": "CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US",
                "subject": "CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US",
                "name": "f5-ca-bundle.crt"
            },
            "f5-irule.crt": {
                "email": "support@f5.com",
                "expirationDate": 1815944413,
                "expirationString": "Jul 18 21:00:13 2027 GMT",
                "issuer": "emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US",
                "subject": "emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US",
                "name": "f5-irule.crt"
            }
        },
        "telemetryServiceInfo": {
            "pollingInterval": 300,
            "cycleStart": "Tue, 15 Jan 2019 18:47:00 GMT",
            "cycleEnd": "Tue, 15 Jan 2019 18:47:01 GMT"
        },
        "telemetryEventCategory": "systemInfo"
    }




LTM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by Telemetry Streaming, they must be configured with AS3 or another method.

.. code-block:: json
   :linenos:

    {
        "event_source":"request_logging",
        "hostname":"hostname",
        "client_ip":"177.47.192.42",
        "server_ip":"",
        "http_method":"GET",
        "http_uri":"/",
        "virtual_name":"/Common/app.app/app_vs",
        "tenant":"Common",
        "application":"app.app",
        "telemetryEventCategory": "event"
    }

AFM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by Telemetry Streaming, they must be configured with AS3 or another method.

.. code-block:: json
   :linenos:

    {
        "acl_policy_name":"/Common/app",
        "acl_policy_type":"Enforced",
        "acl_rule_name":"ping",
        "action":"Reject",
        "hostname":"telemetry.bigip.com",
        "bigip_mgmt_ip":"10.0.1.100",
        "context_name":"/Common/app.app/app_vs",
        "context_type":"Virtual Server",
        "date_time":"Dec 17 2018 22:46:04",
        "dest_fqdn":"unknown",
        "dest_ip":"10.0.2.101",
        "dst_geo":"Unknown",
        "dest_port":"80",
        "device_product":"Advanced Firewall Module",
        "device_vendor":"F5",
        "device_version":"14.0.0.1.0.0.2",
        "drop_reason":"Policy",
        "errdefs_msgno":"23003137",
        "errdefs_msg_name":"Network Event",
        "flow_id":"0000000000000000",
        "ip_protocol":"TCP",
        "severity":"8",
        "partition_name":"Common",
        "route_domain":"0",
        "sa_translation_pool":"",
        "sa_translation_type":"",
        "source_fqdn":"unknown",
        "source_ip":"50.206.82.144",
        "src_geo":"US/Washington",
        "source_port":"62204",
        "source_user":"unknown",
        "source_user_group":"unknown",
        "translated_dest_ip":"",
        "translated_dest_port":"",
        "translated_ip_protocol":"",
        "translated_route_domain":"",
        "translated_source_ip":"",
        "translated_source_port":"",
        "translated_vlan":"",
        "vlan":"/Common/external",
        "send_to_vs":"",
        "tenant":"Common",
        "application":"app.app",
        "telemetryEventCategory":"event"
    }

ASM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by Telemetry Streaming, they must be configured with AS3 or another method.

.. code-block:: json
   :linenos:

    {
        "hostname":"hostname",
        "management_ip_address":"10.0.1.4",
        "management_ip_address_2":"",
        "http_class_name":"/Common/app.app/app_policy",
        "web_application_name":"/Common/app.app/app_policy",
        "policy_name":"/Common/app.app/app_policy",
        "policy_apply_date":"2018-11-19 22:17:57",
        "violations":"Evasion technique detected",
        "support_id":"1730614276869062795",
        "request_status":"blocked",
        "response_code":"0",
        "ip_client":"50.206.82.144",
        "route_domain":"0",
        "method":"GET",
        "protocol":"HTTP",
        "query_string":"",
        "x_forwarded_for_header_value":"50.206.82.144",
        "sig_ids":"",
        "sig_names":"",
        "date_time":"2018-11-19 22:34:40",
        "severity":"Critical",
        "attack_type":"Detection Evasion,Path Traversal",
        "geo_location":"US",
        "ip_address_intelligence":"N/A",
        "username":"N/A",
        "session_id":"f609d8a924419638",
        "src_port":"49804",
        "dest_port":"80",
        "dest_ip":"10.0.2.10",
        "sub_violations":"Evasion technique detected:Directory traversals",
        "virus_name":"N/A",
        "violation_rating":"3",
        "websocket_direction":"N/A",
        "websocket_message_type":"N/A",
        "device_id":"N/A",
        "staged_sig_ids":"",
        "staged_sig_names":"",
        "threat_campaign_names":"",
        "staged_threat_campaign_names":"",
        "blocking_exception_reason":"N/A",
        "captcha_result":"not_received",
        "uri":"/directory/file",
        "fragment":"",
        "request":"GET /admin/..%2F..%2F..%2Fdirectory/file HTTP/1.0\\r\\nHost: host.westus.cloudapp.azure.com\\r\\nConnection: keep-alive\\r\\nCache-Control: max-age",
        "tenant":"Common",
        "application":"app.app",
        "telemetryEventCategory": "event"
    }

APM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by Telemetry Streaming, they must be configured with AS3 or another method.

.. code-block:: json
   :linenos:

    {
        "hostname":"telemetry.bigip.com",
        "errdefs_msgno":"01490102:5:",
        "partition_name":"Common",
        "session_id":"ec7fd55d",
        "Access_Profile":"/Common/access_app",
        "Partition":"Common",
        "Session_Id":"ec7fd55d",
        "Access_Policy_Result":"Logon_Deny",
        "tenant":"Common",
        "application":"",
        "telemetryEventCategory":"event"
    }
