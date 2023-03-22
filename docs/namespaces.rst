F5 BIG-IP Telemetry Streaming Namespaces
========================================
.. NOTE:: Using F5 BIG-IP Telemetry Streaming Namespaces is supported as of BIG-IP TS 1.23 (was experimental in 1.16-1.22). 

F5 BIG-IP Telemetry Streaming v1.16 introduced the concept of *namespaces*, which is a grouping of Telemetry components.  With namespaces, you can declare separate configurations to allow better control of data forwarding. Any System Pollers or Event Listeners defined within a namespace will only forward data to the Consumers within that same Namespace.

Namespaces are declared in the new **Telemetry_Namespace** class, which acts as the container for the namespace.

The following are important notes about namespaces.

- The components declared on the top level of a declaration are treated as part of a default namespace with no name. As such they will behave as grouped together and will not conflict with the other "named" namespaces. All existing behavior for this default namespace will be preserved.
- Each namespace works separately from another and cannot share configuration or object references. 
- While each namespace must have a unique name, the components in a namespace can share the same name as the components in another namespace. 
- Namespaces are not tied in any way to RBAC. 
- You must send a full declaration to **/telemetry/declare**. If there are multiple namespaces, you must declare them all in the POST body, otherwise, they are omitted. To configure a single namespace, see :ref:`namespaceEP`.
- All namespaces inherit the top level **controls** object. 
- For pull consumers: If you declare a pull consumer under a namespace, the URI to get the data should specify the namespace in path, for example **/mgmt/shared/telemetry/namespace/${namespaceName}/pullconsumer/${pullConsumerName}**
- In F5 BIG-IP Telemetry Streaming v1.19 and later, you cannot have a namespace name that is the same as the name of any other Telemetry class type in the default namespace, if you do, BIG-IP Telemetry Streaming returns an error. However, you can have a namespace name that is the same as the name of another Telemetry class type in another (non-default) namespace.

|

The following examples show how you can use namespaces in your F5 BIG-IP Telemetry Streaming declarations.

Basic declaration with namespace only
-------------------------------------
In this example, all objects are in the namespace named **My_Namespace**.  Because there is only one namespace, except for the name, this is essentially the same as if there were no namespace specified.

This example uses the **/telemetry/declare** endpoint.

.. literalinclude:: ../examples/declarations/namespaces/basic_namespace.json
    :language: json

|

Multiple namespaces in a declaration
------------------------------------
In this example, we show how you can use multiple namespaces in a declaration.  This shows how namespaces can be used to group components by function.

Note that the Consumers in each namespace are using the same name (highlighted in the example).  This example also uses the **/telemetry/declare** endpoint.


.. literalinclude:: ../examples/declarations/namespaces/multiple_namespaces.json
    :language: json
    :emphasize-lines: 15, 41

|

Default and custom namespaces in a declaration
----------------------------------------------
In this example, we show how you can use the default namespace (where you do not specify a named namespace), and a named namespace in a declaration.  

The lines that are not highlighted in the example are all part of the default namespace. The highlighted lines are a part of the custom **My_Namespace** namespace.


.. literalinclude:: ../examples/declarations/namespaces/default_and_custom_namespace.json
    :language: json
    :emphasize-lines: 24-37

|

.. _namespaceEP:

Namespace-specific endpoints
----------------------------
F5 BIG-IP Telemetry Streaming 1.18 and later introduced new endpoints specific to individual namespaces. Using this endpoint allows you to configure a specific namespace without needing to know about other namespaces. 

The following table describes the endpoint and request types you can use.

+------------------------------------------------------------+--------------+---------------------------------------------------------------------------------------------------+
| URI                                                        | Request Type | Description                                                                                       |
+============================================================+==============+===================================================================================================+
| /mgmt/shared/telemetry/namespace/${namespace_name}/declare | GET          | - Returns the single Telemetry Namespace object (configuration data), referenced by name          |
+                                                            +--------------+---------------------------------------------------------------------------------------------------+
|                                                            | POST         | - Configures a single Telemetry Namespace class - accepts just a single Telemetry_Namespace class |
+                                                            |              | - Assumes defaults/existing configuration for Controls and Telemetry classes                      |
|                                                            |              |                                                                                                   |
+------------------------------------------------------------+--------------+---------------------------------------------------------------------------------------------------+

|

For example, we use the new endpoint, and POST the following declaration to ``https://{{host}}/mgmt/shared/telemetry/namespace/NamespaceForEvents/declare``

.. code-block:: json

   {
        "class": "Telemetry_Namespace",
        "My_Listener": {
            "class": "Telemetry_Listener",
            "port": 6514,
            "trace": true
        },
        "Elastic": {
            "class": "Telemetry_Consumer",
            "type": "ElasticSearch",
            "host": "192.168.10.10",
            "protocol": "http",
            "port": "9200",
            "apiVersion": "6.5",
            "index": "eventdata",
            "enable": true,
            "trace": true
        }
    }

|

And we receive the following response:

.. code-block:: json

   {
        "message": "success",
        "declaration": {
            "class": "Telemetry_Namespace",
            "My_Listener": {
                "class": "Telemetry_Listener",
                "port": 6514,
                "trace": true,
                "enable": true,
                "match": "",
                "actions": [
                    {
                        "setTag": {
                            "tenant": "`T`",
                            "application": "`A`"
                        },
                        "enable": true
                    }
                ]
            },
            "Elastic": {
                "class": "Telemetry_Consumer",
                "type": "ElasticSearch",
                "host": "192.168.10.10",
                "protocol": "http",
                "port": 9200,
                "apiVersion": "6.5",
                "index": "eventdata",
                "enable": true,
                "trace": true,
                "allowSelfSignedCert": false,
                "dataType": "f5.telemetry"
            }
        }
    }

|

You receive the same output as response above when you send a GET request to ``https://{{host}}/mgmt/shared/telemetry/namespace/NamespaceForEvents/declare``.



