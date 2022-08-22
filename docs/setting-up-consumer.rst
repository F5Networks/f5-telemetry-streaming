.. _settingupconsumer-ref:

Push Consumers
==============

Use this section to find example declarations and notes for supported push-based consumers. See :doc:`pull-consumers` for pull-based consumers.

.. IMPORTANT:: Each of the following examples shows only the **Consumer** class of a declaration and must be included with the rest of the base declaration (see :ref:`components`).

Use the index on the right to locate a specific consumer.

|

.. _splunk-ref:

Splunk
------
|splunk_img|

Required information:
 - Host: The address of the Splunk instance that runs the HTTP event collector (HEC).
 - Protocol: Check if TLS is enabled within the HEC settings :guilabel:`Settings > Data Inputs > HTTP Event Collector`.
 - Port: Default is 8088, this can be configured within the Global Settings section of the Splunk HEC.
 - API Key: An API key must be created and provided in the passphrase object of the declaration, refer to Splunk documentation for the correct way to create an HEC token.

If you want to specify proxy settings for Splunk consumers in TS 1.17 and later, see the :ref:`Splunk Proxy<splunkproxy>` example.

.. NOTE:: When using the :doc:`custom endpoints feature<custom-endpoints>`, be sure to include **/mgmt/tm/sys/global-settings** in your endpoints for Telemetry Streaming to be able to find the hostname.

Additions to the Splunk consumer
````````````````````````````````
The following items have been added to the Splunk consumer since it was introduced.

.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description
  
      * - 1.19
        - **compressionType**
        - Sets the type of compression.  Be sure to see :ref:`Memory usage spikes<splunkmem>` in the Troubleshooting section for information on the **compressionType** property. When set to **none**, this property stops TS from compressing data before sending it to Splunk, which can help reduce memory usage.


**IMPORTANT**: The following declaration includes the additional properties shown in the table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line(s), and the comma from the previous line. 


Example Declaration:

.. literalinclude:: ../examples/declarations/splunk.json
    :language: json
    :emphasize-lines: 11, 12

|

.. _splunk-legacy:

Splunk Legacy format (Deprecated)
`````````````````````````````````
.. IMPORTANT:: The Splunk Legacy format has been deprecated as of Telemetry Streaming 1.17, and has entered maintenance mode. This means there will be no further TS development for the Splunk Legacy format. |br| We recommend using the :ref:`Splunk default format<splunk-ref>`, or :ref:`multi-metric`.

The **format** property can be set to **legacy** for Splunk users who wish to convert the stats output similar to the |splunk app|. To see more information, see |Analytics|. To see more information about using the HEC, see |HEC|.  See the following example.

To poll for any data involving **tmstats** you must have a Splunk consumer with the legacy format as described in this section.  This includes GET requests to the SystemPoller API because the data is not pulled unless it is a legacy Splunk consumer. |br| |br| Telemetry Streaming 1.7.0 and later gathers additional data from tmstats tables to improve compatibility with Splunk Legacy consumers.

In Telemetry Streaming v1.6.0 and later, you must use the **facility** parameter with the legacy format to specify a Splunk facility in your declarations.  The facility parameter is for identification of location/facility in which the BIG-IP is located (such as 'Main Data Center', 'AWS', or 'NYC'). 

If a Splunk Consumer is configured with the legacy format, then it ignores events from Event Listener.

Required information for **facility**: 
  - The facility parameter must be inside of **actions** and then **setTag** as shown in the example.
  - The value for **facility** is arbitrary, but must be a string.
  - The **locations** property must include ``"system": true``, as that is where facility is expected.
  - The value for facility is required when the format is legacy (required by the Splunk F5 Dashboard application; a declaration without it will still succeed)
  
Example Declaration for Legacy (including facility):

.. literalinclude:: ../examples/declarations/splunk_legacy.json
    :language: json

|

.. _multi-metric:

Splunk multi-metric format
``````````````````````````
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Splunk multi-metric format is available in TS v1.17 and later, and requires Splunk 8.0.0 or later.

.. IMPORTANT:: Splunk multi-metric format requires Splunk version 8.0.0 or later.

Telemetry Streaming 1.17 introduced the ability to use Splunk multi-metric format (experimental in TS 1.17-1.24) for Splunk 8.0.0 and later.  Splunk multi-metric format allows each JSON object to contain measurements for multiple metrics, which generate multiple-measurement metric data points, taking up less space on disk and improving search performance.

See the |splunkmm| for more information.

.. WARNING:: Only canonical (default) system poller output is supported. Custom endpoints are NOT supported with the multi-metric format.

To use this feature, the **format** of the Splunk Telemetry_Consumer must be set to **multiMetric** as shown in the example.

Example Declaration for Splunk multi-metric:

.. literalinclude:: ../examples/declarations/splunk_multi_metric.json
    :language: json

|

.. _azure-ref:

Microsoft Azure Log Analytics
-----------------------------
|azure_img|

Required Information:
 - Workspace ID: Navigate to :guilabel:`Log Analytics workspace > [your workspace] > Agents Management > Workspace ID`.
 - Shared Key: Navigate to :guilabel:`Log Analytics workspace > [your workspace] > Agents Management > Primary key`.

.. IMPORTANT:: The Azure Log Analytics Consumer only supports sending 500 items. Each configuration item (such as virtual server, pool, node) uses part of this limit.

Additions to the Azure Log Analytics consumer
`````````````````````````````````````````````
The following items have been added to the Azure Log Analytics consumer since it was introduced.

.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description
  
      * - 1.24
        - **format**
        - This was added to reduce the number of columns in the output which prevents a potential Azure error stating ``Data of Type F5Telemetry was dropped because number of field is above the limit of 500``. The values for **format** are:

      * - 
        - 
        - **default**: This is the default value, and does not change the behavior from previous versions. In this mode, each unique item gets a set of columns.  With some properties such as Client and Server SSL profiles, the number of columns exceeds the maximum allowed by Azure.  |br| For example, with a CA bundle certificate, there may be fields for expirationDate, expirationString, issuer, name, and subject.  TS creates a column named **ca-bundle_crt_expirationDate** and four additional columns for the other four properties.  The **name** value is a prefix for every column.

      * - 
        - 
        - **propertyBased** - This value causes Telemetry Streaming to create fewer columns by using the property name for the column.  In the example above, the column (property) name is just **expirationDate**, and all certificates use this column for the expiration dates.  |br| Note this happens only if the property **name** exists, and it matches the declared object name at the top. Otherwise, the naming mode goes back to default.

      * - 1.24
        - **region**
        - The **region** property for Azure Log Analytics and Application Insights was added in part to support the Azure Government regions. |br| - This optional property is used to determine cloud type (public/commercial, govcloud) so that the correct API URLs can be used (example values: westeurope, japanwest, centralus, usgovvirginia, and so on). |br| - If you do not provide a region, Telemetry Streaming attempts to look it up from the instance metadata. |br| - If it is unable to extract metadata, TS defaults to public/commercial |br| - Check the |azregion| for product/region compatibility for Azure Government. |br| - See the Azure documentation for a valid list of regions (resource location), and :ref:`Region list<azreg>` for example values from the Azure CLI.



