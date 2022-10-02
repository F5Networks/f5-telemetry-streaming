.. _customize-data:

Customizing the F5 BIG-IP Telemetry Streaming payload
-----------------------------------------------------

F5 BIG-IP Telemetry Streaming 1.20 introduced a feature that allows you to restructure the data coming out of the Telemetry Streaming Generic HTTP consumer so it fits the format of 3rd party systems.  This is useful when you want the Telemetry Streaming payload in the format of a system that does not have a specific Telemetry Streaming consumer.  It also helps when trying to get log data into any kind of HTTP API.

This feature is enabled as a JMESPath expression (using a JMESPath library) in the Telemetry Consumer class as an **action** for the Generic HTTP consumer. BIG-IP TS takes the JMESPath expression with the string that you provide, and applies the expression to the data received by the consumer.

For information on JMESPath, including the JMESPath specification, additional examples, and an interactive query tool, see https://jmespath.org/.

.. IMPORTANT:: Currently, you can only use this with the Generic HTTP consumer and only with JMESPath expressions.

For example, if we take a declaration similar to the :ref:`Quick Start declaration<qs-example>`, but using the Generic_HTTP consumer, it looks like:

.. code-block:: json

    {
        "class": "Telemetry",
        "My_System": {
            "class": "Telemetry_System",
            "systemPoller": {
                "interval": 60
            }
        },
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Generic_HTTP",
            "host": "192.0.2.1",
            "protocol": "http",
            "port": 8080
        }
    }

The output for this example is shown in :ref:`System Information Output<sysinfo>`.

When we modify the declaration to apply the JMESPath Expression action to the consumer, it looks like:

.. code-block:: json

    {
        "class": "Telemetry",
        "My_System": {
            "class": "Telemetry_System",
            "systemPoller": {
                "interval": 60
            }
        },
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Generic_HTTP",
            "host": "192.0.2.1",
            "protocol": "http",
            "port": 8080,
            "path": "/bigip",
            "actions": [
                {
                    "JMESPath": {},
                    "expression": "{ virtuals: virtualServers, service: telemetryEventCategory, hostname: system.hostname, staticTag: 'any string value' }"
                }
            ]
        }
    }

|

The dataset is modified and sent to the Consumer, as seen in the following example:

.. code-block:: json

    {
        "virtuals": {
            "/Common/Shared/some_service": {
                "clientside.bitsIn": 0,
                "clientside.bitsOut": 0,
                "clientside.curConns": 0,
                "clientside.maxConns": 0,
                "clientside.pktsIn": 0,
                "clientside.pktsOut": 0,
                "clientside.totConns": 0,
                "destination": "192.168.10.11:443",
                "availabilityState": "unknown",
                "enabledState": "enabled",
                "status.statusReason": "The children pool member(s) either don't have service checking enabled, or service check results are not available yet",
                "totRequests": 0,
                "name": "/Common/Shared/some_service",
                "ipProtocol": "any",
                "mask": "255.255.255.255",
                "profiles": {
                    "/Common/Shared/telemetry_traffic_log_profile": {
                        "name": "/Common/Shared/telemetry_traffic_log_profile"
                    },
                    "/Common/ipother": {
                        "name": "/Common/ipother"
                    }
                },
                "tenant": "Common",
                "application": "Shared"
            },
            "/Common/Shared/telemetry_local": {
                "clientside.bitsIn": 163246672,
                "clientside.bitsOut": 116752896,
                "clientside.curConns": 0,
                "clientside.maxConns": 8,
                "clientside.pktsIn": 354753,
                "clientside.pktsOut": 267618,
                "clientside.totConns": 90019,
                "destination": "255.255.255.254:6514",
                "availabilityState": "unknown",
                "enabledState": "enabled",
                "status.statusReason": "The children pool member(s) either don't have service checking enabled, or service check results are not available yet",
                "totRequests": 0,
                "name": "/Common/Shared/telemetry_local",
                "ipProtocol": "tcp",
                "mask": "255.255.255.255",
                "profiles": {
                    "/Common/f5-tcp-progressive": {
                        "name": "/Common/f5-tcp-progressive"
                    }
                },
                "tenant": "Common",
                "application": "Shared"
            },
            "/Common/tester": {
                "clientside.bitsIn": 3037272,
                "clientside.bitsOut": 1408616,
                "clientside.curConns": 0,
                "clientside.maxConns": 4,
                "clientside.pktsIn": 2504,
                "clientside.pktsOut": 2384,
                "clientside.totConns": 728,
                "destination": "10.145.68.179:7878",
                "availabilityState": "unknown",
                "enabledState": "enabled",
                "status.statusReason": "The children pool member(s) either don't have service checking enabled, or service check results are not available yet",
                "totRequests": 100,
                "name": "/Common/tester",
                "ipProtocol": "tcp",
                "mask": "255.255.255.255",
                "profiles": {
                    "/Common/ASM_ASMTestPolicy": {
                        "name": "/Common/ASM_ASMTestPolicy"
                    },
                    "/Common/http": {
                        "name": "/Common/http"
                    },
                    "/Common/tcp": {
                        "name": "/Common/tcp"
                    },
                    "/Common/websecurity": {
                        "name": "/Common/websecurity"
                    }
                },
                "tenant": "Common"
            }
        },
        "service": "systemInfo",
        "hostname": "bigip1",
        "staticTag": "any string value"
    }

