.. _schema-reference:

Appendix A: Schema Reference
============================
This page is a reference for the objects you can use in your Declarations for Telemetry Streaming. For more information on BIG-IP objects and terminology, see the BIG-IP documentation at https://support.f5.com/csp/home.
Please note: this reference document is currently a work in progress.

allowSelfSignedCert
-------------------

*No description provided*

No properties


constants
---------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **class** (*string*)
        - -
        - "Constants"
        - Telemetry streaming constants class

Controls
--------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **class** (*string*)
        - -
        - "Controls"
        - Telemetry Streaming Controls class
      * - **debug** (*boolean*)
        - false
        - true, false
        - -
      * - **listenerMode** (*string*)
        - -
        - "buffer", "string"
        - Event Listener events parsing mode. "buffer" is more performant but under the high memory usage events may result in OOM. "string" is less performant but more chance to have lower RSS
      * - **listenerStrategy** (*string*)
        - -
        - "drop", "ring"
        - Event Listener events buffering strategy. "drop" drops all new chunks of data, but keeps pending data to process - less memory usage but loosing data. "ring" keeps buffering data by overriding peding data - higher memory usage but less chance to get data lost.
      * - **logLevel** (*string*)
        - "info"
        - "verbose", "debug", "info", "error"
        - -
      * - **memoryMonitor** (*Controls_memoryMonitor*)
        - -
        - -
        - Memory Monitor configuration options allow configuring thresholds for various parameters to help Telemetry Streaming avoid extreme conditions like Out-Of-Memory.
      * - **memoryThresholdPercent** (*integer*)
        - 90
        - [1, 100]
        - Once memory usage reaches this value, processing may temporarily cease until levels return below threshold. Defaults to 90%
      * - **runtime** (*Controls_runtime*)
        - -
        - -
        - Runtime Configuration Options (V8). Allows to tune the V8 configuration. EXPERIMENTAL!

Controls_memoryMonitor
----------------------

Controls memoryMonitor possible properties

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **interval** (*reference*)
        - "default"
        - -
        - -
      * - **logFrequency** (*integer*)
        - 10
        - [1, infinity]
        - Number of seconds to use to log information about memory usage. Defaults to 10 sec.
      * - **logLevel** (*logLevel*)
        - "debug"
        - -
        - Logging Level to use to log information about memory usage. Defaults to "debug"
      * - **memoryThresholdPercent** (*integer*)
        - -
        - [1, 100]
        - Once memory usage reaches this value, processing may temporarily cease until levels return below threshold * "thresholdReleasePercent". Defaults to 90%. NOTE: the property is the same as the one from parent object but it take precedens over the parent's one if specified.
      * - **osFreeMemory** (*integer*)
        - 30
        - [1, infinity]
        - Amount of OS Free memory (in MB) below that processing may temporarily ceasae until levels return above theshold. Defaults to 30 MB.
      * - **provisionedMemory** (*integer*)
        - -
        - [1, infinity]
        - Amount of Memory in MB. that application should not exceed. Once limit exceed, processing may temporarily cease until levels return below threshold. Defaults to the 'runtime.maxHeapSize' value. Maximum should not exceed 'runtime.maxHeapSize'.
      * - **thresholdReleasePercent** (*integer*)
        - 90
        - [1, 100]
        - Once memory usage reaches value described in "memoryThresholdPercent", processing may temporarily cease until levels return below threshold * "thresholdReleasePercent". Defaults to 90%.

Controls_runtime
----------------

Controls runtime possible properties

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **enableGC** (*boolean*)
        - false
        - true, false
        - Grants Telemetry Streaming access to the V8 garbage collector, which helps Telemetry Streaming cleanup memory when usage exceeds thresholds. EXPERIMENTAL!
      * - **httpTimeout** (*number*)
        - 60
        - -
        - Increases the timeout value in seconds for incoming REST API HTTP requests that allows Telemetry Streaming to avoid TimeoutException error for long lasting operations. Defaults to 60 seconds. EXPERIMENTAL!
      * - **maxHeapSize** (*number*)
        - 1400
        - -
        - Increases V8 maximum heap size to enable more memory usage and prevent Heap-Out-Of-Memory error. EXPERIMENTAL!

enable
------

This property can be used to enable/disable the poller/listener

No properties


enableHostConnectivityCheck
---------------------------

*No description provided*

No properties


host
----

*No description provided*

No properties


match
-----

