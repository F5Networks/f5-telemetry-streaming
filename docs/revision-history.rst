.. _revision-history:

Document Revision History
=========================

**PLEASE NOTE:** F5 BIG-IP Telemetry Streaming is no longer in active development.  
We are moving this technology into maintenance mode.

A product in maintenance mode continues to receive support and ensures its stability with regular critical fixes and security updates. 
This maintenance approach helps maintain the longevity and reliability of the product for the long term. 
Enhancement requests for this product will be evaluated on an individual basis, taking into consideration their overall impact and alignment with our business objectives. 
Only those with a strong case for improvement will be considered for implementation
There is no plan to deprecate this product.


.. list-table::
      :widths: 15 100 15
      :header-rows: 1

      * - Doc Rev
        - Description
        - Date

      * - 1.33.0
<<<<<<< HEAD
        - Updated the documentation for Telemetry Streaming v1.33.0. This release contains the following changes: |br| * Added allowing user provided endpoints for the Azure consumers |br| |br| Changed: |br| * Update npm packages
=======
        - Released Telemetry Streaming v1.33.0 as a LTS (Long Term Support) version. See the Telemetry Streaming |supportmd| for information about the Telemetry Streaming support policy. |br|Updated the documentation for Telemetry Streaming v1.33.0. This release contains the following changes: |br| * Added allowing user provided endpoints for the Azure consumers |br| |br| Changed: |br| * Update npm packages
