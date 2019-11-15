.. _eventlistener-ref:

Event Listener class
====================

The Telemetry Streaming Event Listener collects event logs from all BIG-IP sources, including LTM, ASM, AFM, APM, and AVR. You can configure all of these by POSTing a single AS3 declaration or you can use TMSH or the GUI to configure individual modules. Below you will find an example AS3 declaration as well as instructions for configuring each module.


.. _configurelogpubas3-ref:

Configure Logging using AS3
---------------------------

You can use the following declaration with Application Services Extension (AS3) 3.10.0 or later. For more information, see |as3docs|.  For configuring logging using the BIG-IP TMSH interface, see :ref:`configuretmsh`.

.. literalinclude:: ../examples/misc/application_services_3/all_log_profile.json
    :language: json



The Request Logging profile gives you the ability to configure data within a log file for HTTP requests and responses, in accordance with specified parameters.

|

.. _configuretmsh:

Configure Logging Using TMSH
----------------------------
The following sections show how to configure logging using TMSH


LTM Request Log profile
```````````````````````

To configure an LTM request profile, use the following TMSH commands:

.. NOTE:: All keys should be in lower case to enable classification (tenant/application).

1. Create a pool in TMSH: 

   .. code-block:: bash

        create ltm pool telemetry-local monitor tcp members replace-all-with { 192.0.2.1:6514 }

    
   Replace the example address with a valid Telemetry Streaming listener address, for example the management IP address.

2. Create an LTM Request Log Profile using the following TMSH command. Note: If you are creating the profile in the user interface, the ``\`` are not required. 

   .. code-block:: bash

       create ltm profile request-log telemetry request-log-pool telemetry-local request-log-protocol mds-tcp request-log-template event_source=\"request_logging\",hostname=\"$BIGIP_HOSTNAME\",client_ip=\"$CLIENT_IP\",server_ip=\"$SERVER_IP\",http_method=\"$HTTP_METHOD\",http_uri=\"$HTTP_URI\",virtual_name=\"$VIRTUAL_NAME\",event_timestamp=\"$DATE_HTTP\" request-logging enabled

3. Attach the profile to the virtual server, for example: 

   .. code-block:: bash
    
      modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry { context all } }

|

Example Output from Telemetry Streaming:

.. literalinclude:: ../examples/output/request_logs/ltm_request_log.json
    :language: json


.. _cgnat:

Configuring CGNAT logging
`````````````````````````
To configure carrier-grade network address translation (CGNAT), use the following guidance.  For more information on CGNAT, see |cgnatdoc|. 

.. NOTE:: You must have Carrier Grade NAT licensed and enabled to use CGNAT features.

1. Create a basic Telemetry Streaming configuration (such as :ref:`configurelogpubas3-ref`).

2. Configure the BIG-IP to send log messages about CGNAT processes.  For instructions, see the CGNAT Implementations guide chapter on logging for your BIG-IP version.  For example, for BIG-IP 14.0, see |cgnatdocs|.  Make sure of the following:

   - The Large Scale NAT (LSN) Pool must use the Telemetry Streaming Log Publisher you created (**telemetry_publisher** if you used the AS3 example to configure TS logging).  |br| If you have an existing pool, update the pool to use the TS Log Publisher:

     - TMSH:|br| ``modify ltm lsn-pool cgnat_lsn_pool log-publisher telemetry_publisher``
     - GUI:|br| **Carrier Grade NAT > LSN Pools > LSN Pools List**  |br| |br|

   - Create and attach a new CGNAT Logging Profile to the LSN pool.  This determines what types of logs you wish to receive (optional).

     - TMSH-create:|br| ``create ltm lsn-log-profile telemetry_lsn_log_profile { start-inbound-session { action enabled } }``
     - TMSH-attach:|br| ``modify ltm lsn-pool cgnat_lsn_pool log-profile telemetry_lsn_log_profile``
     - GUI:|br| **Carrier Grade NAT -> Logging Profiles -> LSN**

Example output:

.. code-block:: json

   {
        "ip_protocol":"TCP",
        "lsn_event":"LSN_DELETE",
        "start":"1562105093001",
        "cli":"X.X.X.X",
        "nat":"Y.Y.Y.Y",
        "duration":"5809",
        "pem_subscriber_id":"No-lookup",
        "telemetryEventCategory":"CGNAT"
   }


|

AFM Request Log profile
```````````````````````

1. Create and :ref:`configurelogpub-ref`.

2. Create a Security Log Profile using TMSH or :ref:`configurelogpubas3-ref`:

   .. code-block:: bash
    
        create security log profile telemetry network replace-all-with { telemetry { filter { log-acl-match-drop enabled log-acl-match-reject enabled } publisher telemetry_publisher } }


3. Attach the profile to the virtual server, for example: 

   .. code-block:: bash
    
      modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry { context all } }


|

Example output from Telemetry Streaming:

.. literalinclude:: ../examples/output/request_logs/afm_request_log.json
    :language: json

|


