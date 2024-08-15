.. _memorymanagement:

Memory Management - BETA
==========================
.. NOTE:: Using F5 BIG-IP Telemetry Streaming **Memory Monitor** is supported as of BIG-IP TS 1.35. 

F5 BIG-IP Telemetry Streaming v1.35 and later allows you to specify memory usage limit.


Overview of the "memoryMonitor" property of Controls class
----------------------------------------------------------
The "memoryMonitor" property of Controls class is where you define your memory usage limits.


.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - Property
        - Required
        - Description
  
      * - **interval**
        - No
        - Defines how often **Memory Monitor** should check memory usage. The acceptable values are **default** (the default), or **aggressive** (forces **Memory Monitor** to check memory usage more often).
  
      * - **logFrequency**
        - No
        - Defines how often **Memory Monitor** should log memory usage data. The default value set to **10** seconds. The minimal value is **1**. 
  
      * - **logLevel**
        - No
        - Defines the logging level **Memory Monitor** should use to log memory usage data. The acceptable values are **verbose**, **debug** (the default), **info** or **error**
  
      * - **memoryThresholdPercent**
        - No
        - Defines the threshold value for memory usage. Once limit is exceeded the data processing will be temporarily ceased until the level returns below the threshold. The default value set to **90**. The minimal value is **1** and the maximum **100**.
  
      * - **osFreeMemory**
        - No
        - Defines the threshold value for OS free memory. Once amount of OS free memory becomes below the threshold value then data processing will be temporarily ceased until the level returns above the threshold. The default value set to **30** MB. The minimal value is **1**.
  
      * - **provisionedMemory**
        - No
        - Defines the total amount of memory available for application. The **allowed** amount of memory is calculated by multiplying **provisionedMemory** and **memoryThresholdPercent**. Defaults to the value of **runtime.maxHeapSize**. The minimal value is **1** and maximum should not exceed **runtime.maxHeapSize**.

      * - **thresholdReleasePercent**
        - No
        - Defines amount of memory (in %) once memory utilization is equal or below that value the data processing will be enabled. The default value set to **90**. The minimal value is **1** and the maximum **100**. For more info see :ref:`memorystateflapping`.


For example, your declaration could add the following snippet, which contains **Memory Monitor** configuration:

.. code-block:: bash

   {
       ...
        "controls": {
            "class": "Controls",
            "memoryMonitor": {
                "interval": "aggressive",
                "logFrequency": 60,
                "logLevel": "debug",
                "memoryThresholdPercent": 80,
                "osFreeMemory": 100,
                "provisionedMemory": 500,
                "thresholdReleasePercent": 95
            }
        }
    }


**memoryThresholdPercent** as part of Controls and "memoryMonitor"
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

F5 BIG-IP Telemetry Streaming v1.35 and later allows to specify **memoryThresholdPercent** twice:

.. code-block:: bash

   {
       ...
        "controls": {
            "class": "Controls",
            "memoryThresholdPercent": 80,
            "memoryMonitor": {
                "logLevel": "debug",
                "memoryThresholdPercent": 90,
                "provisionedMemory": 500
            }
        }
    }

For this particular case the property **controls/memoryMonitor/memoryThresholdPercent** with value **90**% has more priority than **controls/memoryThresholdPercent** with value **80**% and as result the last one will be ignored.
If the property **controls/memoryMonitor/memoryThresholdPercent** would not be specified then **controls/memoryThresholdPercent** would be used. In other words - whenever **controls/memoryMonitor/memoryThresholdPercent**
specified then **controls/memoryThresholdPercent** ignored despite the value.

.. code-block:: bash

   {
       ...
        "controls": {
            "class": "Controls",
            "memoryMonitor": {
                "logLevel": "debug",
                "memoryThresholdPercent": 90,
                "provisionedMemory": 500
            }
        }
    }

**Memory Monitor** will be configured with **memoryThresholdPercent** set to **90** %.


Using the "memoryMonitor" property of Controls class
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The good starting point of using **memoryMonitor** may looks like following:

.. code-block:: bash

   {
       ...
        "controls": {
            "class": "Controls",
            "memoryMonitor": {
                "memoryThresholdPercent": 90
            }
        }
    }

Simply limit memory usage by applying 90% threshold.


Default behavior when the "memoryMonitor" property not configured
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
If the **memoryMonitor** property is not specified, then default values will be used. It is equal to following declaration:

.. code-block:: bash

   {
       ...
        "controls": {
            "class": "Controls",
            "memoryMonitor": {
                "interval": "default",
                "logFrequency": 10,
                "logLevel": "debug",
                "memoryThresholdPercent": 90,
                "osFreeMemory": 30,
                "provisionedMemory": 1400,
                "thresholdReleasePercent": 90
            }
        }
    }


