Azure Log Analytics Example
--------------

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

