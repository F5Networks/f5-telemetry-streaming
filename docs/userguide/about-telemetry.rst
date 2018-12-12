About Telemetry Streaming
========================

Telemetry Streaming is an iControl LX extension that sends telemetry information, such as client/server stats, from the BIG-IP to third-party monitoring and stats aggregation tools.

.. image:: /images/telemetry-streaming-diagram.png

System Statistics
-----------------
Some of the system statistics that are collected with Telemetry Streaming include device state, CPU usage, and virtual server stats. You can customize the poll interval. The minimum amount of time is 60 seconds and the default is 5 minutes.

Consumers
---------

- Splunk
- Azure Log Analytics
- AWS CloudWatch
- AWS S3
- Graphite