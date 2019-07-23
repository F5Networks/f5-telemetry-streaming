.. _revision-history:

Document Revision History
=========================

.. list-table::
      :widths: 15 100 15
      :header-rows: 1

      * - Revision
        - Description
        - Date

      * - 1.5.0
        - Updated the documentation for Telemetry Streaming v1.5.0. This release contains the following changes: |br| * Added support for Carrier Grade NAT (CGNAT) event logs (see :ref:`cgnat`) |br| * Telemetry Streaming now collects **mask** and **ipProtocol** for virtual servers (see the virtualServers lines of :ref:`System Information Output<sysinfo>` for example output. |br| * Telemetry Streaming now collects the system status information: devicegroup, asm_state, last_asm_change, apm_state, afm_state, last_afm_deploy, ltm_config_time, gtm_config_time (see the :ref:`System Information Output<sysinfo>` for example output) |br| * Added iRules support to system poller stats (see the iRules lines of :ref:`System Information Output<sysinfo>` for example output)  |br| |br| Issues Resolved: |br| * Elastic Search Unable to parse and index some messages with previously used keys |br| * Elastic Search event data objects containing consecutive periods will be replaced with a single period |br| * Splunk Host property is null for TS events
        - 07-30-19

      * - 1.4.0
        - Updated the documentation for Telemetry Streaming v1.4.0. This release contains the following changes: |br| * Added a new troubleshooting entry for an error that can occur with the ElasticSearch consumer (see :ref:`Troubleshooting <elkerror>`). |br| * Added the |schemalink| from previous releases to the GitHub repository  |br| * Updated :doc:`validate` to clarify the schema URL to use |br| * Updated the documentation theme and indexes. |br| |br| Issues Resolved: |br| * System Poller throws unhandled exception "socket hang up" on attempt to fetch stats.
        - 06-18-19
      
      * - 1.3.0
        - Updated the documentation for Telemetry Streaming v1.3.0. This release contains the following changes: |br| * TS now exports AVR data. See the :ref:`avr-ref` section for configuration notes. |br| * Added documentation for the tag property. |br| * Added support for Kafka SASL-PLAIN authentication.
        - 04-30-19

      * - 1.2.0
        - Updated the documentation for Telemetry Streaming v1.2.0. This release contains the following changes: |br| * Changed the System Poller class to the Telemetry System class. |br| * Added support for iHealth polling. |br| * Added support for IPsec Tunnel statistics. |br| * Added Event Listener log profile configuration example using a single AS3 declaration. |br| * Updated the Event Listener log profile configuration examples to use non-mgmt-IP-based endpoints. |br| * Updated example output.
        - 04-02-19

      * - 1.1.0
        - Updated the documentation for Telemetry Streaming v1.1.0. This release contains the following changes: |br| * Added reference links for importing the example Azure dashboard to the :ref:`settingupconsumer-ref` section. |br| * Added a section for :ref:`validate`.  |br| * Updated the Kafka example declaration to include binaryTcp as an alternate protocol option. |br| * Added UDP as a protocol for the event listener.  |br| * Added StatsD and generic HTTP as consumers. See the :ref:`settingupconsumer-ref` section for declaration examples. |br| * Added System Log to the :ref:`eventlistener-ref` section.  |br| * Updated GitHub links.
        - 03-05-19  
      
      * - 1.0.0
        - Initial release of Telemetry Streaming documentation.
        - 02-05-19


      * - 0.9.0
        - Initial internal release of Telemetry Streaming documentation.
        - 12-27-18

    



.. |br| raw:: html
   
   <br />

.. |hub| raw:: html

   <a href="https://github.com/F5Networks/f5-telemetry-streaming/issues" target="_blank">GitHub Issues</a>

.. |schemalink| raw:: html

   <a href="https://github.com/F5Networks/f5-telemetry-streaming/tree/master/src/nodejs/schema" target="_blank">schema files</a>




