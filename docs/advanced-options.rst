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
| enableHostConnectivityCheck | true, **false**                |  This value applies to the Telemetry_Consumer and Telmetry_System class. If set to true, Telemetry Streaming will check if it can reach the host and return a fail if it cannot reach the host.                                                                                                                                                                                                                                   |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| allowSelfSignedCert         | true, **false**                |  This value applies to the Telemetry_Consumer and Telemetry_System class, as well as the Telemetry_iHealth_Poller **proxy** object.  If set to true, allows you to use self-signed certificates.                                                                                                                                                                                                                                  |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+


.. _tagproperty:

Tag property
~~~~~~~~~~~~
As of Telemetry Streaming 1.5.0, tagging is now an actions array.  Inside this actions array, you can add tagging objects.  The following is a snippet that includes this tagging action, see the table for details on the parameters, and then the example following the table.
         
.. code-block:: bash
   :linenos:  
    
        "actions": [
            {
                "enable": true,
                "setTag": {
                    "tag1": {
                        "prop1": "tag1prop1",
                        "prop2": "tag1prop2"
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

    
|


+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter                   | Options                        |  Description/Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+=============================+================================+=========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================+
| enable                      | false, **true**                |  This value is used to enable an action.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| setTag                      | array of objects               |  The setTag property is the tag(s) that will be applied (each additional property inside setTag is a tag that will be applied).                                                                                                                                                                                                                                                                                                                                                                                                         |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| ifAllMatch                  | arrary of objects              |  This property contains conditions you specify for the tag.  If you use this property, Telemetry Streaming verifies the conditions inside ifAllMatch and checks against the data.  All conditions inside this property must match the data for tagging to be performed. If you do not use this property, then the system tags everything in the **locations** property.                                                                                                                                                                 |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| locations                   | array of objects               |  This property is used to specify where the tags should be applied.  If you used ifAllMatch, and all of the conditions inside ifAllMatch pass, then the locations are where the tags are applied (or to default objects if no locations are provided). If you do not use this property, the following locations are used by default: virtualServers, pools, ltmPolicies, httpProfiles, clientSslProfiles, serverSslProfiles, networkTunnels, deviceGroups, and iRules. If you use this property with an empty array, no tagging occurs. |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+


The following is an example declaration using the tagging action.  In this example:

- Telemetry Streaming tags all **virtualServers** with the two tags in **setTag** if the conditions in **ifAllMatch** pass. 
- For the conditions in **ifAllMatch** to match, all **virtualServers** that match the regular expression **.\***, must have the property that matches **serverside.bits.\***.
- If all the conditions pass, the two tags are applied. 


.. code-block:: bash
   :linenos:  
    
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
                            "prop1": "hello",
                            "prop2": "goodbye"
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


|
  
  
Tag property for TS versions prior to 1.5.0
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

For Telemetry streaming versions 1.4.0 and earlier, the **tag** property provides a way to add additional properties (key:value) to the output. If not provided, the property will default to:

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