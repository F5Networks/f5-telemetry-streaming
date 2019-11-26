Data Modification
=================
This section details how you can manipulate the data to better meet your Telemetry goals.  This includes the new :ref:`Actions Chain<actions>`, which can contain the :ref:`includeData<include>` and :ref:`excludeData<exclude>` options introduced in Telemetry Streaming 1.8.0, and the previously introduced :ref:`setTag<tagproperty>` property.

.. _actions: 

Actions chain
-------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for **Actions chain** is available in TS 1.8.0 and later.  

This section describes Telemetry Streaming Action chains, and how to use them.  Action chains can be thought of as a pipeline of actions for data post-processing (and :ref:`pre-processing<preactions>` for System Poller only).  

These actions use the :ref:`setTag<tagproperty>`, :ref:`includeData<include>`, and :ref:`excludeData<exclude>` options described in detail later on this page.  See each section for details on the individual properties.

The order of execution is deterministic; actions are executed as they are defined - one after another.
 
The following is an example of an Action chain with a description after the example.

.. code-block:: json

    {
        "actions": [
            {
                "excludeData": {},
                "locations": {
                    "system": true
                }
            },
            {
                "setTag": {
                    "vsInfo": {
                        "app": "`A`"
                    }
                }
            },
            {
                "includeData": {},
                "locations": {
                    "virtualServers": {
                        ".*": {
                            "vsInfo": true,
                            "name": true,
                            "bits.in": true
                        }
                    }
                }
            }
        ]
    }



1. First Telemetry Streaming will exclude **system**.
2. Next Telemetry Streaming will apply **vsInfo** tag to known locations (if the **locations** property is not specified, then the tag is applied to **virtualServers**, **pools** etc.)
3. Finally Telemetry Streaming keeps all **virtualServers** data with properties defined in **locations** only.
 
As result of execution output will look like:

.. code-block:: json

    {
        "virtualServers": {
            "/Common/app.app/virtualServer": {
                "vsInfo": {
                    "app": "app.app"
                },
                "name": "/Common/app.app/virtualServer",
                "bits.in": "100"
            }
        }
    }
 
If the action has the property **enable** with value **false** then this action will be skipped.
 
Another example:

.. code-block:: json
 
    {
        "actions": [
            {
                "includeData": {},
                "locations": {
                    "system": true
                }
            },
            {
                "setTag": {
                    "vsInfo": {
                        "app": "`A`"
                    }
                }
            },
            {
                "includeData": {},
                "locations": {
                    "virtualServers": {
                        ".*": {
                            "vsInfo": true,
                            "name": true,
                            "bits.in": true
                        }
                    }
                }
            }
        ]
    }
 

As result of execution output will look like:

``{} - empty object``
 
This is because
 
1. First action **includeData** will keep only **system**.
2. Second action **setTag** will try to assign tag to known locations (if the 'locations' property is not specified, then the tag is applied to 'virtualServers', 'pools' etc.)
3. Third action **includeData** should keep only **virtualServers**, but after execution of action #1 only the **system** property was left in the output - so, Telemetry Streaming removed from the output everything that not matched **virtualServers** and as result the output is empty object.

|

.. _preactions: 
 
Pre-optimization (System Poller only)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 
Telemetry System tries to analyze the actions chain before fetching data from the BIG-IP in order to reduce number of requests to BIG-IP.
 
Example 1:

.. code-block:: json

    {
        "actions": [
            {
                "includeData": {},
                "locations": {
                    "system": true
                }
            },
            {
                "setTag": {
                    "vsInfo": {
                        "app": "`A`"
                    }
                }
            },
            {
                "includeData": {},
                "locations": {
                    "virtualServers": {
                        ".*": {
                            "vsInfo": true,
                            "name": true,
                            "bits.in": true
                        }
                    }
                }
            }
        ]
    }


The Telemetry System sees that first action is **includeData** and it should include only **system**. So, as result of the Actions chain analysis, the Telemetry System will fetch only **system** data and not **virtualServers**.

 
Example 2:

.. code-block:: json
 
    {
        "actions": [
            {
                "excludeData": {},
                "locations": {
                    "system": true
                }
            },
            {
                "setTag": {
                    "vsInfo": {
                        "app": "`A`"
                    }
                },
                "ifAllMatch": {
                    "pools": {
                        ".*": {
                            "name": "poolName"
                        }
                    }
                }
            },
            {
                "includeData": {},
                "locations": {
                    "virtualServers": {
                        ".*": {
                            "vsInfo": true,
                            "name": true,
                            "bits.in": true
                        }
                    }
                }
            }
        ]
    }


 
1. Telemetry System sees that first action is **excludeData** and it should exclude **system** property. So, as result of the Actions chain analysis, Telemetry System will not fetch **system** information, but will still fetch everything else - pools, virtualServers and etc.
2. Telemetry System sees that seconds action is **setTag** with **ifAllMatch** conditions. So, the Telemetry System fetches **pools** already (see step 1) - no additional action required.
3. Telemetry System sees that third action is **includeData**. So, Telemetry System looks into **locations** and determines that it should keep **virtualServers** only. 
 
