F5 Telemetry Streaming
======================

Welcome to the F5 Telemetry Streaming User Guide.
To provide feedback on this documentation, you can file a GitHub Issue, or email us at solutionsfeedback@f5.com.

Introduction
------------

Telemetry Streaming (TS) is an iControl LX Extension delivered as a TMOS-independent RPM file. Installing the TS Extension on BIG-IP enables you to declaratively aggregate, normalize, and forward statistics and events from the BIG-IP to a consumer application by POSTing a single TS JSON declaration to TS’s declarative REST API endpoint. 

Telemetry Streaming uses a declarative model, meaning you provide a JSON declaration rather than a set of imperative commands.


.. image:: /images/telemetry-streaming.png

|

This guide contains information on downloading, installing, and using the Telemetry Streaming Extension.

Click the following links to go directly to the supported third-party consumer example declaration:

-  :ref:`splunk-ref`
-  :ref:`azure-ref`
-  :ref:`awscloud-ref`
-  :ref:`awss3-ref`
-  :ref:`graphite-ref`
-  :ref:`kafka-ref`
-  :ref:`elasticsearch-ref`
-  :ref:`sumologic-ref`
-  :ref:`statsd-ref`
-  :ref:`http-ref`

You can use Microsoft Visual Studio Code to validate your declarations, see :ref:`validate` for information.


See our Telemetry Streaming overview video:

|video|


Use the following links, the navigation on the left, and/or the Next and
Previous buttons to explore the documentation.

.. toctree::
   :caption: Telemetry Streaming:
   :glob:
   :maxdepth: 1

   prereqs
   faq
   quick-start
   installation
   using-ts
   declarations
   output-example
   troubleshooting
   revision-history


.. |video| raw:: html


   
    <iframe width="560" height="315" src="https://www.youtube.com/embed/YeEAovBvUkY" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>





