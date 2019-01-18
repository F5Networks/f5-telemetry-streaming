About Telemetry Streaming
=========================

Telemetry Streaming is a way for you to forward events and statistics from the BIG-IP system to your preferred data consumer and visualization application. You can do all of this by POSTing a single JSON declaration to a declarative REST API endpoint.

.. image:: /images/TSdiagram.png

A basic declaration is shown here with descriptions of the components below:

.. code-block:: json
   :linenos:

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
            "protocol": "http",
            "port": "8088",
            "passphrase": {
                "cipherText": "apikey"
            }
        }
    }



Components
----------
**System Poller:** Polls a system, such as BIG-IP on a configurable interval for information such as device statistics, virtual server statistics, pools statistics, and more. 

**Event Listener:** Provides a listener, currently TCP, that can accept events in a specific format and process them.
Event Format: ``key1="value",key2="value"``

**Consumer:** Accepts information from disparate systems and provides the tools to process that information. In the context of Telemetry Streaming this means providing a mechanism by which to integrate with existing analytics products. To see examples of configurations for consumers like Splunk, Azure Log Analytics, AWS CloudWatch, AWS S3, Graphite, see the Configuring a Consumer Stream section of this guide.