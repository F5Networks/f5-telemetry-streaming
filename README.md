# Introduction

<img align="right" src="docs/logo/Telemetry-Streaming.png" width="125">

Telemetry Services is an iControl LX extension to stream telemetry from BIG-IP(s) to analytics consumers such as the following.

- Splunk
- Kafka
- Azure Log Analytics
- AWS CloudWatch

## Contents

- [Container](#Container)
- [Configuration Example](#configuration-example)
- [Output Example](#output-example)

## Container

This project builds a container, here are the current steps to build and run that container. Note: Additional steps TBD around pushing to docker hub, etc.

Note: Currently this is building from local node_modules, src, etc.  This should change to using the RPM package.

Build: ```docker build . -t f5-telemetry``` Note: From root folder of this project

Run: ```docker run --rm -d -p 443:443/tcp -p 6514:6514/tcp f5-telemetry:latest```

Attach Shell: ```docker exec -it <running container name> /bin/sh```

## Configuration example

`POST /mgmt/shared/telemetry/declare`

```json
{
   "class": "Telemetry",
   "configuration": {
        "My_Poller": {
            "class": "System_Poller",
            "enabled": true,
            "trace": false,
            "interval": 60,
            "host": "x.x.x.x",
            "port": 443,
            "username": "myuser",
            "passphrase": "mypassphrase"
        },
        "My_Listener": {
            "class": "Event_Listener",
            "enabled": true,
            "trace": false,
            "port": 6514
        },
        "My_Consumer": {
            "class": "Consumer",
            "enabled": true,
            "trace": false,
            "type": "Azure_Log_Analytics",
            "host": "myworkspaceid",
            "passphrase": "mysharedkey"
        }
   }
}
```

Note: To run on a BIG-IP target hosts should reference localhost with no credentials.

```json
"My_Poller": {
    "class": "System_Poller",
    "host": "localhost"
}
```

## Output Example

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
    "deviceTimestamp": "2018-11-09T18:30:16Z",
    "cpu": 2,
    "memory": 50,
    "tmmCpu": 1,
    "tmmMemory": 10,
    "tmmTraffic": {
        "0.0": {
            "clientSideTraffic.bitsIn": 88589048,
            "clientSideTraffic.bitsOut": 112507072
        },
        "0.1": {
            "clientSideTraffic.bitsIn": 3247338816,
            "clientSideTraffic.bitsOut": 9998209360
        },
        "0.2": {
            "clientSideTraffic.bitsIn": 90876144,
            "clientSideTraffic.bitsOut": 121086968
        },
        "0.3": {
            "clientSideTraffic.bitsIn": 3244881224,
            "clientSideTraffic.bitsOut": 9962121096
        }
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
            "Capacity": "32%"
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
            "rsec/s": "16.51",
            "wsec/s": "202.96"
        },
        "sdb": {
            "rsec/s": "1.02",
            "wsec/s": "0.00"
        },
        "dm-0": {
            "rsec/s": "0.01",
            "wsec/s": "0.00"
        },
        "dm-1": {
            "rsec/s": "0.58",
            "wsec/s": "97.94"
        },
        "dm-2": {
            "rsec/s": "0.85",
            "wsec/s": "30.23"
        },
        "dm-3": {
            "rsec/s": "0.47",
            "wsec/s": "30.55"
        },
        "dm-4": {
            "rsec/s": "0.02",
            "wsec/s": "0.01"
        },
        "dm-5": {
            "rsec/s": "0.73",
            "wsec/s": "3.13"
        },
        "dm-6": {
            "rsec/s": "8.64",
            "wsec/s": "0.00"
        },
        "dm-7": {
            "rsec/s": "0.11",
            "wsec/s": "0.14"
        },
        "dm-8": {
            "rsec/s": "4.01",
            "wsec/s": "40.98"
        }
    },
    "networkInterfaces": {
        "1.1": {
            "counters.bitsIn": 20329242824,
            "counters.bitsOut": 6866947736,
            "status": "up"
        },
        "1.2": {
            "counters.bitsIn": 0,
            "counters.bitsOut": 18240,
            "status": "up"
        },
        "mgmt": {
            "counters.bitsIn": 2645461912,
            "counters.bitsOut": 1405234728,
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
            "clientside.bitsIn": 5735888,
            "clientside.bitsOut": 24373512,
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
            "serverside.bitsIn": 960352,
            "serverside.bitsOut": 3344936,
            "serverside.curConns": 0,
            "status.availabilityState": "available",
            "status.enabledState": "enabled",
            "status.statusReason": "The pool is available"
        },
        "~Sample_01~A1~web_pool": {
            "serverside.bitsIn": 0,
            "serverside.bitsOut": 0,
            "serverside.curConns": 0,
            "status.availabilityState": "offline",
            "status.enabledState": "enabled",
            "status.statusReason": "The children pool member(s) are down"
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