.. _delete-ts:

Deleting the Telemetry Streaming configuration
----------------------------------------------
If you want to delete the TS configuration, simply send a POST request to **/telemetry/declare** with the following in the Body of the request:

.. code-block:: json

  {
    "class": "Telemetry"
  }


The configuration produced by Telemetry Streaming will be deleted.