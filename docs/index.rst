F5 Telemetry Streaming
======================

Welcome to the F5 Telemetry Streaming User Guide. To provide feedback on this documentation, you can file a GitHub Issue, or email us at solutionsfeedback@f5.com. |br|

For information on supported versions of Telemetry Streaming, see |supportmd|.

Introduction
------------

Telemetry Streaming (TS) enables you to declaratively aggregate, normalize, and forward statistics and events from the BIG-IP to a consumer application. Telemetry Streaming is an iControl LX Extension delivered as a TMOS-independent RPM file, and uses a declarative model, meaning you provide a JSON declaration rather than a set of imperative commands.  To use Telemetry Streaming, you POST a single JSON declaration to Telemetry Streaming's declarative REST API endpoint. 

See our Telemetry Streaming overview video:

|video|

|

This guide contains information on downloading, installing, and using the Telemetry Streaming Extension.  Use the navigation panes, and/or the Next and
Previous buttons to explore the documentation.  

You can click the following links to go directly to a specific :doc:`setting-up-consumer` or :doc:`pull-consumers`:

.. list-table::
      :header-rows: 1

      * - **Push Consumers**
        - **Supports System Poller**
        - **Supports Event Listener**

      * - :ref:`splunk-ref`
        - yes
        - yes
    
      * - :ref:`azure-ref`
        - yes
        - yes

      * - :ref:`appinsight-ref`
        - yes (metrics only)
        - no

      * - :ref:`awscloud-ref`
        - yes (metrics only)
        - no

      * - :ref:`awss3-ref`
        - yes
        - yes

      * - :ref:`graphite-ref`
        - yes
        - yes

      * - :ref:`kafka-ref`
        - yes
        - yes

      * - :ref:`elasticsearch-ref`
        - yes
        - yes

      * - :ref:`sumologic-ref`
        - yes
        - yes

      * - :ref:`statsd-ref`
        - yes (metrics only)
        - no

      * - :ref:`http-ref`
        - yes
        - yes

      * - :ref:`F5 Beacon<beacon-ref>`
        - yes
        - yes

      * - :ref:`fluentd-ref`
        - yes
        - yes

      * - :ref:`stackdrive`
        - yes (metrics only)
        - no


.. list-table::
      :header-rows: 1

      * - **Pull Consumers**
        - **Supports System Poller**
        - **Supports Event Listener**

      * - :ref:`pull`
        - yes
        - no

      * - :ref:`prometheus`
        - yes (metrics only)
        - no



.. toctree::
   :caption: Telemetry Streaming:
   :hidden:
   :glob:
   :maxdepth: 1

   prereqs
   faq
   quick-start
   installation
   using-ts
   declarations
   output-example
   data-modification
   troubleshooting
   schema-reference
   namespaces
   poller-default-output-reference
   revision-history



.. |video| raw:: html

    <iframe width="560" height="315" src="https://www.youtube.com/embed/YeEAovBvUkY" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>


.. |supportmd| raw:: html

   <a href="https://github.com/F5Networks/f5-telemetry-streaming/blob/master/SUPPORT.md" target="_blank">Support information on GitHub</a>

.. |br| raw:: html
   
   <br />
