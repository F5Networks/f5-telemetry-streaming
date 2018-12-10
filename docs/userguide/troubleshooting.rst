Troubleshooting
===============
Use this section to read about known issues and for common troubleshooting steps.

**AS3 general troubleshooting tips**:

- Examine the restnoded failure log at /var/log/restnoded/restnoded.log (this is where AS3 records error messages)

- Examine the REST response:

  - A 400-level response will carry an error message with it
  - If this message is missing, incorrect, or misleading, please let us know by filing an issue on Github.

- Use AS3's trace option to create a detailed trace of the configuration process for subsequent analysis. AS3's trace option can be a powerful tool to learn about its working details and to review AS3's operations in detail


**Troubleshooting**

*I'm receiving a path not registered error when I try to post a declaration*  

If you are receiving this error, it means either you did not install AS3, or it did not install properly.  The error contains the following message:  

.. code-block:: shell

    {
        "code":404,
        "message": "Public URI path no registered. Please see /var/log/restjavad.0.log and /var/log/restnoded/restnoded.log for details.".
        ...
    }


If you receive this error, see :doc:`installation` to install or re-install AS3.