*No description provided*

No properties


port
----

*No description provided*

No properties


protocol
--------

*No description provided*

Type string with possible values:
"http", "https"

proxy
-----

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **allowSelfSignedCert** (*allowSelfSignedCert*)
        - -
        - -
        - -
      * - **enableHostConnectivityCheck** (*enableHostConnectivityCheck*)
        - -
        - -
        - -
      * - **host** (*host*)
        - -
        - -
        - -
      * - **passphrase** (*secret*)
        - -
        - -
        - -
      * - **port** (*port*)
        - 80
        - -
        - -
      * - **protocol** (*protocol*)
        - "http"
        - -
        - -
      * - **username** (*username*)
        - -
        - -
        - -

secret
------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **cipherText** (*string*)
        - -
        - -
        - -
      * - **class** (*string*)
        - "Secret"
        - "Secret"
        - Telemetry streaming secret class
      * - **environmentVar** (*string*)
        - -
        - -
        - -
      * - **protected** (*string*)
        - "plainText"
        - "plainText", "plainBase64", "SecureVault"
        - -

Shared
------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **class** (*string*)
        - -
        - "Shared"
        - Telemetry streaming Shared class

stringOrSecret
--------------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **cipherText** (*string*)
        - -
        - -
        - -
      * - **class** (*string*)
        - "Secret"
        - "Secret"
        - Telemetry streaming secret class
      * - **environmentVar** (*string*)
        - -
        - -
        - -
      * - **protected** (*string*)
        - "plainText"
        - "plainText", "plainBase64", "SecureVault"
        - -

tag
---

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **application** (*string*)
        - -
        - -
        - -
      * - **tenant** (*string*)
        - -
        - -
        - -

Telemetry
---------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **$schema** (*string*)
        - -
        - -
        - -
      * - **class** (*string*)
        - -
        - "Telemetry"
        - Telemetry streaming top level class
      * - **schemaVersion** (*string*)
        - "1.36.0"
        - "1.36.0", "1.35.0", "1.34.0", "1.33.0", "1.32.0", "1.31.0", "1.30.0", "1.29.0", "1.28.0", "1.27.1", "1.27.0", "1.26.0", "1.25.0", "1.24.0", "1.23.0", "1.22.0", "1.21.0", "1.20.1", "1.20.0", "1.19.0", "1.18.0", "1.17.0", "1.16.0", "1.15.0", "1.14.0", "1.13.0", "1.12.0", "1.11.0", "1.10.0", "1.9.0", "1.8.0", "1.7.0", "1.6.0", "1.5.0", "1.4.0", "1.3.0", "1.2.0", "1.1.0", "1.0.0", "0.9.0"
        - Version of ADC Declaration schema this declaration uses

