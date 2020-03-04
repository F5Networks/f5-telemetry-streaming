.. _examples:

Example Declarations
====================
This section contains example Telemetry Streaming declarations.  Use the index on the left to go directly to a specific declaration.


Example 1: Base Declaration
---------------------------

.. literalinclude:: ../examples/declarations/basic.json
    :language: json

:ref:`Back to top<examples>`

|

Example 2: Two Consumers
------------------------
Note: This example shows only the Consumer class of the declaration and needs to be included with the rest of the base declaration.

.. literalinclude:: ../examples/declarations/multiple_consumers.json
    :language: json

:ref:`Back to top<examples>`

|


Example 3: External System (BIG-IP)
-----------------------------------
This example shows a case where Telemetry Streaming on one BIG-IP can pull statistics from an additional BIG-IP.

.. code-block:: json


    {
        "My_Poller": {
            "class": "Telemetry_System_Poller",
            "interval": 60,
            "host": "192.0.2.1",
            "port": 443,
            "username": "myuser",
            "passphrase": {
                "cipherText": "mypassphrase"
            }
        }
    }

:ref:`Back to top<examples>`

|

Example 4: iHealth Poller
-------------------------

.. literalinclude:: ../examples/declarations/ihealth_basic.json
    :language: json

:ref:`Back to top<examples>`

|

.. _referencedpollers:

Example 5: Referenced Pollers
-----------------------------

.. literalinclude:: ../examples/declarations/system.json
    :language: json

    

    
:ref:`Back to top<examples>`

|

.. _customendpoint:

Example 6: Custom Endpoints
---------------------------
.. IMPORTANT:: Configuring custom endpoints and multiple system pollers specific to those endpoints is currently EXPERIMENTAL and is available in TS v1.10.0 and later. See :doc:`custom-endpoints` for more information on this feature.

|

.. literalinclude:: ../examples/declarations/system_custom_endpoints.json
    :language: json

    

    
:ref:`Back to top<examples>`

|

.. _value:

Example 7: Value-based matching
-------------------------------
.. IMPORTANT:: Value-based matching is available in TS v1.10.0 and later. See :ref:`valuebased` for more information on this feature.

.. literalinclude:: ../examples/declarations/system_custom_endpoints.json
    :language: json

    

    
:ref:`Back to top<examples>`

|