To see more information about sending data to Log Analytics, see |HTTP Data Collector API|.

|

.. IMPORTANT:: The following example has been updated with the **useManagedIdentity**, **region**, and **format** properties. You must be using a TS version that supports these properties (TS 1.24 for **format**) |br| See :ref:`Using Managed Identities<mi>` following the example for information about using Azure Managed Identities and Telemetry Streaming. 


Example Declaration:

.. literalinclude:: ../examples/declarations/azure_log_analytics.json
    :language: json


Example Dashboard:

The following is an example of the Azure dashboard with Telemetry Streaming data. To create a similar dashboard, see |azure_dashboard|. To create custom views using View Designer, see |Azure_custom_views|.

|azure_log_analytics_dashboard|

| 

.. _mi:

Using Microsoft Managed Identities for Log Analytics
````````````````````````````````````````````````````
Telemetry Streaming v1.11 adds support for sending data to Azure Log Analytics with an Azure Managed Identity. For specific information on Managed Identities, see |managedid|.

**Important:** The managed identity assigned to the VM must have at the minimum, the following permissions (see the Azure documentation for detailed information):

- List subscriptions
- List workspaces for the subscription(s)
- Log Analytics Contributor for the workspace (either at the Workspace resource level or inherited via resource group)

Telemetry Streaming supports Managed Identities using a new **useManagedIdentity** property, set to **true**.  You cannot specify a passphrase when this property is set to true.  You must specify passphrase when this property is omitted or when value is **false**.  If you do not include this property at all, Telemetry Streaming behaves as though the value is false.

Example Declaration:

.. literalinclude:: ../examples/declarations/azure_log_analytics_mi.json
    :language: json

|

.. _appinsight-ref:

Microsoft Azure Application Insights
------------------------------------
|azure_img|

Required Information:

- **Instrumentation Key**: If provided, **Use Managed Identity** must be *false* or omitted (default). Navigate to :guilabel:`Application Insights > {AppinsightsName} > Overview`
- **Use Managed Identity**: If true, Instrumentation Key must be omitted. See :ref:`Managed Identities for App Insight<miappin>`.


Optional Properties:

- **MaxBatch Size**: The maximum number of telemetry items to include in a payload to the ingestion endpoint (default: 250)
- **Max Batch Interval Ms**: The maximum amount of time to wait in milliseconds to for payload to reach maxBatchSize (default: 5000)
- **App Insights Resource Name**: Name filter used to determine to which App Insights resource to send metrics. If not provided, TS will send metrics to App Insights in the subscription in which the managed identity has permissions. Note: To be used only when useManagedIdentity is true.
- **customOpts**: Additional options for use by consumer client library. These are passthrough options (key value pair) to send to the Microsoft node client. 
   
.. WARNING:: The **customOpts** options are not guaranteed to work and may change according to the client library API; you must use these options with caution. Refer to corresponding consumer library documentation for acceptable keys and values.

To see more information about Azure Application Insights, see |appinsight|.

.. _region:

Additions to the Application Insights consumer
``````````````````````````````````````````````
The following items have been added to the Azure Application Insights consumer since it was introduced.

.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description

      * - 1.24
        - **region**
        - The **region** property for Azure Log Analytics and Application Insights was added in part to support the Azure Government regions. |br| - This optional property is used to determine cloud type (public/commercial, govcloud) so that the correct API URLs can be used (example values: westeurope, japanwest, centralus, usgovvirginia, and so on). |br| - If you do not provide a region, Telemetry Streaming attempts to look it up from the instance metadata. |br| - If it is unable to extract metadata, TS defaults to public/commercial |br| - Check the |azregion| for product/region compatibility for Azure Government. |br| - See the Azure documentation for a valid list of regions (resource location), and :ref:`Region list<azreg>` for example values from the Azure CLI.

|

**IMPORTANT**: The following declaration includes the additional properties shown in the table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line(s), and the comma from the previous line. 

Example Declaration:

.. literalinclude:: ../examples/declarations/azure_application_insights.json
    :language: json
    :emphasize-lines: 16

| 

.. _miappin:

Using Microsoft Managed Identities for Application Insights
```````````````````````````````````````````````````````````
Telemetry Streaming v1.11 also adds support for sending data to Azure Application Insights with an Azure Managed Identity. For specific information on Managed Identities, see |managedid|.

**Important:** The managed identity assigned to the VM must have at the minimum, the following permissions  (see the Azure documentation for detailed information):

- List Microsoft.Insight components for subscription(s), for example the Monitoring Reader role
- Push metrics to the App Insights resource, for example the Monitoring Metrics Publisher role

Telemetry Streaming supports Managed Identities using a new **useManagedIdentity** property, set to **true**.  You cannot specify an instrumentationKey when this property is set to true. You must specify instrumentationKey when this property is omitted or when the value is false. If you do not include this property at all, Telemetry Streaming behaves as though the value is false. You can optionally provide an appInsightsResourceName to limit which App Insights resource(s) to send metrics to. Without the filter, metrics will be sent to all App Insights resources to which the managed identity has permissions. 

Example Declaration:

.. literalinclude:: ../examples/declarations/azure_application_insights_mi.json
    :language: json

|

.. _awscloud-ref:

AWS CloudWatch
--------------
|aws_img|   

AWS CloudWatch has two consumers: CloudWatch Logs, and :ref:`CloudWatch Metrics<cw-metrics>`.  If you do not use the new **dataType** property, the system defaults to CloudWatch Logs.

.. IMPORTANT:: In TS 1.9.0 and later, the **username** and **passphrase** for CloudWatch are optional.  This is because a user can send data from a BIG-IP that has an appropriate IAM role in AWS to AWS CloudWatch without a username and passphrase.

In TS 1.18 and later, the root certificates for AWS services are now embedded within Telemetry Streaming and are the only root certificates used in requests made to AWS services per AWS's move to its own Certificate Authority, noted in https://aws.amazon.com/blogs/security/how-to-prepare-for-aws-move-to-its-own-certificate-authority/.

Additions to the AWS CloudWatch consumer
````````````````````````````````````````
The following items have been added to the CloudWatch consumer since it was introduced.


.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description
  
      * - 1.25
        - **endpointUrl**
        - This optional property for AWS CloudWatch (Logs and Metrics) allows you to specify the full AWS endpoint URL for service requests. In particular, it can be an interface VPC endpoint for AWS Direct Connect. See the following CloudWatch Logs and Metrics examples for usage.


|


AWS CloudWatch Logs (default)
`````````````````````````````