As result of the actions chain analysis, the Telemetry System will fetch **virtualServers** only and not **pools** (and not anything else) because only **virtualServers** should be included in the result's output.
 
|
|

.. _tagproperty:

Tag property
------------
Beginning in Telemetry Streaming 1.6.0, tagging is an actions array (the :ref:`old Tag property<oldtagproperty>` is still available).  Inside this actions array, you can add tagging objects.  

This table shows the parameters available for the Tag property.


+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter            | Required | Type             |  Description/Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+======================+==========+==================+=========================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================+
| enable               | false    | Boolean          |  This value is used to enable an action.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| setTag               | true     | Object           |  The setTag property is the tag(s) that will be applied (each additional property inside setTag is a tag that will be applied).                                                                                                                                                                                                                                                                                                                                                                                                         |
+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| ifAllMatch           | false    | Object           |  This property contains conditions you specify for the tag.  If you use this property, Telemetry Streaming verifies the conditions inside ifAllMatch and checks against the data.  All conditions inside this property must match the data for tagging to be performed. If you do not use this property, then the system tags everything in the **locations** property.                                                                                                                                                                 |
+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| locations            | false    | Object           |  This property is used to specify where the tags should be applied.  If you used ifAllMatch, and all of the conditions inside ifAllMatch pass, then the locations are where the tags are applied (or to default objects if no locations are provided). If you do not use this property, the following locations are used by default: virtualServers, pools, ltmPolicies, httpProfiles, clientSslProfiles, serverSslProfiles, networkTunnels, deviceGroups, and iRules. If you use this property with an empty array, no tagging occurs. |
+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+


The following is a snippet that includes this tagging action.
         
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

Example declaration using setTag
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The following is an example declaration using the tagging action.  In this example:

- Telemetry Streaming tags all **virtualServers** with the two tags in **setTag** if the conditions in **ifAllMatch** pass. 
- For the conditions in **ifAllMatch** to match, all **virtualServers** that match the regular expression ``.*``, must have the property that matches ``serverside.bits.*``.
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

Note that you can still use ```A``` and ```T``` as tag values.  For example:

.. code-block:: bash

    "setTag": {
      "applicationTag": "`A`",
      "tenantTag": "`T`"
    }

.. code-block:: bash

    "setTag": {
        "appInfo": {
            "applicationTag": "`A`",
            "tenantTag": "`T`"
        }
    }

.. _oldtagproperty:
  
Tag property for TS versions prior to 1.6.0
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

For Telemetry streaming versions 1.5.0 and earlier, the **tag** property provides a way to add additional properties (key:value) to the output. If not provided, the property will default to:

.. code-block:: json

    {
        "tenant": "`T`",
        "application": "`A`"
    }


| 
|

.. _include:

Using the includeData property
------------------------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for **includeData** is available in TS 1.8.0 and later.  

You can use the **includeData** property to output only the data you specify, and exclude everything else.  

The following table shows the possible parameters for includeData.  After the table, there are three examples.

|


+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter            | Required | Type             |  Description/Notes                                                                                                                                                                                                                                                                      |
+======================+==========+==================+=========================================================================================================================================================================================================================================================================================+
| enable               | false    | Boolean          |  This value is used to enable an action.                                                                                                                                                                                                                                                |
+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| ifAllMatch           | false    | Object           |  This property contains the conditions you specify for the includeData. If you use this property, Telemetry Streaming verifies the conditions inside ifAllMatch and checks against the data. All conditions inside this property must match the data for includeData to be performed.   |
+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| locations            | false    | Object           |  This property is used to specify what data should be included. If you used ifAllMatch, and all of the conditions inside ifAllMatch pass, then the locations will be included.                                                                                                          |
+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

|

includeData Example 1
^^^^^^^^^^^^^^^^^^^^^

The following is an example of Telemetry output without using includeData:

.. code-block:: json

    {
        "system": {
            "hostname": "hostname",
            "version": "14.0.0",
            "versionBuild": "0.0.1"
        }
    }


This is an example of an includeData Action definition:

.. code-block:: json

    {
        "includeData": {},
        "locations": {
            "system": {
                "version": true
            }
        }
    }


And this is an example of the output from the Action definition.

.. code-block:: json

    {
        "system": {
            "version": "14.0.0",
            "versionBuild": "0.0.1"
        }
    }

.. NOTE:: **includeData** treats 'version' as a regular expression, so as result both 'version' and 'versionBuild' are included in output.

|

includeData Example 2
^^^^^^^^^^^^^^^^^^^^^

The following is an example of Telemetry output without using includeData:

.. code-block:: json

    {
        "system": {
            "hostname": "hostname",
            "version": "14.0.0",
            "versionBuild": "0.0.1"
        }
    }


This is an example of an includeData Action definition:

