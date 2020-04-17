.. _pullconsumer-ref:

Pull Consumers
==============

Use this section to find example declarations and notes for pull-based monitoring systems.

.. IMPORTANT:: Each of the following examples shows only the **Consumer** class of a declaration and must be included with the rest of the base declaration (see :ref:`components`).


.. _pull:

Pull Consumer
-------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for the pull consumer is available in TS 1.11.0 and later. 

Telemetry Streaming 1.11 introduces a *pull* consumer to support pull-based monitoring systems using a new class called **Telemetry_Pull_Consumer**.  External systems can use this Pull API to pull/scrape for metrics.

Requirements and notes:
 - You can only pull data from Systems and/or System Pollers that are already defined through a Telemetry Streaming declaration.
 - Only enabled=true (if not in debug mode) Systems or SystemPollers should return data
 - The Pull Consumer must be attached to a System Poller (using the **poller** property in the Telemetry_Pull_Consumer class).
 - The Pull Consumer creates a new endpoint: **/mgmt/shared/pullconsumer/<pull_consumer_name>**
 - A System Poller may have ``interval=0``, which instructs Telemetry Streaming not to poll on an interval, but wait for the endpoint to be called to poll
 - Caching and attaching System Pollers to existing, push-based consumers are not currently supported, but are on the roadmap for a future release.


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