Required information:
 - Region: AWS region of the CloudWatch resource.
 - Log Group: Navigate to :guilabel:`CloudWatch > Logs`
 - Log Stream: Navigate to :guilabel:`CloudWatch > Logs > Your_Log_Group_Name`
 - Username: Navigate to :guilabel:`IAM > Users`
 - Passphrase: Navigate to :guilabel:`IAM > Users`

To see more information about creating and using IAM roles, see the |IAM roles|.

**IMPORTANT**: The following declaration includes the additional properties shown in the Additions to CloudWatch consumer table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line(s), and the comma from the previous line. 

Example Declaration:

.. literalinclude:: ../examples/declarations/aws_cloudwatch_logs.json
    :language: json
    :emphasize-lines: 13

|

.. _cw-metrics:

AWS CloudWatch Metrics
``````````````````````
Telemetry Streaming 1.14 introduced support for AWS CloudWatch Metrics.  To specify CloudWatch Metrics, use the new **dataType** property with a value of **metrics** as shown in the example.

Notes for CloudWatch Metrics:
 - It can take up to 15 minutes for metrics to appear if they do not exist and AWS has to create them.
 - You must use the **dataType** property with a value of **metrics**, if you do not specify metrics, the system defaults to Logs. 
 - Some properties are restricted so that you cannot use them with the wrong dataType (for example, you cannot use **logStream** when **dataType: "metrics"**)


Required Information:
 - Region: AWS region of the CloudWatch resource.
 - MetricNamespace: Namespace for the metrics. :guilabel:`Navigate to CloudWatch > Metrics > All metrics > Custom Namespaces`
 - DataType: Value should be **metrics**
 - Username: Navigate to :guilabel:`IAM > Users`
 - Passphrase: Navigate to :guilabel:`IAM > Users`


**IMPORTANT**: The following declaration includes the additional properties shown in the Additions to CloudWatch consumer table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line(s), and the comma from the previous line. 

Example Declaration:

.. literalinclude:: ../examples/declarations/aws_cloudwatch_metrics.json
    :language: json
    :emphasize-lines: 13

|


.. _awss3-ref:

AWS S3
------
|aws_s3|

Required Information:
 - Region: AWS region of the S3 bucket.
 - Bucket: Navigate to S3 to find the name of the bucket.
 - Username: Navigate to :guilabel:`IAM > Users`
 - Passphrase: Navigate to :guilabel:`IAM > Users`

To see more information about creating and using IAM roles, see the |IAM roles|.

.. IMPORTANT:: Rhe **username** and **passphrase** for S3 are optional.  This is because a user can send data from a BIG-IP that has an appropriate IAM role in AWS to AWS S3 without a username and passphrase.

The root certificates for AWS services are embedded within Telemetry Streaming and are the only root certificates used in requests made to AWS services per AWS's move to its own Certificate Authority, noted in https://aws.amazon.com/blogs/security/how-to-prepare-for-aws-move-to-its-own-certificate-authority/.

Additions to the AWS S3 consumer
````````````````````````````````
The following items have been added to the S3 consumer since it was introduced.


.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description
  
      * - 1.25
        - **endpointUrl**
        - This optional property for AWS S3 allows you to specify the full AWS endpoint URL for service requests. In particular, it can be an interface VPC endpoint for AWS Direct Connect.  


**IMPORTANT**: The following declaration includes the additional properties shown in the table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line(s), and the comma from the previous line. 

Example Declaration:

.. literalinclude:: ../examples/declarations/aws_s3.json
    :language: json
    :emphasize-lines: 12

|

.. _graphite-ref:

Graphite
--------
|graphite|

Required Information:
 - Host: The address of the Graphite system.
 - Protocol: Check Graphite documentation for configuration.
 - Port: Check Graphite documentation for configuration.

.. NOTE:: To see more information about installing Graphite, see |Installing Graphite|. To see more information about Graphite events, see |Graphite Events|.

Example Declaration:

.. literalinclude:: ../examples/declarations/graphite.json
    :language: json

|

.. _kafka-ref:

Kafka
-----
|Kafka|

Required Information:
 - Host: The address of the Kafka system.
 - Port: The port of the Kafka system.
 - Topic: The topic where data should go within the Kafka system
 - Protocol: The port of the Kafka system. Options: binaryTcp or binaryTcpTls. Default is binaryTcpTls
 - Authentication Protocol: The protocol to use for authentication process. Options: **SASL-PLAIN** and **None**, and **TLS** in TS 1.17 and later. Default is None.
 - Username: The username to use for authentication process.
 - Password: The password to use for authentication process.

.. NOTE:: To see more information about installing Kafka, see |Installing Kafka|.

