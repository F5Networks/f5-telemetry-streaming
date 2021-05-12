.. _eventlistener-ref:

Event Listener class
====================

The Telemetry Streaming Event Listener collects event logs it receives on the specified port from configured BIG-IP sources, including LTM, ASM, AFM, APM, and AVR.

.. NOTE:: Each **Telemetry_Event_Listener** opens 3 ports: TCP (dual stack - IPv4 and IPv6), UDPv4, and UDPv6 |br| If two or more Event Listeners use same port, all of them receive same events, but you can still use filters for each listener individually.


To use the Event Listener, you must:

1. Configure the sources of log/event data. You can do this by either POSTing a single AS3 declaration or you can use TMSH or the GUI to configure individual modules.

2. Post a telemetry declaration with the Telemetry_Listener class, as shown in the following minimal example of an Event Listner:


.. code-block:: bash

   "My_Listener": {
      "class": "Telemetry_Listener",
      "port": 6514
   }


IMPORTANT:

- The following configuration examples assume that TS is running on the same BIG-IP that is being monitored, and that the listener is using default port 6514.
- When TS is not a local listener, the corresponding configurations should be adjusted to reflect remote addresses.



.. _logsrc-ref:

Configuring Logging Sources
---------------------------
General workflow to configure a logging source:

- Define a local virtual address and specify the Event Listener port (this enables TS to act as a local, on-box listener)
- Define a pool of logging servers
- Create an unformatted high speed logging destination that references the pool
- Create a formatted destination
- Create a log publisher which is referenced by a logging profile
- Associate the logging profile with the relevant virtual server

The following diagram shows the relationship of the objects that are configured:

|logging-png|
 


.. _as3logging-ref:

