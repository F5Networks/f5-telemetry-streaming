Configuring a Consumer Stream
=============================

.. _awslink:
.. _azurelink:
.. _grafanalink:
.. _kafkalink:
.. _splunklink:

Splunk
~~~~~~
|splunk_img|

- Host: The address of the Splunk instance that runs the HTTP event collector (HEC).
- Protocol: Check if TLS is enabled within the HEC settings (Settings > Data Inputs > HTTP Event Collector).
- Port: Default is 8088, this can be configured within the Global Settings section of the Splunk HEC.
- API Key: An API key must be created and provided in the passphrase object of the declaration, refer to Splunk documentation for the correct way to create an HEC token.

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

To find the Workspace ID, navigate to :guilabel:`Log Analytics workspace > Advanced Settings > Connected Sources`. For more information see |Azure documentation|.
To find the Shared Key, navigate to :guilabel:`Log Analytics workspace > Advanced Settings > Connected Sources` and use the primary key.

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

   aws_index.rst
   azure_index.rst
   grafana_index.rst
   kafka_index.rst
   splunk_index.rst
   
.. |Azure documentation| raw:: html

   <a href="https://docs.microsoft.com/en-us/azure/azure-monitor/platform/data-collector-api" target="_blank">Azure documentation</a>

.. |IAM roles| raw:: html

   <a href="https://aws.amazon.com/iam/" target="_blank">AWS Identity and Access Management (IAM) documentation</a>


