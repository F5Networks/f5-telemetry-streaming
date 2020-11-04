.. _avr-ref:

Exporting data from AVR
=======================
This section shows how you can export data from the Application Visibility and Reporting (AVR) module to Telemetry Streaming.  To see more information on AVR, see the |analytics|.

.. NOTE:: For Telemetry Streaming 1.17, we modified the configuration on this page to use an existing Telemetry Streaming *Log Publisher* as opposed to a static IP address. We also added a new, optional section for TS and AVR in a fanout configuration.

The prerequisites for using TS with AVR include:
 
- The AVR module must be provisioned 
- You must have an Event Listener, including an an existing Log Publisher (see :ref:`eventlistener-ref` for instructions)
- The Analytics profile for HTTP or TCP should be configured and assigned to the virtual server

.. _avr-note:

.. NOTE:: It is currently not possible to configure AVR to publish data to both Telemetry Streaming and BIG-IQ concurrently. Additionally, if a BIG-IP is managed by a BIG-IQ, and has Statistics Collection enabled, the entire AVR configuration of the BIG-IP will be overwritten to publish only to the BIG-IQ.

|

Modifying AVR configuration to use the Log Publisher
----------------------------------------------------
To use AVR with Telemetry Streaming, you must modify the AVR logging configuration to point to the existing Log Publisher. If you do not have an existing log publisher, see :ref:`logsrc-ref` for guidance on creating one.

Use the following TMSH command, but be sure to change **telemetry_publisher** to the name of your Log Publisher if your publisher has a different name.


.. code-block:: bash

    modify analytics global-settings { external-logging-publisher /Common/Shared/telemetry_publisher offbox-protocol hsl use-offbox enabled  }



|

Example output of AVR basic data:

.. literalinclude:: ../examples/output/avr/avr_basic_data.json
    :language: json

| 

Optional: Configuring AVR and Telemetry Streaming in a fanout scenario
``````````````````````````````````````````````````````````````````````
If you want to configure AVR and Telemetry Streaming in a fanout configuration (where AVR can send to multiple destinations using the TS Log Publisher), you can add new Log Destinations to the existing Log Publisher.  For more information, see |hsldocs| in the AVR documentation. This includes configuration instructions using the BIG-IP Configuration utility. Note the Log Destination type must be **Remote High-Speed Log**.  The TS :ref:`Event Listener page<eventlistener-ref>` shows how to configure Log Destinations with AS3 and TMSH.

If you need to add a Log Destination to an existing AS3 declaration (see :ref:`as3logging-ref`), you can simply add the new destination to the existing Log Publisher's **Destination** array (named **telemetry_publisher** in our example, and the AS3 declaration.

|

Collecting data
---------------
Use the following sections for instructions on collecting specific types of data.


Collect HTTP data
`````````````````
Use the following guidance to collect HTTP data.

1. Create an HTTP Analytics Profile using the TMSH command line (you could alternatively configure this using the UI: **Local Traffic > Profiles > Analytics > HTTP analytics**. The rest of the examples on this page only show TMSH commands).

   .. code-block:: bash

        create ltm profile analytics telemetry-http-analytics { collect-geo enabled collect-http-timing-metrics enabled collect-ip enabled collect-max-tps-and-throughput enabled collect-methods enabled collect-page-load-time enabled collect-response-codes enabled collect-subnets enabled collect-url enabled collect-user-agent enabled collect-user-sessions enabled publish-irule-statistics enabled }


2. Assign the analytics profile to a virtual server.

   .. code-block:: bash

      modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry-http-analytics { context all } }


|

Example AVR output for HTTP Analytics profile:

.. literalinclude:: ../examples/output/avr/avr_basic_data.json
    :language: json

| 


Collect TCP data
````````````````

1. Create a TCP analytics profile. For example, using the TMSH command line:

   .. code-block:: bash

        create ltm profile tcp-analytics telemetry-tcp-analytics { collect-city enabled collect-continent enabled collect-country enabled collect-nexthop enabled collect-post-code enabled collect-region enabled collect-remote-host-ip enabled collect-remote-host-subnet enabled collected-by-server-side enabled }


2. Assign the analytics profile to virtual server. For example, using the TMSH command line:

   .. code-block:: bash

        modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry-tcp-analytics { context all } }


|

Example AVR output for TCP Analytics:

.. literalinclude:: ../examples/output/avr/avr_tcp_data.json
    :language: json

| 



Collect DNS data
````````````````

1. Create a DNS analytics profile. For example, using the TMSH command line:

   .. code-block:: bash

        create ltm profile dns telemetry-dns { avr-dnsstat-sample-rate 1 }


2. Assign the analytics profile to a GTM listener. For example, using the TMSH command line:

   .. code-block:: bash

        modify gtm  listener <GTM_LISTENER_NAME> { profiles replace-all-with { telemetry-dns { } } }


Example AVR output for :

|

Example AVR output for DNS analytics profile:

.. literalinclude:: ../examples/output/avr/avr_dns_data.json
    :language: json

| 



Collect ASM data
````````````````

1. Create an ASM policy and assign it to a virtual server.  For instructions on creating an ASM policy, see |asmpolicy|.


|

Example AVR output for ASM:


.. literalinclude:: ../examples/output/avr/avr_asm_data.json
    :language: json

| 

    


Collect AFM data
````````````````

1. Create an AFM DoS policy and assign it to a virtual server.  For instructions on creating an AFM DoS policy, see |afmpolicy|.



|

Example AVR output for AFM:


.. literalinclude:: ../examples/output/avr/avr_afm_data.json
    :language: json

| 

    

.. |analytics| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_analytics/manuals/product/analytics-implementations-13-1-0.html" target="_blank">BIG-IP Analytics Implementations guide</a>


.. |asmpolicy| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_asm/manuals/product/asm-getting-started-13-1-0/2.html" target="_blank">BIG-IP ASM: Creating a Simple Security Policy</a>


.. |afmpolicy| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip-afm/manuals/product/dos-firewall-implementations-13-1-0/4.html" target="_blank">BIG-IP AFM: Detecting and Preventing DNS DoS Attacks on a Virtual Server</a>

.. |hsldocs| raw:: html

   <a href="https://techdocs.f5.com/en-us/bigip-14-0-0/external-monitoring-of-big-ip-systems-implementations-14-0-0/configuring-remote-high-speed-logging.html" target="_blank">Configuring Remote High Speed Logging</a>

