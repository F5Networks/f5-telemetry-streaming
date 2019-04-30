.. _outputexample-ref:

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
            "systemTimestamp": "2019-01-01T01:01:01Z",
            "cpu": 0,
            "memory": 0,
            "tmmCpu": 0,
            "tmmMemory": 0,
            "tmmTraffic": {
                "clientSideTraffic.bitsIn": 0,
                "clientSideTraffic.bitsOut": 0,
                "serverSideTraffic.bitsIn": 0,
                "serverSideTraffic.bitsOut": 0
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
                    "Capacity": "8%",
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
                    "r/s": "1.46",
                    "w/s": "8.25",
                    "%util": "0.09",
                    "name": "sda"
                },
                "sdb": {
                    "r/s": "1.00",
                    "w/s": "0.00",
                    "%util": "0.04",
                    "name": "sdb"
                },
                "dm-0": {
                    "r/s": "0.00",
                    "w/s": "0.00",
                    "%util": "0.00",
                    "name": "dm-0"
                },
                "dm-1": {
                    "r/s": "0.01",
                    "w/s": "11.01",
                    "%util": "0.01",
                    "name": "dm-1"
                },
                "dm-2": {
                    "r/s": "0.14",
                    "w/s": "2.56",
                    "%util": "0.00",
                    "name": "dm-2"
                },
                "dm-3": {
                    "r/s": "0.01",
                    "w/s": "4.28",
                    "%util": "0.01",
                    "name": "dm-3"
                },
                "dm-4": {
                    "r/s": "0.00",
                    "w/s": "0.00",
                    "%util": "0.00",
                    "name": "dm-4"
                },
                "dm-5": {
                    "r/s": "0.04",
                    "w/s": "1.52",
                    "%util": "0.00",
                    "name": "dm-5"
                },
                "dm-6": {
                    "r/s": "0.13",
                    "w/s": "0.00",
                    "%util": "0.00",
                    "name": "dm-6"
                },
                "dm-7": {
                    "r/s": "0.00",
                    "w/s": "0.05",
                    "%util": "0.00",
                    "name": "dm-7"
                },
                "dm-8": {
                    "r/s": "0.11",
                    "w/s": "4.72",
                    "%util": "0.01",
                    "name": "dm-8"
                }
            },
            "networkInterfaces": {
                "1.1": {
                    "counters.bitsIn": 0,
                    "counters.bitsOut": 0,
                    "status": "up",
                    "name": "1.1"
                },
                "1.2": {
                    "counters.bitsIn": 0,
                    "counters.bitsOut": 0,
                    "status": "up",
                    "name": "1.2"
                },
                "mgmt": {
                    "counters.bitsIn": 0,
                    "counters.bitsOut": 0,
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
                "clientside.bitsIn": 0,
                "clientside.bitsOut": 0,
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
                "activeMemberCnt": 0,
                "serverside.bitsIn": 0,
                "serverside.bitsOut": 0,
                "serverside.curConns": 0,
                "availabilityState": "available",
                "enabledState": "enabled",
                "name": "/Common/app.app/app_pool",
                "members": {
                    "/Common/10.0.3.5:80": {
                        "addr": "10.0.3.5",
                        "port": 0,
                        "serverside.bitsIn": 0,
                        "serverside.bitsOut": 0,
                        "serverside.curConns": 0,
                        "availabilityState": "available",
                        "enabledState": "enabled"
                    }
                },
                "tenant": "Common",
                "application": "app.app"
            },
            "/Common/telemetry-local": {
                "activeMemberCnt": 0,
                "serverside.bitsIn": 0,
                "serverside.bitsOut": 0,
                "serverside.curConns": 0,
                "availabilityState": "available",
                "enabledState": "enabled",
                "name": "/Common/telemetry-local",
                "members": {
                    "/Common/10.0.1.100:6514": {
                        "addr": "10.0.1.100",
                        "port": 0,
                        "serverside.bitsIn": 0,
                        "serverside.bitsOut": 0,
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
                        "port": 0,
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
                        "port": 0,
                        "serverside.bitsIn": 0,
                        "serverside.bitsOut": 0,
                        "serverside.curConns": 0,
                        "availabilityState": "offline",
                        "enabledState": "enabled"
                    },
                    "/Example_Tenant/192.0.2.13:80": {
                        "addr": "192.0.2.13",
                        "port": 0,
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
                "invoked": 0,
                "succeeded": 0,
                "actions": {
                    "default:1": {
                        "invoked": 0,
                        "succeeded": 0
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
                "activeHandshakeRejected": 0,
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
                "activeHandshakeRejected": 0,
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
                "activeHandshakeRejected": 0,
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
                "expirationDate": 0,
                "expirationString": "2019-01-01T01:01:01Z",
                "issuer": "CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US",
                "subject": "CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US",
                "name": "ca-bundle.crt"
            },
            "default.crt": {
                "email": "root@localhost.localdomain",
                "expirationDate": 0,
                "expirationString": "2019-01-01T01:01:01Z",
                "issuer": "emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US",
                "subject": "emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US",
                "name": "default.crt"
            },
            "f5-ca-bundle.crt": {
                "expirationDate": 0,
                "expirationString": "2019-01-01T01:01:01Z",
                "issuer": "CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US",
                "subject": "CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US",
                "name": "f5-ca-bundle.crt"
            },
            "f5-irule.crt": {
                "email": "support@f5.com",
                "expirationDate": 0,
                "expirationString": "2019-01-01T01:01:01Z",
                "issuer": "emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US",
                "subject": "emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US",
                "name": "f5-irule.crt"
            }
        },
        "networkTunnels": {
            "/Common/http-tunnel": {
                "hcInBroadcastPkts": 0,
                "hcInMulticastPkts": 0,
                "hcInOctets": 0,
                "hcInUcastPkts": 0,
                "hcOutBroadcastPkts": 0,
                "hcOutMulticastPkts": 0,
                "hcOutOctets": 0,
                "hcOutUcastPkts": 0,
                "inDiscards": 0,
                "inErrors": 0,
                "inUnknownProtos": 0,
                "outDiscards": 0,
                "outErrors": 0,
                "name": "/Common/http-tunnel",
                "tenant": "Common",
                "application": ""
            },
            "/Common/socks-tunnel": {
                "hcInBroadcastPkts": 0,
                "hcInMulticastPkts": 0,
                "hcInOctets": 0,
                "hcInUcastPkts": 0,
                "hcOutBroadcastPkts": 0,
                "hcOutMulticastPkts": 0,
                "hcOutOctets": 0,
                "hcOutUcastPkts": 0,
                "inDiscards": 0,
                "inErrors": 0,
                "inUnknownProtos": 0,
                "outDiscards": 0,
                "outErrors": 0,
                "name": "/Common/socks-tunnel",
                "tenant": "Common",
                "application": ""
            }
        },
        "telemetryServiceInfo": {
            "pollingInterval": 0,
            "cycleStart": "2019-01-01T01:01:01Z",
            "cycleEnd": "2019-01-01T01:01:01Z"
        },
        "telemetryEventCategory": "systemInfo"
    }


iHealth Information Request
---------------------------

.. code-block:: json
   :linenos:

   {
        "code": 200,
        "message": [
            {
                "systemPollerDeclName": "My_Poller",
                "ihealthDeclName": "My_iHealth",
                "state": "IHEALTH_POLL_RETRY",
                "nextFireDate": "2019-03-11T07:35:19.828Z",
                "timeBeforeNextFire": 381089490
            }
        ]
    }





LTM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by Telemetry Streaming, they must be configured with AS3 or another method.

.. code-block:: json
   :linenos:

    {
        "event_source":"request_logging",
        "event_timestamp":"2019-01-01:01:01.000Z",
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


AVR Request Log
---------------

.. code-block:: json
   :linenos:

    {
        "hostname":"hostname.hostname",
        "SlotId":"0",
        "errdefs_msgno":"22282245",
        "Entity":"OffboxAll",
        "Module":"http",
        "AVRProfileName":"/Common/telemetry-http-analytics",
        "AggrInterval":"30",
        "EOCTimestamp":"1556577360",
        "HitCount":"678",
        "ApplicationName":"<Unassigned>",
        "VSName":"/Common/VIRTUAL_SERVER_NAME",
        "POOLIP":"X.X.X.X",
        "POOLIPRouteDomain":"0",
        "POOLPort":"YYYY",
        "URL":"/",
        "ResponseCode":"200",
        "BrowserName":"N/A",
        "OsName":"N/A",
        "ClientIP":"Z.Z.Z.Z",
        "ClientIPRouteDomain":"0",
        "SubnetName":"",
        "SubnetIP":"A.A.A.A",
        "SubnetRouteDomain":"0",
        "DeviceId":"0",
        "GeoCode":"N/A",
        "Method":"GET",
        "UserAgent":"USER_AGENT",
        "TPSMax":"23.000000",
        "ClientLatencyHitCount":"0",
        "ClientLatencyMax":"0",
        "ClientLatencyTotal":"0",
        "ServerLatencyMax":"5",
        "ServerLatencyMin":"1",
        "ServerLatencyTotal":"314",
        "ThroughputReqMaxPerSec":"14136",
        "ThroughputReqTotalPerInterval":"50172",
        "ThroughputRespMaxPerSec":"1458672",
        "ThroughputRespTotalPerInterval":"5175174",
        "UserSessionsNewTotal":"10901",
        "ServerHitcount":"678",
        "ApplicationResponseTime":"48",
        "MaxApplicationResponseTime":"4",
        "MinApplicationResponseTime":"1",
        "SosApplicationResponseTime":"84",
        "ClientTtfbHitcount":"678",
        "ClientTtfb":"922",
        "MaxClientTtfb":"15",
        "MinClientTtfb":"1",
        "SosClientTtfb":"1986",
        "ClientSideNetworkLatency":"69",
        "MaxClientSideNetworkLatency":"1",
        "MinClientSideNetworkLatency":"1",
        "SosClientSideNetworkLatency":"1",
        "ServerSideNetworkLatency":"950",
        "MaxServerSideNetworkLatency":"13",
        "MinServerSideNetworkLatency":"1",
        "SosServerSideNetworkLatency":"1794",
        "RequestDurationHitcount":"678",
        "RequestDuration":"0",
        "MaxRequestDuration":"0",
        "MinRequestDuration":"0",
        "SosRequestDuration":"0",
        "ResponseDurationHitcount":"678",
        "ResponseDuration":"157",
        "MaxResponseDuration":"3",
        "MinResponseDuration":"0",
        "SosResponseDuration":"173",
        "LatencyHistogram":"0,2,4,7,12,22,40,74,136,252,465,858,1585,2929,5412,10001,300000|635,38,5,0,0,0,0,0,0,0,0,0,0,0,0,0",
        "telemetryEventCategory":"AVR"
    }