Telemetry_Consumer
------------------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **actions** (*reference*)
        - -
        - -
        - -
      * - **addTags** (*reference*)
        - -
        - -
        - -
      * - **allowSelfSignedCert** (*boolean*)
        - false
        - true, false
        - -
      * - **apiKey** (*reference*)
        - -
        - -
        - -
      * - **apiVersion** (*reference*)
        - -
        - -
        - -
      * - **appInsightsResourceName** (*reference*)
        - -
        - -
        - -
      * - **authenticationProtocol** (*reference*)
        - -
        - -
        - -
      * - **bucket** (*reference*)
        - -
        - -
        - -
      * - **class** (*string*)
        - -
        - "Telemetry_Consumer"
        - Telemetry Streaming Consumer class
      * - **clientCertificate** (*reference*)
        - -
        - -
        - -
      * - **compressionType** (*reference*)
        - -
        - -
        - -
      * - **convertBooleansToMetrics** (*reference*)
        - -
        - -
        - -
      * - **customOpts** (*reference*)
        - -
        - -
        - -
      * - **customTags** (*reference*)
        - -
        - -
        - -
      * - **dataType** (*reference*)
        - -
        - -
        - -
      * - **enable** (*boolean*)
        - true
        - true, false
        - This property can be used to enable/disable the poller/listener
      * - **enableHostConnectivityCheck** (*boolean*)
        - -
        - true, false
        - -
      * - **endpointUrl** (*reference*)
        - -
        - -
        - -
      * - **eventSchemaVersion** (*reference*)
        - -
        - -
        - -
      * - **exporter** (*reference*)
        - -
        - -
        - -
      * - **f5csSensorId** (*reference*)
        - -
        - -
        - -
      * - **f5csTenantId** (*reference*)
        - -
        - -
        - -
      * - **fallbackHosts** (*reference*)
        - -
        - -
        - -
      * - **format** (*reference*)
        - -
        - -
        - -
      * - **headers** (*reference*)
        - -
        - -
        - -
      * - **host** (*reference*)
        - -
        - -
        - -
      * - **index** (*reference*)
        - -
        - -
        - -
      * - **instrumentationKey** (*reference*)
        - -
        - -
        - -
      * - **logGroup** (*reference*)
        - -
        - -
        - -
      * - **logId** (*reference*)
        - -
        - -
        - -
      * - **logScope** (*reference*)
        - -
        - -
        - -
      * - **logScopeId** (*reference*)
        - -
        - -
        - -
      * - **logStream** (*reference*)
        - -
        - -
        - -
      * - **managementEndpointUrl** (*reference*)
        - -
        - -
        - -
      * - **maxAwsLogBatchSize** (*reference*)
        - -
        - -
        - -
      * - **maxBatchIntervalMs** (*reference*)
        - -
        - -
        - -
      * - **maxBatchSize** (*reference*)
        - -
        - -
        - -
      * - **method** (*reference*)
        - -
        - -
        - -
      * - **metricNamespace** (*reference*)
        - -
        - -
        - -
      * - **metricPrefix** (*reference*)
        - -
        - -
        - -
      * - **metricsPath** (*reference*)
        - -
        - -
        - -
      * - **odsOpinsightsEndpointUrl** (*reference*)
        - -
        - -
        - -
      * - **outputMode** (*reference*)
        - -
        - -
        - -
      * - **partitionerType** (*reference*)
        - -
        - -
        - -
      * - **partitionKey** (*reference*)
        - -
        - -
        - -
      * - **passphrase** (*reference*)
        - -
        - -
        - -
      * - **path** (*reference*)
        - -
        - -
        - -
      * - **payloadSchemaNid** (*reference*)
        - -
        - -
        - -
      * - **port** (*reference*)
        - -
        - -
        - -
      * - **privateKey** (*reference*)
        - -
        - -
        - -
      * - **privateKeyId** (*reference*)
        - -
        - -
        - -
      * - **projectId** (*reference*)
        - -
        - -
        - -
      * - **protocol** (*reference*)
        - -
        - -
        - -
      * - **proxy** (*reference*)
        - -
        - -
        - -
      * - **region** (*reference*)
        - -
        - -
        - -
      * - **reportInstanceMetadata** (*reference*)
        - -
        - -
        - -
      * - **rootCertificate** (*reference*)
        - -
        - -
        - -
      * - **service** (*reference*)
        - -
        - -
        - -
      * - **serviceAccount** (*reference*)
        - -
        - -
        - -
      * - **serviceEmail** (*reference*)
        - -
        - -
        - -
      * - **targetAudience** (*reference*)
        - -
        - -
        - -
      * - **topic** (*reference*)
        - -
        - -
        - -
      * - **trace** (*boolean | string*)
        - -
        - true, false
        - Enables data dumping to file. Boolean uses pre-defined file location, however value could be a string which contains path to a specific file instead
      * - **type** (*string*)
        - -
        - "AWS_CloudWatch", "AWS_S3", "Azure_Log_Analytics", "Azure_Application_Insights", "DataDog", "default", "ElasticSearch", "Generic_HTTP", "Google_Cloud_Logging", "Google_Cloud_Monitoring", "Google_StackDriver", "Graphite", "Kafka", "OpenTelemetry_Exporter", "Splunk", "Statsd", "Sumo_Logic", "F5_Cloud"
        - -
      * - **useManagedIdentity** (*reference*)
        - -
        - -
        - -
      * - **username** (*reference*)
        - -
        - -
        - -
      * - **useServiceAccountToken** (*reference*)
        - -
        - -
        - -
      * - **useSSL** (*reference*)
        - -
        - -
        - -
      * - **workspaceId** (*reference*)
        - -
        - -
        - -

Telemetry_Endpoints
-------------------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **basePath** (*reference*)
        - -
        - -
        - -
      * - **class** (*string*)
        - -
        - "Telemetry_Endpoints"
        - Telemetry Streaming Endpoints class
      * - **enable** (*reference*)
        - -
        - -
        - -
      * - **items** (*reference*)
        - -
        - -
        - -

