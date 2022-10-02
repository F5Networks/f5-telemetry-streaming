.. _outputexample-ref:

Example Output
==============

Use this page to see the type of information that F5 BIG-IP Telemetry Streaming collects. Use the links in the right pane to find a particular example.

.. IMPORTANT::  The following are just examples; the actual fields will vary depending on factors such as how the log/event source is configured, BIG-IP versions, and so on. 

.. NOTE:: For some of the output to appear, you must have the applicable BIG-IP module licensed and provisioned (for example, you must have BIG-IP DNS provisioned to get GSLB wide IP and Pool information).

.. _sysinfo:

System Information
------------------
The following shows the system information that F5 BIG-IP Telemetry Streaming collects. 

.. NOTE:: In F5 BIG-IP Telemetry Streaming 1.24 and later, properties that require the bash endpoint are skipped if bash is not available on the target BIG-IP: system.diskStorage, system.diskLatency, system.apmState, and all tmstats properties (used with “Splunk legacy” format).

**Additional properties** |br|
The following properties were introduced in recent F5 BIG-IP Telemetry Streaming versions.  These properties do not appear in the output in previous versions.  The following table shows the BIG-IP TS version the property was introduced, the type of output, and property (with description if applicable).

.. list-table::
      :widths: 20 20 200 
      :header-rows: 1

      * - Version
        - Type
        - Property

      * - 1.22
        - Virtual Server
        - **clientside.slowKilled**, **clientside.evictedConns**

      * - 1.23
        - Virtual Server
        - **isAvailable**, **isEnabled** (both boolean), which monitor virtual server availability, particularly for the Prometheus consumer. 

      * - 1.23
        - System
        - **throughputPerformance**, which shows throughput performance information. 

      * - 1.25
        - Pool Member
        - **poolName**, which shows the associated pool name.

      * - 1.26
        - Pool Member
        - **fqdn**, which shows FQDN information for LTM pool member nodes that are FQDN nodes.
  
      * - 1.27
        - System
        - **asmAttackSignatures**, which shows ASM attack signature information.

      * - 1.31
        - System
        - **system.connectionsPerformance**, shows performance stats.


.. literalinclude:: ../examples/output/system_poller/output.json
    :language: json

:ref:`Back to top<outputexample-ref>`
    

iHealth Information Request
---------------------------

.. literalinclude:: ../examples/output/ihealth_poller/output.json
    :language: json
    
    
:ref:`Back to top<outputexample-ref>`


LTM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by BIG-IP Telemetry Streaming, they must be configured with BIG-IP AS3 or another method.

.. literalinclude:: ../examples/output/request_logs/ltm_request_log.json
    :language: json
   

:ref:`Back to top<outputexample-ref>`


AFM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by BIG-IP Telemetry Streaming, they must be configured with BIG-IP AS3 or another method.

.. literalinclude:: ../examples/output/request_logs/afm_request_log.json
    :language: json
    
    
:ref:`Back to top<outputexample-ref>`

.. _asmrl:

ASM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by BIG-IP Telemetry Streaming, they must be configured with BIG-IP AS3 or another method.

.. literalinclude:: ../examples/output/request_logs/asm_request_log.json
    :language: json
   

:ref:`Back to top<outputexample-ref>`

.. _apm-rl:

APM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by BIG-IP Telemetry Streaming, they must be configured with BIG-IP AS3 or another method.

**New**: F5 BIG-IP Telemetry Streaming 1.17 adds a timestamp, highlighted in yellow.  You will not see this output in versions prior to 1.17.

.. literalinclude:: ../examples/output/request_logs/apm_request_log.json
    :language: json
    :emphasize-lines: 13

:ref:`Back to top<outputexample-ref>`

AVR Request Log
---------------

.. literalinclude:: ../examples/output/request_logs/avr_request_log.json
    :language: json
   

:ref:`Back to top<outputexample-ref>`


.. |br| raw:: html

   <br />