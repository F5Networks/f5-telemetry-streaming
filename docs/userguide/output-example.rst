Example Output
==============

Use this page to see the type of information that Telemetry Streaming collects.

System Information
------------------

.. code-block:: json
   :linenos:

    {
        "system": {
            "hostname": "telemetry.bigip.com",
            "version": "14.0.0.1",
            "versionBuild": "0.0.2",
            "location": "Seattle",
            "description": "Telemetry BIG-IP",
            "marketingName": "BIG-IP Virtual Edition",
            "platformId": "Z100",
            "chassisId": "9c3abad5-513a-1c43-5bc2be62e957",
            "baseMac": "00:0d:3a:30:34:51",
            "callBackUrl": "https://10.0.1.100",
            "configReady": "yes",
            "licenseReady": "yes",
            "provisionReady": "yes",
            "syncMode": "standalone",
            "syncColor": "green",
            "syncStatus": "Standalone",
            "syncSummary": " ",
            "failoverStatus": "ACTIVE",
            "failoverColor": "green",
            "systemTimestamp": "2019-02-01T17:23:15Z",
            "cpu": 3,
            "memory": 55,
            "tmmCpu": 1,
            "tmmMemory": 11,
            "tmmTraffic": {
                "clientSideTraffic.bitsIn": 30749965632,
                "clientSideTraffic.bitsOut": 91027281336,
                "serverSideTraffic.bitsIn": 26698867512,
                "serverSideTraffic.bitsOut": 90836218144
            },
            "diskStorage": {
                "/": {
                    "1024-blocks": "436342",
                    "Capacity": "55%",
                    "name": "/"
                },
                "/dev/shm": {
                    "1024-blocks": "7181064",
                    "Capacity": "9%",
                    "name": "/dev/shm"
                },
                "/config": {
                    "1024-blocks": "3269592",
                    "Capacity": "11%",
                    "name": "/config"
                },
                "/usr": {
                    "1024-blocks": "4136432",
                    "Capacity": "83%",
                    "name": "/usr"
                },
                "/var": {
                    "1024-blocks": "3096336",
                    "Capacity": "37%",
                    "name": "/var"
                },
                "/shared": {
                    "1024-blocks": "20642428",
                    "Capacity": "3%",
                    "name": "/shared"
                },
                "/var/log": {
                    "1024-blocks": "3023760",
                    "Capacity": "7%",
                    "name": "/var/log"
                },
                "/appdata": {
                    "1024-blocks": "51607740",
                    "Capacity": "3%",
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
                "/var/apm/mount/apmclients-7170.2018.627.21-3.0.iso": {
                    "1024-blocks": "298004",
                    "Capacity": "100%",
                    "name": "/var/apm/mount/apmclients-7170.2018.627.21-3.0.iso"
                },
                "/var/loipc": {
                    "1024-blocks": "7181064",
                    "Capacity": "0%",
                    "name": "/var/loipc"
                },
                "/mnt/sshplugin_tempfs": {
                    "1024-blocks": "7181064",
                    "Capacity": "0%",
                    "name": "/mnt/sshplugin_tempfs"
                }
            },
            "diskLatency": {
                "sda": {
                    "rsec/s": "10.49",
                    "wsec/s": "232.03",
                    "name": "sda"
                },
                "sdb": {
                    "rsec/s": "1.04",
                    "wsec/s": "0.00",
                    "name": "sdb"
                },
                "dm-0": {
                    "rsec/s": "0.02",
                    "wsec/s": "0.00",
                    "name": "dm-0"
                },
                "dm-1": {
                    "rsec/s": "0.17",
                    "wsec/s": "112.02",
                    "name": "dm-1"
                },
                "dm-2": {
                    "rsec/s": "0.47",
                    "wsec/s": "37.00",
                    "name": "dm-2"
                },
                "dm-3": {
                    "rsec/s": "0.85",
                    "wsec/s": "31.45",
                    "name": "dm-3"
                },
                "dm-4": {
                    "rsec/s": "0.05",
                    "wsec/s": "0.22",
                    "name": "dm-4"
                },
                "dm-5": {
                    "rsec/s": "0.39",
                    "wsec/s": "3.34",
                    "name": "dm-5"
                },
                "dm-6": {
                    "rsec/s": "5.82",
                    "wsec/s": "0.00",
                    "name": "dm-6"
                },
                "dm-7": {
                    "rsec/s": "0.22",
                    "wsec/s": "0.90",
                    "name": "dm-7"
                },
                "dm-8": {
                    "rsec/s": "1.41",
                    "wsec/s": "47.10",
                    "name": "dm-8"
                }
            },
            "networkInterfaces": {
                "1.1": {
                    "counters.bitsIn": 88594112512,
                    "counters.bitsOut": 28164141760,
                    "status": "up",
                    "name": "1.1"
                },
                "1.2": {
                    "counters.bitsIn": 7703269352,
                    "counters.bitsOut": 413753256,
                    "status": "up",
                    "name": "1.2"
                },
                "mgmt": {
                    "counters.bitsIn": 10280239984,
                    "counters.bitsOut": 4504546456,
                    "status": "up",
                    "name": "mgmt"
                }
            },
            "provisioning": {
                "afm": {
                    "name": "afm",
                    "level": "nominal"
                },
                "am": {
                    "name": "am",
                    "level": "none"
                },
                "apm": {
                    "name": "apm",
                    "level": "nominal"
                },
                "asm": {
                    "name": "asm",
                    "level": "nominal"
                },
                "avr": {
                    "name": "avr",
                    "level": "nominal"
                },
                "dos": {
                    "name": "dos",
                    "level": "none"
                },
                "fps": {
                    "name": "fps",
                    "level": "none"
                },
                "gtm": {
                    "name": "gtm",
                    "level": "none"
                },
                "ilx": {
                    "name": "ilx",
                    "level": "none"
                },
                "lc": {
                    "name": "lc",
                    "level": "none"
                },
                "ltm": {
                    "name": "ltm",
                    "level": "nominal"
                },
                "pem": {
                    "name": "pem",
                    "level": "none"
                },
                "sslo": {
                    "name": "sslo",
                    "level": "none"
                },
                "swg": {
                    "name": "swg",
                    "level": "none"
                },
                "urldb": {
                    "name": "urldb",
                    "level": "none"
                }
            }
        },
        "virtualServers": {
            "/Common/app.app/app_vs": {
                "clientside.bitsIn": 19599288,
                "clientside.bitsOut": 119172032,
                "clientside.curConns": 0,
                "destination": "10.0.2.101:80",
                "availabilityState": "available",
                "enabledState": "enabled",
                "name": "/Common/app.app/app_vs",
                "tenant": "Common",
                "application": "app.app"
            },
            "/Example_Tenant/A1/serviceMain": {
                "clientside.bitsIn": 0,
                "clientside.bitsOut": 0,
                "clientside.curConns": 0,
                "destination": "192.0.2.11:443",
                "availabilityState": "offline",
                "enabledState": "enabled",
                "name": "/Example_Tenant/A1/serviceMain",
                "tenant": "Example_Tenant",
                "application": "A1"
            },
            "/Example_Tenant/A1/serviceMain-Redirect": {
                "clientside.bitsIn": 0,
                "clientside.bitsOut": 0,
                "clientside.curConns": 0,
                "destination": "192.0.2.11:80",
                "availabilityState": "unknown",
                "enabledState": "enabled",
                "name": "/Example_Tenant/A1/serviceMain-Redirect",
                "tenant": "Example_Tenant",
                "application": "A1"
            }
        },
        "pools": {
            "/Common/app.app/app_pool": {
                "activeMemberCnt": 1,
                "serverside.bitsIn": 25825768,
                "serverside.bitsOut": 114425928,
                "serverside.curConns": 0,
                "availabilityState": "available",
                "enabledState": "enabled",
                "name": "/Common/app.app/app_pool",
                "members": {
                    "/Common/10.0.3.5:80": {
                        "addr": "10.0.3.5",
                        "port": 80,
                        "serverside.bitsIn": 25825768,
                        "serverside.bitsOut": 114425928,
                        "serverside.curConns": 0,
                        "availabilityState": "available",
                        "enabledState": "enabled"
                    }
                },
                "tenant": "Common",
                "application": "app.app"
            },
            "/Common/telemetry-local": {
                "activeMemberCnt": 1,
                "serverside.bitsIn": 8908592,
                "serverside.bitsOut": 1955808,
                "serverside.curConns": 0,
                "availabilityState": "available",
                "enabledState": "enabled",
                "name": "/Common/telemetry-local",
                "members": {
                    "/Common/10.0.1.100:6514": {
                        "addr": "10.0.1.100",
                        "port": 6514,
                        "serverside.bitsIn": 8908592,
                        "serverside.bitsOut": 1955808,
                        "serverside.curConns": 0,
                        "availabilityState": "available",
                        "enabledState": "enabled"
                    }
                },
                "tenant": "Common",
                "application": ""
            },
            "/Example_Tenant/A1/hsl_pool": {
                "activeMemberCnt": 0,
                "serverside.bitsIn": 0,
                "serverside.bitsOut": 0,
                "serverside.curConns": 0,
                "availabilityState": "offline",
                "enabledState": "enabled",
                "name": "/Example_Tenant/A1/hsl_pool",
                "members": {
                    "/Example_Tenant/192.168.120.6:514": {
                        "addr": "192.168.120.6",
                        "port": 514,
                        "serverside.bitsIn": 0,
                        "serverside.bitsOut": 0,
                        "serverside.curConns": 0,
                        "availabilityState": "offline",
                        "enabledState": "enabled"
                    }
                },
                "tenant": "Example_Tenant",
                "application": "A1"
            },
            "/Example_Tenant/A1/web_pool": {
                "activeMemberCnt": 0,
                "serverside.bitsIn": 0,
                "serverside.bitsOut": 0,
                "serverside.curConns": 0,
                "availabilityState": "offline",
                "enabledState": "enabled",
                "name": "/Example_Tenant/A1/web_pool",
                "members": {
                    "/Example_Tenant/192.0.2.12:80": {
                        "addr": "192.0.2.12",
                        "port": 80,
                        "serverside.bitsIn": 0,
                        "serverside.bitsOut": 0,
                        "serverside.curConns": 0,
                        "availabilityState": "offline",
                        "enabledState": "enabled"
                    },
                    "/Example_Tenant/192.0.2.13:80": {
                        "addr": "192.0.2.13",
                        "port": 80,
                        "serverside.bitsIn": 0,
                        "serverside.bitsOut": 0,
                        "serverside.curConns": 0,
                        "availabilityState": "offline",
                        "enabledState": "enabled"
                    }
                },
                "tenant": "Example_Tenant",
                "application": "A1"
            }
        },
        "ltmPolicies": {
            "/Common/app.app/app_policy": {
                "invoked": 5413,
                "succeeded": 5413,
                "actions": {
                    "default:1": {
                        "invoked": 5413,
                        "succeeded": 5413
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
        "httpProfiles": {
            "/Common/app.app/app_http": {
                "cookiePersistInserts": 5409,
                "getReqs": 2395,
                "maxKeepaliveReq": 350,
                "numberReqs": 5413,
                "postReqs": 2989,
                "2xxResp": 289,
                "3xxResp": 0,
                "4xxResp": 5124,
                "5xxResp": 0,
                "respLessThan2m": 0,
                "respGreaterThan2m": 0,
                "v10Reqs": 30,
                "v10Resp": 0,
                "v11Reqs": 5379,
                "v11Resp": 5413,
                "v9Reqs": 4,
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
            "/Example_Tenant/A1/custom_http_profile": {
                "cookiePersistInserts": 0,
                "getReqs": 0,
                "maxKeepaliveReq": 0,
                "numberReqs": 0,
                "postReqs": 0,
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
                "name": "/Example_Tenant/A1/custom_http_profile",
                "tenant": "Example_Tenant",
                "application": "A1"
            }
        },
        "clientSslProfiles": {
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
                "sniRejects": 0,
                "name": "/Common/clientssl",
                "tenant": "Common",
                "application": ""
            },
            "/Example_Tenant/A1/webtls": {
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
                "sniRejects": 0,
                "name": "/Example_Tenant/A1/webtls",
                "tenant": "Example_Tenant",
                "application": "A1"
            }
        },
        "serverSslProfiles": {
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
        "sslCerts": {
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
            "cycleStart": "Fri, 01 Feb 2019 17:23:14 GMT",
            "cycleEnd": "Fri, 01 Feb 2019 17:23:15 GMT"
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
