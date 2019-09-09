.. _settingupconsumer-ref:

Consumer class
==============

Use this section to find example declarations and notes for supported consumers. 

.. IMPORTANT:: Each of the following examples shows only the **Consumer** class of a declaration and must be included with the rest of the base declaration (see :ref:`components`).

.. _splunk-ref:

Splunk
~~~~~~
|splunk_img|

Required information:
 - Host: The address of the Splunk instance that runs the HTTP event collector (HEC).
 - Protocol: Check if TLS is enabled within the HEC settings :guilabel:`Settings > Data Inputs > HTTP Event Collector`.
 - Port: Default is 8088, this can be configured within the Global Settings section of the Splunk HEC.
 - API Key: An API key must be created and provided in the passphrase object of the declaration, refer to Splunk documentation for the correct way to create an HEC token.

Example Declaration:

.. literalinclude:: ../examples/declarations/splunk.json
    :language: json

.. _splunk-legacy:

Splunk Legacy format
^^^^^^^^^^^^^^^^^^^^
The **format** property can be set to **legacy** for Splunk users who wish to convert the stats output similar to the |splunk app|. To see more information, see |Analytics|. To see more information about using the HEC, see |HEC|.  See the following example.

In Telemetry Streaming v1.6.0 and later, you must use the **facility** parameter with the legacy format to specify a Splunk facility in your declarations.  The facility parameter is for identification of location/facility in which the BIG-IP is located (such as 'Main Data Center', 'AWS', or 'NYC'). 

Required information for **facility**: 
  - The facility parameter must be inside of **actions** and then **setTag** as shown in the example.
  - The value for **facility** is arbitrary, but must be a string.
  - The **locations** property must include ``"system": true``, as that is where facility is expected.
  - The value for facility is required when the format is legacy (required by the Splunk F5 Dashboard application; a declaration without it will still succeed)
  
Example Declaration for Legacy (including facility):

.. literalinclude:: ../examples/declarations/splunk_legacy.json
    :language: json

|

.. _azure-ref:

Microsoft Azure Log Analytics
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
|azure_img|

Required Information:
 - Workspace ID: Navigate to :guilabel:`Log Analytics workspace > Advanced Settings > Connected Sources`.
 - Shared Key: Navigate to :guilabel:`Log Analytics workspace > Advanced Settings > Connected Sources` and use the primary key.

.. NOTE:: To see more information about sending data to Log Analytics, see |HTTP Data Collector API|.

Example Declaration:

.. literalinclude:: ../examples/declarations/azure_log_analytics.json
    :language: json


Example Dashboard:

The following is an example of the Azure dashboard with Telemetry Streaming data. To create a similar dashboard, see |azure_dashboard|. To create custom views using View Designer, see |Azure_custom_views|.

|azure_log_analytics_dashboard|


.. _awscloud-ref:

AWS Cloud Watch
~~~~~~~~~~~~~~~
|aws_img|   

Required information:
 - Region: AWS region of the cloud watch resource.
 - Log Group: Navigate to :guilabel:`Cloud Watch > Logs`
 - Log Stream: Navigate to :guilabel:`Cloud Watch > Logs > Your_Log_Group_Name`
 - Access Key: Navigate to :guilabel:`IAM > Users`
 - Secret Key: Navigate to :guilabel:`IAM > Users`

.. NOTE:: To see more information about creating and using IAM roles, see |IAM roles|.

Example Declaration:

.. literalinclude:: ../examples/declarations/aws_cloudwatch.json
    :language: json


.. _awss3-ref:

AWS S3
~~~~~~
|aws_s3|

Required Information:
 - Region: AWS region of the S3 bucket.
 - Bucket: Navigate to S3 to find the name of the bucket.
 - Access Key: Navigate to :guilabel:`IAM > Users`
 - Secret Key: Navigate to :guilabel:`IAM > Users`

.. NOTE:: To see more information about creating and using IAM roles, see |IAM roles|.

Example Declaration:

.. literalinclude:: ../examples/declarations/aws_s3.json
    :language: json


.. _graphite-ref:

Graphite
~~~~~~~~
|graphite|

Required Information:
 - Host: The address of the Graphite system.
 - Protocol: Check Graphite documentation for configuration.
 - Port: Check Graphite documentation for configuration.