Additions to the Kafka consumer
```````````````````````````````
The following items have been added to the Kafka consumer since it was introduced.


.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description
  
      * - 1.17
        - **privateKey**
        - This and the following properties provide the ability to add TLS client authentication to the Kafka consumer using the **TLS** authentication protocol.  This protocol configures Telemetry Streaming to provide the required private key and certificate(s) when the Kafka broker is configured to use SSL/TLS Client authentication.  You can find more information on Kafka's client authentication on the Confluent pages: https://docs.confluent.io/5.5.0/kafka/authentication_ssl.html. |br| |br| **privateKey** is the Private Key for the SSL certificate. Must be formatted as a 1-line string, with literal new line characters. 

      * - 
        - **clientCertificate**
        - The client certificate chain. Must be formatted as a 1-line string, with literal new line characters. 

      * - 
        - **rootCertificate**
        - The Certificate Authority root certificate, used to validate the client certificate. Certificate verification can be disabled by setting allowSelfSignedCert=true. Must be formatted as a 1-line string, with literal new line characters.



**IMPORTANT**: The following declaration includes the additional properties shown in the table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line(s), and the comma from the previous line. 

Example Declaration:

.. literalinclude:: ../examples/declarations/kafka.json
    :language: json
    :linenos:
    :emphasize-lines: 24-41

|

.. _elasticsearch-ref:

ElasticSearch
-------------
|ElasticSearch|

.. NOTE:: TS 1.24 added support for sending data to ElasticSearch 7 and ElasticSearch 8.

Required Information:
 - Host: The address of the ElasticSearch system.
 - Index: The index where data should go within the ElasticSearch system.

Optional Parameters:
 - Port: The port of the ElasticSearch system. Default is 9200.
 - Protocol: The protocol of the ElasticSearch system. Options: http or https. Default is http.
 - Allow Self Signed Cert: allow TS to skip Cert validation. Options: true or false. Default is false.
 - Path: The path to use when sending data to the ElasticSearch system.
 - Data Type: The type of data posted to the ElasticSearch system. 
 - API Version: The API version of the ElasticSearch system. Options: Any version string matching the ElasticSearch node(s) version.  The default is 6.0.
 - Username: The username to use when sending data to the ElasticSearch system.
 - Passphrase: The secret/password to use when sending data to the ElasticSearch system.

.. IMPORTANT:: Telemetry Streaming 1.24 and later use the API Version value to determine the appropriate defaults to use for the Data Type parameter. |br| When the API Version is 6.X or earlier, **f5.telemetry** is used as the default Data Type. |br| When the API Version is 7.0 until the last 7.X version, **_doc** is used as the default Data Type. |br| In API Version 8.0 and later, the Data Type value is not supported, and will not be accepted in the Telemetry Streaming declaration.

|

To see more information about installing ElasticSearch, see |Installing ElasticSearch|.

Example Declaration:

.. literalinclude:: ../examples/declarations/elasticsearch.json
    :language: json

|

.. _sumologic-ref:

Sumo Logic
----------
|Sumo Logic|

Required Information:
 - Host: The address of the Sumo Logic collector.
 - Protocol: The protocol of the Sumo Logic collector.
 - Port: The port of the Sumo Logic collector.
 - Path: The HTTP path of the Sumo Logic collector (without the secret).
 - Secret: The protected portion of the HTTP path (the final portion of the path, sometimes called a system tenant).

.. NOTE:: To see more information about installing Sumo Logic, see |Installing Sumo Logic|.

Example Declaration:

.. literalinclude:: ../examples/declarations/sumo_logic.json
    :language: json

|

.. _statsd-ref:

StatsD
------
|StatsD|

Required Information:
    - Host: The address of the StatsD instance.
    - Protocol: The protocol of the StatsD instance. Options: TCP (TS 1.12+) or UDP. The default is UDP.
    - Port: The port of the StatsD instance

.. IMPORTANT:: In TS v1.15 and later, if Telemetry Streaming is unable to locate the hostname in the systemPoller data, it sends the metric with hostname value **host.unknown**. This gets transformed to **hostname-unknown** as required by StatsD. This is because StatsD uses a **.** as a delimiter, and TS automatically replaces it with a **-**. For example: |br| |bold| { |br| |sp| |sp| |sp| metricName: 'f5telemetry.hostname-unknown.customStats.clientSideTraffic-bitsIn', |br| |sp| |sp| |sp| metricValue: 111111030 |br| } |boldclose| 

.. NOTE:: When using the :doc:`custom endpoints feature<custom-endpoints>`, be sure to include **/mgmt/tm/sys/global-settings** in your endpoints for Telemetry Streaming to be able to find the hostname.

For more information about installing StatsD, see |StatsDWiki|.

.. _addtags: 

Additions to the StatsD consumer
````````````````````````````````
The following items have been added to the StatsD consumer since it was introduced.

.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description

      * - 1.21
        - **addTags**
        - This feature (experimental in TS 1.21-1.24) causes Telemetry Streaming to parse the incoming payload for values to automatically add as tags. Currently only the **sibling** method is supported. To see an example and the output from **addTags**, see :ref:`addTags example<addtagex>`.

      * - 1.25
        - **convertBooleansToMetrics**
        - This property allows you to choose whether or not to convert boolean values to metrics (true becomes 1, false (default0) becomes 0). |br| By default, Telemetry Streaming uses Boolean values as tag values that are attached to individual metrics. If **convertBooleansToMetrics** is set to **true**, any Boolean values are instead converted to numeric values, which are then sent to the consumer(s) as a metric. |br| Note: Telemetry Streaming does not send a Boolean as both a tag and a metric; a Boolean value is sent to the consumer(s) as either a tag or as a metric.
        
        
**IMPORTANT**: The following declaration includes the additional properties shown in the table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line(s), and the comma from the previous line. 


.. literalinclude:: ../examples/declarations/statsd.json
    :language: json
    :emphasize-lines: 9, 10-19

|

.. _http-ref:

Generic HTTP
------------

Required Information:
 - Host: The address of the system.

Optional Properties:
 - Protocol: The protocol of the system. Options: ``https`` or ``http``. Default is ``https``.
 - Port: The port of the system. Default is ``443``.
 - Path: The path of the system. Default is ``/``.
 - Method: The method of the system. Options: ``POST``, ``PUT``, ``GET``. Default is ``POST``.
 - Headers: The headers of the system.
 - Passphrase: The secret to use when sending data to the system, for example an API key to be used in an HTTP header.
 - fallbackHosts: List FQDNs or IP addresses to be used as fallback hosts
 - proxy: Proxy server configuration


.. NOTE:: Since this consumer is designed to be generic and flexible, how authentication is performed is left up to the web service. To ensure the secrets are encrypted within Telemetry Streaming please note the use of JSON pointers. The secret to protect should be stored inside ``passphrase`` and referenced in the desired destination property, such as an API token in a header as shown in this example. 

Additions to the Generic HTTP consumer
``````````````````````````````````````
The following items have been added to the Generic HTTP consumer since it was introduced.


.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description
  
      * - 1.18
        - **privateKey**
        - This and the following properties provide the ability to add TLS client authentication to the Generic HTTP consumer using the **TLS** authentication protocol.  This protocol configures Telemetry Streaming to provide the required private key and certificate(s) when the Generic HTTP consumer is configured to use SSL/TLS Client authentication.  |br| |br| **privateKey** is the Private Key for the SSL certificate. Must be formatted as a 1-line string, with literal new line characters. 

      * - 
        - **clientCertificate**
        - The client certificate chain. Must be formatted as a 1-line string, with literal new line characters. 

      * - 
        - **rootCertificate**
        - The Certificate Authority root certificate, used to validate the client certificate. Certificate verification can be disabled by setting allowSelfSignedCert=true. Must be formatted as a 1-line string, with literal new line characters.

      * - 1.29
        - **outputMode**
        - Possible values: **raw**, **processed**.  OutputMode provides the options to send data with the Generic HTTP consumer in an "as-is" (**raw**) format instead of the generated JSON payload (**processed**) allowing the data to be sent in Line Protocol format to a raw event listener and have it forwarded through the Generic HTTP consumer. 

      * - 1.31
        - **compressionType**
        - Sets the type of compression. The acceptable values are none for no compression (the default), or gzip, where the payload will be compressed using gzip. 

      * -  
        - **customOpts** experimental
        - This experimental feature relies on Node.js for each value when the user specifies nothing in **customOpts**.  Node.js values may differ based on version used. Refer to node.js documentation for more information. 

|
**IMPORTANT**: The following declaration includes the additional properties shown in the table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line(s), and the comma from the previous line. 

Example Declaration:

.. literalinclude:: ../examples/declarations/generic_http.json
    :language: json
    :emphasize-lines: 24


|

**Additional examples for Generic HTTP consumers:**

- Generic HTTP with multiple passphrases, see :ref:`multiple`.
- Generic HTTP with proxy settings in TS 1.17 and later, see :ref:`proxy`.
- An EXPERIMENTAL feature where you can specify fallback IP address(es) for the Generic HTTP consumer, see :ref:`fallback`.
- Generic HTTP with TLS authentication, see :ref:`httptls`.
  
|

.. _beacon-ref:

F5 Beacon
---------
|beaconlogo|

F5 Beacon, a SaaS offering, provides visibility and actionable insights into the health and performance of applications. 

F5 Beacon uses the generic HTTP consumer.  To see an example of Generic HTTP with proxy settings, see :ref:`proxy`.

Required Information:
 - See |beacon| for information on how to add Telemetry Streaming as a source to Beacon.
 - Host: The address of the system.
 - Protocol: The protocol of the system. Options: ``https`` or ``http``. Default is ``https``.
 - Port: The port of the system. Default is ``443``.
 - Path: The path of the system. Default is ``/``.
 - Method: The method of the system. Options: ``POST``, ``PUT``, ``GET``. Default is ``POST``.
 - Headers: The headers of the system.
 - Passphrase: The secret to use when sending data to the system, for example an API key to be used in an HTTP header.

Example Declaration:

.. literalinclude:: ../examples/declarations/f5_beacon.json
    :language: json


|

.. _fluentd-ref:

Fluentd
-------
|Fluentd|

Required Information:
 - Host: The address of the system.
 - Protocol: The protocol of the system. Options: ``https`` or ``http``. Default is ``https``.
 - Port: The port of the system. Default is ``9880``.
 - Path: The path of the system. This parameter corresponds to the **tag** of the event being sent to Fluentd (see |fluentdocs| for information) 
 - Method: The method of the system. This must be ``POST``.
 - Headers: The headers of the system.  **Important**: The **content-type = application/json** header as shown in the example is required.

Example Declaration:

.. literalinclude:: ../examples/declarations/fluentd.json
    :language: json

|

.. _stackdrive:

Google Cloud Operations Suite's Cloud Monitoring
------------------------------------------------
|Google Cloud|

.. NOTE:: Google recently changed the name of their StackDriver product to Cloud Operations Suite with the monitoring product named *Cloud Monitoring*.

Required Information:
 - projectId: The ID of the GCP project.
 - serviceEmail: The email for the Google Service Account. To check if you have an existing Service Account, from the left menu of GCP, select **IAM & admin**, and then click **Service Accounts**. If you do not have a Service Account, you must create one.
 - privateKeyId: The ID of the private key that the user created for the Service Account (if you do not have a key, from the account page, click **Create Key** with a type of **JSON**. The Private key is in the file that was created when making the account). If you are using IAM roles, introduced in 1.25 do not use this property and see :ref:`gcmiam`.
 - privateKey: The private key given to the user when a private key was added to the service account. If you are using IAM roles, introduced in 1.25 do not use this property and see :ref:`gcmiam`.

For complete information on deploying Google Cloud Operations Suite, see |sddocs|.

**Finding the Data**  |br|
Once you have configured the Google Cloud Monitoring consumer and sent a Telemetry Streaming declaration, Telemetry Streaming creates custom MetricDescriptors to which it sends metrics.  These metrics can be found under a path such as **custom/system/cpu**. To make it easier to find data that is relevant to a specific device, TS uses the **Generic Node** resource type, and assigns machine ID to the **node_id** label to identify which device the data is from.

.. IMPORTANT:: There is a quota of 500 custom MetricDescriptors for Google Cloud Monitoring. Telemetry Streaming creates these MetricDescriptors, and if this quota is ever reached, you must delete some of these MetricDescriptors.

Additions to the Cloud Monitoring consumer
``````````````````````````````````````````
The following items have been added to the Google Cloud Operations Suite's Cloud Monitoring consumer since it was introduced.


.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description
  
      * - 1.22
        - **reportInstanceMetadata**
        - This property allows you to enable or disable metadata reporting.  The default is **false**.


**IMPORTANT**: The following declaration includes the additional properties shown in the table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line(s), and the comma from the previous line. 


Example Declaration:

.. literalinclude:: ../examples/declarations/google_cloud_monitoring.json
    :language: json

|

.. _gcmiam:

Using IAM roles for Google Cloud Monitoring
```````````````````````````````````````````
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for GCP IAM roles is available in TS v1.25 and later

