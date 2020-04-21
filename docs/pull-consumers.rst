.. _pullconsumer-ref:

Pull Consumers
==============
Use this section to find example declarations and notes for pull-based monitoring systems. See :doc:`setting-up-consumer` for push-based consumers.


About Pull Consumers
--------------------
Telemetry Streaming 1.11 introduces a *pull* consumer to support pull-based monitoring systems using a new class called **Telemetry_Pull_Consumer**.  External systems can use this Pull API to pull/scrape for metrics.

- You can only pull data from Systems and/or System Pollers that are already defined through a Telemetry Streaming declaration.
- With TS 1.11, you can set a Telemetry_System_Poller **interval=0**. This disables the background polling process, but keeps the Poller enabled. Using interval=0 on a Poller allows for the Poller to only collect data from a BIG-IP when the Pull Consumer API endpoint is scraped, so that the Poller doesn't collect data from a BIG-IP when it is not needed.
- If a Poller is used for both a Pull Consumer and a Push Consumer, the interval will need to be set to a non-zero number of seconds, so that the background polling process will collect data and push it to the configured Push Consumers.
- Each Pull Consumer must reference, via the systemPoller property, which Telemetry_System_Poller the Pull Consumer will collect data from when the Pull Consumer HTTP API is called. This can be configured as a single systemPoller, or as an array of systemPollers, using the name of the configured System Poller


|

|

.. _pull:

Default Pull Consumer
---------------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the default pull consumer is available in TS 1.11.0 and later. 

This example shows how to use the default pull consumer.  For the default pull consumer, the type must be **default** in the Pull Consumer class as shown.

See |pullref| in the Schema Reference for usage information.


URL format: **/mgmt/shared/telemetry/pullconsumer/<pull_consumer_name>**

Example CURL call: **GET /mgmt/shared/telemetry/pullconsumer/My_Pull_Consumer**

Example declaration:

.. literalinclude:: ../examples/declarations/default_pull_consumer.json
    :language: json


.. |br| raw:: html
   
   <br />

.. |pullref| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/schema-reference.html#telemetry-pull-consumer" target="_blank">Telemetry_Pull_Consumer</a>