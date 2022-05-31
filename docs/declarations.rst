.. _examples:

Example Declarations
====================
This section contains example Telemetry Streaming declarations.  Use the index on the right to go directly to a specific declaration.


Base Declaration
----------------
This example shows the base declaration.

.. literalinclude:: ../examples/declarations/basic.json
    :language: json

:ref:`Back to top<examples>`

|

Two Consumers
-------------
Note: This example shows only the Consumer class of the declaration and needs to be included with the rest of the base declaration.

.. literalinclude:: ../examples/declarations/multiple_consumers.json
    :language: json

:ref:`Back to top<examples>`

|


External System (BIG-IP)
------------------------
This example shows a case where Telemetry Streaming on one BIG-IP can pull statistics from an additional BIG-IP.

.. code-block:: json


    {
        "My_Poller": {
            "class": "Telemetry_System_Poller",
            "interval": 60,
            "host": "192.0.2.1",
            "port": 443,
            "username": "myuser",
            "passphrase": {
                "cipherText": "mypassphrase"
            }
        }
    }

:ref:`Back to top<examples>`

|

iHealth Poller
--------------
This example shows the iHealth Poller.

.. literalinclude:: ../examples/declarations/ihealth_basic.json
    :language: json

:ref:`Back to top<examples>`

|

.. _referencedpollers:

Referenced Pollers
------------------
This example shows referenced Pollers.

.. literalinclude:: ../examples/declarations/system.json
    :language: json

    
:ref:`Back to top<examples>`

|

.. _customendpoint:

Custom Endpoints
----------------
See :doc:`custom-endpoints` for more information on this feature.

|

.. literalinclude:: ../examples/declarations/system_custom_endpoints.json
    :language: json

    
:ref:`Back to top<examples>`

|

.. _value:

Value-based matching
--------------------
See :ref:`valuebased` for more information on this feature.

.. literalinclude:: ../examples/declarations/action_matching.json
    :language: json


:ref:`Back to top<examples>`

|

.. _multiple:

Generic HTTP with multiple passphrases
--------------------------------------
If you require multiple secrets for the Generic HTTP consumer, TS supports defining an additional secret within ``Shared`` and referencing it using pointers as shown in this example. 

For more details about pointers see the section on :ref:`pointersyntax`.

.. literalinclude:: ../examples/declarations/multiple_passphrases.json
    :language: json

|

.. _fallback:

Specifying fallback hosts for Generic HTTP consumers
----------------------------------------------------
Configuring fallback hosts for Generic HTTP consumers is supported as of TS 1.23 (was experimental in 1.14-1.22). 

This example shows how you can use the **fallbackHosts** property to specify fallback IP address(es) for a consumer.

.. literalinclude:: ../examples/declarations/generic_http_fallback.json
    :language: json

|

.. _proxy:

Specifying proxy settings for Generic HTTP consumers
----------------------------------------------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring proxy settings is available in TS v1.17 and later

This example shows how you can configure proxy settings for Generic HTTP consumers (including :ref:`F5 Beacon<beacon-ref>`) in TS 1.17 and later. This allows you to send Telemetry Streaming data through a proxy.

For usage options, see |proxy| in the Schema Reference.

The following example also uses :doc:`Telemetry Streaming Namespaces<namespaces>`.  The proxy lines are highlighted in the example.


.. literalinclude:: ../examples/declarations/generic_http_proxy.json
    :language: json
    :emphasize-lines: 20-29, 44-48


|

.. _splunkproxy:

Specifying proxy settings for Splunk consumers
----------------------------------------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for configuring Splunk proxy settings is available in TS v1.17 and later

This example shows how you can configure proxy settings for :ref:`Splunk consumers<splunk-ref>` in TS 1.17 and later. This allows you to send Telemetry Streaming data through a proxy.

For usage options, see |proxy| in the Schema Reference.

The following example also uses :doc:`Telemetry Streaming Namespaces<namespaces>`.  The proxy lines are highlighted in the example.


.. literalinclude:: ../examples/declarations/splunk_proxy.json
    :language: json
    :emphasize-lines: 23-32, 52-56


|


.. _httptls:

Generic HTTP consumer with TLS Client Authentication
----------------------------------------------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for TLS client authentication with the Generic HTTP consumer is available in TS v1.18 and later

This example shows how you can configure TLS client authentication for :ref:`Generic HTTP consumers<http-ref>` in a Telemetry Streaming declaration using version 1.18 and later. 