>>>>>>> develop
        - 03-17-23

      * - 1.32.0
        - Updated the documentation for Telemetry Streaming v1.32.0. This release contains the following changes: |br| * DataDog: forward metric data additionally to the logs endpoint |br| * Removed Beacon from documentation
        - 10-04-22

      * - 1.31.0
        - Updated the documentation for Telemetry Streaming v1.31.0. This release contains the following changes: |br| * Added gRPC exporter to OpenTelemetry_Exporter (experimental feature) |br| * Added new performance stats - system.connectionsPerformance. |br| * Generic_HTTP consumer should allow to tune transport options (experimental feature) |br| * Added compressionType option to Generic_HTTP consumer. |br| * DataDog consumer should support proxy configuration. |br| * DataDog consumer should split huge payload into smaller chunks according to API docs. |br| * DataDog consumer should allow to tune transport options (experimental feature). |br| * Added OpenTelemetry_Exporter raw JSON output. |br| * Added secure connection settings to OpenTelemetry_Exporter (experimental feature). |br| |br| Issues Resolved: |br| * DataDog consumer should send correct timestamp value. |br| * OpenTelemetry_Exporter should set correct timestamp. |br| |br| Changed: |br| * system.throughputPerformance in System Poller's default output should match output example in "examples" directory. |br| * DataDog consumer should use API v2 for to send data.
        - 8-23-22

      * - 1.30.0
        - Updated the documentation for Telemetry Streaming v1.30.0. This release contains the following resolved issues: |br| * Add support for numerical enums, enhance SNMP metrics processing `GitHub #207 <https://github.com/F5Networks/f5-telemetry-streaming/issues/207>`_ |br| * Created separate Azure Logs tables for pool members and  removed that data from the pool tables.
        - 7-15-22        
  
      * - 1.29.0
        - Updated the documentation for Telemetry Streaming v1.29.0. This release contains the following changes: |br| * Added support for querying SNMP using a custom endpoint (see :ref:`SNMP example<snmpep>`) |br| * Added outputMode parameter to Generic HTTP consumer to support raw data output (see :ref:`Generic HTTP<http-ref>`) |br| |br| Issues Resolved: |br| * Metric Consumers should not fail when 'null' found in data |br| * Prometheus consumer should ignore NaN values
        - 5-31-22

      * - 1.28.0
        - Updated the documentation for Telemetry Streaming v1.28.0. This release contains the following changes: |br| * Increased number of messages in a single PutLogEvents command for AWS Logs consumer and added retry logic for InvalidSequenceTokenException, `GitHub #191 <https://github.com/F5Networks/f5-telemetry-streaming/issues/191>`_ |br| * Updated the path to stored declarations, and noted that qkview now has access to the Declaration History file (see :ref:`Stored Declarations<save>`)
        - 4-19-22

      * - 1.27.1
        - Released Telemetry Streaming v1.27.1 as a LTS (Long Term Support) version. See the Telemetry Streaming |supportmd| for information about the Telemetry Streaming support policy.
        - 4-19-22

      * - 1.27.0
        - Updated the documentation for Telemetry Streaming v1.27.0. This release contains the following changes: |br| * Telemetry Streaming now stores up to 30 of the most recent declarations (see :ref:`Stored Declarations<save>`) |br| * Verified support for ElasticSearch 8 (see :ref:`ElasticSearch<elasticsearch-ref>`) |br| * Removed the experimental label from the OpenTelemetry Exporter consumer (see :ref:`OpenTelemetry<opent>`) |br| * Updated the DataDog consumer to use the v2 logs API |br| * TS now closes the tracer by timeout when inactive |br| |br| Issues Resolved: |br| * Added additional sanitation to StatsD metric and tag naming, `GitHub #184 <https://github.com/F5Networks/f5-telemetry-streaming/issues/184>`_ |br| * RegEx catastrophic backtracking on attempt to mask secrets in JSON data |br| * Added info about installed ASM attack signatures to output (see :ref:`System Information<sysinfo>`, `GitHub #174 <https://github.com/F5Networks/f5-telemetry-streaming/issues/174>`_)
        - 3-8-22

      * - 1.26.0
        - Updated the documentation for Telemetry Streaming v1.26.0. This release contains the following changes: |br| * Added the **fqdn** property to the output for pool members that use FQDNs (see :ref:`System Information<sysinfo>`) |br| * Added two new sections to :doc:`troubleshooting` for logging and tracing 
        - 1-25-22

      * - 1.25.0
        - Updated the documentation for Telemetry Streaming v1.25.0. This release contains the following changes: |br| * Added support for IAM roles for Google Cloud Platform (see Google :ref:`Cloud Monitoring<gcmiam>` and :ref:`Cloud Logging<gcliam>`), `GitHub #154 <https://github.com/F5Networks/f5-telemetry-streaming/issues/154>`_ |br| * Added the **metricPrefix** (`GitHub #152 <https://github.com/F5Networks/f5-telemetry-streaming/issues/152>`_) and **customTags** (`GitHub #160 <https://github.com/F5Networks/f5-telemetry-streaming/issues/160>`_) properties to the DataDog consumer (see :ref:`DataDog<datadog>`) |br| * Added the **convertBooleansToMetrics** property to the DataDog, StatsD, and OpenTelemetry consumers (see :ref:`DataDog<datadog>`, :ref:`StatsD<statsd-ref>`, and :ref:`OpenTelemetry<opent>`) |br| * Added the **endpointUrl** property to AWS S3 and CloudWatch consumers (see :ref:`AWS S3<awss3-ref>` and :ref:`AWS CloudWatch<awscloud-ref>`), `GitHub #173 <https://github.com/F5Networks/f5-telemetry-streaming/issues/173>`_ |br| * Added **poolName** to pool member output (see :ref:`System Information<sysinfo>`), `GitHub #170 <https://github.com/F5Networks/f5-telemetry-streaming/issues/170>`_ |br| * Removed the experimental label from the autoTag property for StatsD (see :ref:`StatsD addTags<addtags>`) |br| * Removed the experimental label from Splunk multi-metric format (see :ref:`Splunk multi-metric<multi-metric>`)
        - 12-14-21

      * - 1.24.0
        - Updated the documentation for Telemetry Streaming v1.24.0. This release contains the following changes: |br| * Added the **region** and **service** properties for the DataDog consumer (see :ref:`DataDog<datadog>`) |br| * Removed the Experimental label from the DataDog consumer (see :ref:`DataDog<datadog>`) |br| * Added support for the **format** property for Azure Log Analytics (see :ref:`Azure Log Analytics<azure-ref>`) |br| * Added support for ElasticSearch 7 (see :ref:`ElasticSearch<elasticsearch-ref>`) |br| |br| Issues Resolved: |br| * Fixed an issue where Telemetry Streaming would not collect System Poller data if **bash** was disabled on the BIG-IP device. Properties that require the bash endpoint are now skipped if bash is not available on the target BIG-IP (see :ref:`System information<sysinfo>`).
        - 11-2-21

      * - 1.23.0
        - Updated the documentation for Telemetry Streaming v1.23.0. This release contains the following changes: |br| * Added a new EXPERIMENTAL Push consumer for OpenTelemetry Exporter (see :ref:`OpenTelemetry Exporter<opent>`) |br| * Added  **isAvailable** and **isEnabled** to virtual server output (see :ref:`System information output<sysinfo>`), `GitHub #152 <https://github.com/F5Networks/f5-telemetry-streaming/issues/152>`_ |br| * Added  **throughputPerformance** to System output (see :ref:`System information output<sysinfo>`), `GitHub #129 <https://github.com/F5Networks/f5-telemetry-streaming/issues/129>`_ |br| * Added the **compressionType** property to the experimental DataDog consumer (see :ref:`DataDog<datadog>`), `GitHub #157 <https://github.com/F5Networks/f5-telemetry-streaming/issues/157>`_  |br| * Added functionality to handle responses from iControlREST that contain duplicate JSON keys |br| * Added support for TS Namespaces (was experimental), see :doc:`namespaces` |br| * Added support for specifying fallback hosts for Generic HTTP consumers (was experimental) :ref:`Fallback hosts<fallback>` |br| |br| Issues Resolved: |br| * Fixed issue where Prometheus consumer did not return the correct Content-Type HTTP Header, `GitHub #148 <https://github.com/F5Networks/f5-telemetry-streaming/issues/148>`_ |br| * Fixed issue where asmState could report incorrect state value. asmState and lastAsmChange properties are now retrieved from iControlREST, `GitHub #151 <https://github.com/F5Networks/f5-telemetry-streaming/issues/151>`_
        - 9-21-21
     
      * - 1.22.0
        - Updated the documentation for Telemetry Streaming v1.22.0. This release contains the following changes: |br| * Added  **clientside.slowKilled** and **clientside.evictedConns** to virtual server output (see :ref:`System information output<sysinfo>`) |br| * Added a new Push consumer for Google Cloud Logging (see :ref:`Google Cloud Logging<gcl>`) |br| * Added a new EXPERIMENTAL Push consumer for DataDog (see :ref:`DataDog<datadog>`) |br| * Added the **reportInstanceMetadata** property for Google Cloud Monitoring to enable or disable metadata reporting (see :ref:`Google Cloud Monitoring<stackdrive>`) |br| * Added the **eventSchemaVersion** property to the F5 Cloud consumer (see :ref:`F5 Cloud consumer<f5cloud>`) |br| |br| Issues Resolved: |br| * Fixed issue where Prometheus consumer encounters an error when a metric name is registered more than once, `GitHub #134 <https://github.com/F5Networks/f5-telemetry-streaming/issues/134>`_ |br| * Fixed issue where the Kafka Consumer would create a new Kafka connection on each Telemetry Streaming payload |br| * Google Cloud Monitoring Consumer now uses instance_id and zone as time-series resource labels for BIG-IPs that run in Google Cloud (change in behavior) |br| * The default namespace (f5telemetry_default) is now stated explicitly in traceName and paths of the to the trace files (change in behavior) 
        - 8-9-21
 

      * - 1.20.1
        - Released Telemetry Streaming v1.20.1 as a LTS (Long Term Support) version. See the Telemetry Streaming |supportmd| for information about the Telemetry Streaming support policy.
        - 6-30-21
      
      * - 1.21.0
        - Updated the documentation for Telemetry Streaming v1.21.0. This release contains the following changes: |br| * An **experimental** property for the StatsD consumer (see :ref:`StatsD addTags<addtags>`) |br| * A number of minor bug fixes, stability enhancements, and foundational elements for some upcoming features. 
        - 6-28-21
      
      * - 1.20.0
        - Updated the documentation for Telemetry Streaming v1.20.0. This release contains the following changes: |br| * Added support for customizing the Telemetry Streaming payload (see :doc:`customizing-data` and the related :ref:`example<custompl>`) |br| * Added a new troubleshooting entry for writing an Event Listener's incoming raw data to a trace file (see :ref:`Troubleshooting<trace>`), also added a new note to the description of :doc:`event-listener` about tracing. |br| * Added data tracing and 'success' message to Google Cloud Monitoring consumer  |br| * Added system.configSyncSucceeded to default output and f5_system_configSyncSucceeded to Prometheus output, `GitHub #74 <https://github.com/F5Networks/f5-telemetry-streaming/issues/74>`_ |br| * Added Capacity_Float to system.diskStorage, `GitHub #119 <https://github.com/F5Networks/f5-telemetry-streaming/issues/119>`_ |br| |br| Issues Resolved: |br| * Fixed issue where 'long' fields in ASM events were causing ASM events to become malformed. Individual event fields are now permitted to be <= MAX_BUFFER_SIZE (16k), `GitHub #127 <https://github.com/F5Networks/f5-telemetry-streaming/issues/127>`_ |br| * AWS S3 date path was incorrect |br| * Should not create multiple Tracer instances that point to the same file
        - 5-18-21

      * - 1.19.0
        - Updated the documentation for Telemetry Streaming v1.19.0. This release contains the following changes: |br| * Added a new troubleshooting entry providing memory threshold information (see :ref:`Memory Threshold<memory>`) |br| * Added new Event Listener endpoints for sending debug messages to an Event Listener (see :ref:`Event Listener endpoints<eventlistenerdata>`) |br| * Updated the :ref:`Splunk Consumer<splunk-ref>` documentation with the new **compressionType** property, and added a related troubleshooting entry (see :ref:`Troubleshooting<splunkmem>`)  |br| * **totNativeConns** and **totCompatConns** are now exposed on SSL profile stats |br| * Added the **swap** metric to the **system** group (System Poller output), see :ref:`System Information<sysinfo>`) |br| * Trace full payload now sent to StatsD Consumer |br| * System Poller recurring scheduling changed so that System Poller executions do not overlap |br| * Added a note to :ref:`iHealth Poller<ihealthpoller>` stating it must be attached to a System |br| * Added a bullet item to :ref:`About Pull Consumer<aboutpull>` stating if a poller was attached to two systems, the response contains data from both |br| * Added a note to the Important  list for :doc:`Namespaces<namespaces>` about naming objects |br| |br| Issues Resolved: |br| * Fixed Route Domain ID handling for Virtual Server and Pool stats |br| * Splunk debug output does not log HTTP Response payload, `GitHub #109 <https://github.com/F5Networks/f5-telemetry-streaming/issues/109>`_ |br| * Update example output for maxConns, pktsIn, pktsOut, and totConns |br| * Tracer unable to access destination directory |br| * Tracer(s) from other namespaces should not stop when namespace-only declaration posted |br| * Removed excessive data formatting from tracer
        - 4-6-21
  
      * - Unreleased
        - This documentation only update contains the following change: |br| * Updated the note in :ref:`Splunk multi-metric format<multi-metric>` to add that custom endpoints are not supported with multi-metric format (added the same note to :doc:`custom-endpoints`).
        - 3-1-21
     
      * - 1.18.0
        - Updated the documentation for Telemetry Streaming v1.18.0. This release contains the following changes: |br| * Added new endpoints for individual namespaces (see :ref:`Namespace endpoints<namespaceEP>`) |br| * Added support for TLS client authentication for the Generic HTTP consumer (see the :ref:`TLS Client example<httptls>` and the :ref:`Generic HTTP consumer page<http-ref>`) |br| * Added response logging to Event Listener page (see :ref:`LTM Request Log profile<requestlog>` and the updated :ref:`AS3 Logging example<as3logging-ref>`)  |br| * Added a note to the :ref:`Splunk consumer<splunk-ref>` and a new section in Custom Endpoints for :ref:`Including hostname information<hostname>`  (`GitHub #107 <https://github.com/F5Networks/f5-telemetry-streaming/issues/107>`_)  |br| * Added a note to :ref:`awscloud-ref` and :ref:`awss3-ref` about root certificates for AWS services being embedded within Telemetry Streaming  |br| |br| Issues Resolved: |br| * Fix Event Listener startup errors that might cause restnoded to crash |br| * Splunk multiEvent format should ignore 'References'
        - 2-23-21

      * - 1.17.0
        - Updated the documentation for Telemetry Streaming v1.17.0. This release contains the following changes: |br| * Added support for configuring proxy settings on Generic HTTP consumers, `GitHub #92 <https://github.com/F5Networks/f5-telemetry-streaming/issues/92>`_ (see :ref:`proxy`) |br| * Added support for configuring proxy settings on Splunk consumers, `GitHub #85 <https://github.com/F5Networks/f5-telemetry-streaming/issues/85>`_ (see :ref:`splunkproxy`) |br| * Added a timestamp for APM Request Log output, `GitHub #91 <https://github.com/F5Networks/f5-telemetry-streaming/issues/91>`_  (see :ref:`APM Request Log<apm-rl>`) |br| * Added support for TLS client authentication to the Kafka consumer, `GitHub #90 <https://github.com/F5Networks/f5-telemetry-streaming/issues/90>`_ (see :ref:`kafka-ref`) |br| * Added an F5 Internal Only push consumer for F5 Cloud (see :ref:`F5 Cloud<f5cloud>`) |br| * Added the ability to use the Splunk multi-metric format, currently EXPERIMENTAL (see :ref:`multi-metric`) |br| * Added a new reference for the Telemetry Streaming Default Output (see :ref:`Default Output Appendix<poller-default-output-reference>`) |br| * Tracefile now stores up to 10 items |br| * Added a note to the System Information output page stating there is new pool and virtual server information collected (see :ref:`System Information<sysinfo>`) |br| * Deprecated TS support for the :ref:`Splunk Legacy Format<splunk-legacy>` |br| * Posting a declaration while a previous declaration is still processing now returns an HTTP 503 status code |br| |br| Issues Resolved: |br| * Fixed error where unavailable Custom Endpoint would return HTTP 500
        - 1-12-20

      * - 1.16.0
        - Updated the documentation for Telemetry Streaming v1.16.0. This release contains the following changes: |br| * Added support for the Telemetry_Namespace class in declarations posted to the /declare endpoint (see :doc:`namespaces`) |br| * Added new Namespace PullConsumer endpoint (see :doc:`namespaces`) |br| * Added support for Custom Endpoints.  Moved the Custom Endpoint page from an Appendix to Using Telemetry Streaming (see :doc:`custom-endpoints`) |br| * TS now includes _ResourceId if available for Azure Log Analytics consumer, and metadata calls are now only happening upon consumer(s) load |br| *  |br| |br| Issues Resolved: |br| * Fixed issue when TS incorrectly processing iRule stats with multiple events
        - 11-20-20

      * - 1.15.0
        - Updated the documentation for Telemetry Streaming v1.15.0. This release contains the following changes: |br| * Updated the default hostname for the StatsD consumer (see the Important note in :ref:`statsd-ref`) |br| * Added a note to the :ref:`prometheus` consumer on how to access the consumer endpoint with a user other than **admin** |br| * Added a new FAQ entry on why you may see a decrease in some pool statistics (see :ref:`Pool Statistics<pool-stats>`)  |br| |br| Issues Resolved: |br| * Fixed syslog event hostname parsing for VCMP hosts |br| * Resolve memory leak in ElasticSearch consumer, by replacing 'elasticsearch' library with 'request' library
        - 10-13-20

      * - 1.14.0
        - Updated the documentation for Telemetry Streaming v1.14.0. This release contains the following changes: |br| * Added support for AWS CloudWatch Metrics (see :ref:`cw-metrics`) |br| * Added an EXPERIMENTAL feature to specify fallback hosts for generic HTTP consumers (see :ref:`fallback`) |br| * Added **cipherUses** stats for Client and Server SSL profiles (see the cipherUses lines in :ref:`sysinfo`) |br| * Added a troubleshooting entry for a restjavad issue (see :ref:`restjavad`) |br| * Added a note to the :doc:`avr` page about AVR caveats with TS and BIG-IQ (see the :ref:`AVR note<avr-note>`) |br| * Updated the introduction for the experimental :doc:`custom-endpoints` |br| * Added support for BIG-IP 16.0  |br| |br| Issues Resolved: |br| * Fixed Event Listener parsing when receiving multiple events
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

.. |supportmd| raw:: html

   <a href="https://github.com/F5Networks/f5-telemetry-streaming/blob/master/SUPPORT.md" target="_blank">Support information on GitHub</a>