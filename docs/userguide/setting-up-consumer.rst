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

AWS S3
~~~~~~

Graphite
~~~~~~~~


|grafana_img| |kafka_img| 


.. |aws_img| image:: /images/aws_logo.png
   :target: aws_index.html
   :alt: Amazon Web Services

.. |azure_img| image:: /images/azure_logo.png
   :target: azure_index.html
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
   