.. NOTE:: To see more information about installing Graphite, see |Installing Graphite|. To see more information about Graphite events, see |Graphite Events|.

.. literalinclude:: ../examples/declarations/graphite.json
    :language: json


.. _kafka-ref:

Kafka
~~~~~
|Kafka|

Required Information:
 - Host: The address of the Kafka system.
 - Port: The port of the Kafka system.
 - Topic: The topic where data should go within the Kafka system
 - Protocol: The port of the Kafka system. Options: binaryTcp or binaryTcpTls. Default is binaryTcpTls
 - Authentication Protocol: The protocol to use for authentication process. Options: SASL-PLAIN or None. Default is None.
 - Username: The username to use for authentication process.
 - Password: The password to use for authentication process.

.. NOTE:: To see more information about installing Kafka, see |Installing Kafka|.

.. literalinclude:: ../examples/declarations/kafka.json
    :language: json


.. _elasticsearch-ref:

ElasticSearch
~~~~~~~~~~~~~
|ElasticSearch|

Required Information:
 - Host: The address of the ElasticSearch system.
 - Index: The index where data should go within the ElasticSearch system.

Optional Parameters:
 - Port: The port of the ElasticSearch system. Default is 9200.
 - Protocol: The protocol of the ElasticSearch system. Options: http or https. Default is http.
 - Allow Self Signed Cert: allow TS to skip Cert validation. Options: true or false. Default is false.
 - Path: The path to use when sending data to the ElasticSearch system.
 - Data Type: The type of data posted to the ElasticSearch system. Default is f5.telemetry
 - API Version: The API version of the ElasticSearch system.
 - Username: The username to use when sending data to the ElasticSearch system.
 - Passphrase: The secret/password to use when sending data to the ElasticSearch system.

.. NOTE:: To see more information about installing ElasticSearch, see |Installing ElasticSearch|.

.. literalinclude:: ../examples/declarations/elasticsearch.json
    :language: json



.. _sumologic-ref:

Sumo Logic
~~~~~~~~~~
|Sumo Logic|

Required Information:
 - Host: The address of the Sumo Logic collector.
 - Protocol: The protocol of the Sumo Logic collector.
 - Port: The port of the Sumo Logic collector.
 - Path: The HTTP path of the Sumo Logic collector (without the secret).
 - Secret: The protected portion of the HTTP path (the final portion of the path, sometimes called a system tenant).

.. NOTE:: To see more information about installing Sumo Logic, see |Installing Sumo Logic|.

.. literalinclude:: ../examples/declarations/sumo_logic.json
    :language: json



.. _statsd-ref:

StatsD
~~~~~~
|StatsD|

Required Information:
 - Host: The address of the StatsD instance.
 - Protocol: The protocol of the StatsD instance. The default is UDP.
 - Port: The port of the Statsd instance

.. NOTE:: To see more information about installing StatsD, see |StatsDWiki|.

.. literalinclude:: ../examples/declarations/statsd.json
    :language: json



.. _http-ref:

Generic HTTP
~~~~~~~~~~~~

Required Information:
 - Host: The address of the system.
 - Protocol: The protocol of the system. Options: ``https`` or ``http``. Default is ``http``.
 - Port: The protocol of the system. Default is ``443``.
 - Path: The path of the system. Default is ``/``.
 - Method: The method of the system. Options: ``POST``, ``PUT``, ``GET``. Default is ``POST``.
 - Headers: The headers of the system.
 - Passphrase: The secret to use when sending data to the system, for example an API key to be used in an HTTP header.

.. NOTE:: Since this consumer is designed to be generic and flexible, how authentication is performed is left up to the web service. To ensure the secrets are encrypted within Telemetry Streaming please note the use of JSON pointers. The secret to protect should be stored inside ``passphrase`` and referenced in the desired destination property, such as an API token in a header as shown in this example. 

.. literalinclude:: ../examples/declarations/generic_http.json
    :language: json

.. NOTE::  If multiple secrets are required, defining an additional secret within ``Shared`` and referencing it using pointers is supported. For more details about pointers see the section on :ref:`pointersyntax`.

Example with multiple passphrases:

.. literalinclude:: ../examples/declarations/multiple_passphrases.json
    :language: json



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



.. toctree::
   :caption: Choose a provider
   :hidden:
   :glob:
   :maxdepth: 1

   
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
