Quick Start
===========

If you are familiar with the BIG-IP system, and generally familiar with REST and
using APIs, this section contains the minimum amount of information to get you
up and running with Telemetry Streaming.

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   In BIG-IP versions prior to 14.0.0, the Package Management LX tab will not show up in the user interface unless you run the following command from the BIG-IP CLI: ``touch /var/config/rest/iapps/enable``.

#. Download the latest RPM package from the |github|.
#. Upload and install the RPM package on the using the BIG-IP GUI:

   - :guilabel:`Main tab > iApps > Package Management LX > Import`
   - Select the downloaded file and click :guilabel:`Upload`
   - For complete instructions see :ref:`installgui-ref` or
     :ref:`installcurl-ref`.

#. Be sure to see the known issues on GitHub (https://github.com/F5Networks/f5-telemetry-streaming/issues) to review any known issues and other important information before you attempt to use Telemetry Streaming.

#. Provide authorization (basic auth) to the BIG-IP system:  

   - If using a RESTful API client like Postman, in the :guilabel:`Authorization` tab, type the user name and password for a BIG-IP user account with Administrator permissions.
   - If using cURL, see :ref:`installcurl-ref`.

#. Using a RESTful API client like Postman, send a GET request to the URI
   ``https://{{host}}/mgmt/shared/telemetry/info`` to ensure Telemetry Streaming is running
   properly.

#. Copy one of the :ref:`examples` which best matches the configuration you want
   to use.  Alternatively, you can use the simple "Hello World" example below,
   which is a good start if you don't have an example in mind.

#. Paste the declaration into your API client, and modify names and IP addresses
   as applicable.

#. POST to the URI ``https://<BIG-IP>/mgmt/shared/telemetry/declare``

.. _qs-example:

Quick Start Example
-------------------

.. literalinclude:: ../examples/declarations/basic.json
    :language: json
    :linenos:

    

|

.. _components:

Components of the declaration
-----------------------------
This section provides more information about the options in the Quick Start example, and breaks down the example declaration into each class so you can understand the options when composing your declaration. The tables below the examples contain descriptions and options for the parameters included in this example only. 

For a list of all the Telemetry Streaming classes and options, see :doc:`using-ts`.

If there is a default value, it is shown in bold in the Options column.

.. _base-comps:

Base components
```````````````
The first few lines of your declaration are a part of the base components and define top-level options. When you POST a declaration, depending on the complexity of your declaration and the modules you are provisioning, it may take some time before the system returns a success message.  Note that the controls class is optional and used for logging and debugging (see :ref:`logging-ref`).

.. code-block:: javascript
   :linenos:

    {
        "class": "Telemetry",
        "controls": {
            "class": "Controls",
            "logLevel": "info"
        },

   
             
|

+--------------------+--------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter          | Options                        | Description/Notes                                                                                                                                                            |
+====================+================================+==============================================================================================================================================================================+
| class              | Controls                       | Describes top-level Telemetry Streaming options. The optional class for controls must always be Controls, do not change this value. Controls are for logging and debugging.  |
+--------------------+--------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| logLevel           | **info**, debug, error         | This value determines how much information you want Telemetry Streaming to log. See the :ref:`logging-ref` section for more information.                                     |
+--------------------+--------------------------------+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+




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

.. NOTE:: TS 1.11 adds support for the Pull Consumer class.  See :doc:`pull-consumers`. 

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



    
.. |github| raw:: html

   <a href="https://github.com/F5Networks/f5-telemetry-streaming/releases" target="_blank">Release Assets on GitHub</a>

