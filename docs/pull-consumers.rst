.. _pullconsumer-ref:

Pull Consumers
==============
Use this section to find example declarations and notes for pull-based monitoring systems. See :doc:`setting-up-consumer` for push-based consumers.

.. _aboutpull:

About Pull Consumers
--------------------
F5 BIG-IP Telemetry Streaming 1.11 introduced a *pull* consumer to support pull-based monitoring systems using a new class called **Telemetry_Pull_Consumer**.  External systems can use this Pull API to pull/scrape for metrics.

- F5 BIG-IP Telemetry Streaming Pull Consumers expose a new HTTP API, which can be scraped for metrics.
- You can only pull data from Systems and/or System Pollers that are already defined through an F5 BIG-IP Telemetry Streaming declaration.
- With TS 1.11, you can set a Telemetry_System_Poller **interval=0**. This disables the background polling process, but keeps the Poller enabled. Using interval=0 on a Poller allows for the Poller to only collect data from a BIG-IP when the Pull Consumer API endpoint is scraped, so that the Poller doesn't collect data from a BIG-IP when it is not needed.
- If a Poller is used for both a Pull Consumer and a Push Consumer, the interval will need to be set to a non-zero number of seconds, so that the background polling process will collect data and push it to the configured Push Consumers.
- Each Pull Consumer must reference, via the systemPoller property, which Telemetry_System_Poller the Pull Consumer will collect data from when the Pull Consumer HTTP API is called. This can be configured as a single systemPoller, or as an array of systemPollers, using the name of the configured System Poller.
- If a Poller referred by a Pull Consumer was attached to two Systems, then the response from the Pull Consumer will contain data from those Systems.

|

Using a Pull Consumer
---------------------
Telemetry Streaming now exposes the ``/mgmt/shared/telemetry/pullconsumer/<pull_consumer_name>`` HTTP endpoint, which returns metrics from the Pull Consumer referenced, by name, in the HTTP call.

Example CURL call: **GET /mgmt/shared/telemetry/pullconsumer/My_Pull_Consumer**

See |pullref| in the Schema Reference for usage information.

|

.. _pushpull:

Using Pull Consumers and Push Consumers
---------------------------------------
An F5 BIG-IP Telemetry Streaming declaration may contain multiple System Pollers, as well as both Push Consumer(s) and Pull Consumer(s).

The following example contains:

- Two Telemetry_System_Pollers (**My_Poller** and **My_VS_Poller**), both attached to the Telemetry_System (**My_System**)
- One *Push* Consumer (**Splunk_Consumer**)
- One *Pull* Consumer (**My_Pull_Consumer**)

In this example:

- The **My_Poller** System Poller queries the BIG-IP every 60 seconds for telemetry data. My_Poller pushes that telemetry data to all of the enabled Push Consumers – in this case, the **Splunk_Consumer**.
- The **My_VS_Poller** System Poller has a polling interval equal to 0 – it does not poll the BIG-IP for telemetry data on its own schedule.
- The **My_Pull_Consumer** Pull Consumer references the **My_VS_Poller**. |br| When My_Pull_Consumer is queried (via an HTTP GET), it:

  - Invokes **My_VS_Poller**, causing My_VS_Poller to fetch telemetry data from the BIG-IP, 
  - Applies the filtering defined in the **actions** block, 
  - Returns the formatted data in the HTTP response body. 
  
- The telemetry data fetched by **My_VS_Poller** is NOT sent to the **Splunk_Consumer** Consumer.

.. literalinclude:: ../examples/declarations/push_and_pull_consumers.json
    :language: json

|

|

.. _pull:

Default Pull Consumer
---------------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the default pull consumer is available in BIG-IP TS 1.11.0 and later. 

This example shows how to use the default pull consumer.  For the default pull consumer, the type must be **default** in the Pull Consumer class as shown.

The primary use case of such type of pull consumer is troubleshooting.

Example declaration:

.. literalinclude:: ../examples/declarations/consumers/Pull_Consumer/default_pull_consumer.json
    :language: json

|

.. _prometheus:

Prometheus Pull Consumer
------------------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the Prometheus pull consumer is available in BIG-IP TS 1.12.0 and later. 

|prometheus_img|

This example shows how to use the Prometheus pull consumer. For this pull consumer, the type must be **Prometheus** in the Pull Consumer class as shown.

The Prometheus Pull Consumer outputs the telemetry data according to the Prometheus data model specification. For more information about the Prometheus data model, see https://prometheus.io/docs/concepts/data_model/.

**NOTE**: To access the consumer endpoint with a user other than **admin**, refer to |dcarticle|. When you create the resource group while following this guide, you will need a resource group similar to the following:

.. code-block:: json

   {
      "name": "prometheusResourceGrup",
      "resources": [
         {
               "restMethod": "GET",
               "resourceMask": "/mgmt/shared/telemetry/pullconsumer/My_Pull_Consumer"
         }
      ]
   }

|

Example declaration:

.. literalinclude:: ../examples/declarations/consumers/Prometheus/prometheus_pull_consumer.json
    :language: json



.. |br| raw:: html
   
   <br />

.. |pullref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/schema-reference.html#telemetry-pull-consumer" target="_blank">Telemetry_Pull_Consumer</a>


.. |prometheus_img| image:: /images/prometheus.png
   :target: https://prometheus.io/
   :alt: Prometheus

.. |dcarticle| raw:: html

   <a href="https://devcentral.f5.com/s/articles/icontrol-rest-fine-grained-role-based-access-control-30773" target="_blank">this article on DevCentral</a>


