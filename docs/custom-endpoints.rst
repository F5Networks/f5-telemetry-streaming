Configuring Custom Endpoints
----------------------------
Telemetry Streaming v1.10 and later allows you to define a list of Custom Endpoints that reference iControlRequest paths in a new **Telemetry_Endpoints** class.
The Custom Endpoints defined within a Telemetry Streaming declaration must then be attached to a Telemetry Streaming System Poller, where the System Poller will query the defined endpoints.

.. NOTE:: Custom Endpoints *replace* the endpoints that a Telemetry Streaming System Poller queries by default - once a System Poller references a collection of Custom Endpoints, that System Poller will *only* query the Custom Endpoints.

Telemetry Streaming v1.10+ also includes the ability to define multiple system pollers within a single declaration.
Using multiple system pollers within a single declaration allows for a configuration where one system poller can pull data from the default endpoints, and another system poller pulls data only from its referenced, Custom Endpoints. 

.. NOTE::  Custom endpoints are currently for BIG-IP only. Custom endpoints are NOT supported with :ref:`Splunk multi-metric format<multi-metric>`.


Using the Telemetry_Endpoints class
-----------------------------------
The Telemetry_Endpoints class is where you define your endpoints and their paths.



+--------------------+------------+---------------------------------------------------------------------------------------------------------+
| Parameter          | Required?  |  Description/Notes                                                                                      |
+====================+============+=========================================================================================================+
| class              |   Yes      |  Telemetry_Endpoints                                                                                    |
+--------------------+------------+---------------------------------------------------------------------------------------------------------+
| basePath           |   No       |  Optional base path value to prepend to each individual endpoint path you specify in "items"            |
+--------------------+------------+---------------------------------------------------------------------------------------------------------+
| enable             |   No       |  Whether you want to enable this class. The default is **true**.                                        |
+--------------------+------------+---------------------------------------------------------------------------------------------------------+
| items              |   Yes      |  Object with each property an endpoint with their own properties.                                       |
+--------------------+------------+---------------------------------------------------------------------------------------------------------+
|    \- name         |   No       |  Optional name for the item                                                                             |
+--------------------+------------+---------------------------------------------------------------------------------------------------------+
|    \- path         |   Yes      |  Path to query data from                                                                                |
+--------------------+------------+---------------------------------------------------------------------------------------------------------+


For example, your declaration could add the following snippet, which contains endpoints for profiles, and for total connections for a virtual:

.. code-block:: bash

   {
       ...
        "Endpoints_Profiles": {
            "class": "Telemetry_Endpoints",
            "basePath": "/mgmt/tm/ltm/profile",
            "items": {
                "radiusProfiles": {
                    "name": "radiusProfiles",
                    "path": "radius/stats"
                },
                "ipOtherProfiles": {
                    "name": "ipOtherProfiles",
                    "path": "ipother/stats"
                }
            }
        }, 
        "Endpoints_Misc": {
            "class": "Telemetry_Endpoints",
            "items": {
                "clientside.totConns": {
                    "name": "virtualTotConns",
                    "path": "/mgmt/tm/ltm/virtual/stats?$select=clientside.totConns"
                },
                "virtualAddress": {
                    "path": "/mgmt/tm/ltm/virtual-address/stats"
                }
            }
        }
    }

|

.. _hostname:

Including hostname information
``````````````````````````````
In order to have hostname information available in the data sent to your consumer, F5 recommends you always include the following endpoint when using custom endpoints:

.. code-block:: json

    "Endpoints_Custom": {
        "class": "Telemetry_Endpoints",
        "items": {
            "system": {
                "path": "/mgmt/tm/sys/global-settings?$select=hostname"
            }
        }
    }


|


Creating System Pollers specific to the custom endpoint
-------------------------------------------------------
Because you may want to specify different polling intervals for the custom endpoints, v1.10.0 also enables the ability to create an system poller specific to an endpoint or array of endpoints.  To do this, you use the new **endpointList** property in your system poller definition.

EndpointList is simply a list of endpoints to use in data collection, and can include the following types:

* **Array** |br| When using an array, the item in the array must be one of the following: |br| |br|

  #. Name of an existing Telemetry_Endpoints object (for example, ``Endpoints_Profiles``) 
  #. Name of an existing Telemetry_Endpoints object and the endpoint object key (``Endpoints_Profiles/radiusProfiles``)
  #. An in-line Telemetry_Endpoint object (name is required).  For example:
  
     .. code-block:: json

      {
         "path": "mgmt/tm/net/vlan/stats",
         "name": "requiredWhenInline"
      }

  #. A Telemetry_Endpoints definition

