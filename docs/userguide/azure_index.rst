Azure Log Analytics Example
--------------

#. Go to portal.azure.My_Consumer

#. Click Create a Resource

#. In the Search the Marketplace box, type "Log Analytics"

#. Click Create

.. code-block:: json
   :linenos:

    {
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Azure_Log_Analytics",
            "host": "workspaceid",
            "passphrase": {
                "cipherText": "sharedkey"
            }
        }
    }

