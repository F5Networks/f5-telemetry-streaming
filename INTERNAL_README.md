# Introduction

<img align="right" src="docs/logo/Telemetry-Streaming.png" width="125">

Telemetry Streaming is an iControl LX extension to stream telemetry from BIG-IP(s) to analytics consumers such as the following.

- Splunk
- Azure Log Analytics
- AWS CloudWatch
- AWS S3
- Graphite
- Kafka
- Elastic Search
- Sumo Logic

## Contents

- [Overview](#overview)
- [Configuration Examples](#configuration-examples)
- [Pointer Syntax](#pointer-syntax)
- [REST API Endpoints](#rest-api-endpoints)
- [Output Example](#output-example)
- [Container](#container)

## Overview

The telemetry streaming design accounts for a number of key components, including ***System Poller***, ***Event Listener*** and ***Consumer***.  Those are described in more detail below.

### System Poller

Definition: Polls a system on a defined interval for information such as device statistics, virtual server statistics, pool statistics and much more.

### Event Listener

Definition: Provides a listener, on both TCP and UDP protocols, that can accept events in a specific format and process them.

Event Format: ```key1="value",key2="value"```

### Consumer

Definition: Accepts information from disparate systems and provides the tools to process that information.  In the context of Telemetry Streaming this simply means providing a mechanism by which to integrate with existing analytics products.

### Connection verification

Both Consumers and System Poller has property `allowSelfSignedCert` which allows to establish connection which are secured by self-signed certificates.
Global restriction is disallowing connections secured by self-signed certificates but by setting this property to `true` you allowing TS to connect to such hosts.

## Configuration examples

### Basic

`POST /mgmt/shared/telemetry/declare`

```json
{
    "class": "Telemetry",
    "controls": {
        "class": "Controls",
        "logLevel": "info"
    },
    "My_Poller": {
        "class": "Telemetry_System_Poller",
        "interval": 60
    },
    "My_Listener": {
        "class": "Telemetry_Listener",
        "port": 6514
    },
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Splunk",
        "host": "192.0.2.1",
        "protocol": "https",
        "port": "8088",
        "passphrase": {
            "cipherText": "apikey"
        }
    }
}
```

### Controls

There is a fixed class called "Controls", which contains a number of properties:

- logLevel - logging level, possible values are **debug**, **info**, **error**. Default value is **info**

```json
{
    "controls": {
        "class": "Controls",
        "logLevel": "info"
    }
}
```

### Additional properties

The schema has some additional properties which might not be covered elesewhere, defined below.

- trace
  - Definition: Useful during debug of TS because it dumps intermediate data to file.
  - Values:
    - *false* - tracer disabled
    - *true* - tracer enabled, file name will be **DEFAULT_LOCATION/OBJ_TYPE.OBJ_NAME** - Default location for files is **/var/tmp/telemetry**
    - *string* - custom path to file
  - Note: Applies to the Telemetry_System_Poller, Telemetry_Listener and Telemetry_Consumer class(es)
- match
  - Definition: Provide a string or pattern (regex) which will result in events being dropped that do not match the value of a defined set of keys in the event.  Defined keys: ```virtual_name, policy_name, Access_Profile, context_name```
  - Values: String or pattern (regex)
  - Note: Applies to the Telemetry_Listener class

### Splunk

Website: [https://www.splunk.com](https://www.splunk.com).

Required information:

- Host: The address of the Splunk instance that runs the HTTP event collector (HEC).
- Protocol: Check if TLS is enabled within the HEC settings (Settings > Data Inputs > HTTP Event Collector).
- Port: Default is 8088, this can be configured within the Global Settings section of the Splunk HEC.
- API Key: An API key must be created and provided in the passphrase object of the declaration, refer to Splunk documentation for the correct way to create an HEC token.

Note: More information about using the HEC can be found on the Splunk website [here](http://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector).

```json
{
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Splunk",
        "host": "192.0.2.1",
        "protocol": "https",
        "port": "8088",
        "passphrase": {
            "cipherText": "apikey"
        }
    }
}
```

### Azure Log Analytics

Website: [https://docs.microsoft.com/en-us/azure/azure-monitor/log-query/log-query-overview](https://docs.microsoft.com/en-us/azure/azure-monitor/log-query/log-query-overview).

Required information:

- Workspace ID: Navigate to the Log Analaytics workspace > Advanced Settings > Connected Sources to find the workspace ID.  More information [here](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/data-collector-api).
- Shared Key: Navigate to the Log Analaytics workspace > Advanced Settings > Connected Sources to find the primary key.  More information [here](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/data-collector-api).

Note: More information about using the data collector API can be found [here](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/data-collector-api).

Note: Certain keys are reserved when streaming to this consumer, specifically 'tenant'.  Those will have the prefix 'f5' added, for example 'f5tenant'.

```json
{
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Azure_Log_Analytics",
        "workspaceId": "workspaceid",
        "passphrase": {
            "cipherText": "sharedkey"
        }
    }
}
```

Example Dashboard - dashboard export in [examples/consumers](examples/consumers)

![image](images/azure_la_dashboard_example.png)

### AWS Cloud Watch

Website: [https://aws.amazon.com/cloudwatch](https://aws.amazon.com/cloudwatch).

Required information:

- Region: AWS region of the cloud watch resource.
- Log Group: Navigate to Cloud Watch > Logs to find the name of the log group.
- Log Stream: Navigate to Cloud Watch > Logs > Your_Log_Group_Name to find the name of the log stream.
- Access Key: Navigate to IAM > Users to find the access key.
- Secret Key: Navigate to IAM > Users to find the secret key.

Note: More information about creating and using IAM roles can be found [here](https://aws.amazon.com/iam).

```json
{
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "AWS_CloudWatch",
        "region": "us-west-1",
        "logGroup": "f5telemetry",
        "logStream": "default",
        "username": "accesskey",
        "passphrase": {
            "cipherText": "secretkey"
        }
    }
}
```

### AWS S3

Website: [https://aws.amazon.com/s3](https://aws.amazon.com/s3).

Required information:

- Region: AWS region of the S3 bucket.
- Bucket: Navigate to S3 to find the name of the bucket.
- Access Key: Navigate to IAM > Users to find the access key.
- Secret Key: Navigate to IAM > Users to find the secret key.

Note: More information about creating and using IAM roles can be found [here](https://aws.amazon.com/iam).

```json
{
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "AWS_S3",
        "region": "us-west-1",
        "bucket": "bucketname",
        "username": "accesskey",
        "passphrase": {
            "cipherText": "secretkey"
        }
    }
}
```

### Generic HTTP

Required information:

- Host: The address of the system.
- Protocol: The protocol of the system. Options: ```https``` or ```http```. Default is ```http```.
- Port: The protocol of the system. Default is ```443```.
- Path: The path of the system. Default is ```/```.
- Method: The method of the system. Options: ```POST```, ```PUT```, ```GET```. Default is ```POST```.
- Headers: The headers of the system.
- Passphrase: The secret to use when sending data to the system, for example an API key to be used in an HTTP header.

Note: Since this consumer is designed to be generic and flexible, how authentication is performed is left up to the web service.  To ensure the secrets are encrypted within Telemetry Streaming please note the use of JSON pointers.  The secret to protect should be stored inside `passphrase` and referenced in the desired destination property, such as an API token in a header as show in this example.

```json
{
    "class": "Telemetry",
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Generic_HTTP",
        "host": "192.0.2.1",
        "protocol": "https",
        "port": "443",
        "path": "/",
        "method": "POST",
        "headers": [
            {
                "name": "content-type",
                "value": "application/json"
            },
            {
                "name": "x-api-key",
                "value": "`>@/passphrase`"
            }
        ],
        "passphrase": {
            "cipherText": "apikey"
        }
    }
}
```

Note: If multiple secrets are required, defining an additional secret within `Shared` and referencing it using pointers is supported. For more details about pointers see the section on [pointer syntax](#pointer-syntax).

Example with multiple passphrases:

```json
{
    "class": "Telemetry",
    "Shared": {
        "class": "Shared",
        "secretPath": {
            "class": "Secret",
            "cipherText": "/?token=secret"
        }
    },
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Generic_HTTP",
        "host": "192.0.2.1",
        "protocol": "https",
        "port": "443",
        "path": "`>/Shared/secretPath`",
        "method": "POST",
        "headers": [
            {
                "name": "content-type",
                "value": "application/json"
            },
            {
                "name": "x-api-key",
                "value": "`>@/passphrase`"
            }
        ],
        "passphrase": {
            "cipherText": "apikey"
        }
    }
}
```

### Graphite

Website: [https://graphiteapp.org](https://graphiteapp.org).

Required information:

- Host: The address of the Graphite system.
- Protocol: Check Graphite documentation for configuration.
- Port: Check Graphite documentation for configuration.

Note: More information about installing Graphite can be found [here](https://graphite.readthedocs.io/en/latest/install.html).

Note: More information about Graphite events can be found [here](https://graphite.readthedocs.io/en/latest/events.html).

```json
{
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Graphite",
        "host": "192.0.2.1",
        "protocol": "https",
        "port": "443"
    }
}
```

### Kafka

Website: [https://kafka.apache.org/](https://kafka.apache.org/).

Required information:

- Host: The address of the Kafka system.
- Protocol: The port of the Kafka system. Options: ```binaryTcp``` or ```binaryTcpTls```. Default is ```binaryTcpTls```.
- Port: The port of the Kafka system.
- Topic: The topic where data should go within the Kafka system.

Note: More information about installing Kafka can be found [here](https://kafka.apache.org/quickstart).

```json
{
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Kafka",
        "host": "192.0.2.1",
        "protocol": "binaryTcpTls",
        "port": "9092",
        "topic": "f5-telemetry"
    }
}
```

### ElasticSearch

Website: [https://www.elastic.co/](https://www.elastic.co/).

Required information:

- Host: The address of the ElasticSearch system.
- Index: The index where data should go within the ElasticSearch system.

Optional parameters:

- Port: The port of the ElasticSearch system. Default is ```9200```.
- Protocol: The protocol of the ElasticSearch system. Options: ```http``` or ```https```. Default is ```http```.
- Allow Self Signed Cert: allow TS to skip Cert validation. Options: ```true``` or ```false```. Default is ```false```.
- Path: The path to use when sending data to the ElasticSearch system.
- Data Type: The type of data posted to the ElasticSearch system. Default is ```f5.telemetry```
- API Version: The API version of the ElasticSearch system.
- Username: The username to use when sending data to the ElasticSearch system.
- Passphrase: The secret/password to use when sending data to the ElasticSearch system.

Note: More information about installing ElasticSearch can be found [here](https://www.elastic.co/guide/index.html).

```json
{
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "ElasticSearch",
        "host": "192.0.2.1",
        "port": "9200",
        "protocol": "https",
        "allowSelfSignedCert": false,
        "path": "/path/to/post/data",
        "index": "f5telemetry",
        "dataType": "f5telemetry",
        "apiVersion": "6.5",
        "username": "username",
        "passphrase": {
            "cipherText": "secretkey"
        }

    }
}
```

### Sumo Logic

Website: [https://www.sumologic.com/](https://www.sumologic.com/).

Required information:

- Host: The address of the Sumo Logic collector.
- Protocol: The protocol of the Sumo Logic collector.
- Port: The port of the Sumo Logic collector.
- Path: The HTTP path of the Sumo Logic collector (without the secret).
- Secret: The protected portion of the HTTP path (the final portion of the path, sometimes called a system tenant).

Note: Typically the required information can be found by navigating to the HTTP collector created within Sumo Logic and selecting 'Show URL'.  For example: ```https://endpoint.collection.sumologic.com/receiver/v1/http/secret``` would be broken up into the required information.

```json
{
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Sumo_Logic",
        "host": "192.0.2.1",
        "protocol": "https",
        "port": "443",
        "path": "/receiver/v1/http/",
        "passphrase": {
            "cipherText": "secret"
        }
    }
}
```


### Statsd

Website: [https://github.com/statsd/statsd/wiki](https://github.com/statsd/statsd/wiki).

Required information:

- Host: The address of the statsd instance.
- Protocol: The protocol of the statsd instance Default is ```udp```. - Only supported option
- Port: The port of the statsd instance.

Note: Statsd is designed primarily to support integers and floating point numbers.  Because of that this consumer will only process a system info event.
Note: Official container which contains graphite and statsd: https://hub.docker.com/r/graphiteapp/docker-graphite-statsd
Note: All metrics are stored as gauges in statsd, those can be seen within graphite by navigating to stats -> gauges.

```json
{
    "class": "Telemetry",
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Statsd",
        "host": "192.0.2.1",
        "protocol": "udp",
        "port": "8125"
    }
}
```

### 2 Consumers

```json
{
    "class": "Telemetry",
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Azure_Log_Analytics",
        "host": "workspaceid",
        "passphrase": {
            "cipherText": "sharedkey"
        }
    },
    "My_Second_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Splunk",
        "host": "192.0.2.1",
        "protocol": "https",
        "port": "8088",
        "passphrase": {
            "cipherText": "apikey"
        }
    }
}
```

### External system (BIG-IP)

```json
{
    "My_Poller": {
        "class": "Telemetry_System_Poller",
        "interval": 60,
        "host": "192.0.2.1",
        "port": 443,
        "username": "myuser",
        "passphrase": {
            "cipherText": "mypassphrase"
        }
    }
}
```

### Container passphrase handling

```json
{
    "passphrase": {
        "environmentVar": "MY_SECRET_ENV_VAR"
    }
}
```

## Pointer Syntax

Configuration of TS is typically straightforward, however the need to reference objects in other parts of the configuration may be necessary for certain use cases, such as the generic http consumer with secrets.  TS uses JSON pointers to accomplish this, with syntax derived primarily from one of the other tool chain components Application Services 3.

- RFC 6901 compliant, with some enhacements to account for scenarios not outlined in the RFC
- Pointer types
  - Absolute pointer: \`=/Shared/secretPath\`
  - Relative pointer: \`=passphrase\`
  - Relative (nearest class) pointer: \`=@/passphrase\`
- Pointer formats (determined by leading character)
  - Resolve value: =
  - Resolve value and base64 decode: +
  - Resolve value and replace property with object (no stringify): >

## REST API Endpoints

### Base endpoint

- Telemetry's base URI is **mgmt/shared/telemetry**
- Allowed **Content-Type** for *POST* requests is **application/json**. Otherwise HTTP code 415 **Unsupported Media Type** will be returned.
- Response is valid JSON data.

Request example:

```bash
curl -v -u admin:<admin_password> -X GET http://localhost:8100/mgmt/shared/telemetry/info
```

Output:

```json
{"nodeVersion":"v4.6.0","version":"1.0.0","release":"2","schemaCurrent":"1.0.0","schemaMinimum":"1.0.0"}
```

#### Response

As mentioned above - response is valid JSON data. When response is *HTTP 200* - everything went well, response body - JSON data.

When response code is other than 2xx then response body in general will looks like following object:

```json
{
    "code": ERROR_CODE, // number
    "message": "ERROR_MESSAGE" // string
}
```

Additional properties might be added (depends on error type).

### Info

**<base_endpoint>/info** - endpoint to retrieve information about application.
Allowed HTTP method - **GET**.
Output:

```json
{
    "nodeVersion": "v4.6.0",
    "version": "1.0.0",
    "release": "2",
    "schemaCurrent": "1.0.0",
    "schemaMinimum": "1.0.0"
}
```

### Declare configuration

**<base_endpoint>/declare** - endpoint to declare/retrieve configuration.
Allowed HTTP method - **POST**, **GET**.
Request body - valid JSON object. For example see [Configuration Example](#configuration-example).

### System poller

**<base_endpoint>/systempoller/<pollerName>** - endpoint to retrieve data from configured poller.
Allowed HTTP method - **GET**.
Useful for demo or to check if poller was able to connect to device.
**pollerName** should match the name of one of configured pollers.
Otherwise *HTTP 404* will be returned. For output example see [System Info](#system-info).

## Output Example

### System Info

```json
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
```

### Events (Logs)

#### LTM Request Log

**Note**: all 'keys' should be in lower case to enable classification (tenant/application).

Configuration

- Create Pool (just the pool, no destination/publisher): [Log Publisher Configuration](#log-publisher-configuration)
- Create LTM Request Log Profile
  - TMSH: ```create ltm profile request-log telemetry request-log-pool telemetry-local request-log-protocol mds-tcp request-log-template event_source=\"request_logging\",hostname=\"$BIGIP_HOSTNAME\",client_ip=\"$CLIENT_IP\",server_ip=\"$SERVER_IP\",http_method=\"$HTTP_METHOD\",http_uri=\"$HTTP_URI\",virtual_name=\"$VIRTUAL_NAME\" request-logging enabled```
    - Note: If creating the profile from the GUI, the ```\``` are not required.
  - F5 Application Services 3.0: [Log Profile Creation Using AS3](#log-profile-creation-using-as3)
- Attach profile to the virtual server
  - F5 Application Services Extension (snippet) - Note: Requires v3.8.0 or greater
    ```json
        {
            "serviceMain": {
                "class": "Service_HTTP",
                "virtualAddresses": ["192.0.2.1"],
                "virtualPort": 80,
                "profileTrafficLog": {
                    "bigip": "/Common/telemetry"
                }
            }
        }
    ```

Output

```json
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
```

#### AFM Log

Configuration

- Create Log Publisher (and related objects): [Log Publisher Configuration](#log-publisher-configuration)
- Create Security Log Profile:
  - TMSH: ```create security log profile telemetry network replace-all-with { telemetry { filter { log-acl-match-drop enabled log-acl-match-reject enabled } publisher telemetry-publisher } }```
  - F5 Application Services 3.0: [Log Profile Creation Using AS3](#log-profile-creation-using-as3)
- Attach profile to the virtual server
  - F5 Application Services Extension (snippet)
    ```json
        {
            "serviceMain": {
                "class": "Service_HTTP",
                "virtualAddresses": ["192.0.2.1"],
                "virtualPort": 80,
                "securityLogProfiles": [
                    {
                        "bigip": "/Common/telemetry"
                    }
                ]
            }
        }
    ```

Output

```json
{
    "acl_policy_name":"/Common/app",
    "acl_policy_type":"Enforced",
    "acl_rule_name":"ping",
    "action":"Reject",
    "hostname":"telemetry.bigip.com",
    "bigip_mgmt_ip":"10.0.1.100",
    "context_name":"/Common/app.app/app_vs",
    "context_type":"Virtual Server",
    "date_time":"2019-01-01T01:01:01Z",
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
```

#### ASM Log

Configuration

- Create Security Log Profile:
  - TMSH: ```create security log profile telemetry application replace-all-with { telemetry { filter replace-all-with { request-type { values replace-all-with { all } } } logger-type remote remote-storage splunk servers replace-all-with { 192.0.2.1:6514 {} } } }```
  - F5 Application Services 3.0: [Log Profile Creation Using AS3](#log-profile-creation-using-as3)
- Attach profile to the virtual server
  - F5 Application Services Extension (snippet)
    ```json
        {
            "serviceMain": {
                "class": "Service_HTTP",
                "virtualAddresses": ["192.0.2.1"],
                "virtualPort": 80,
                "securityLogProfiles": [
                    {
                        "bigip": "/Common/telemetry"
                    }
                ]
            }
        }
    ```

Output

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
    "request":"GET /admin/..%2F..%2F..%2Fdirectory/file HTTP/1.0\\r\\nHost: host.westus.cloudapp.azure.com\\r\\nConnection: keep-alive\\r\\nCache-Control: max-age",
    "tenant":"Common",
    "application":"app.app",
    "telemetryEventCategory": "event"
}
```

#### APM Log

Configuration

- Create Log Publisher (and related objects): [Log Publisher Configuration](#log-publisher-configuration)
- Create APM Log Profile
  - TMSH: ```create apm log-setting telemetry access replace-all-with { access { publisher telemetry-publisher } }```
- Attach profile to the APM policy
- Attach APM policy to the virtual server
  - F5 Application Services Extension (snippet)
    ```json
        {
            "serviceMain": {
                "class": "Service_HTTP",
                "virtualAddresses": ["192.0.2.1"],
                "virtualPort": 80,
                "policyIAM": {
                    "bigip": "/Common/my_apm_policy"
                }
            }
        }
    ```

Output

```json
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

```

#### System Log

Configuration

- Modify System syslog configuration (add destination)
  - TMSH: ```modify sys syslog remote-servers replace-all-with { server { host 10.0.1.100 remote-port 6515 } }```
  - GUI: System -> Logs -> Configuration -> Remote Logging
- Modify System logging configuration (update what gets logged)
  - TMSH: ```modify sys daemon-log-settings mcpd audit enabled`` Note: Other daemon-log-settings exist
  - GUI: System -> Logs -> Configuration -> Options

Output

```json
{
    "data":"<85>Feb 12 21:39:43 telemetry notice sshd[22277]: pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=218.92.1.148  user=root",
    "telemetryEventCategory":"event"
}
```

#### Log Publisher Configuration

- Create Pool
  - TMSH: ```create ltm pool telemetry-local monitor tcp members replace-all-with { 192.0.2.1:6514 }```
  - Note: Replace example address with valid TS listener address, for example the mgmt IP.
- Create Log Destination (Remote HSL)
  - GUI: System -> Logs -> Configuration -> Log Destinations
    - Name: telemetry-hsl
    - Type: Remote HSL
    - Protocol: TCP
    - Pool: telemetry-local
  - TMSH: ```create sys log-config destination remote-high-speed-log telemetry-hsl protocol tcp pool-name telemetry-local```
- Create Log Destination (Format)
  - GUI: System -> Logs -> Configuration -> Log Destinations
    - Name: telemetry-formatted
    - Forward To: telemetry-hsl
  - TMSH: ```create sys log-config destination splunk telemetry-formatted forward-to telemetry-hsl```
- Create Log Publisher
  - GUI: System -> Logs -> Configuration -> Log Publishers
    - Name: telemetry-publisher
    - Destinations: telemetry-formatted
  - TMSH: ```create sys log-config publisher telemetry-publisher destinations replace-all-with { telemetry-formatted }```

#### Log Profile Creation Using AS3

Note: AS3 version 3.10.0 or greater required.

```json
{
    "class": "ADC",
    "schemaVersion": "3.10.0",
    "remark": "Example depicting creation of BIG-IP module log profiles",
    "Common": {
        "Shared": {
            "class": "Application",
            "template": "shared",
            "telemetry_local": {
                "class": "Pool",
                "members": [
                    {
                        "serverAddresses": [
                            "192.0.2.10"
                        ],
                        "enable": true,
                        "servicePort": 6514
                    }
                ],
                "monitors": [
                    {
                        "bigip": "/Common/tcp"
                    }
                ]
            },
            "telemetry_hsl": {
                "class": "Log_Destination",
                "type": "remote-high-speed-log",
                "protocol": "tcp",
                "pool": {
                    "use": "telemetry_local"
                }
            },
            "telemetry_formatted": {
                "class": "Log_Destination",
                "type": "splunk",
                "forwardTo": {
                    "use": "telemetry_hsl"
                }
            },
            "telemetry_publisher": {
                "class": "Log_Publisher",
                "destinations": [
                    {
                        "use": "telemetry_formatted"
                    }
                ]
            },
            "telemetry_traffic_log_profile": {
                "class": "Traffic_Log_Profile",
                "requestSettings": {
                    "requestEnabled": true,
                    "requestProtocol": "mds-tcp",
                    "requestPool": {
                        "use": "telemetry_local"
                    },
                    "requestTemplate": "event_source=\"request_logging\",hostname=\"$BIGIP_HOSTNAME\",client_ip=\"$CLIENT_IP\",server_ip=\"$SERVER_IP\",http_method=\"$HTTP_METHOD\",http_uri=\"$HTTP_URI\",virtual_name=\"$VIRTUAL_NAME\""
                }
            },
            "telemetry_security_log_profile": {
                "class": "Security_Log_Profile",
                "application": {
                    "localStorage": false,
                    "remoteStorage": "splunk",
                    "protocol": "tcp",
                    "servers": [
                        {
                            "address": "192.0.2.10",
                            "port": "6514"
                        }
                    ],
                    "storageFilter": {
                        "requestType": "illegal-including-staged-signatures"
                    }
                },
                "network": {
                    "publisher": {
                        "use": "telemetry_publisher"
                    },
                    "logRuleMatchAccepts": false,
                    "logRuleMatchRejects": true,
                    "logRuleMatchDrops": true,
                    "logIpErrors": true,
                    "logTcpErrors": true,
                    "logTcpEvents": true
                }
            }
        }
    }
}
```

## Container

This project builds a container, here are the current steps to build and run that container. Note: Additional steps TBD around pushing to docker hub, etc.

Note: Currently this is building from local node_modules, src, etc.  This should change to using the RPM package.

Build: ```docker build . -t f5-telemetry``` Note: From root folder of this project

Run: ```docker run --rm -d -p 443:443/tcp -p 6514:6514/tcp -e MY_SECRET_ENV_VAR='mysecret' f5-telemetry:latest```

Attach Shell: ```docker exec -it <running container name> /bin/sh```