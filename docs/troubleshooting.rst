Troubleshooting
===============
Use this section to read about known issues and for common troubleshooting steps.

Telemetry Streaming general troubleshooting tips
------------------------------------------------

- Examine the restnoded failure log at /var/log/restnoded/restnoded.log (this is where Telemetry Streaming records error messages)

- Examine the REST response:

  - A 400-level response will carry an error message with it
  - If this message is missing, incorrect, or misleading, please let us know by filing an issue on Github.

- Use Telemetry's trace option to create a detailed trace of the configuration process for subsequent analysis. Telemetry's trace option can be a powerful tool to learn about its working details and to review Telemetry's operations in detail.


Troubleshooting
---------------

**I'm receiving a path not registered error when I try to post a declaration**  

If you are receiving this error, it means either you did not install Telemetry Streaming, or it did not install properly. The error contains the following message:  

.. code-block:: shell

    {
        "code":404,
        "message": "Public URI path no registered. Please see /var/log/restjavad.0.log and /var/log/restnoded/restnoded.log for details.".
        ...
    }


If you receive this error, see :doc:`installation` to install or re-install Telemetry Streaming.

|

.. _elkerror:

**I'm receiving a limit of total fields exceeded error when Telemetry Streaming forwards statistics to ElasticSearch**

If you are receiving this error, it means that Telemetry Streaming is exceeding the maximum allowed number of fields in the ElasticSearch index to which it is forwarding. The error contains the following message: |br|

.. code-block:: bash

    Tue, 04 Jun 2019 22:22:37 GMT - severe: [telemetry.ElasticSearch] error: [illegal_argument_exception] Limit of total fields [1000] in index [f5telemetry] has been exceeded


If you receive this error, use **one** of the following methods to correct the issue:


- Increase the ``index.mapping.total_fields.limit`` setting of the failing index to a larger value to compensate for the amount of data that Telemetry Streaming is sending. This can be accomplished using a **PUT** request to the URI **http(s)://<ElasticSearch>/<index_name>/_settings** with the following JSON body: |br| |br|

   .. code-block:: json

        {
            "index.mapping.total_fields.limit": 2000
        }


- Create the ElasticSearch index with an increased ``index.mapping.total_fields.limit`` value before Telemetry Streaming begins sending data to it. This can be done using a **PUT** request to the URI **http(s)://<ElasticSearch>/<index_name>** with the following JSON body: |br| |br|

   .. code-block:: json

        {
            "settings": {
                "index.mapping.total_fields.limit": 2000
            }
        }

|

.. NOTE:: To see more information about mapping in ElasticSearch, see |ElasticSearch Mapping|.


.. _certerror:

**I'm receiving a SELF_SIGNED_CERT_IN_CHAIN error**

If you are receiving this error, you are using a self-signed certificate in a declaration.  In Telemetry Streaming 1.5.0 and later, you can use the **allowSelfSignedCert** parameter set to **true** to use self-signed certificates (see :doc:`advanced-options` for more information and usage).  

If you are using a version of TS prior to 1.5.0 and are experiencing this error, you can either upgrade to TS 1.5.0, or use a certificate that is not self-signed.



.. |ElasticSearch Mapping| raw:: html

   <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html" target="_blank">ElasticSearch mapping documentation</a>

.. |br| raw:: html
   
   <br />
