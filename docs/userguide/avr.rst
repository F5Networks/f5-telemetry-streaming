.. _avr-ref:

Exporting data from AVR
=======================

As of TS version 1.3.0, you can now export AVR data. The TS declaration will be the same but the Event Listener needs to be configured to allow TS to receive AVR data from the BIG-IP system. At a high level the prerequisites include:

  - AVR module should be provisioned 
  - TS should have the Event Listener configured
  - AVR should be configured to send data to TS
  - The Analytics profile for HTTP or TCP should be configured and assigned to the virtual server

.. NOTE:: To see more information on AVR, see |analytics|.



Example output:

.. code-block:: json
   :linenos:

    {
        "hostname":"telemetry.bigip.com",
        "errdefs_msgno":"01490102:5:",
        "partition_name":"Common",
        "session_id":"ec7fd55d",
        "Access_Profile":"/Common/access_app",
        "Partition":"Common",
        "Session_Id":"ec7fd55d",
        "Access_Policy_Result":"Logon_Deny",
        "tenant":"Common",
        "application":"",
        "telemetryEventCategory":"event"
    }




.. |analytics| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_analytics/manuals/product/analytics-implementations-13-1-0.html" target="_blank">BIG-IP Analytics Implementations guide</a>

