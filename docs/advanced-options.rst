Advanced Options
----------------

This section describes additional options that you may want to configure once you comfortable to using Telemetry Streaming.


+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter                   | Options                        |  Description/Notes                                                                                                                                                                                                                                                                                                                                                                                                                |
+=============================+================================+===================================================================================================================================================================================================================================================================================================================================================================================================================================+
| enable                      | false, **true**, string        |  This value is used to disable any object in a declaration.                                                                                                                                                                                                                                                                                                                                                                       |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| trace                       | **false**, true, string        |  This value is useful during debug of Telemetry Streaming because it dumps intermediate data to a file. This value can be applied to the Poller, Listener, and Consumer classes. The option ``false`` disables the tracer. The option ``true`` enables the tracer and dumps the data in **/var/tmp/telemetry** in a file named **DEFAULT_LOCATION/OBJ_TYPE.OBJ_NAME**. The option ``string`` sets a custom path to the file.      |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| match                       | string, pattern (regex)        |  This value applies to the Telemetry_Listener class and provides a string or pattern (regex) which will result in events being dropped that do not match the value of a defined set of keys in the event. Defined keys: ``virtual_name, policy_name, Access_Profile, context_name``                                                                                                                                               |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| enableHostConnectivityCheck | true, **false**                |  This value applies to the Telemetry_Consumer and Telmetry_System_Poller class. If set to true, Telemetry Streaming will check if it can reach the host and return a fail if it cannot reach the host.                                                                                                                                                                                                                            |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+


.. _tagproperty:

Tag property
~~~~~~~~~~~~
As of Telemetry Streaming 1.5.0, tagging is now an actions array.  Inside this actions array, you can add tagging objects.  The following is an example that includes this tagging action, see the table for details on the parameters.
         
.. code-block:: bash
   :linenos:  
    
        "actions": [
            {
                "enable": true,
                "setTag": {
                    "tag1": {
                        "prop1": "tag1prop1"
                    },
                    "tag2": "Another tag"
                    },
                "ifAllMatch": {
                    "virtualServers": {
                        ".*": {
                            "serverside.bits.*": true
                        }
                    }
                },
                "locations": {
                    "virtualServers": {
                        ".*": {}
                    }
                }
            }
        ]

    


+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter                   | Options                        |  Description/Notes                                                                                                                                                                                                                                                                                                                                                                                                                |
+=============================+================================+===================================================================================================================================================================================================================================================================================================================================================================================================================================+
| enable                      | false, **true**, string        |  This value is used to disable any object in a declaration.                                                                                                                                                                                                                                                                                                                                                                       |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| trace                       | **false**, true, string        |  This value is useful during debug of Telemetry Streaming because it dumps intermediate data to a file. This value can be applied to the Poller, Listener, and Consumer classes. The option ``false`` disables the tracer. The option ``true`` enables the tracer and dumps the data in **/var/tmp/telemetry** in a file named **DEFAULT_LOCATION/OBJ_TYPE.OBJ_NAME**. The option ``string`` sets a custom path to the file.      |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| match                       | string, pattern (regex)        |  This value applies to the Telemetry_Listener class and provides a string or pattern (regex) which will result in events being dropped that do not match the value of a defined set of keys in the event. Defined keys: ``virtual_name, policy_name, Access_Profile, context_name``                                                                                                                                               |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| enableHostConnectivityCheck | true, **false**                |  This value applies to the Telemetry_Consumer and Telmetry_System_Poller class. If set to true, Telemetry Streaming will check if it can reach the host and return a fail if it cannot reach the host.                                                                                                                                                                                                                            |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

  
  
The "enable" property is a way to enable or disable the tag object when the tagging is done. The "setTag" property is the tag(s) that will be applied (Each additional property inside "setTag" is a tag to apply). The "ifAllMatch" property is conditions specified by the user. We will verify the conditions inside of "ifAllMatch" and check against the data. For "ifAllMatch," all conditions inside it must match with the data for the tagging to be done. If no conditions are applied, then there are default sets of data that will be tagged. The "locations" property is used to specify where the tags should be applied. If the conditions inside "ifAllMatch" pass, then the "locations" are where the tags will be applied (or to default objects if no "locations" provided if no locations provided). If locations is an empty object, then nothing will be tagged. 
 
An example declaration might look something like this:

  
  
  
    
      
      
        Text
      
    
    
    
      {
  "class": "Telemetry",
  "My_System_Poller": {
    "class": "Telemetry_System",
    "systemPoller": {
      "interval": 60,
      "actions": [
        {
            "enable": true,
            "setTag": {
                "tag1": {
                    "prop1": "hello"
                },
                "tag2": "Another tag"
            },
            "ifAllMatch": {
                "virtualServers": {
                    ".*": {
                        "serverside.bits.*": true
                    }
                }
            },
            "locations": {
                "virtualServers": {
                    ".*": {}
                }
            }
        }
      ]
    }
  }
}
    
    
      Expand (32 lines)
      Collapse
    
  
  
So in the above declaration, we will tag all "virtualServers" with the two tags in "setTag", if the conditions in "ifAllMatch" pass. For the conditions to match, all "virtualServers" that match the regular expression ".*", will have the property that matches "serverside.bits.*" checked in each "virtualServer" to see that they match the value specified in "ifAllMatch." If all the conditions are passed then the two tags will be applied to the "virtualServers" that match the regular expression ".*". 










The tag property provides a way to add additional properties (key:value) to the output. If not provided, the property will default to:

.. code-block:: json

    {
        "tenant": "`T`",
        "application": "`A`"
    }
 


.. _pointersyntax:

Pointer Syntax
~~~~~~~~~~~~~~

In certain use cases, such as configuring the generic http consumer with secrets, you may need to reference objects in other parts of the configuration. To reference other objects, Telemetry Streaming uses JSON pointers with syntax derived primarily from Application Services 3.

- RFC 6901 compliant, with some enhancements to account for scenarios not outlined in the RFC
- Pointer types:

  - Absolute pointer: `=/Shared/secretPath`
  - Relative pointer: `=passphrase`
  - Relative (nearest class) pointer: `=@/passphrase`

- Pointer formats (determined by leading character):

  - Resolve value: =
  - Resolve value and base64 decode: +
  - Resolve value and replace property with object (no stringify): >