* **String** |br| The name of an existing Telemetry_Endpoints object

* **Object** |br| An object that conforms to the definition of the Telemetry_Endpoints class.

The following snippet demonstrates how Custom Endpoint(s) can be attached to System Pollers, by:

* Referencing the entire ``Endpoints_Profiles`` Telemetry_Endpoints object from the previous snippet
* Referencing the single ``clientside.totConns`` custom endpoint from the ``Endpoints_Misc`` Telemetry_Endpoints object from the previous snippet
* Creating an in-line custom endpoint, named ``requiredWhenInline``

.. code-block:: json

   {
        "Custom_System_Poller1": {
            "class": "Telemetry_System_Poller",
            "interval": 60,
            "endpointList": "Endpoints_Profiles"
        },
        "Custom_System_Poller2": {
            "class": "Telemetry_System_Poller",
            "interval": 720,
            "endpointList": [
                "Endpoints_Misc/clientside.totConns",
                {
                    "path": "mgmt/tm/net/vlan/stats",
                    "name": "requiredWhenInline"
                }
            ]
        }
    }

|


Example declaration for using custom Endpoints with specific pollers
--------------------------------------------------------------------
The following example contains an example declaration for Telemetry Streaming, which includes the snippets in the examples above.
**Note:** The example below does not define a Telemetry Consumer, and a consumer of your choice must be added to the example declaration in order to receive the Telemetry Streaming data.

.. literalinclude:: ../examples/declarations/system_custom_endpoints.json
    :language: json

|

Example output from the system pollers
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The following is output from the system pollers in the examples above.

**Custom_System_Poller1**:

.. code-block:: json
  
   {
        "radiusProfiles":{
            "/Common/radiusLB/stats":{
                "accepts":0,
                "acctRequests":0,
                "acctResponses":0,
                "challenges":0,
                "drops":0,
                "tmName":"/Common/radiusLB",
                "other":0,
                "rejects":0,
                "requests":0,
                "typeId":"ltm profile radius",
                "vsName":"N/A",
                "name":"/Common/radiusLB/stats"
            },
            "/Common/radiusLB-subscriber-aware/stats":{
                "accepts":0,
                "acctRequests":0,
                "acctResponses":0,
                "challenges":0,
                "drops":0,
                "tmName":"/Common/radiusLB-subscriber-aware",
                "other":0,
                "rejects":0,
                "requests":0,
                "typeId":"ltm profile radius",
                "vsName":"N/A",
                "name":"/Common/radiusLB-subscriber-aware/stats"
            }
        },
        "ipOtherProfiles":{
            "/Common/ipother/stats":{
                "accepts":0,
                "connects":0,
                "expires":0,
                "tmName":"/Common/ipother",
                "open":0,
                "rxbaddgram":0,
                "rxdgram":0,
                "rxunreach":0,
                "txdgram":0,
                "typeId":"ltm profile ipother",
                "vsName":"N/A",
                "name":"/Common/ipother/stats"
            }
        },
        "telemetryServiceInfo":{
            "pollingInterval":60,
            "cycleStart":"2020-02-11T20:48:42.094Z",
            "cycleEnd":"2020-02-11T20:48:42.161Z"
        },
        "telemetryEventCategory":"systemInfo"
    }

|

**Custom_System_Poller2**

.. code-block:: json

   {
        "ipOtherProfiles":{
            "/Common/ipother/stats":{
                "accepts":0,
                "connects":0,
                "expires":0,
                "tmName":"/Common/ipother",
                "open":0,
                "rxbaddgram":0,
                "rxdgram":0,
                "rxunreach":0,
                "txdgram":0,
                "typeId":"ltm profile ipother",
                "vsName":"N/A",
                "name":"/Common/ipother/stats"
            }
        },
        "telemetryServiceInfo":{
            "pollingInterval":120,
            "cycleStart":"2020-02-11T20:50:18.218Z",
            "cycleEnd":"2020-02-11T20:50:18.277Z"
        },
        "telemetryEventCategory":"systemInfo"
    }

|


.. |br| raw:: html
   
   <br />