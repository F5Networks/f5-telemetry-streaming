.. _examples:

Example Declarations
====================
This section contains example Telemetry Streaming declarations.  Use the index on the left to go directly to a specific declaration.


Example 1: Base Declaration
---------------------------

.. literalinclude:: ../examples/declarations/basic.json
    :language: json

:ref:`Back to top<examples>`

|

Example 2: Two Consumers
------------------------
Note: This example shows only the Consumer class of the declaration and needs to be included with the rest of the base declaration.

.. literalinclude:: ../examples/declarations/multiple_consumers.json
    :language: json

:ref:`Back to top<examples>`

|


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

:ref:`Back to top<examples>`

|

Example 4: iHealth Poller
-------------------------
This example shows a case where Telemetry Streaming on one BIG-IP can pull statistics from an additional BIG-IP.

.. literalinclude:: ../examples/declarations/ihealth_basic.json
    :language: json

:ref:`Back to top<examples>`

|


.. _referencedpollers:

Example 5: Referenced Pollers
-----------------------------

.. code-block:: json
   :linenos:

    {
        "class": "Telemetry",
        "My_System_Inline_Pollers": {
            "class": "Telemetry_System",
            "enable": true,
            "trace": false,
            "host": "localhost",
            "port": 8100,
            "protocol": "http",
            "allowSelfSignedCert": false,
            "enableHostConnectivityCheck": false,
            "username": "admin",
            "passphrase": {
                "cipherText": "passphrase"
            },
            "systemPoller": {
                "enable": true,
                "trace": false,
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
                        "end":   "07:15"
                    },
                    "frequency": "monthly",
                    "day": "5"
                }
            }
        },
        "My_System_Referenced_Pollers": {
            "class": "Telemetry_System",
            "enable": true,
            "trace": false,
            "host": "localhost",
            "port": 8100,
            "protocol": "http",
            "allowSelfSignedCert": false,
            "enableHostConnectivityCheck": false,
            "username": "admin",
            "passphrase": {
                "cipherText": "passphrase"
            },
            "systemPoller": "My_Poller",
            "iHealthPoller": "My_iHealth"
        },
        "My_Poller": {
            "class": "Telemetry_System_Poller",
            "enable": true,
            "trace": false,
            "interval": 60
        },
        "My_iHealth": {
            "class": "Telemetry_iHealth_Poller",
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
                    "end":   "04:15"
                },
                "frequency": "monthly",
                "day": "5"
            }
        }
    }

    
:ref:`Back to top<examples>`

|