|


Example of reformatting ASM events
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this example, we take the input from :ref:`ASM Request Log<asmrl>`.

We then add a JMESPath Expression of ``"{ asmLog: @, method: method, service: telemetryEventCategory }"``

The updated output looks like the following:

.. code-block:: json

    {
        "asmLog": {
            "hostname": "hostname",
            "management_ip_address": "10.0.1.4",
            "management_ip_address_2": "",
            "http_class_name": "/Common/app.app/app_policy",
            "web_application_name": "/Common/app.app/app_policy",
            "policy_name": "/Common/app.app/app_policy",
            "policy_apply_date": "2018-11-19 22:17:57",
            "violations": "Evasion technique detected",
            "support_id": "1730614276869062795",
            "request_status": "blocked",
            "response_code": "0",
            "ip_client": "50.206.82.144",
            "route_domain": "0",
            "method": "GET",
            "protocol": "HTTP",
            "query_string": "",
            "x_forwarded_for_header_value": "50.206.82.144",
            "sig_ids": "",
            "sig_names": "",
            "date_time": "2018-11-19 22:34:40",
            "severity": "Critical",
            "attack_type": "Detection Evasion,Path Traversal",
            "geo_location": "US",
            "ip_address_intelligence": "N/A",
            "username": "N/A",
            "session_id": "f609d8a924419638",
            "src_port": "49804",
            "dest_port": "80",
            "dest_ip": "10.0.2.10",
            "sub_violations": "Evasion technique detected:Directory traversals",
            "virus_name": "N/A",
            "violation_rating": "3",
            "websocket_direction": "N/A",
            "websocket_message_type": "N/A",
            "device_id": "N/A",
            "staged_sig_ids": "",
            "staged_sig_names": "",
            "threat_campaign_names": "",
            "staged_threat_campaign_names": "",
            "blocking_exception_reason": "N/A",
            "captcha_result": "not_received",
            "uri": "/directory/file",
            "fragment": "",
            "request": "GET /admin/..%2F..%2F..%2Fdirectory/file HTTP/1.0\\r\\nHost: host.westus.cloudapp.azure.com\\r\\nConnection: keep-alive\\r\\nCache-Control: max-age",
            "tenant": "Common",
            "application": "app.app",
            "telemetryEventCategory": "ASM"
        },
        "method": "GET",
        "service": "ASM"
    }

|

Example of integrating with another system
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Next, we show how you can integrate with another system using JMESPath Expression.  

In this example, we include an expression to be able to send ASM events into DataDog Logs (using the DataDog Log API: https://docs.datadoghq.com/api/latest/logs/#send-logs).

We use the same input as the last example, :ref:`ASM Request Log<asmrl>`.

We then add a JMESPath Expression of ``"{ message: @, service: application, hostname: hostname, ddtags: 'env:prod',  ddsource: 'BIG-IP' }"``

The updated output looks like the following:

.. code-block:: json

    {
        "message": {
            "hostname": "hostname",
            "management_ip_address": "10.0.1.4",
            "management_ip_address_2": "",
            "http_class_name": "/Common/app.app/app_policy",
            "web_application_name": "/Common/app.app/app_policy",
            "policy_name": "/Common/app.app/app_policy",
            "policy_apply_date": "2018-11-19 22:17:57",
            "violations": "Evasion technique detected",
            "support_id": "1730614276869062795",
            "request_status": "blocked",
            "response_code": "0",
            "ip_client": "50.206.82.144",
            "route_domain": "0",
            "method": "GET",
            "protocol": "HTTP",
            "query_string": "",
            "x_forwarded_for_header_value": "50.206.82.144",
            "sig_ids": "",
            "sig_names": "",
            "date_time": "2018-11-19 22:34:40",
            "severity": "Critical",
            "attack_type": "Detection Evasion,Path Traversal",
            "geo_location": "US",
            "ip_address_intelligence": "N/A",
            "username": "N/A",
            "session_id": "f609d8a924419638",
            "src_port": "49804",
            "dest_port": "80",
            "dest_ip": "10.0.2.10",
            "sub_violations": "Evasion technique detected:Directory traversals",
            "virus_name": "N/A",
            "violation_rating": "3",
            "websocket_direction": "N/A",
            "websocket_message_type": "N/A",
            "device_id": "N/A",
            "staged_sig_ids": "",
            "staged_sig_names": "",
            "threat_campaign_names": "",
            "staged_threat_campaign_names": "",
            "blocking_exception_reason": "N/A",
            "captcha_result": "not_received",
            "uri": "/directory/file",
            "fragment": "",
            "request": "GET /admin/..%2F..%2F..%2Fdirectory/file HTTP/1.0\\r\\nHost: host.westus.cloudapp.azure.com\\r\\nConnection: keep-alive\\r\\nCache-Control: max-age",
            "tenant": "Common",
            "application": "app.app",
            "telemetryEventCategory": "ASM"
        },
        "service": "app.app",
        "hostname": "hostname",
        "ddtags": "env:prod",
        "ddsource": "BIG-IP"
    }

