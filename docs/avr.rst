.. _avr-ref:

Exporting data from AVR
=======================

As of TS version 1.3.0, you can now export AVR data. The TS declaration will be the same but the Event Listener needs to be configured to allow TS to receive AVR data from the BIG-IP system. At a high level the prerequisites include:
 
- AVR module should be provisioned 
- TS should have the Event Listener configured
- AVR should be configured to send data to TS
- The Analytics profile for HTTP or TCP should be configured and assigned to the virtual server

.. NOTE:: To see more information on AVR, see the |analytics|.


Modify system logging configuration to update what gets logged by running the following commands in TMSH:

For BIG-IP version 13.X: 

.. code-block:: bash

    modify analytics global-settings { ecm-address 127.0.0.1 ecm-port 6514 use-ecm enabled use-offbox enabled }

.. NOTE:: You may need to run the command ``bigstart restart avrds`` after running this command on BIG-IP version 13.X.


For BIG-IP version 14.X: 

.. code-block:: bash

    modify analytics global-settings { offbox-protocol tcp offbox-tcp-addresses add { 127.0.0.1 } offbox-tcp-port 6514 use-offbox enabled }

|

Example output of AVR basic data:

.. literalinclude:: ../examples/output/avr/avr_basic_data.json
    :language: json

| 



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

