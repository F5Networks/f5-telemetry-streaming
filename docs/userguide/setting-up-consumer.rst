Configuring a Consumer Stream
=============================

Use this section to find example declarations and notes for supported consumers.

.. _awslink:
.. _azurelink:
.. _grafanalink:
.. _kafkalink:
.. _splunklink:

Splunk
~~~~~~
|splunk_img|

Required information:
 - Host: The address of the Splunk instance that runs the HTTP event collector (HEC).
 - Protocol: Check if TLS is enabled within the HEC settings :guilabel:`Settings > Data Inputs > HTTP Event Collector`.
 - Port: Default is 8088, this can be configured within the Global Settings section of the Splunk HEC.
 - API Key: An API key must be created and provided in the passphrase object of the declaration, refer to Splunk documentation for the correct way to create an HEC token.

.. NOTE:: To see more information about using the HEC, see |HEC|.

Example Declaration:

.. code-block:: json
   :linenos:

    {
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Splunk",
            "host": "192.0.2.1",
            "protocol": "http",
            "port": "8088",
            "passphrase": {
                "cipherText": "apikey"
            }
        }
    }


Microsoft Azure Log Analytics
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
|azure_img|

Required Information:
 -Workspace ID: Navigate to :guilabel:`Log Analytics workspace > Advanced Settings > Connected Sources`.
 -Shared Key: Navigate to :guilabel:`Log Analytics workspace > Advanced Settings > Connected Sources` and use the primary key.

.. NOTE:: To see more information about sending data to Log Analytics, see |HTTP Data Collector API|.

Example Declaration:

.. code-block:: json
   :linenos:

    {
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Azure_Log_Analytics",
            "workspaceId": "workspaceid",
            "passphrase": {
                "cipherText": "sharedkey"
            }
        }
    }


Example Dashboard:

|azure_dashboard_img|

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

.. code-block:: json
   :linenos:

    {
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "AWS_CloudWatch",
            "region": "us-west-1",
            "logGroup": "f5telemetry",
            "logStream": "default",
            "username": "accesskey",
            "passphrase": {
                "cipherText": "secretkey"
            }
        }
    }

AWS S3
~~~~~~

Required Information:
 - Region: AWS region of the S3 bucket.
 - Bucket: Navigate to S3 to find the name of the bucket.
 - Access Key: Navigate to :guilabel:`IAM > Users`
 - Secret Key: Navigate to :guilabel:`IAM > Users`

.. NOTE:: To see more information about creating and using IAM roles, see |IAM roles|.

Example Declaration:

.. code-block:: json
   :linenos:

    {
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "AWS_S3",
            "region": "us-west-1",
            "bucket": "bucketname",
            "username": "accesskey",
            "passphrase": {
                "cipherText": "secretkey"
            }
        }
    }


Graphite
~~~~~~~~

Required Information:
 - Host: The address of the Graphite system.
 - Protocol: Check Graphite documentation for configuration.
 - Port: Check Graphite documentation for configuration.

 .. NOTE:: To see more information about installing Graphite, see |Installing Graphite|. To see more information about Graphite events, see |Graphite Events|.

.. code-block:: json
   :linenos:

    {
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Graphite",
            "host": "192.0.2.1",
            "protocol": "http",
            "port": "80"
        }
    }




.. |aws_img| image:: /images/aws_logo.png
   :target: aws_index.html
   :alt: Amazon Web Services

.. |azure_img| image:: /images/azure_logo.png
   :target: https://docs.microsoft.com/en-us/azure/azure-monitor/log-query/log-query-overview
   :alt: Microsoft Azure

.. |grafana_img| image:: /images/grafana-logo.png
   :target: grafana_index.html
   :alt: Grafana

.. |kafka_img| image:: /images/kafka-logo-wide.png
   :target: kafka_index.html
   :alt: Kafka

.. |splunk_img| image:: /images/splunk_logo.png
   :target: https://www.splunk.com
   :alt: Splunk


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

.. |HTTP Data Collector API| raw:: html

   <a href="https://docs.microsoft.com/en-us/azure/azure-monitor/platform/data-collector-api" target="_blank">HTTP Data Collector API documentation</a>

.. |Installing Graphite| raw:: html

   <a href="https://graphite.readthedocs.io/en/latest/install.html" target="_blank">Installing Graphite documentation</a>

.. |Graphite Events| raw:: html

   <a href="https://graphite.readthedocs.io/en/latest/events.html" target="_blank">Graphite Events documentation</a>
