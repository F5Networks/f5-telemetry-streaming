.. _outputexample-ref:

Example Output
==============

Use this page to see the type of information that Telemetry Streaming collects. Use the links in the right pane to find a particular example.

.. IMPORTANT::  The following are just examples; the actual fields will vary depending on factors such as how the log/event source is configured, BIG-IP versions, and so on. 

.. _sysinfo:

System Information
------------------
The following shows the system information that Telemetry Streaming collects. 

.. NOTE:: For some of the output to appear, you must have the applicable BIG-IP module licensed and provisioned (for example, you must have BIG-IP DNS provisioned to get GSLB wide IP and Pool information).

Telemetry Streaming 1.17 introduced additional pool and virtual server output, these do not appear in earlier versions.

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
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by Telemetry Streaming, they must be configured with AS3 or another method.

.. literalinclude:: ../examples/output/request_logs/ltm_request_log.json
    :language: json
   

:ref:`Back to top<outputexample-ref>`


AFM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by Telemetry Streaming, they must be configured with AS3 or another method.

.. literalinclude:: ../examples/output/request_logs/afm_request_log.json
    :language: json
    
    
:ref:`Back to top<outputexample-ref>`

ASM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by Telemetry Streaming, they must be configured with AS3 or another method.

.. literalinclude:: ../examples/output/request_logs/asm_request_log.json
    :language: json
   

:ref:`Back to top<outputexample-ref>`

.. _apm-rl:

APM Request Log
---------------
.. NOTE:: Log streams from LTM, AFM, ASM, and APM are not configured by Telemetry Streaming, they must be configured with AS3 or another method.

**New**: Telemetry Streaming 1.17 adds a timestamp, highlighted in yellow.  You will not see this output in versions prior to 1.17.

.. literalinclude:: ../examples/output/request_logs/apm_request_log.json
    :language: json
    :emphasize-lines: 13

:ref:`Back to top<outputexample-ref>`

AVR Request Log
---------------

.. literalinclude:: ../examples/output/request_logs/avr_request_log.json
    :language: json
   

:ref:`Back to top<outputexample-ref>`