Configure Logging Using AS3
```````````````````````````

You can use the following declaration with Application Services Extension (AS3) 3.10.0 or later for a standard BIG-IP system. For more information, see |as3docs|.

You can also configure logging using TMSH, see :ref:`configuretmsh`. 

.. NOTE:: Some profiles are not supported in AS3 and therefore must be configured using TMSH.

**IMPORTANT**: This declaration has been updated with the TS 1.18 release to include LTM response logging (highlighted in yellow).

.. literalinclude:: ../examples/misc/application_services_3/all_log_profile.json
    :language: json
    :emphasize-lines: 95-103

|

.. _configuretmsh:

Configure Logging Using TMSH
````````````````````````````
This section describes how to configuring logging using TMSH.

The first steps depend on which type of BIG-IP system you are using: a :ref:`standard BIG-IP system<standard>` or a :ref:`Per-App BIG-IP VE (Virtual Edition)<perapp>`. 

Use only one of the following procedures for the initial configuration.

.. _perapp:

Initial configuration for Per-App BIG-IP VE
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The configuration for a Per-App VE is different because it limits the number of virtual servers (one virtual IP address and three virtual servers). 
  
If you are using a Per-App VE, to avoid creating the virtual server for the local listener, you can point the pool directly at the TMM link-local IPv6 address, using the following guidance:

#. From the BIG-IP Command line, type the following command: ``ip -6 a s tmm scope link``.  |br| You see the system return something similar to the following: |br| 
   
   .. code-block:: bash
   
     tmm: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP qlen 1000
     inet6 fe80::298:76ff:fe54:3210/64 scope link
     valid_lft forever preferred_lft forever


#. Copy the IPv6 address starting after **inet6**, beginning with **fe80**, and without any mask. In our example, we copy **fe80::298:76ff:fe54:3210**

#. Create a pool using the following command (replace the IPv6 link-local address with the one returned from the BIG-IP in the first step): |br| ``tmsh create ltm pool telemetry members replace-all-with { fe80::298:76ff:fe54:3210.6514 }``  

#. Continue with :ref:`restlogpub`.

.. _standard:

Initial configuration for a standard BIG-IP system
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

If you are using a standard BIG-IP system (one that does not have restrictions on the number of virtual servers like the Per-App VE), use the following guidance to initially configure the system.


#. Create an iRule (localhost forwarder).

   .. code-block:: bash

        create ltm rule telemetry_local_rule

   And insert the following iRule code:

   .. code-block:: bash
    
        when CLIENT_ACCEPTED {
            node 127.0.0.1 6514
        }


#. Create the virtual server for the local listener.

   .. code-block:: bash

        create ltm virtual telemetry_local destination 255.255.255.254:6514 rules { telemetry_local_rule }


#. Create the pool.

   .. code-block:: bash

        create ltm pool telemetry monitor tcp members replace-all-with { 255.255.255.254:6514 }

#. Continue with :ref:`restlogpub`.

|

.. _restlogpub:

Configuring the rest of the logging components
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
In this section, you configure the remaining objects for logging, no matter which initial configuration method you used.


#. Create the Log Destination (Remote HSL):

   .. code-block:: python

        create sys log-config destination remote-high-speed-log telemetry_hsl protocol tcp pool-name telemetry


#. Create the Log Destination (Format):

   .. code-block:: python

        create sys log-config destination splunk telemetry_formatted forward-to telemetry_hsl


#. Create the Log Publisher:

   .. code-block:: python

        create sys log-config publisher telemetry_publisher destinations replace-all-with { telemetry_formatted }

#. Create the Log Profile(s) then attach to the appropriate virtual server (see :ref:`loggingprofiles` for the options):


Example virtual server definition:

.. code-block:: bash

   create ltm virtual some_service destination 192.168.10.11:443 mask 255.255.255.255


|


.. _loggingprofiles: 

Logging Profiles
""""""""""""""""
You can use the following procedures to create different types of logging profiles.

- :ref:`LTM Request Log profile<requestlog>`
- :ref:`cgnat`
- :ref:`afm`
- :ref:`asm`
- :ref:`apm`
- :ref:`avrbasic-ref`
- :ref:`systemlog`

|

.. _requestlog:

LTM Request Log profile
~~~~~~~~~~~~~~~~~~~~~~~

The Request Logging profile gives you the ability to configure data within a log file for HTTP requests and responses, in accordance with specified parameters. 

.. NOTE:: Step 1 has been updated to include LTM response logging.

To configure an LTM request profile, use the following TMSH commands:

.. NOTE:: All keys should be in lower case to enable classification (tenant/application).



1. Create an LTM Request Log Profile using the following TMSH command. Note: If you are creating the profile in the user interface, the ``\`` are not required. |br| IMPORTANT: This step has been updated with the TS 1.18 release to include LTM response logging.

   .. code-block:: bash

       create ltm profile request-log telemetry_traffic_log_profile request-log-pool telemetry request-log-protocol mds-tcp request-log-template event_source=\"request_logging\",hostname=\"$BIGIP_HOSTNAME\",client_ip=\"$CLIENT_IP\",server_ip=\"$SERVER_IP\",http_method=\"$HTTP_METHOD\",http_uri=\"$HTTP_URI\",virtual_name=\"$VIRTUAL_NAME\",event_timestamp=\"$DATE_HTTP\" request-logging enabled response-log-pool telemetry response-log-protocol mds-tcp response-log-template event_source=\"response_logging\",hostname=\"$BIGIP_HOSTNAME\",client_ip=\"$CLIENT_IP\",server_ip=\"$SERVER_IP\",http_method=\"$HTTP_METHOD\",http_uri=\"$HTTP_URI\",virtual_name=\"$VIRTUAL_NAME\",event_timestamp=\"$DATE_HTTP\",http_statcode=\"$HTTP_STATCODE\",http_status=\"$HTTP_STATUS\",response_ms=\"$RESPONSE_MSECS\" response-logging enabled

2. Attach the profile to the virtual server, for example: 

   .. code-block:: bash
    
      modify ltm virtual some_service profiles add { telemetry_traffic_log_profile { context all } }

|

Example Output from Telemetry Streaming:

.. literalinclude:: ../examples/output/request_logs/ltm_request_log.json
    :language: json

|

.. _cgnat:

Configuring CGNAT logging
~~~~~~~~~~~~~~~~~~~~~~~~~
To configure carrier-grade network address translation (CGNAT), use the following guidance.  For more information on CGNAT, see |cgnatdoc|. 

.. NOTE:: You must have Carrier Grade NAT licensed and enabled to use CGNAT features.

1. Configure the BIG-IP to send log messages about CGNAT processes.  For instructions, see the CGNAT Implementations guide chapter on logging for your BIG-IP version.  For example, for BIG-IP 14.0, see |cgnatdocs|.  Make sure of the following:

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

.. _afm:

AFM Request Log profile
~~~~~~~~~~~~~~~~~~~~~~~

1. Create a Security Log Profile.

   .. code-block:: bash
    
         create security log profile telemetry_afm_security_log_profile network replace-all-with { telemetry { filter { log-acl-match-drop enabled log-acl-match-reject enabled log-ip-errors enabled log-tcp-errors enabled log-tcp-events enabled } publisher telemetry_publisher } } application add { telemetry { servers add { 255.255.255.254:6514 } filter add { request-type { values add { illegal-including-staged-signatures } } } local-storage disabled logger-type remote remote-storage splunk protocol tcp } }


2. Attach the profile to the virtual server, for example: 

   .. code-block:: bash
    
      modify ltm virtual some_service security-log-profiles add { telemetry_afm_security_log_profile }


|

Example output from Telemetry Streaming:

.. literalinclude:: ../examples/output/request_logs/afm_request_log.json
    :language: json

|

.. _asm:

ASM Log
~~~~~~~

1. Create a Security Log Profile:

   .. code-block:: python
    
      create security log profile telemetry_asm_security_log_profile  application replace-all-with { telemetry { filter replace-all-with { request-type { values replace-all-with { all } } } logger-type remote remote-storage splunk servers replace-all-with { 255.255.255.254:6514 {} } } }

2. Attach the profile to the virtual server, for example: 

   .. code-block:: bash
    
      modify ltm virtual some_service security-log-profiles add { telemetry_asm_security_log_profile }


|

Example Output from Telemetry Streaming:

.. literalinclude:: ../examples/output/request_logs/asm_request_log.json
    :language: json


|

.. _apm:

APM Log
~~~~~~~

1. Create an APM Log Profile. For example:

   .. code-block:: bash
    
        create apm log-setting telemetry access replace-all-with { access { publisher telemetry_publisher } }

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
~~~~~~~
For information, see :ref:`avr-ref`. 

|

.. _systemlog:

System Log
~~~~~~~~~~

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


|



.. _char-encoding:

Character Encoding information
------------------------------
F5 logs may contain various character encoding or byte streams that include illegal characters for a specific encoding, or invalid UTF-8 strings. Telemetry Streaming does not currently enforce validation of the data that an event listener receives. It simply attempts to convert the raw input it receives into a JSON-formatted string for forwarding. 

.. NOTE:: Varying character encodings and illegal characters in the byte streams are very common in BIG-IP ASM logs.

For example, the following "message" is sent through TCP (input) and shows the received data in a format that will be handed off for forwarder use (output):

.. code-block:: bash

   let message = 'policy_name="some_test",key1="это безопасно",key2="U+0000 = fc 80 80 80 80 80 = "������"",key3="ひほわれよ HЯ⾀ U+FFFF = ef bf bf = "￿""';


The following shows the input sent as different buffers, and the resulting output:

#. *Input*: |br| Sent as buffer (default utf-8) |br| *Output*:

   .. code-block:: bash

      {
          "data": {
              "policy_name": "some_test",
              "key1": "это безопасно",
              "key2": "U+0000 = fc 80 80 80 80 80 = \"������\"",
              "key3": "ひほわれよ HЯ⾀ U+FFFF = ef bf bf = \"\"",
              "telemetryEventCategory": "ASM"
           },
              "type": "ASM"
      }

