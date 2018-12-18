Troubleshooting
===============
Use this section to read about known issues and for common troubleshooting steps.

**Telemetry Streaming general troubleshooting tips**:

- Examine the restnoded failure log at /var/log/restnoded/restnoded.log (this is where Telemetry Streaming records error messages)

- Examine the REST response:

  - A 400-level response will carry an error message with it
  - If this message is missing, incorrect, or misleading, please let us know by filing an issue on Github.

- Use Telemetry's trace option to create a detailed trace of the configuration process for subsequent analysis. Telemetry's trace option can be a powerful tool to learn about its working details and to review Telemetry's operations in detail.


**Troubleshooting**

*I'm receiving a path not registered error when I try to post a declaration*  

If you are receiving this error, it means either you did not install Telemetry Streaming, or it did not install properly. The error contains the following message:  

.. code-block:: shell

    {
        "code":404,
        "message": "Public URI path no registered. Please see /var/log/restjavad.0.log and /var/log/restnoded/restnoded.log for details.".
        ...
    }


If you receive this error, see :doc:`installation` to install or re-install Telemetry Streaming.