Telemetry_iHealth_Poller
------------------------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **class** (*string*)
        - -
        - "Telemetry_iHealth_Poller"
        - Telemetry Streaming iHealth Poller class
      * - **downloadFolder** (*reference*)
        - -
        - -
        - -
      * - **enable** (*reference*)
        - -
        - -
        - -
      * - **interval** (*reference*)
        - -
        - -
        - -
      * - **passphrase** (*reference*)
        - -
        - -
        - -
      * - **proxy** (*reference*)
        - -
        - -
        - -
      * - **trace** (*reference*)
        - -
        - -
        - -
      * - **username** (*reference*)
        - -
        - -
        - -

Telemetry_Listener
------------------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **actions** (*baseActionsChain | reference*)
        - [object Object]
        - -
        - -
      * - **class** (*string*)
        - -
        - "Telemetry_Listener"
        - Telemetry Streaming Event Listener class
      * - **enable** (*boolean*)
        - true
        - true, false
        - This property can be used to enable/disable the poller/listener
      * - **match** (*string*)
        - ""
        - -
        - -
      * - **port** (*integer*)
        - 8100
        - [0, 65535]
        - -
      * - **tag** (*Telemetry_Listener_tag*)
        - -
        - -
        - -
      * - **trace** (*boolean | string*)
        - -
        - true, false
        - Enables data dumping to file. Boolean uses pre-defined file location, however value could be a string which contains path to a specific file instead

Telemetry_Listener_tag
----------------------

Telemetry_Listener tag possible properties

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **application** (*string*)
        - -
        - -
        - -
      * - **tenant** (*string*)
        - -
        - -
        - -

Telemetry_Namespace
-------------------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **class** (*string*)
        - -
        - "Telemetry_Namespace"
        - Telemetry Streaming Namespace class

Telemetry_Pull_Consumer
-----------------------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **class** (*string*)
        - -
        - "Telemetry_Pull_Consumer"
        - Telemetry Streaming Pull Consumer class
      * - **enable** (*boolean*)
        - true
        - true, false
        - This property can be used to enable/disable the poller/listener
      * - **systemPoller** (*systemPollerPointerRef | array<systemPollerPointerRef>*)
        - -
        - -
        - -
      * - **trace** (*boolean | string*)
        - -
        - true, false
        - Enables data dumping to file. Boolean uses pre-defined file location, however value could be a string which contains path to a specific file instead
      * - **type** (*string*)
        - -
        - "default", "Prometheus"
        - -

Telemetry_System
----------------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **allowSelfSignedCert** (*boolean*)
        - false
        - true, false
        - -
      * - **class** (*string*)
        - -
        - "Telemetry_System"
        - Telemetry Streaming System class
      * - **enable** (*boolean*)
        - true
        - true, false
        - This property can be used to enable/disable the poller/listener
      * - **enableHostConnectivityCheck** (*boolean*)
        - -
        - true, false
        - -
      * - **host** (*string*)
        - "localhost"
        - -
        - -
      * - **iHealthPoller** (*Telemetry_System_iHealthPoller*)
        - -
        - -
        - -
      * - **passphrase** (*Telemetry_System_passphrase*)
        - -
        - -
        - -
      * - **port** (*integer*)
        - 8100
        - [0, 65535]
        - -
      * - **protocol** (*string*)
        - "http"
        - "http", "https"
        - -
      * - **systemPoller** (*Telemetry_System_systemPoller*)
        - -
        - -
        - -
      * - **trace** (*boolean | string*)
        - -
        - true, false
        - Enables data dumping to file. Boolean uses pre-defined file location, however value could be a string which contains path to a specific file instead
      * - **username** (*string*)
        - -
        - -
        - -

Telemetry_System_iHealthPoller
------------------------------

Telemetry_System iHealthPoller possible properties

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **downloadFolder** (*string*)
        - -
        - -
        - -
      * - **enable** (*enable*)
        - true
        - -
        - -
      * - **interval** (*object*)
        - -
        - -
        - -
      * - **passphrase** (*secret*)
        - -
        - -
        - -
      * - **proxy** (*proxy*)
        - -
        - -
        - -
      * - **trace** (*trace*)
        - false
        - -
        - -
      * - **username** (*username*)
        - -
        - -
        - -

Telemetry_System_passphrase
---------------------------

