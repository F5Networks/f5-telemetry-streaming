Logging
=======

Telemetry Streaming logs to **/var/log/restnoded.log**.
The logging level is set in the "controls" class with possible values of "debug", "info", and "error". The default value is **info**. To change the logging level, submit the declaration with logLevel set to the preferred value.

.. code-block:: json
   :linenos:

    {
        "controls": {
            "class": "Controls",
            "logLevel": "info"
        }
    }



Example log entries for different levels
----------------------------------------

info
````
The info value will log information and errors.

.. code-block:: bash

   Thu, 24 Jan 2019 02:20:19 GMT - info: [telemetry] Global logLevel set to 'info'
   Thu, 24 Jan 2019 02:20:19 GMT - info: [telemetry] Loading consumer specific plug-ins from ./consumers
   Thu, 24 Jan 2019 02:20:19 GMT - info: [telemetry] 0 consumer plug-in(s) loaded


debug
`````
The debug value will log everything.

.. code-block:: bash

   Thu, 24 Jan 2019 02:18:56 GMT - info: [telemetry] Global logLevel set to 'debug'
   Thu, 24 Jan 2019 02:18:56 GMT - finest: [telemetry] configWorker change event in consumers
   Thu, 24 Jan 2019 02:18:56 GMT - info: [telemetry] Loading consumer specific plug-ins from ./consumers
   Thu, 24 Jan 2019 02:18:56 GMT - finest: [telemetry] configWorker change event in eventListener
   Thu, 24 Jan 2019 02:18:56 GMT - finest: [telemetry] 0 event listener(s) listening
   Thu, 24 Jan 2019 02:18:56 GMT - finest: [telemetry] configWorker change event in systemPoller
   Thu, 24 Jan 2019 02:18:56 GMT - info: [telemetry] 0 consumer plug-in(s) loaded


error
`````
The error value will log only errors.

.. code-block:: bash

   Thu, 24 Jan 2019 02:22:03 GMT - info: [telemetry] Global logLevel set to 'error'
   Thu, 24 Jan 2019 02:22:08 GMT - severe: [telemetry] validateAndApply error: [{"keyword":"enum","dataPath":"['controls'].logLevel","schemaPath":"controls_schema.json#/allOf/0/then/properties/logLevel/enum","params":{"allowedValues":["debug","info","error"]},"message":"should be equal to one of the allowed values"}]
   Traceback:
   Error: [{"keyword":"enum","dataPath":"['controls'].logLevel","schemaPath":"controls_schema.json#/allOf/0/then/properties/logLevel/enum","params":{"allowedValues":["debug","info","error"]},"message":"should be equal to one of the allowed values"}]
      at validator.then.catch (/var/config/rest/iapps/f5-telemetry/nodejs/config.js:237:41)
      at <anonymous>
      at process._tickCallback (internal/process/next_tick.js:188:7)


