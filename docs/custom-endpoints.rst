Configuring Custom Endpoints
============================

.. WARNING:: Configuring custom Endpoints and multiple System poller support is currently an EXPERIMENTAL feature, and the associated API could change based on testing and user feedback.

.. NOTE:: Custom endpoints are currently for BIG-IP only. 

Telemetry Streaming v1.10 allows you to define a list of named endpoints with paths in a new **Telemetry_Endpoints** class, and includes the ability to define multiple system pollers that can fetch specific custom endpoint(s).   


Using the Telemetry_Endpoints class
-----------------------------------
The Telemetry_Endpoints class is where you define your endpoints and their paths.



+--------------------+-------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                 | Required?  |  Description/Notes                                                                                                                 |
+====================+=========================+============+====================================================================================================================================+
| class              | Telemetry_Endpoints     |   Yes      |  Indicates that this property contains route configuration.                                                                        |
+--------------------+-------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| basePath           | string                  |   No       |  Optional base path value to prepend to each individual endpoint path you specify in "items"                                       |
+--------------------+-------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| enable             | boolean                 |   No       |  Whether you want to enable this class. The default is **true**.                                                                   |
+--------------------+-------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| items              | integer                 |   Yes      |  Object with each property an endpoint with their own properties.                                                                  |
+--------------------+-------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
|    \- name         | string                  |   No       |  Optional name for the item                                                                                                        |
+--------------------+-------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
|    \- path         | string                  |   Yes      |  Path to query data from                                                                                                           |
+--------------------+-------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+


For example, your declaration could include the following snippet, which contains endpoints for profiles, and for total connections for a virtual:

.. code-block:: json

   {
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
                    "path": "/mgmt/ltm/virtual/stats?$select=clientside.totConns"
                },
                "virtualAddress": {
                    "path": "/mgmt/tm/ltm/virtual-address/stats"
                }
            }
        }
    }

|

Creating System Pollers specific to the custom endpoint
-------------------------------------------------------
Because you might want to specify different polling intervals for the custom endpoints, v1.10.0 also enables the ability to create an system poller specific to an endpoint or array of endpoints.  To do this, you use the new **endpointList** property in your system poller definition.

EndpointList is simply a list of endpoints to use in data collection, and can include the following types:

* **Array** |br| When using an array, the item in the array must be one of the following: |br| |br|

  1. Name of the Telemetry_Endpoints object (for example, ``My_endpt``) 
  2. Name of Telemetry_Endpoints object and the endpoint object key (``My_endpt/itemA``)
  3. A Telemetry_Endpoint (name is required).  For example:

        .. code-block:: json
        
            {
                "path": "mgmt/tm/net/vlan/stats",
                "name": "requiredWhenInline"
            }

  4. A Telemetry_Endpoints definition

* **String** |br| The name of the Telemetry_Endpoints object

* **Object** An object that conforms to the definition

The following is an example the system pollers, which correspond to the preceding Telemetry_Endpoints example:

.. code-block:: json

   {
        "Custom_System_Poller1": {
            "class": "Telemetry_System_Poller",
            "interval": 60,
            "enable": false,
            "endpointList": "Endpoints_Profiles",
            "trace": true
        },
        "Custom_System_Poller2": {
            "class": "Telemetry_System_Poller",
            "interval": 720,
            "enable": true,
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
The following example contains a complete example declaration for Telemetry Streaming, which includes the snippets in the examples above.

.. literalinclude:: ../examples/declarations/system_custom_endpoints.json
    :language: json



.. |br| raw:: html
   
   <br />