Telemetry_System passphrase possible properties

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **cipherText** (*string*)
        - -
        - -
        - -
      * - **class** (*string*)
        - "Secret"
        - "Secret"
        - Telemetry streaming secret class
      * - **environmentVar** (*string*)
        - -
        - -
        - -
      * - **protected** (*string*)
        - "plainText"
        - "plainText", "plainBase64", "SecureVault"
        - -

Telemetry_System_systemPoller
-----------------------------

Telemetry_System systemPoller possible properties

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **actions** (*inputDataStreamActionsChain*)
        - [object Object]
        - -
        - Actions to be performed on the systemPoller.
      * - **chunkSize** (*integer*)
        - 30
        - [1, infinity]
        - The maximum number of items to fetch at a time for a given endpoint. Requests with reduced response size can help improve CPU/memory utilization.
      * - **enable** (*enable*)
        - true
        - -
        - -
      * - **endpointList** (*array<endpointsPointerRef | endpointsItemPointerRef | endpointsObjectRef | endpointObjectRef> | endpointsPointerRef | endpointsObjectRef*)
        - -
        - -
        - List of endpoints to use in data collection
      * - **httpAgentOpts** (*array*)
        - -
        - -
        - Additional http agent options to use
      * - **interval** (*integer*)
        - 300
        - [-infinity, infinity]
        - If endpointList is specified, minimum=1. Without endpointList, minimum=60 and maximum=60000. Allows setting interval=0 to not poll on an interval.
      * - **tag** (*tag*)
        - -
        - -
        - -
      * - **trace** (*trace*)
        - -
        - -
        - -
      * - **workers** (*integer*)
        - 5
        - [1, infinity]
        - Number of workers to create, which affects processing of simultaneous requests to device.

Telemetry_System_Poller
-----------------------

*No description provided*

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **actions** (*reference*)
        - -
        - -
        - -
      * - **allowSelfSignedCert** (*boolean*)
        - false
        - true, false
        - -
      * - **chunkSize** (*reference*)
        - -
        - -
        - -
      * - **class** (*string*)
        - -
        - "Telemetry_System_Poller"
        - Telemetry Streaming System Poller class
      * - **enable** (*reference*)
        - -
        - -
        - -
      * - **enableHostConnectivityCheck** (*boolean*)
        - -
        - true, false
        - -
      * - **endpointList** (*reference*)
        - -
        - -
        - -
      * - **host** (*string*)
        - "localhost"
        - -
        - -
      * - **httpAgentOpts** (*reference*)
        - -
        - -
        - -
      * - **interval** (*reference*)
        - -
        - -
        - -
      * - **passphrase** (*Telemetry_System_Poller_passphrase*)
        - -
        - -
        - -
      * - **port** (*integer*)
        - 8100
        - [0, 65535]
        - -
      * - **protocol** (*string*)
        - "http"
        - "http", "https"
        - -
      * - **tag** (*reference*)
        - -
        - -
        - -
      * - **trace** (*reference*)
        - -
        - -
        - -
      * - **username** (*string*)
        - -
        - -
        - -
      * - **workers** (*reference*)
        - -
        - -
        - -

Telemetry_System_Poller_passphrase
----------------------------------

Telemetry_System_Poller passphrase possible properties

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **cipherText** (*string*)
        - -
        - -
        - -
      * - **class** (*string*)
        - "Secret"
        - "Secret"
        - Telemetry streaming secret class
      * - **environmentVar** (*string*)
        - -
        - -
        - -
      * - **protected** (*string*)
        - "plainText"
        - "plainText", "plainBase64", "SecureVault"
        - -

trace
-----

Enables data dumping to file. Boolean uses pre-defined file location, however value could be a string which contains path to a specific file instead

No properties


traceConfig
-----------

Enables data dumping to file. Boolean uses pre-defined file location, however value could be a string which contains path to a specific file instead

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **path** (*string*)
        - -
        - -
        - Path to trace file to write data to
      * - **type** (*string*)
        - -
        - "output", "input"
        - Trace type - output data or input data

traceV2
-------

Enables data dumping to file. Boolean uses pre-defined file location, however value could be a string which contains path to a specific file instead

**Properties:**

.. list-table::
      :widths: 20 15 15 50
      :header-rows: 1

      * - Name (Type)
        - Default
        - Values
        - Description
      * - **path** (*string*)
        - -
        - -
        - Path to trace file to write data to
      * - **type** (*string*)
        - -
        - "output", "input"
        - Trace type - output data or input data

username
--------

*No description provided*

No properties