.. literalinclude:: ../examples/declarations/generic_http_tls_client_auth.json
    :language: json



|

.. _custompl:

Customizing the Generic HTTP consumer payload
---------------------------------------------
.. IMPORTANT:: Customizing the Generic HTTP consumer payload is available in TS v1.20.0 and later. See :ref:`customize-data` for complete information on this feature.

.. code-block:: json

    {
        "class": "Telemetry",
        "My_System": {
            "class": "Telemetry_System",
            "systemPoller": {
                "interval": 60
            }
        },
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Generic_HTTP",
            "host": "192.0.2.1",
            "protocol": "http",
            "port": 8080,
            "path": "/bigip",
            "actions": [
                {
                    "JMESPath": {},
                    "expression": "{ virtuals: virtualServers, service: telemetryEventCategory, hostname: system.hostname, staticTag: 'any string value' }"
                }
            ]
        }
    }


:ref:`Back to top<examples>`

|

.. _addtagex:

Using the addTags property for the StatsD consumer
--------------------------------------------------
.. IMPORTANT:: The addTags property is available in TS v1.21.0 and later. See :ref:`StatsD addTags<addtags>` for more information on this feature.

The following example shows a declaration with a systemPoller, a Listener, and a StatsD consumer with **addTags** using the **sibling** method.

.. code-block:: json

    {
        "class": "Telemetry",
        "My_System": {
            "class": "Telemetry_System",
            "systemPoller": {
                "interval": 60
            }
        },
        "My_Consumer_with_AutoTagging": {
            "class": "Telemetry_Consumer",
            "type": "Statsd",
            "host": "192.0.2.1",
            "protocol": "udp",
            "port": 8125,
            "addTags": {
                "method": "sibling"
            }
        }
    }

|

Next, we show the output from the System poller:

.. code-block:: json

    {
        "pools": {
            "/Common/app.app/app_pool": {
                "activeMemberCnt": 0,
                "serverside.bitsIn": 0,
                "serverside.bitsOut": 0,
                "serverside.curConns": 0,
                "serverside.maxConns": 0,
                "serverside.pktsIn": 0,
                "serverside.pktsOut": 0,
                "serverside.totConns": 0,
                "availabilityState": "available",
                "enabledState": "enabled",
                "status.statusReason": "The pool is available",
                "name": "/Common/app.app/app_pool",
                "members": {
                    "/Common/10.0.3.5:80": {
                        "addr": "10.0.3.5",
                        "monitorStatus": "up",
                        "port": 0,
                        "serverside.bitsIn": 0,
                        "serverside.bitsOut": 0,
                        "serverside.curConns": 0,
                        "serverside.maxConns": 0,
                        "serverside.pktsIn": 0,
                        "serverside.pktsOut": 0,
                        "serverside.totConns": 0,
                        "availabilityState": "available",
                        "enabledState": "enabled",
                        "status.statusReason": "Pool member is available"
                    }
                },
                "tenant": "Common",
                "application": "app.app"
            }
        }
    }

|

Without the **addTags** property, the StatsD consumer sends only numeric metrics like **serverside.bitsIn** and so on.

With the **addTags** property, the StatsD consumer also sends numeric metrics but also sends the following tags along with each metric

- For nested metrics under **pools.-Common-app.app-app_pool**, it sends following tags:

  .. code-block:: json

      {
         "availabilityState": "available",
         "enabledState": "enabled",
         "status.statusReason": "The pool is available",
         "name": "/Common/app.app/app_pool",
         "tenant": "Common",
         "application": "app.app"
      }


- For nested metrics under **pools.-Common-app.app-app_pool.memebers.-Common-10-0-3-5-80**, it sends following tags:

  .. code-block:: json
     
      {                   
         "addr": "10.0.3.5",
         "monitorStatus": "up",
         "availabilityState": "available",
         "enabledState": "enabled",
         "status.statusReason": "Pool member is available"
      }
    

|

:ref:`Back to top<examples>`

|


.. _snmpep:

Querying SNMP using a custom endpoint
-------------------------------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for SNMP for custom endpoints is available in TS v1.29 and later


This example shows how you can query SNMP using a custom endpoint in a Telemetry Streaming declaration using version 1.29 and later. 
See :doc:`custom-endpoints` for more information on this feature.


.. literalinclude:: ../examples/declarations/system_custom_endpoints_with_snmp.json
    :language: json



|




.. |proxy| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/schema-reference.html#proxy" target="_blank">Proxy</a>