Default behavior when no active components configured
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Let's say your declaration look like following:


.. code-block:: bash

   {
        "class": "Telemetry",
        "controls": {
            "class": "Controls",
            "memoryMonitor": {
                "interval": "default",
                "logFrequency": 10,
                "logLevel": "debug",
                "memoryThresholdPercent": 90,
                "osFreeMemory": 30,
                "provisionedMemory": 1400,
                "thresholdReleasePercent": 90
            }
        },
        "listener": {
            "class": "Telemetry_Listener",
            "enable": false
        }
    }

Once declaration applied F5 BIG-IP Telemetry Streaming checks if there are any active components enabled at all.
For that declaration **Memory Monitor** will be disabled because there are no active components.


.. _memorystateflapping:

How to avoid processing state "flapping" behavior
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Once limits defined by **memoryThresholdPercent** exceeding the data processing will be temporarily ceased until levels return below the threshold.
F5 BIG-IP Telemetry Streaming allows to specify a recovery state once reached will enable data processing. **thresholdReleasePercent** is amount of memory (in %)
once memory utilization is equal or below that value the data processing will be enabled.

Let's say your declaration look like following:

.. code-block:: bash

   {
        "class": "Telemetry",
        "controls": {
            "class": "Controls",
            "memoryMonitor": {
                "memoryThresholdPercent": 90,
                "provisionedMemory": 1000,
                "thresholdReleasePercent": 90
            }
        },
        "listener": {
            "class": "Telemetry_Listener",
            "enable": false
        }
    }

**provisionedMemory** set to 1000 MB and the threshold value is **provisionedMemory** * **memoryThresholdPercent** = *1000 MB* * *90%* = *900 MB*.
Once memory usage exceeded *900 MB* the data processing will be temporarily ceased until levels return below **thresholdReleasePercent**.
The recovery limit calculated using following formula: **threshold** * **thresholdReleasePercent**, where **threshold** = **provisionedMemory** * **memoryThresholdPercent**.
In our example it will be *900 MB* * *90%* = *810 MB*. Once memory usage returns below or equal to *810 MB* the data processing
will be enabled and back to its activity.

.. NOTE:: It is not recommended to set **thresholdReleasePercent** to **100** because it may result in **flapping** behavior: processing state will switch its states rapidly without a delay.

| 

.. _runtimeconfigoptions:

Runtime Configuration options - BETA
------------------------------------
The "runtime" property of Controls class is where you define your runtime configuration.

.. NOTE:: Using F5 BIG-IP Telemetry Streaming **runtime** is supported as of BIG-IP TS 1.35 (currently experimental).

.. IMPORTANT:: **RUNTIME CONFIGURATION OPTIONS SHOULD BE USED ONLY WHEN YOU ARE OBSERVING/EXPERIENCING MEMORY USAGE ISSUES**

.. list-table::
      :widths: 25 25 200
      :header-rows: 1

      * - Property
        - Required
        - Description
  
      * - **enableGC**
        - No
        - **EXPERIMENTAL**: Enables the built-in Garbage Collector and makes it available for F5 BIG-IP Telemetry Streaming to clean up freed memory blocks. The default is **false**.

      * - **httpTimeout**
        - No
        - **EXPERIMENTAL**: Defines the HTTP timeout value in seconds for F5 BIG-IP Telemetry Streaming incoming REST API requests. Allows F5 BIG-IP Telemetry Streaming to avoid TimeoutException error for long lasting operations. The default value set to **60** seconds. The minimal value is **60** seconds and the maximum value is **600**.
  
      * - **maxHeapSize**
        - No
        - **EXPERIMENTAL**: Defines the upper limit of V8's heap size that allows F5 BIG-IP Telemetry Streaming to utilize more memory before being killed due to a Heap-Out-Of-Memory error. The default value set to **1400** MB. The minimal value is **1400** MB.

.. IMPORTANT:: Changes in the runtime's configuration may require the **restnoded** service to be restarted. F5 BIG-IP Telemetry Streaming will schedule the **restnoded** restart when changes in configuration are made.

The good starting point of using **runtime** may looks like following:

.. code-block:: bash

   {
        "class": "Telemetry",
        "controls": {
            "class": "Controls",
            "runtime": {
                "enableGC": true
            }
        }
    }

It enables the garbage collection function that F5 BIG-IP Telemetry Streaming will use to free memory.

Declaration with all **runtime** properties specified:

.. code-block:: bash

   {
        "class": "Telemetry",
        "controls": {
            "class": "Controls",
            "runtime": {
                "enableGC": false,
                "httpTimeout": 60,
                "maxHeapSize": 1400
            }
        }
    }
