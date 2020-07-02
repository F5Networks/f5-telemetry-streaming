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

I'm receiving a path not registered error when I try to post a declaration
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  

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

I'm receiving a limit of total fields exceeded error when Telemetry Streaming forwards statistics to ElasticSearch
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

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

I'm receiving a SELF_SIGNED_CERT_IN_CHAIN error
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you are receiving this error, you are using a self-signed certificate in a declaration.  You can use the **allowSelfSignedCert** parameter set to **true** to use self-signed certificates (see :doc:`advanced-options` for more information and usage).  

|

.. _nodist:

I can no longer find the TS source RPM on GitHub
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Beginning with TS 1.7.0, the RPM and checksum files are no longer located in the **/dist** directory in the Telemetry Streaming repository on GitHub.  These files can be found on the |release|, as **Assets**. 

You can find historical files on GitHub by using the **Branch** drop-down, clicking the **Tags** tab, and then selecting the appropriate release.

|

.. _nodata:

Why is data not showing up in my consumer?
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
If data is not appearing in your consumer, use the following troubleshooting advice appropriate for your Telemetry Streaming configuration.

**If you are using the Event Listener** |br|

If you are using the :ref:`Event Listener<eventlistener-ref>` to publish events and/or logs to a Consumer, first check the configuration required for the Event Listener to function successfully. There are three individual configuration tasks that need to occur:

#. Ensure the Telemetry Streaming declaration has a **Telemetry_Listener** class defined, and that the declaration successfully succeeds.
#. Ensure you have completed the base configuration of the BIG-IP, which enables logs and/or events to be published to Telemetry Streaming. See :doc:`event-listener`. |br|    

   .. IMPORTANT:: The BIG-IP documentation references a port number used as a part of publishing logs. The port number you use in this configuration must be the same as the port number in the **port** property of the Telemetry_Listener class in your Telemetry Streaming declaration. The BIG-IP publishes events and/or logs to the IP:PORT defined in the configuration, and Telemetry Streaming listens for events on this port.

#.	Ensure the profiles (AFM/ASM Security Log profiles, or the LTM Request profiles) are attached to the Virtual Servers that should be monitored. Only Virtual Servers that have logging profiles attached publish logs to Telemetry Streaming.
 
|

**If you are attempting to use the System Poller** |br|

If you are using the System Poller to get metrics from your BIG-IP, ensure that your Telemetry Streaming declaration has a :ref:`Telemetry_System class<tssystem-ref>`, and this class has the **systemPoller** property defined.

|

**Verify the Consumer configuration** |br|

Once you have verified your Event Listener and/or System Poller, check the configuration for the Consumer(s) in your declaration, and ensure that any external consumers are reachable from the BIG-IP device.  See :doc:`setting-up-consumer` and :doc:`pull-consumers` for consumer configuration.

|

**Check the Telemetry Streaming logs** |br|

By default, Telemetry Streaming logs to **restnoded.log** (stored on the BIG-IP at **/var/log/restnoded/restnoded.log**), at the *info* level. At the *info* log level, you can see any errors that Telemetry Streaming encounters. The consumers within Telemetry Streaming also log an error if they are not able to connect to the external system.

For example, the following log line shows that the Fluent_Consumer cannot connect to the external system at 10.10.1.1:343:

``Wed, 01 Jul 2020 21:36:13 GMT - severe: [telemetry.Generic_HTTP.Fluent_Consumer] error: connect ECONNREFUSED 10.10.1.1:343``
 
|

Additionally, you can adjust the log level of Telemetry Streaming by changing the **logLevel** property in the **Controls** object (see |controls| in the schema reference). 

When the log level is set to **debug**, many more events are logged to the restnoded log. For example, you can see:

- When the System Poller successfully runs, and if the Consumer(s) were able to successfully publish the System Poller data. The following example log shows the System Poller data (data type: systemInfo) was successfully processed, and where the Fluent_Consumer successfully published that data:
  
  .. code-block:: bash

     Wed, 01 Jul 2020 21:46:59 GMT - finest: [telemetry] Pipeline processed data of type: systemInfo 
     Wed, 01 Jul 2020 21:46:59 GMT - finest: [telemetry] System poller cycle finished
     Wed, 01 Jul 2020 21:46:59 GMT - finest: [telemetry.Generic_HTTP.Fluent_Consumer] success

- When the Event Listener publishes events, the type of that event, and whether the Consumer successfully published the event. The following example shows both an ASM and LTM event being successfully processed by Telemetry Streaming, and published by the Fluent_Consumer:  

  .. code-block:: bash

     Wed, 01 Jul 2020 21:48:59 GMT - finest: [telemetry] Pipeline processed data of type: ASM Wed, 01 Jul 2020 21:48:59 GMT - finest: [telemetry] Pipeline processed data of type: LTM
     Wed, 01 Jul 2020 21:48:59 GMT - finest: [telemetry.Generic_HTTP.Fluent_Consumer] success
     Wed, 01 Jul 2020 21:48:59 GMT - finest: [telemetry.Generic_HTTP.Fluent_Consumer] success




.. |ElasticSearch Mapping| raw:: html

   <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html" target="_blank">ElasticSearch mapping documentation</a>

.. |br| raw:: html
   
   <br />

.. |release| raw:: html

   <a href="https://github.com/F5Networks/f5-telemetry-streaming/releases" target="_blank">GitHub Release</a>


.. |controls| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/schema-reference.html#controls" target="_blank">Controls</a>