Telemetry Streaming 1.25 added support for using IAM roles for Google Cloud Monitoring.  This means the Cloud Monitoring consumer can send data without specifying credentials if IAM roles are properly configured for the BIG-IP instance in GCP.

IAM roles are enabled by using the new **useServiceAccountToken** property set to **true** (the default is **false**).  When set to true, the **privateKey** and **privateKeyId** properties are not used. 

When using this feature, the authentication token is fetched from metadata at ``${METADATA_URL}/v1/instance/service-accounts/${serviceAccount.serviceEmail}/token``, meaning that **serviceEmail** in the declaration should match the service account email associated with the VM. 

Example Declaration:

.. literalinclude:: ../examples/declarations/google_cloud_monitoring_sat.json
    :language: json

|

.. _gcl:

Google Cloud Logging
--------------------
|Google Cloud|

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for Google Cloud Logging is available in TS 1.22 and later.  

Required Information:
 - serviceEmail: The email for the Google Service Account. To check if you have an existing Service Account, from the GCP left menu, select **IAM & admin**, and then click **Service Accounts**. If you do not have a Service Account, you must create one.
 - privateKeyId: The ID of the private key the user created for the Service Account (if you do not have a key, from the Account page, click **Create Key** with a type of **JSON**. The Private key is in the file that was created when making the account). If you are using IAM roles introduced in 1.25, do not use this property and see :ref:`gcmiam`.
 - privateKey: The private key given to the user when a private key was added to the service account. If you are using IAM roles introduced in 1.25, do not use this property and see :ref:`gcliam`.
 - logScopeId: The ID of the scope specified in the **logScope** property. If using a logScope of **projects**, this is the ID for your project.
 - logId: The Google Cloud logging LOG_ID where log entries will be written.
 

For complete information, see the |gcldocs|.