ASM Log
```````

1. Create a Security Log Profile using either TMSH or :ref:`configurelogpubas3-ref`:

   .. code-block:: python
    
      create security log profile telemetry application replace-all-with { telemetry { filter replace-all-with { request-type { values replace-all-with { all } } } logger-type remote remote-storage splunk servers replace-all-with { 255.255.255.254:6514 {} } } }

2. Attach the profile to the virtual server, for example: 

   .. code-block:: bash
    
      modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry { context all } }


|

Example Output from Telemetry Streaming:

.. literalinclude:: ../examples/output/request_logs/asm_request_log.json
    :language: json


|

APM Log
```````

1. Create and :ref:`configurelogpub-ref` or :ref:`configurelogpubas3-ref`.

2. Create an APM Log Profile. For example:

   .. code-block:: bash
    
        create apm log-setting telemetry access replace-all-with { access { publisher telemetry-publisher } }

3. Attach the profile to the APM policy.

4. Attach the profile to the virtual server, for example: 

   .. code-block:: bash
    
      modify ltm virtual <VIRTUAL_SERVER_NAME> profiles add { telemetry { context all } }


|

Example Output from Telemetry Streaming:

.. literalinclude:: ../examples/output/request_logs/apm_request_log.json
    :language: json

|


.. _avrbasic-ref:

AVR Log
```````
For information, see :ref:`avr-ref`. 



System Log
``````````

1. Modify the system syslog configuration by adding a destination, using the following TMSH command:

   .. code-block:: bash

        modify sys syslog remote-servers replace-all-with { server { host 127.0.0.1 remote-port 6514 } }    


2. Modify system logging configuration to update what gets logged:

   .. code-block:: bash

        modify sys daemon-log-settings mcpd audit enabled


Example output:

.. code-block:: json

    {
        "data":"<85>Feb 12 21:39:43 telemetry notice sshd[22277]: pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=218.92.1.148  user=root",
        "telemetryEventCategory":"syslog"
    }



.. _configurelogpub-ref:

Configure the Log Publisher using TMSH
``````````````````````````````````````

Note the following:

  - Examples assume the TS listener is using port 6514.
  - Additional objects are required for BIG-IP configurations pointing to a local on-box listener (configuration notes included in the following procedure).
  - Per-app Virtual Edition BIG-IP limits the number of virtual servers available. To avoid creating the virtual server creating the virtual server in the following configuration, it is possible to point the pool directly at the TMM link-local IPv6 address, using the following guidance:

    - From the BIG-IP Command line, type the following command ``ip -6 a s tmm scope link``.  |br| You see the system return something similar to the following: |br| ``tmm: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP qlen 1000`` |br| ``inet6 fe80::298:76ff:fe54:3210/64 scope link`` |br| ``valid_lft forever preferred_lft forever``

    - Copy the IPv6 address starting after inet6, beginning with fe80, and without any mask. In our example, we copy **fe80::298:76ff:fe54:3210**

    - Create a pool using the following command: |br| ``tmsh create ltm pool telemetry members replace-all-with { fe80::298:76ff:fe54:3210.6514 }``  (replace the IPv6 link-local address with the one returned from the BIG-IP in the first step)

    - SKIP steps 1-3 below, and then continue with step 4.


1. Create an iRule (localhost forwarder). **This is only required when TS is a local listener**.

   .. code-block:: bash

        create ltm rule telemetry_local_rule

   And insert the following iRule code:

   .. code-block:: bash
    
        when CLIENT_ACCEPTED {
            node 127.0.0.1 6514
        }


2. Create the virtual server. **This is only required when TS is a local listener**.

   .. code-block:: bash

        create ltm virtual telemetry_local destination 255.255.255.254:6514 rules { telemetry_local_rule }


3. Create the pool. When TS is not a local listener, the member should be the listener's remote address.

   .. code-block:: bash

        create ltm pool telemetry monitor tcp members replace-all-with { 255.255.255.254:6514 }


4. Create the Log Destination (Remote HSL):

   .. code-block:: python

        create sys log-config destination remote-high-speed-log telemetry_hsl protocol tcp pool-name telemetry


5. Create the Log Destination (Format):

   .. code-block:: python

        create sys log-config destination splunk telemetry_formatted forward-to telemetry_hsl


6. Create the Log Publisher:

   .. code-block:: python

        create sys log-config publisher telemetry_publisher destinations replace-all-with { telemetry_formatted }



.. |as3docs| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/latest/" target="_blank">AS3 documentation</a>

.. |analytics| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_analytics/manuals/product/analytics-implementations-13-1-0.html" target="_blank">BIG-IP Analytics Implementations guide</a>
   
.. |cgnatdoc| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/bigip-cgnat-implementations-13-1-0/1.html" target="_blank">BIG-IP CGNAT: Implementations</a>

.. |cgnatdocs| raw:: html

   <a href="https://techdocs.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/big-ip-cgnat-implementations-14-0-0/08.html" target="_blank">BIG-IP CGNAT: Implementations - Using CGNAT Logging and Subscriber Traceability</a>

.. |br| raw:: html
   
   <br />


   


