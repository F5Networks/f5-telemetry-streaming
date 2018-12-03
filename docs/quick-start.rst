Quick Start
===========

If you are familiar with the BIG-IP system, and generally familiar with REST and
using APIs, this section contains the minimum amount of information to get you
up and running with Telemetry Services.

**Quick Start Example**

.. code-block:: json
   :linenos:

    {
        "class": "Telemetry",
        "configuration": {
            "My_Poller": {
                "class": "System_Poller",
                "enabled": true,
                "trace": false,
                "interval": 60,
                "host": "x.x.x.x",
                "port": 443,
                "username": "myuser",
                "passphrase": "mypassphrase",
            },
            "My_Listener": {
                "class": "Event_Listener",
                "enabled": true,
                "trace": false,
                "port": 6514
            },
            "My_Consumer": {
                "class": "Consumer",
                "enabled": true,
                "trace": false,
                "type": "Azure_Log_Analytics",
                "host": "myworkspaceid",
                "passphrase": "mysharedkey"
                
            }
        }
    }




