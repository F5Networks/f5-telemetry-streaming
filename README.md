# Introduction

<img align="right" src="docs/logo/Telemetry-Streaming.png" width="125">

Telemetry Services is an iControl LX extension to stream telemetry from BIG-IP(s) to analytics consumers such as the following.

- Splunk
- Kafka
- Azure Log Analytics
- AWS S3
- AWS CloudWatch

## Contents

- [Container](#Container)
- [Configuration Example](#configuration-example)
- [Data tracer](#data-tracer)
- [Output Example](#output-example)

## Container

This project builds a container, here are the current steps to build and run that container. Note: Additional steps TBD around pushing to docker hub, etc.

Note: Currently this is building from local node_modules, src, etc.  This should change to using the RPM package.

Build: ```docker build . -t f5-telemetry``` Note: From root folder of this project

Run: ```docker run --rm -d -p 443:443/tcp -p 6514:6514/tcp -e MY_SECRET_ENV_VAR='mysecret' f5-telemetry:latest```

Attach Shell: ```docker exec -it <running container name> /bin/sh```

## Configuration example

`POST /mgmt/shared/telemetry/declare`

```json
{
   "class": "Telemetry",
    "My_Poller": {
        "class": "Telemetry_System_Poller",
        "enabled": true,
        "trace": false,
        "interval": 60,
        "host": "x.x.x.x",
        "port": 443,
        "username": "myuser",
        "passphrase": {
            "cipherText": "mypassphrase"
        }
    },
    "My_Listener": {
        "class": "Telemetry_Listener",
        "enabled": true,
        "trace": false,
        "port": 6514
    },
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "enabled": true,
        "trace": false,
        "type": "Azure_Log_Analytics",
        "host": "myworkspaceid",
        "passphrase": {
            "cipherText": "mysharedkey"
        }
    }
}
```

Note: To run on a BIG-IP the system poller object should look like the following example.

```json
"My_Poller": {
    "class": "Telemetry_System_Poller",
    "interval": 60
}
```

Note: To run in a container, each passphrase object should look like the following example.

```json
"passphrase": {
    "environmentVar": "MY_SECRET_ENV_VAR"
}
```

## Data tracer

Tracer is useful for debug because it dumps intermediate data to file.
Default location for files is **/var/tmp/telemetry**
Each config object has 'tracer' property. Possible values are:

- *false* - tracer disabled
- *true* - tracer enabled, file name will be **DEFAULT_LOCATION/OBJ_TYPE.OBJ_NAME**
- *string* - custom path to file to steam data to

## Output Example

### System Info

```json
{
    "hostname": "hostname",
    "version": "14.0.0.1",
    "versionBuild": "0.0.2",
    "location": "Seattle",
    "description": "My BIG-IP description",
    "marketingName": "BIG-IP Virtual Edition",
    "platformId": "Z100",
    "chassisId": "6743d724-7b83-a34b-62d42aa19ad8",
    "baseMac": "00:0d:3a:36:c2:8d",
    "callBackUrl": "https://10.0.1.4",
    "configReady": "yes",
    "licenseReady": "yes",
    "provisionReady": "yes",
    "syncMode": "standalone",
    "syncColor": "green",
    "syncStatus": "Standalone",
    "syncSummary": " ",
    "failoverStatus": "ACTIVE",
    "failoverColor": "green",
    "deviceTimestamp": "2018-11-16T00:40:18Z",
    "cpu": 4,
    "memory": 51,
    "tmmCpu": 1,
    "tmmMemory": 10,
    "tmmTraffic": {
        "clientSideTraffic.bitsIn": 22020094176,
        "clientSideTraffic.bitsOut": 66095376960
    },
    "diskStorage": {
        "/": {
            "1024-blocks": "436342",
            "Capacity": "55%"
        },
        "/dev/shm": {
            "1024-blocks": "7181064",
            "Capacity": "9%"
        },
        "/config": {
            "1024-blocks": "3269592",
            "Capacity": "20%"
        },
        "/usr": {
            "1024-blocks": "4136432",
            "Capacity": "83%"
        },
        "/var": {
            "1024-blocks": "3096336",
            "Capacity": "33%"
        },
        "/shared": {
            "1024-blocks": "20642428",
            "Capacity": "3%"
        },
        "/var/log": {
            "1024-blocks": "3023760",
            "Capacity": "8%"
        },
        "/appdata": {
            "1024-blocks": "25717852",
            "Capacity": "4%"
        },
        "/shared/rrd.1.2": {
            "1024-blocks": "7181064",
            "Capacity": "1%"
        },
        "/var/run": {
            "1024-blocks": "7181064",
            "Capacity": "1%"
        },
        "/var/tmstat": {
            "1024-blocks": "7181064",
            "Capacity": "1%"
        },
        "/var/prompt": {
            "1024-blocks": "4096",
            "Capacity": "1%"
        },
        "/var/apm/mount/apmclients-7170.2018.627.21-3.0.iso": {
            "1024-blocks": "298004",
            "Capacity": "100%"
        },
        "/var/loipc": {
            "1024-blocks": "7181064",
            "Capacity": "0%"
        },
        "/mnt/sshplugin_tempfs": {
            "1024-blocks": "7181064",
            "Capacity": "0%"
        }
    },
    "diskLatency": {
        "sda": {
            "rsec/s": "6.41",
            "wsec/s": "189.75"
        },
        "sdb": {
            "rsec/s": "1.01",
            "wsec/s": "0.00"
        },
        "dm-0": {
            "rsec/s": "0.00",
            "wsec/s": "0.00"
        },
        "dm-1": {
            "rsec/s": "0.18",
            "wsec/s": "97.72"
        },
        "dm-2": {
            "rsec/s": "0.27",
            "wsec/s": "30.26"
        },
        "dm-3": {
            "rsec/s": "0.27",
            "wsec/s": "26.19"
        },
        "dm-4": {
            "rsec/s": "0.02",
            "wsec/s": "0.06"
        },
        "dm-5": {
            "rsec/s": "0.25",
            "wsec/s": "3.03"
        },
        "dm-6": {
            "rsec/s": "3.06",
            "wsec/s": "0.00"
        },
        "dm-7": {
            "rsec/s": "0.07",
            "wsec/s": "0.09"
        },
        "dm-8": {
            "rsec/s": "1.25",
            "wsec/s": "32.40"
        }
    },
    "networkInterfaces": {
        "1.1": {
            "counters.bitsIn": 66541031568,
            "counters.bitsOut": 22639094120,
            "status": "up"
        },
        "1.2": {
            "counters.bitsIn": 2400,
            "counters.bitsOut": 18240,
            "status": "up"
        },
        "mgmt": {
            "counters.bitsIn": 8638870752,
            "counters.bitsOut": 5048056112,
            "status": "up"
        }
    },
    "provisionState": {
        "afm": {
            "level": "nominal"
        },
        "am": {
            "level": "none"
        },
        "apm": {
            "level": "nominal"
        },
        "asm": {
            "level": "nominal"
        },
        "avr": {
            "level": "none"
        },
        "dos": {
            "level": "none"
        },
        "fps": {
            "level": "none"
        },
        "gtm": {
            "level": "none"
        },
        "ilx": {
            "level": "none"
        },
        "lc": {
            "level": "none"
        },
        "ltm": {
            "level": "nominal"
        },
        "pem": {
            "level": "none"
        },
        "sslo": {
            "level": "none"
        },
        "swg": {
            "level": "none"
        },
        "urldb": {
            "level": "none"
        }
    },
    "virtualServerStats": {
        "~Common~app.app~app_vs": {
            "clientside.bitsIn": 14561768,
            "clientside.bitsOut": 58749616,
            "clientside.curConns": 0,
            "destination": "10.0.2.10:80",
            "status.availabilityState": "available",
            "status.enabledState": "enabled"
        },
        "~Sample_01~A1~serviceMain": {
            "clientside.bitsIn": 0,
            "clientside.bitsOut": 0,
            "clientside.curConns": 0,
            "destination": "10.0.1.10:80",
            "status.availabilityState": "offline",
            "status.enabledState": "enabled"
        }
    },
    "poolStats": {
        "~Common~app.app~app_pool": {
            "members": {
                "~Common~216.58.217.36:80": {
                    "addr": "216.58.217.36",
                    "port": 80,
                    "serverside.bitsIn": 9345128,
                    "serverside.bitsOut": 36115312,
                    "serverside.curConns": 0,
                    "status.availabilityState": "available",
                    "status.enabledState": "enabled",
                    "status.statusReason": "Pool member is available"
                }
            }
        },
        "~Sample_01~A1~web_pool": {
            "members": {
                "~Sample_01~192.0.1.10:80": {
                    "addr": "192.0.1.10",
                    "port": 80,
                    "serverside.bitsIn": 0,
                    "serverside.bitsOut": 0,
                    "serverside.curConns": 0,
                    "status.availabilityState": "offline",
                    "status.enabledState": "enabled",
                    "status.statusReason": "Pool member has been marked down by a monitor"
                },
                "~Sample_01~192.0.1.11:80": {
                    "addr": "192.0.1.11",
                    "port": 80,
                    "serverside.bitsIn": 0,
                    "serverside.bitsOut": 0,
                    "serverside.curConns": 0,
                    "status.availabilityState": "offline",
                    "status.enabledState": "enabled",
                    "status.statusReason": "Pool member has been marked down by a monitor"
                }
            }
        }
    },
    "tlsCerts": {
        "ca-bundle.crt": {
            "expirationDate": 1893455999,
            "expirationString": "Dec 31 23:59:59 2029 GMT",
            "issuer": "CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US",
            "subject": "CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US"
        },
        "default.crt": {
            "email": "root@localhost.localdomain",
            "expirationDate": 1854983224,
            "expirationString": "Oct 12 17:07:04 2028 GMT",
            "issuer": "emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US",
            "subject": "emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US"
        },
        "f5-ca-bundle.crt": {
            "expirationDate": 1922896554,
            "expirationString": "Dec  7 17:55:54 2030 GMT",
            "issuer": "CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US",
            "subject": "CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US"
        },
        "f5-irule.crt": {
            "email": "support@f5.com",
            "expirationDate": 1815944413,
            "expirationString": "Jul 18 21:00:13 2027 GMT",
            "issuer": "emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US",
            "subject": "emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US"
        }
    }
}
```

### Events (Logs)

#### LTM Request Log

```json
{
    "event_source":"request_logging",
    "hostname":"hostname",
    "client_ip":"177.47.192.42",
    "server_ip":"",
    "http_method":"GET",
    "http_uri":"/",
    "virtual_name":"/Common/app.app/app_vs"
}
```

#### AFM Log

TBD

#### ASM Log

```json
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
    "request":"GET /admin/..%2F..%2F..%2Fdirectory/file HTTP/1.0\\r\\nHost: host.westus.cloudapp.azure.com\\r\\nConnection: keep-alive\\r\\nCache-Control: max-age"
}
```

#### APM Log

TBD