About Telemetry Streaming
=========================

Telemetry Streaming is an iControl LX extension that aggregates, normalizes, and forwards statistics and events from the BIG-IP to a consumer application.

.. image:: /images/telemetry-streaming-diagram.png

Components
----------
**System Poller:** Polls a system on a defined interval for information such as device statistics, virtual server statistics, pools statistics, and more. 

**Event Listener:** Provides a listener, currently TCP, that can accept events in a specific format and process them.
Event Format: ``key1="value",key2="value"``

**Consumer:** Accepts information from disparate systems and provides the tools to process that information. In the context of Telemetry Streaming this means providing a mechanism by which to integrate with existing analytics products. To see examples of configurations for consumers like Splunk, Azure Log Analytics, AWS CloudWatch, AWS S3, Graphite, see the Configuring a Consumer Stream section of this guide.