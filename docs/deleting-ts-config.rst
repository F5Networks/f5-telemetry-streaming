.. _delete-ts:

Deleting the F5 BIG-IP Telemetry Streaming configuration
--------------------------------------------------------
If you want to delete the BIG-IP TS configuration, simply send a POST request to **/telemetry/declare** with the following in the Body of the request:

.. code-block:: json

  {
    "class": "Telemetry"
  }


The configuration produced by BIG-IP Telemetry Streaming will be deleted.