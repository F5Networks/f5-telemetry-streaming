Example Declarations
====================

Example 1: Base Declaration
----------------
.. code-block:: json
   :linenos:

    {
        "class": "Telemetry",
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


Example 2: Two Consumers
------------------------
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
            "protocol": "http",
            "port": "8088",
            "passphrase": {
                "cipherText": "apikey"
            }
        }
    }



Example 3: External System (BIG-IP)
-----------------------------------
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

