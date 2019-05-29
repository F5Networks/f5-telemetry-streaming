About Telemetry Streaming
=========================

Telemetry Streaming is a way to forward events and statistics from the BIG-IP system to your preferred data consumer and visualization application. You can do all of this by POSTing a single JSON declaration to a declarative REST API endpoint.

Telemetry Streaming uses a declarative model, meaning you provide a JSON declaration rather than a set of imperative commands.

.. image:: /images/telemetry-streaming.png


A basic declaration is shown here with descriptions of the components below:

.. code-block:: json
   :linenos:

    {
        "class": "Telemetry",
        "controls": {
            "class": "Controls",
            "logLevel": "info"
        },
        "My_System": {
            "class": "Telemetry_System",
            "systemPoller": {
                "interval": 60
            }
        },
        "My_Listener": {
            "class": "Telemetry_Listener",
            "port": 6514
        },
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Splunk",
            "host": "192.0.2.1",
            "protocol": "https",
            "port": "8088",
            "passphrase": {
                "cipherText": "apikey"
            }
        }
    }




Components of the declaration
-----------------------------
In this section, we break down the example declaration into each class so you can understand the options when composing your declaration. The tables below the examples contain descriptions and options for the parameters included in this example only.  

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

+--------------------+--------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Description/Notes                                                                                                                            |
+====================+================================+==============================================================================================================================================+
| class              | Controls                       | Describes top-level Telemetry Streaming options. The class for controls must always be Controls, do not change this value.                   |
+--------------------+--------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------+
| logLevel           | **info**, debug, error         | This value determines how much information you want Telemetry Streaming to log. See the :ref:`logging-ref` section for more information.     |
+--------------------+--------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------+




.. _system-poller-class:

Telemetry System class
``````````````````````
The next lines of the declaration define the target system. You can define and configure the system poller inside of the System declaration to collect and normalize statistics. These statistics include device statistics, virtual server statistics, pool statistics, individual pool member statistics, and more. For more information, including an optional iHealth poller, see :ref:`tssystem-ref`. 

.. code-block:: javascript
   :linenos:
   :lineno-start: 7


    "My_System": {
        "class": "Telemetry_System",
        "systemPoller": {
            "interval": 60
        }
    },

|


+--------------------+--------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        |  Description/Notes                                                                                                                                               |
+====================+================================+==================================================================================================================================================================+
| class              | Telemetry_System               |  The class for Telemetry System must always be Telemetry_System, do not change this value.                                                                       |
+--------------------+--------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| systemPoller       | systemPoller                   |  This value Polls a system on a defined interval for information such as device statistics, virtual server statistics, pool statistics and much more.            |
+--------------------+--------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------+



.. _event-listener-class:

Telemetry Listener class
````````````````````````
The next lines of the declaration sets the Event Listener, on both TCP and UDP protocols, that can accept events in a specific format and process them. Currently, the TS Listener sends all logging telemetry data.
To see the type of information that the event listener processes, see :ref:`outputexample-ref`.
Event Format: ``key1="value",key2="value"``

.. code-block:: javascript
   :linenos:
   :lineno-start: 13


    "My_Listener": {
        "class": "Telemetry_Listener",
        "port": 6514
    },


|


+--------------------+--------------------------------+------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        |  Description/Notes                                                                                                                 |
+====================+================================+====================================================================================================================================+
| class              | Telemetry_Listener             |  The class for listener must always be Telemetry_Listener, do not change this value.                                               |
+--------------------+--------------------------------+------------------------------------------------------------------------------------------------------------------------------------+
| port               | 6514                           |  Specifies the port of the TCP and UDP listener                                                                                    |
+--------------------+--------------------------------+------------------------------------------------------------------------------------------------------------------------------------+



.. _consumer-class:

Telemetry Consumer class
````````````````````````
The next lines of the declaration sets the Consumer, which accepts all telemetry information from whatever systems you configure it to. The consumer provides the tools to process that information. To see examples of configurations for consumers like Splunk, Azure Log Analytics, AWS CloudWatch, AWS S3, Graphite, and others, see the :ref:`settingupconsumer-ref` section of this guide.

.. code-block:: javascript
   :linenos:
   :lineno-start: 17


    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Splunk",
        "host": "192.0.2.1",
        "protocol": "https",
        "port": "8088",
        "passphrase": {
            "cipherText": "apikey"
        }
    }



|


+--------------------+--------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        |  Description/Notes                                                                                                                                 |
+====================+================================+====================================================================================================================================================+
| class              | Telemetry_Consumer             |  The class for consumer must always be Telemetry_Consumer, do not change this value.                                                               |
+--------------------+--------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------+
| type               | Splunk, AWS_S3, etc.           |  Specifies the consumer type you would like to send Telemetry information to. See the :ref:`settingupconsumer-ref` section for more information.   |
+--------------------+--------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------+
| host               | 192.0.2.1                      |  The address of the instance that runs the HTTP event collector                                                                                    |
+--------------------+--------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------+
| protocol           | **http**, https                |  The protocol of the consumer                                                                                                                      |
+--------------------+--------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------+
| port               | 8088                           |  The port of the consumer system                                                                                                                   |
+--------------------+--------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------+
| passphrase         | xxxxx                          |  The secret password to use when sending data to the consumer system                                                                               |
+--------------------+--------------------------------+----------------------------------------------------------------------------------------------------------------------------------------------------+

.. toctree::
   :maxdepth: 2
   :includehidden:
   :glob:

   prereqs
   faq