#. *Input*: |br| Sent as buffer (utf16le) |br| *Output*:

   .. code-block:: bash

      {
          "data": {
              "data": "p\u0000o\u0000l\u0000i\u0000c\u0000y\u0000_\u0000n\u0000a\u0000m\u0000e\u0000=\u0000
              \"\u0000s\u0000o\u0000m\u0000e\u0000_\u0000t\u0000e\u0000s\u0000t\u0000\"\u0000,\u0000k\u0000e\u0000y
              \u00001\u0000=\u0000\"\u0000M\u0004B\u0004>\u0004 \u00001\u00045\u00047\u0004>\u0004?\u00040\u0004A\u
              0004=\u0004>\u0004\"\u0000,\u0000k\u0000e\u0000y\u00002\u0000=\u0000\"\u0000U\u0000+\u00000\u00000\u0
              0000\u00000\u0000 \u0000=\u0000 \u0000f\u0000c\u0000 \u00008\u00000\u0000 \u00008\u00000\u0000 \u0000
              8\u00000\u0000 \u00008\u00000\u0000 \u00008\u00000\u0000 \u0000=\u0000 \u0000\"\u0000������������\"\u
              0000\"\u0000,\u0000k\u0000e\u0000y\u00003\u0000=\u0000\"\u0000r0{0�0�0�0 \u0000H\u0000/\u0004�/ \u000
              0U\u0000+\u0000F\u0000F\u0000F\u0000F\u0000 \u0000=\u0000 \u0000e\u0000f\u0000 \u0000b\u0000f\u0000 \
              u0000b\u0000f\u0000 \u0000=\u0000 \u0000\"\u0000��\"\u0000\"\u0000",
              "telemetryEventCategory": "event"
          },
          "type": "event"
      }
          
#. *Input*: |br| Sent as buffer (ascii) |br| *Output*:

   .. code-block:: bash

      {
          "data": {
              "policy_name": "some_test",
              "key1": "MB> 157>?0A=>",
              "key2": "U+0000 = fc 80 80 80 80 80 = \"������\"",
              "key3": "r{��� H/� U+FFFF = ef bf bf = \"�\"",
              "telemetryEventCategory": "ASM"
          },
          "type": "ASM"
      }

|

.. _trace:

Writing an Event Listener's incoming raw data to a trace file
-------------------------------------------------------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for writing an Event Listener's incoming raw data to a trace file is available in TS v1.20 and later

In Telemetry Streaming 1.20 and later you can configure TS to write an Event Listener's incoming raw data to a trace file. This is useful when troubleshooting, as it allows you to reproduce the exact issue instead of relying on the BIG-IP configuration, profiles, and traffic generation.

This feature is enabled using the **trace** property with values of **input** and/or **output**. All data is written to the ``/var/tmp/telemetry`` directory (or check logs for the exact file path).

.. IMPORTANT:: **Input** tracing data is written in HEX format. If you want to remove sensitive data, you need to decode HEX data, clean or remove the sensitive data, and re-encode it back to HEX format. But this operation does not guarantee 100% reproduction of issue (in the case of input tracing data will be sent to F5 Support for further investigation). Instead of cleaning the data (or complete removal of sensitive data), we recommend replacing it with non-sensitive data (i.e. the exact same size and original encoding).

The following is an example of configuring the Event Listener to trace incoming data:

.. code-block:: json

    {
        "class": "Telemetry",
        "Listener": {
            "class": "Telemetry_Listener",
            "trace": {
                "type": "input"
            }
        }
    }

|

If you want to enable both input and output tracing, use the following syntax in your Event Listener:

.. code-block:: json

    {
        "class": "Telemetry",
        "Listener": {
            "class": "Telemetry_Listener",
            "trace": [
                {
                    "type": "input"
                },
                {
                    "type": "output"
                }
            ]
        }
    }







.. |logging-png| image:: /images/high-speed-logging.png
   :alt: High Speed Logging


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

.. |utf| raw:: html

   <a href="https://www.cl.cam.ac.uk/~mgk25/ucs/examples/UTF-8-test.txt" target="_blank">BIG-IP CGNAT: Implementations - Using CGNAT Logging and Subscriber Traceability</a>

   


