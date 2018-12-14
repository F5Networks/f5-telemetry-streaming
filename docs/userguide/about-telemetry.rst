About Telemetry Streaming
=========================

Telemetry Streaming is an iControl LX extension that sends telemetry information, such as client/server stats, from the BIG-IP to third-party monitoring and stats aggregation tools.

.. image:: /images/telemetry-streaming-diagram.png

Definitions
```````````
**System Poller:** Polls a system on a defined interval for information such as device statistics, virtual server statistics, pools statistics, and more. 

**Event Listener:** Provides a listener, currently TCP, that can accept events in a specific format and process them.
Event Format: ``key1="value",key2="value"``

**Consumer:** Accepts information from disparate systems and provides the tools to process that information. In the context of Telemetry Streaming this means providing a mechanism by which to integrate with existing analytics products. To see examples of configurations for consumers like Splunk, Azure Log Analytics, AWS CloudWatch, AWS S3, Graphite, see the Configuring a Consumer Stream section of this guide.

System Statistics
-----------------
Some of the system statistics that are collected with Telemetry Streaming include device state, CPU usage, and virtual server stats. You can customize the poll interval. The minimum amount of time is 60 seconds and the default is 5 minutes.