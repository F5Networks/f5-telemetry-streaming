.. _examples:

Example Declarations
====================

Example 1: Base Declaration
---------------------------

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



Example 2: Two Consumers
------------------------
Note: This example shows only the Consumer class of the declaration and needs to be included with the rest of the base declaration.

.. code-block:: json
   :linenos:

    {
        "class": "Telemetry",
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Azure_Log_Analytics",
            "host": "workspaceid",
            "passphrase": {
                "cipherText": "sharedkey"
            }
        },
        "My_Second_Consumer": {
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


Example 3: External System (BIG-IP)
-----------------------------------
This example shows a case where Telemetry Streaming on one BIG-IP can pull statistics from an additional BIG-IP.

.. code-block:: json
   :linenos:

    {
        "My_Poller": {
            "class": "Telemetry_System_Poller",
            "interval": 60,
            "host": "192.0.2.1",
            "port": 443,
            "username": "myuser",
            "passphrase": {
                "cipherText": "mypassphrase"
            }
        }
    }


Example 4: iHealth Poller
-------------------------
This example shows a case where Telemetry Streaming on one BIG-IP can pull statistics from an additional BIG-IP.

.. code-block:: json
   :linenos:

   {
        "class": "Telemetry",
        "My_System": {
            "class": "Telemetry_System",
            "systemPoller": {
                "interval": 60
            },
            "iHealthPoller": {
                "username": "username",
                "passphrase": {
                    "cipherText": "passphrase"
                },
                "proxy": {
                    "host": "127.0.0.1",
                    "protocol": "http",
                    "port": 80,
                    "enableHostConnectivityCheck": false,
                    "allowSelfSignedCert": false,
                    "username": "username",
                    "passphrase": {
                        "cipherText": "passphrase"
                    }
                },
                "interval": {
                    "timeWindow": {
                        "start": "23:15",
                        "end":   "02:15"
                    },
                    "frequency": "monthly",
                    "day": "5"
                }
            }
        }
    }
