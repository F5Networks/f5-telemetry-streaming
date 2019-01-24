Logging
=======

Telemetry Streaming logs to /var/log/restnoded.log
The logging level is set in the "controls" class with possible values of "debug", "info", and "error". The default value is info. 

.. code-block:: json
   :linenos:

    {
        "controls": {
            "class": "Controls",
            "logLevel": "info"
        }
    }

To change the logging level, you should submit the declaration with a changed logLevel.

