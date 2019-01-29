Event Listener
--------------

Telemetry Streaming collects event logs from all BIG-IP sources, including LTM, ASM, AFM, and APM.

The Request Logging profile gives you the ability to configure data within a log file for HTTP requests and responses, in accordance with specified parameters.

LTM Request Log profile
```````````````````````

To configure an LTM request profile, use these tmsh commands:

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Note:

  All keys should be in lower case to enable classication (tenant/application).

1. Create a pool in tmsh: 

``create ltm pool telemetry-local monitor tcp members replace-all-with { 192.0.2.1:6514 }``. Replace the example address with a valid Telemetry Streaming listener address, for example the mgmt IP.

2. Create an LTM Request Log Profile: 

``create ltm profile request-log telemetry request-log-pool telemetry-local request-log-protocol mds-tcp request-log-template event_source=\"request_logging\",hostname=\"$BIGIP_HOSTNAME\",client_ip=\"$CLIENT_IP\",server_ip=\"$SERVER_IP\",http_method=\"$HTTP_METHOD\",http_uri=\"$HTTP_URI\",virtual_name=\"$VIRTUAL_NAME\" request-logging enabled``

3. Attach the profile to the virtual server.

.. code-block:: json
   :linenos:

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


Example Output:

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
