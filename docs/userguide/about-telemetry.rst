About Telemetry Streaming
=========================

Telemetry Streaming is a way for you to forward events and statistics from the BIG-IP system to your preferred data consumer and visualization application. You can do all of this by POSTing a single JSON declaration to a declarative REST API endpoint.

.. image:: /images/TSdiagram.png

A basic declaration is shown here with descriptions of the components below:

.. code-block:: json
   :linenos:

    {
        "class": "Telemetry",
        "controls": {
            "class": "Controls",
            "logLevel": "info"
        },
        "My_Poller": {
            "class": "Telemetry_System_Poller",
            "interval": 60
        },
        "My_Listener": {
            "class": "Telemetry_Listener",
            "port": 6514
        },
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Splunk",
            "host": "192.0.2.1",
            "protocol": "http",
            "port": "8088",
            "passphrase": {
                "cipherText": "apikey"
            }
        }
    }



Components of the declaration
-----------------------------
In this section, we break down the example into each class so you can understand the options when composing your declaration. The tables below the examples contain descriptions and options for the parameters included in the example only.  

If there is a default value, it is shown in bold in the Options column.

.. _base-comps:

Base components
```````````````
The first few lines of your declaration are a part of the base components and define top-level options. When you POST a declaration, depending on the complexity of your declaration and the modules you are provisioning, it may take some time before the system returns a success message.

.. code-block:: javascript
   :linenos:


    {
        "class": "Telemetry",
        "controls": {
            "class": "Controls",
            "logLevel": "info"
        },
        
             
|

+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required?  |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| class              | Controls                       |   Yes      |  Indicates this JSON document is a Device declaration.                                                                             |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| logLevel           | **info**, debug, error         |   No       |  Optional friendly label for this declaration.                                                                                     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+


.. _system-poller-class:

System Poller
`````````````
The next lines of the declaration sets the System Poller, which Polls a system, such as BIG-IP on a configurable interval for information such as device statistics, virtual server statistics, pool statistics, individual pool member statistics, and more.

.. code-block:: javascript
   :linenos:
   :lineno-start: 7


    "My_Poller": {
        "class": "Telemetry_System_Poller",
        "interval": 60
    },

|


+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| class              | Telemetry_System_Poller        |   Yes      |  Specifies...                                                                                                                      |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| interval           | 30, **60**                     |   No       |  Hostname you want to set for this BIG-IP device. The default hostname on a new BIG-IP is **bigip1**.                              |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+



.. _event-listener-class:

Event Listener
``````````````
The next lines of the declaration sets the Event Listener, which provides a listener, currently TCP, that can accept events in a specific format and process them.
Event Format: ``key1="value",key2="value"``

.. code-block:: javascript
   :linenos:
   :lineno-start: 11


    "My_Listener": {
        "class": "Telemetry_Listener",
        "port": 6514
    },


|


+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| class              | Telemetry_Listener             |   Yes      |  Specifies....                                                                                                                     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| port               | 30, **60**                     |   No       |  Hostname you want to set for this BIG-IP device. The default hostname on a new BIG-IP is **bigip1**.                              |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+



.. _consumer-class:

Consumer class
``````````````
The next lines of the declaration sets the Consumer, which accepts information from disparate systems and provides the tools to process that information. In the context of Telemetry Streaming this means providing a mechanism by which to integrate with existing analytics products. To see examples of configurations for consumers like Splunk, Azure Log Analytics, AWS CloudWatch, AWS S3, Graphite, see the Configuring a Consumer Stream section of this guide.

.. code-block:: javascript
   :linenos:
   :lineno-start: 15


    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Splunk",
        "host": "192.0.2.1",
        "protocol": "http",
        "port": "8088",
        "passphrase": {
            "cipherText": "apikey"
        }
    }



|


+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Required*? |  Description/Notes                                                                                                                 |
+====================+================================+============+====================================================================================================================================+
| class              | Telemetry_Consumer             |   Yes      |  Specifies....                                                                                                                     |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| type               | ...                            |   No       |  Hostname you want to set for this BIG-IP device. The default hostname on a new BIG-IP is **bigip1**.                              |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| host               | 192.0.2.1                      |   No       |  Hostname you want to set for this BIG-IP device. The default hostname on a new BIG-IP is **bigip1**.                              |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| protocol           | http,                          |   No       |  Hostname you want to set for this BIG-IP device. The default hostname on a new BIG-IP is **bigip1**.                              |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| port               | 8088                           |   No       |  Hostname you want to set for this BIG-IP device. The default hostname on a new BIG-IP is **bigip1**.                              |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+
| passphrase         | ...                            |   No       |  Hostname you want to set for this BIG-IP device. The default hostname on a new BIG-IP is **bigip1**.                              |
+--------------------+--------------------------------+------------+------------------------------------------------------------------------------------------------------------------------------------+



