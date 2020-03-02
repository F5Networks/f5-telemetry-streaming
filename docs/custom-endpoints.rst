Configuring Custom Endpoints
============================

.. WARNING:: Configuring custom Endpoints and multiple System poller support is currently an EXPERIMENTAL feature, and the associated API could change based on testing and user feedback.

.. IMPORTANT:: Custom endpoints are currently for BIG-IP only . 

Telemetry Streaming v1.10 allows you to define a list of named endpoints with paths in a new **Telemetry_Endpoints** class, and includes multiple system pollers.  


Using the Telemetry_Endpoints class
-----------------------------------
The Telemetry_Endpoints class si where you define your endpoints and their paths.



+--------------------+-------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                 | Required*? |  Description/Notes                                                                                                                 |
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


For example, to create custom endpoints for profiles, your declaration could include the following snippet:

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
        }
    }