**Finding the Data**  |br|
Once you have configured the Google Cloud Logging consumer and sent a Telemetry Streaming declaration, Telemetry Streaming sends log entries directly to Google Cloud Logging. Log entries are written to a *logName* in Google Cloud Logging, where the logName is generated from the properties in the Telemetry Streaming declaration, using the following format: ``[logScope]/[logScopeId/logs/[logId] (example: “projects/yourProjectId/logs/yourLogId”)``.

Example Declaration:

.. literalinclude:: ../examples/declarations/google_cloud_logging.json
    :language: json

|

.. _gcliam:

Using IAM roles for Google Cloud Logging
````````````````````````````````````````
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for GCP IAM roles is available in TS v1.25 and later

Telemetry Streaming 1.25 added support for using IAM roles for Google Cloud Logging.  This means the Cloud Logging consumer can send data without specifying credentials if IAM roles are properly configured for the BIG-IP instance in GCP.

IAM roles are enabled by using the new **useServiceAccountToken** property set to **true** (the default is **false**).  When set to true, the **privateKey** and **privateKeyId** properties are not used. 

When using this feature, the authentication token is fetched from metadata at ``${METADATA_URL}/v1/instance/service-accounts/${serviceAccount.serviceEmail}/token``, meaning that **serviceEmail** in the declaration should match the service account email associated with the VM. 

Example Declaration:

.. literalinclude:: ../examples/declarations/google_cloud_logging_sat.json
    :language: json

|

.. _f5cloud:

F5 Cloud Consumer (F5 Internal)
-------------------------------
The F5 Cloud Consumer is a part of F5's internal, digital experience operating system, a cloud-based analytics platform that helps organizations monitor, operate, and protect digital workflows and optimize their customer's digital experiences.  

.. IMPORTANT:: This F5 Cloud consumer is for **F5 internal use only**, and its API is subject to change. We are including it on this page of Push consumers because you may see it in a Telemetry Streaming declaration.

Additions to the F5 Cloud consumer
``````````````````````````````````
The following items have been added to the F5 Cloud consumer since it was introduced.


.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description
  
      * - 1.22
        - **eventSchemaVersion**
        -  This allows you to select the appropriate event schema instead of using a hard-coded value.


**IMPORTANT**: The following declaration includes the additional properties shown in the table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line(s), and the comma from the previous line. 


Example Declaration:


.. literalinclude:: ../examples/declarations/f5_cloud.json
    :language: json
    :emphasize-lines: 94

|

.. _datadog:

DataDog
-------
|datadog|

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

    The DataDog consumer was introduced as an experimental consumer in TS 1.22. |br| The **compressionType** property was added in 1.23. |br| The **region** and **service** properties were added in TS 1.24 |br| The **metricPrefix** property was added in 1.25.

Required Information:
 - apiKey: The DataDog API key required to submit metrics and events to DataDog

Optional Properties:
 - proxy: Proxy server configuration

Additional examples for HTTP consumers:
 - DataDog with proxy settings in TS 1.31 and later, see :ref:`proxy`.


Additions to the DataDog consumer
`````````````````````````````````
The following items have been added to the DataDog consumer since it was introduced.

.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description
  
      * - 1.23
        - **compressionType**
        - Sets the type of compression.  The acceptable values are **none** for no compression (the default), or **gzip**, where the payload will be compressed using gzip. 

      * - 1.24
        - **region**
        - Sets the region. The acceptable values are **US1** (the default), **US3**, **EU1**, and **US1-FED**.

      * - 
        - **service**
        - The name of the service generating telemetry data (string). The default is **f5-telemetry**.  This property exposes the **DATA_DOG_SERVICE_FIELD** value that is sent to the DataDog API.

      * - 1.25
        - **metricPrefix**
        - This property allows you to provide a string value to be used as a metric prefix.  For example, in the following declaration, the **metricPrefix** is set to **"f5", "bigip"**, which would add **f5.bigip** as a prefix (i.e. **system.cpu** would become **f5.bigip.system.cpu**).

      * - 
        - **convertBooleansToMetrics**
        - This property allows you to choose whether or not to convert boolean values to metrics (true becomes 1, false (default0) becomes 0). |br| By default, Telemetry Streaming uses Boolean values as tag values that are attached to individual metrics. If **convertBooleansToMetrics** is set to **true**, any Boolean values are instead converted to numeric values, which are then sent to the consumer(s) as a metric. |br| Note: Telemetry Streaming does not send a Boolean as both a tag and a metric; a Boolean value is sent to the consumer(s) as either a tag or as a metric.

      * - 
        - **customTags**
        - This property allows you to add custom tags that are appended to the dynamically generated telemetry tags. You specify tags as an array of **name** and **value** pairs.  You can set more than one tag in a declaration, but if you use this property, you must specify at least one custom tag. 

      * - 1.31 
        - **customOpts** experimental
        - This experimental feature relies on Node.js for each value when the user specifies nothing in **customOpts**.  Node.js values may differ based on version used. Refer to node.js documentation for more information.


**IMPORTANT**: The following declaration includes all of the additional properties shown in the table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the lines highlighted in yellow (and the comma from line 7).

Example Declaration:

.. literalinclude:: ../examples/declarations/data_dog.json
    :language: json
    :emphasize-lines: 8-17
    
|

.. _opent:

OpenTelemetry Exporter
----------------------
|opentelemetry|

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

    The OpenTelemetry Exporter consumer was introduced as an EXPERIMENTAL consumer in TS 1.23, and is supported in TS 1.27 and later.

The OpenTelemetry Exporter Consumer exports telemetry data to an OpenTelemetry Collector, or OpenTelemetry Protocol compatible API.


Required Information:
 - Host: The address of the OpenTelemetry Collector, or OpenTelemetry Protocol compatible API
 - Port: The port of the OpenTelemetry Collector, or OpenTelemetry Protocol compatible API

Optional Properties:
 - metricsPath: The URL path to send metrics telemetry to
 - headers: Any required HTTP headers, required to send metrics telemetry to an OpenTelemetry Protocol compatible API
 - Protocol: The protocol of the system.  Note: **protocol** is allowed only when **exporter** is **json** or **protobuf**. When **exporter** is **grpc** then **useSSL** can be specified.
   **privateKey**, **clientCertificate**, **rootCertificate** allowed for any **exporter** but only when **protocol** is **https** or **useSSL** set to ``true``.


Note: As of Telemetry Streaming 1.23, this consumer:
 - Only exports OpenTelemetry metrics (logs and traces are not supported)
 - Exports telemetry data using protobufs over HTTP
 - Extracts metrics from Event Listener log messages. Any integer or float values in Event Listener log messages will be converted to an OpenTelemetry metric, and exported as a metric.
  

Additions to the OpenTelemetry Exporter consumer
````````````````````````````````````````````````
The following items have been added to the OpenTelemetry consumer since it was introduced.

.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - TS Version
        - Property
        - Description

      * - 1.25
        - **convertBooleansToMetrics**
        - This property allows you to choose whether or not to convert boolean values to metrics (true becomes 1, false (default0) becomes 0). |br| By default, Telemetry Streaming uses Boolean values as tag values that are attached to individual metrics. If **convertBooleansToMetrics** is set to **true**, any Boolean values are instead converted to numeric values, which are then sent to the consumer(s) as a metric. |br| Note: Telemetry Streaming does not send a Boolean as both a tag and a metric; a Boolean value is sent to the consumer(s) as either a tag or as a metric.

      * - 1.31
        - **exporter**
        - **exporter** allowed values: **grpc**, **json** and **protobuf**. Default is **protobuf**, while **grpc** is experimental.  Note: When **exporter** is **grpc**, then **useSSL** can be specified.

      * - 
        - **privateKey**
        - This and the following properties provide the ability to add TLS client authentication using the **TLS** authentication protocol.  This protocol configures Telemetry Streaming to provide the required private key and certificate(s) when the consumer is configured to use SSL/TLS Client authentication.  |br| |br| **privateKey** is the Private Key for the SSL certificate. Must be formatted as a 1-line string, with literal new line characters. 

      * - 
        - **clientCertificate**
        - The client certificate chain. Must be formatted as a 1-line string, with literal new line characters. 

      * - 
        - **rootCertificate**
        - The Certificate Authority root certificate, used to validate the client certificate. Certificate verification can be disabled by setting allowSelfSignedCert=true. Must be formatted as a 1-line string, with literal new line characters.

      * -
        - **Protocol** 
        - The protocol of the system. 
      
      * - 
        - **useSSL**
        - To ensure the data that is transferred between a client and a server remains private.

**IMPORTANT**: The following declaration includes all of the additional properties shown in the table. If you attempt to use this declaration on a previous version, it will fail. On previous versions, remove the highlighted line.

Example Declaration:

.. literalinclude:: ../examples/declarations/open_telemetry_exporter.json
    :language: json
    :emphasize-lines: 15

|

|

.. _azreg:

Azure Regions
-------------
The following table shows an example table when listing regions from the Azure CLI using the command ``az account list-locations -o table``.  Note to list Azure Government Regions, you must use ``az cloud set --name AzureUsGovernment`` before running the list-locations command.

.. IMPORTANT:: This list is just a static example, we strongly recommend running the commands yourself to retrieve the current list. |br| The **Name** column on the right is the value to use in your Telemetry Streaming declaration


``az account list-locations -o table``

+----------------------+------------+------------+--------------------+
| DisplayName          |  Latitude  |  Longitude |  **Name**          |
+======================+============+============+====================+
| East Asia            |  22.267    | 114.188    |  eastasia          |
+----------------------+------------+------------+--------------------+
| Southeast Asia       |  1.283     | 103.833    |  southeastasia     |
+----------------------+------------+------------+--------------------+
| Central US           |  41.5908   | -93.6208   |  centralus         |
+----------------------+------------+------------+--------------------+
| East US              |  37.3719   | -79.8164   | eastus             |
+----------------------+------------+------------+--------------------+
| East US 2            |  36.6681   | -78.3889   | eastus2            |
+----------------------+------------+------------+--------------------+
| West US              |  37.783    | -122.417   | westus             |
+----------------------+------------+------------+--------------------+
| North Central US     |  41.8819   | -87.6278   | northcentralus     |
+----------------------+------------+------------+--------------------+
| South Central US     |  29.4167   | -98.5      | southcentralus     |
+----------------------+------------+------------+--------------------+
| North Europe         |  53.3478   | -6.2597    | northeurope        |
+----------------------+------------+------------+--------------------+
| West Europe          |  52.3667   | 4.9        | westeurope         |
+----------------------+------------+------------+--------------------+
| Japan West           |  34.6939   | 135.5022   | japanwest          |
+----------------------+------------+------------+--------------------+
| Japan East           |  35.68     | 139.77     | japaneast          |
+----------------------+------------+------------+--------------------+
| Brazil South         |  -23.55    | -46.633    | brazilsouth        |
+----------------------+------------+------------+--------------------+
| Australia East       |  -33.86    | 151.2094   | australiaeast      |
+----------------------+------------+------------+--------------------+
| Australia Southeast  |  -37.8136  | 144.9631   | australiasoutheast |
+----------------------+------------+------------+--------------------+
| South India          |  12.9822   | 80.1636    | southindia         |
+----------------------+------------+------------+--------------------+
| Central India        |  18.5822   | 73.9197    | centralindia       |
+----------------------+------------+------------+--------------------+
| West India           |  19.088    | 72.868     | westindia          |
+----------------------+------------+------------+--------------------+
| Canada Central       | 43.653     | -79.383    | canadacentral      |
+----------------------+------------+------------+--------------------+
| Canada East          | 46.817     | -71.217    | canadaeast         |
+----------------------+------------+------------+--------------------+
| UK South             | 50.941     | -0.799     | uksouth            |
+----------------------+------------+------------+--------------------+
| UK West              | 53.427     | -3.084     | ukwest             |
+----------------------+------------+------------+--------------------+
| West Central US      | 40.890     | -110.234   | westcentralus      |
+----------------------+------------+------------+--------------------+
| West US 2            | 47.233     | -119.852   | westus2            |
+----------------------+------------+------------+--------------------+
| Korea Central        | 37.5665    | 126.9780   | koreacentral       |
+----------------------+------------+------------+--------------------+
| Korea South          | 35.1796    | 129.0756   | koreasouth         |
+----------------------+------------+------------+--------------------+
| France Central       | 46.3772    | 2.3730     | francecentral      |
+----------------------+------------+------------+--------------------+
| France South         | 43.8345    | 2.1972     | francesouth        |
+----------------------+------------+------------+--------------------+
| Australia Central    | -35.3075   | 149.1244   | australiacentral   |
+----------------------+------------+------------+--------------------+
| Australia Central 2  | -35.3075   | 149.1244   | australiacentral2  |
+----------------------+------------+------------+--------------------+
| UAE Central          | 24.466667  | 54.366669  | uaecentral         |
+----------------------+------------+------------+--------------------+
| UAE North            | 25.266666  |  55.316666 | uaenorth           |
+----------------------+------------+------------+--------------------+
| South Africa North   | -25.731340 | 28.218370  | southafricanorth   |
+----------------------+------------+------------+--------------------+
| South Africa West    | -34.075691 | 18.843266  | southafricawest    |
+----------------------+------------+------------+--------------------+
| Switzerland North    | 47.451542  | 8.564572   | switzerlandnorth   |
+----------------------+------------+------------+--------------------+
| Switzerland West     | 46.204391  | 6.143158   | switzerlandwest    |
+----------------------+------------+------------+--------------------+
| Germany North        | 53.073635  | 8.806422   | germanynorth       |
+----------------------+------------+------------+--------------------+
| Germany West Central | 50.110924  | 8.682127   | germanywestcentral |
+----------------------+------------+------------+--------------------+
| Norway West          | 58.969975  | 5.733107   | norwaywest         |
+----------------------+------------+------------+--------------------+
| Norway East          | 59.913868  | 10.752245  | norwayeast         |
+----------------------+------------+------------+--------------------+


|

In the following table, we list the Azure Government regions.

``az cloud set --name AzureUsGovernment`` |br|
``az account list-locations -o table``

+----------------------+------------+------------+--------------------+
| DisplayName          |  Latitude  |  Longitude |  **Name**          |
+======================+============+============+====================+
| USGov Virginia       |  37.3719   | -79.8164   |  usgovvirginia     |
+----------------------+------------+------------+--------------------+
| USGov Iowa           |  41.5908   | -93.6208   |  usgoviowa         |
+----------------------+------------+------------+--------------------+
| USDoD East           |  36.6676   | -78.3875   |  usdodeast         |
+----------------------+------------+------------+--------------------+
| USDoD Central        |  41.6005   | -93.6091   |  usdodcentral      |
+----------------------+------------+------------+--------------------+
| USGov Texas          |  29.4241   | -98.4936   |  usgovtexas        |
+----------------------+------------+------------+--------------------+
| USGov Arizona        |  33.4484   | -112.0740  | usgovarizona       |
+----------------------+------------+------------+--------------------+




.. |splunk_img| image:: /images/splunk_logo.png
   :target: https://www.splunk.com
   :alt: Splunk

.. |azure_img| image:: /images/azure_logo.png
   :target: https://docs.microsoft.com/en-us/azure/azure-monitor/log-query/log-query-overview
   :alt: Microsoft Azure

.. |azure_log_analytics_dashboard| image:: /images/azure_log_analytics_dashboard.png

.. |aws_img| image:: /images/aws_s3.png
   :target: https://aws.amazon.com/cloudwatch/
   :alt: Amazon Web Services

.. |aws_s3| image:: /images/aws_s3.png
   :target: https://aws.amazon.com/s3/
   :alt: Amazon Web Services

.. |graphite| image:: /images/graphite.png
   :target: https://graphiteapp.org/
   :alt: Graphite

.. |grafana_img| image:: /images/grafana-logo.png
   :target: grafana_index.html
   :alt: Grafana

.. |Kafka| image:: /images/kafka-logo-wide.png
   :target: https://kafka.apache.org/
   :alt: Kafka

.. |ElasticSearch| image:: /images/ElasticSearch_img.png
   :target: https://www.elastic.co/
   :alt: Elastic Search

.. |Sumo Logic| image:: /images/Sumo_img.png
   :target: https://www.sumologic.com/
   :alt: Sumo Logic

.. |StatsD| image:: /images/statsd_logo.png
   :target: https://github.com/statsd/statsd/blob/master/docs/graphite.md
   :alt: StatsD

.. |Fluentd| image:: /images/fluentd.png
   :target: https://www.fluentd.org/
   :alt: fluentd

.. |Google Cloud| image:: /images/google_logo.png
   :target: https://cloud.google.com/products/operations
   :alt: Google Cloud

.. |beaconlogo| image:: /images/beacon-logo.png
   :target: https://www.f5.com/products/beacon-visibility-and-analytics
   :alt: F5 Beacon

.. |datadog| image:: /images/dd_logo.png
   :target: https://www.datadoghq.com/
   :alt: DataDog
   
.. |opentelemetry| image:: /images/ot_logo.png
   :target: https://opentelemetry.io/
   :alt: OpenTelemetry

.. |Azure documentation| raw:: html

   <a href="https://docs.microsoft.com/en-us/azure/azure-monitor/platform/data-collector-api" target="_blank">Azure documentation</a>

.. |IAM roles| raw:: html

   <a href="https://aws.amazon.com/iam/" target="_blank">AWS Identity and Access Management (IAM) documentation</a>

.. |HEC| raw:: html

   <a href="http://docs.splunk.com/Documentation/Splunk/latest/Data/UsetheHTTPEventCollector" target="_blank">Splunk HTTP Event Collector documentation</a>

.. |Analytics| raw:: html

   <a href="https://www.f5.com/pdf/deployment-guides/f5-analytics-dg.pdf" target="blank">F5 Analytics iApp Template documentation</a>

.. |splunk app| raw:: html

   <a href="https://splunkbase.splunk.com/app/3161/" target="blank">F5 Analytics App for Splunk</a>

.. |HTTP Data Collector API| raw:: html

   <a href="https://docs.microsoft.com/en-us/azure/azure-monitor/platform/data-collector-api" target="_blank">HTTP Data Collector API documentation</a>

.. |azure_dashboard| raw:: html

    <a href="https://github.com/F5Networks/f5-telemetry-streaming/blob/master/examples/consumers/azure_log_analytics/telemetry_dashboard.omsview" target="blank">Azure dashboard</a>

.. |Azure_custom_views| raw:: html

    <a href="https://docs.microsoft.com/en-us/azure/azure-monitor/platform/view-designer" target="blank">Microsoft documentation</a>

.. |Installing Graphite| raw:: html

   <a href="https://graphite.readthedocs.io/en/latest/install.html" target="_blank">Installing Graphite documentation</a>

.. |Graphite Events| raw:: html

   <a href="https://graphite.readthedocs.io/en/latest/events.html" target="_blank">Graphite Events documentation</a>

.. |Installing Kafka| raw:: html

   <a href="https://kafka.apache.org/quickstart" target="_blank">Installing Kafka documentation</a>

.. |Installing ElasticSearch| raw:: html

   <a href="https://www.elastic.co/guide/index.html" target="_blank">Installing ElasticSearch documentation</a>

.. |Installing Sumo Logic| raw:: html

   <a href="https://help.sumologic.com/01Start-Here/Quick-Start-Tutorials" target="_blank">Installing Sumo Logic documentation</a>

.. |StatsDWiki| raw:: html

   <a href="https://github.com/statsd/statsd/blob/master/docs/graphite.md" target="_blank">StatsD documentation on GitHub</a>

.. |fluentdocs| raw:: html

   <a href="https://docs.fluentd.org/quickstart/life-of-a-fluentd-event#event-structure" target="_blank">Fluentd documentation</a>

.. |sddocs| raw:: html

   <a href="https://cloud.google.com/products/operations" target="_blank">Google Operations suite documentation</a>

.. |br| raw:: html
   
   <br />

.. |sp| raw:: html

   &nbsp;

.. |bold| raw:: html

   <strong>

.. |boldclose| raw:: html

   </strong>

.. |managedid| raw:: html

   <a href="https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview" target="_blank">Microsoft documentation</a>


.. |appinsight| raw:: html

   <a href="https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview" target="_blank">Microsoft documentation</a>


.. |azregion| raw:: html

   <a href="https://azure.microsoft.com/en-us/global-infrastructure/services/?products=monitor&regions=non-regional,usgov-non-regional,us-dod-central,us-dod-east,usgov-arizona,usgov-iowa,usgov-texas,usgov-virginia" target="_blank">Azure Products Available by Region</a>

.. |beacon| raw:: html

   <a href="https://clouddocs.f5.com/cloud-services/latest/f5-cloud-services-Beacon-WorkWith.html#adding-a-new-source" target="_blank">Beacon documentation</a>

.. |splunkmm| raw:: html

   <a href="https://docs.splunk.com/Documentation/Splunk/8.1.0/Metrics/GetMetricsInOther#The_multiple-metric_JSON_format" target="_blank">Splunk documentation</a>

.. |gcldocs| raw:: html

   <a href="https://cloud.google.com/logging" target="_blank">Google Cloud Logging documentation</a>