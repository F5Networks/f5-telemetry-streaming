.. _revision-history:

Document Revision History
=========================

.. list-table::
      :widths: 15 100 15
      :header-rows: 1

      * - Doc Rev
        - Description
        - Date

      * - 1.15.0
        - Updated the documentation for Telemetry Streaming v1.15.0. This release contains the following changes: |br| * Updated the default hostname for the StatsD consumer (see the Important note in :ref:`statsd-ref`) |br| * Added a note to the :ref:`prometheus` consumer on how to access the consumer endpoint with a user other than **admin** |br| * Added a new FAQ entry on why you may see a decrease in some pool statistics (see :ref:`poolstats`)  |br| |br| Issues Resolved: |br| * Fixed syslog event hostname parsing for VCMP hosts |br| * Resolve memory leak in ElasticSearch consumer, by replacing 'elasticsearch' library with 'request' library
        - 10-13-20

      * - 1.14.0
        - Updated the documentation for Telemetry Streaming v1.14.0. This release contains the following changes: |br| * Added support for AWS CloudWatch Metrics (see :ref:`cw-metrics`) |br| * Added an EXPERIMENTAL feature to specify fallback hosts for generic HTTP consumers (see :ref:`fallback`) |br| * Added F5 Beacon as a Generic HTTP consumer (see :ref:`beacon-ref`)  |br| * Added **cipherUses** stats for Client and Server SSL profiles (see the cipherUses lines in :ref:`sysinfo`) |br| * Added a troubleshooting entry for a restjavad issue (see :ref:`restjavad`) |br| * Added a note to the :doc:`avr` page about AVR caveats with TS and BIG-IQ (see the :ref:`AVR note<avr-note>`) |br| * Updated the introduction for the experimental :doc:`custom-endpoints` |br| * Added support for BIG-IP 16.0  |br| |br| Issues Resolved: |br| * Fixed Event Listener parsing when receiving multiple events
        - 09-01-20

      * - 1.13.0
        - Updated the documentation for Telemetry Streaming v1.13.0. This release contains the following changes: |br| * Added **statusReason** and **monitorStatus** fields to System Poller output for BIG-IQ Analytics (see :ref:`sysinfo`) |br| * Added comprehensive troubleshooting entry for why data may not be showing up in a consumer (see :ref:`Troubleshooting<nodata>`) |br| * Updated the Event Listener page (see :doc:`event-listener`) |br| |br| Issues Resolved: |br| * Fixed inconsistency in GSLB output: return empty object instead of 'undefined' |br| * Fixed Azure consumer memory leak when calling metadata service on an instance where it is unavailable |br| * Updated Azure Log Analytics dashboard example (`GitHub #39 <https://github.com/F5Networks/f5-telemetry-streaming/issues/39>`_) |br| * Fixed lodash `Prototype Pollution vulnerability <https://www.npmjs.com/advisories/1523>`_ |br| * Fixed Splunk legacy format missing poolMemberStat data
        - 07-21-20

      * - 1.12.0
        - Updated the documentation for Telemetry Streaming v1.12.0. This release contains the following changes: |br| * Added a new consumer for Prometheus (see :ref:`prometheus`) |br| * Updated the Pull Consumer page and added an example for using push and pull consumers in the same declaration (see :doc:`pull-consumers`) |br| * Added support for IAM Roles with AWS_S3 Consumer (see :ref:`awss3-ref`) |br| * Added TCP support to the StatsD consumer (see :ref:`statsd-ref`) |br| * Added a note to :ref:`splunk-legacy` stating if the legacy format is used, it ignores events from the Event Listener |br| |br| Issues Resolved: |br| * Added a timeout to Azure metadata service HTTP requests to fix an issue where the Azure Consumer was slow when running in a non-Azure environment |br| * Fixed renameKeys for networkInterfaces with multiple digits (`GitHub #18 <https://github.com/F5Networks/f5-telemetry-streaming/issues/18>`_)
        - 06-02-20

      * - Unreleased
        - Documentation only update. This update contains the following change: |br| * Added an important note to the ElasticSearch consumer section stating TS currently does not support sending data to ElasticSearch 7 (see :ref:`elasticsearch-ref`).
        - 04-24-20

      * - 1.11.0
        - Updated the documentation for Telemetry Streaming v1.11.0. This release contains the following changes: |br| * Added a new consumer for Azure Application Insights (see :ref:`appinsight-ref`) |br| * Added support for Azure Managed Identities for :ref:`Azure Log Analytics<mi>` and :ref:`Azure Application Insights<miappin>` |br| * Added support for AzureGov for Azure consumers using an optional region property (see :ref:`region`) |br| * Added a new page for the Pull consumer (see :ref:`pullconsumer-ref`) and renamed the original Consumer page to Push consumer |br| * Added a new page detailing how to delete the configuration produced by TS (see :doc:`deleting-ts-config`) |br| * Renamed Google StackDriver to Google Cloud Monitoring |br| |br| Issues Resolved: |br| * Fixed `Regular Expression Denial of Service vulnerability <https://www.npmjs.com/advisories/1488>`_ and improved start up time on node v4.x and v6.x |br| * Fixed error when Splunk consumer (configured with 'legacy' format) tries to forward event from Event Listener (`GitHub #30 <https://github.com/F5Networks/f5-telemetry-streaming/issues/30>`_) |br| * Fixed crash in Kafka consumer on attempt to close idle connections to brokers (`GitHub #17 <https://github.com/F5Networks/f5-telemetry-streaming/issues/17>`_) 
        - 04-21-20

      * - 1.10.0
        - Updated the documentation for Telemetry Streaming v1.10.0. This release contains the following changes: |br| * Added a feature (currently EXPERIMENTAL) for configuring custom endpoints (see :doc:`custom-endpoints`) |br| * Added **ifAnyMatch** functionality to the existing value-based matching logic (see :ref:`valuebased`) |br| * Added support for F5 devices with multiple hosts (see the :ref:`FAQ<viprion>`)  |br| |br| Issues Resolved: |br| * Event Listener unable to classify AFM DoS event |br| * Splunk legacy tmstats - include last_cycle_count |br| * Splunk legacy tmstats - add tenant and application data |br| * Declarations with large secrets may timeout |br| * Passphrases should be obfuscated in consumer trace files |br| * Add 'profiles' data (profiles attached to Virtual Server) to 'virtualServers' |br| * Use baseMac instead of hostname to fetch CM device (`GitHub Issue 26 <https://github.com/F5Networks/f5-telemetry-streaming/pull/26>`_) |br| * cipherText validation when protected by SecureVault |br| * Caching data about the host device to speed up declaration processing
        - 03-10-20

      * - 1.9.0
        - Updated the documentation for Telemetry Streaming v1.9.0. This release contains the following changes: |br| * Added support for gathering configuration information and statistics for GSLB Wide IP and Pools (see :ref:`System Information example output<sysinfo>`) |br| * Username and passphrase are now optional on the AWS CloudWatch consumer (see the important note in :ref:`awscloud-ref`) |br| * Added detailed information about character encoding and Telemetry Streaming (see :ref:`char-encoding`) |br| * Added a FAQ entry to define the F5 Automation Toolchain API contract (see :ref:`What is the Automation Toolchain API Contract?<contract>`) |br| |br| Issues Resolved: |br| * Basic auth does not work with ElasticSearch consumer |br| * Some Splunk legacy tmstats datamodels have a period in property name instead of underscore
        - 01-28-20

      * - 1.8.0
        - Updated the documentation for Telemetry Streaming v1.8.0. This release contains the following changes: |br| * Added support for Google StackDriver as a consumer (see :ref:`stackdrive`) |br| * Added a new page for :doc:`data-modification`, which includes support for Action Chains, and includeData and excludeData filtering (see :ref:`Action Chains<actions>` for information on these items). |br| * Added **machineId** to System Poller output |br| * Added reference to pools in virtual server data  |br| |br| Issues Resolved: |br| * Improved error handling to preserve stack traces
        - 12-3-19
      
      * - 1.7.0
        - Updated the documentation for Telemetry Streaming v1.7.0. This release contains the following changes: |br| * Added a new Consumer for Fluentd (see :ref:`fluentd-ref`) |br| * Added a note to :ref:`splunk-legacy` stating TS 1.7.0 and later gathers additional data from tmstats tables to improve compatibility with Splunk Legacy consumers |br| * Added a troubleshooting entry and other notes about the **/dist** directory going away on GitHub, and the TS RPM being available as a release Asset (see :ref:`Troubleshooting<nodist>`) |br| * Added an FAQ entry about TS collecting non-identifiable usage data  (see :ref:`Usage data<statsinfo>`) |br| * Updated the maximum number of concurrent established TCP sockets per consumer to 5 |br| |br| Issues Resolved: |br| * Splunk Tmstat table data is being overwritten when forwarded to Splunk |br| * Broken promise chain when loading config file.
        - 10-22-19

      * - 1.6.0
        - Updated the documentation for Telemetry Streaming v1.6.0. This release contains the following changes: |br| * In version 1.6.0 and later, tagging is now an array inside of which you can add tagging objects  (see :ref:`Tag Property <tagproperty>`). |br| * Added the facility parameter for the Splunk Legacy format (see :ref:`splunk-legacy`)  |br| * Added a Schema Reference appendix 
        - 09-10-19

      * - 1.5.0
        - Updated the documentation for Telemetry Streaming v1.5.0. This release contains the following changes: |br| * Added support for Carrier Grade NAT (CGNAT) event logs (see :ref:`cgnat`) |br| * Telemetry Streaming now collects **mask** and **ipProtocol** for virtual servers (see the virtualServers lines of :ref:`System Information Output<sysinfo>` for example output. |br| * Telemetry Streaming now collects the system status information: **devicegroup**, **asm_state**, **last_asm_change**, **apm_state**, **afm_state**, **last_afm_deploy**, **ltm_config_time**, and **gtm_config_time** (see the :ref:`System Information Output<sysinfo>` for example output) |br| * Added iRules support to system poller stats (see the iRules lines of :ref:`System Information Output<sysinfo>` for example output) |br| * Added a :ref:`Troubleshooting entry<certerror>` about a self-signed certificate error.  Also added a related **allowSelfSignedCert** row to the :doc:`advanced-options` table.  |br| |br| Issues Resolved: |br| * Elastic Search Unable to parse and index some messages with previously used keys |br| * Elastic Search event data objects containing consecutive periods will be replaced with a single period |br| * Splunk Host property is null for TS events
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

   <a href="https://github.com/F5Networks/f5-telemetry-streaming/tree/master/src/schema" target="_blank">schema files</a>