.. code-block:: json

    {
        "includeData": {},
        "locations": {
            "system": {
                "version$": true
            }
        }
    }


And this is an example of the output from the Action definition.

.. code-block:: json

    {
        "system": {
            "version": "14.0.0"
        }
    }

|

includeData Example 3
^^^^^^^^^^^^^^^^^^^^^

The following is an example of Telemetry output without using includeData:

.. code-block:: json

    {
        "system": {
            "hostname": "hostname",
            "version": "14.0.0",
            "versionBuild": "0.0.1"
        },
        "virtualServers": {
            "virtual1": {
                "bits.in": "100",
                "bits.out": "200"
            }
        }
    }



This is an example of an includeData Action definition:

.. code-block:: json

    {
        "includeData": {},
        "locations": {
            "virtualServers": {
                ".*": {
                    "bits.in": true
                }
            }
        }
    }



And this is an example of the output from the Action definition.

.. code-block:: json

    {
        "virtualServers": {
            "virtual1": {
                "bits.in": "100"
            }
        }
    }

|

.. _exclude: 

Using the excludeData property
------------------------------
.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   Support for **excludeData** is available in TS 1.8.0 and later.  

You can use the **excludeData** property to exclude only the data you specify, and include everything else. 

The following table shows the possible parameters for excludeData.  After the table, there are three examples.

|


+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter            | Required | Type             |  Description/Notes                                                                                                                                                                                                                                                                      |
+======================+==========+==================+=========================================================================================================================================================================================================================================================================================+
| enable               | false    | Boolean          |  This value is used to enable an action.                                                                                                                                                                                                                                                |
+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| ifAllMatch           | false    | Object           |  This property contains the conditions you specify for the excludeData. If you use this property, Telemetry Streaming verifies the conditions inside ifAllMatch and checks against the data. All conditions inside this property must match the data for excludeData to be performed.   |
+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| locations            | false    | Object           |  This property is used to specify what data should be excluded. If you used ifAllMatch, and all of the conditions inside ifAllMatch pass, then the locations will be excluded.                                                                                                          |
+----------------------+----------+------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

|

excludeData Example 1
^^^^^^^^^^^^^^^^^^^^^

The following is an example of Telemetry output without using excludeData:

.. code-block:: json

    {
        "system": {
            "hostname": "hostname",
            "version": "14.0.0",
            "versionBuild": "0.0.1"
        }
    }


This is an example of an excludeData Action definition:

.. code-block:: json

    {
        "excludeData": {},
        "locations": {
            "system": {
                "version": true
            }
        }
    }


And this is an example of the output from the Action definition.

.. code-block:: json

    {
        "system": {
            "hostname": "hostname",
            "versionBuild": "0.0.1"
        }
    }


.. NOTE:: **includeData** treats 'version' as a regular expression, so as result both 'version' and 'versionBuild' are included in output.

|

excludeData Example 2a
^^^^^^^^^^^^^^^^^^^^^^

The following is an example of Telemetry output without using excludeData. Note that excludeData tries to find an exact match first, and if no exact match exists, then treats the property as a regular expression (see example 2b).

.. code-block:: json

    {
        "system": {
            "hostname": "hostname",
            "version": "14.0.0",
            "versionBuild": "0.0.1"
        }
    }


This is an example of an excludeData Action definition:

.. code-block:: json

    {
        "excludeData": {},
        "locations": {
            "system": {
                "version*": true
            }
        }
    }



And this is an example of the output from the Action definition.

.. code-block:: json

    {
        "system": {
            "hostname": "hostname"
        }
    }



excludeData Example 2b
^^^^^^^^^^^^^^^^^^^^^^
This example highlights how Telemetry Streaming treats a non-exact match as a regular expression (this example uses the same example without using excludeData).


This is an example of an excludeData Action definition:

.. code-block:: json

    {
        "excludeData": {},
        "locations": {
            "system": {
                "versio": true
            }
        }
    }



And this is an example of the output from the Action definition.

.. code-block:: json

    {
        "system": {
            "hostname": "hostname"
        }
    }


|

excludeData Example 3
^^^^^^^^^^^^^^^^^^^^^

The following is an example of Telemetry output without using excludeData:

.. code-block:: json

    {
        "system": {
            "hostname": "hostname",
            "version": "14.0.0",
            "versionBuild": "0.0.1"
        },
        "virtualServers": {
            "virtual1": {
                "bits.in": "100",
                "bits.out": "200"
            }
        }
    }



This is an example of an excludeData Action definition:

.. code-block:: json

    {
        "excludeData": {},
        "locations": {
            "virtualServers": {
                ".*": {
                    "bits.in": true
                }
            }
        }
    }




And this is an example of the output from the Action definition.

.. code-block:: json

    {
        "system": {
            "hostname": "hostname",
            "version": "14.0.0",
            "versionBuild": "0.0.1"
        },
        "virtualServers": {
            "virtual1": {
                "bits.out": "200"
            }
        }
    }

|
|

