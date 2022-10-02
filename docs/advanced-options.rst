Advanced Options
----------------

This section describes additional options you may want to use for configuring, once you are comfortable using F5 BIG-IP Telemetry Streaming.


+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Parameter                   | Options                        |  Description/Notes                                                                                                                                                                                                                                                                                                                                                                                                                |
+=============================+================================+===================================================================================================================================================================================================================================================================================================================================================================================================================================+
| enable                      | false, **true**, string        |  This value is used to disable any object in a declaration.                                                                                                                                                                                                                                                                                                                                                                       |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| trace                       | **false**, true, string        |  This value is useful during debug of Telemetry Streaming because it dumps intermediate data to a file. This value can be applied to the Poller, Listener, and Consumer classes. The option ``false`` disables the tracer. The option ``true`` enables the tracer and dumps the data in **/var/tmp/telemetry** in a file named **DEFAULT_LOCATION/OBJ_TYPE.OBJ_NAME**. The option ``string`` sets a custom path to the file.      |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| match                       | string, pattern (regex)        |  This value applies to the Telemetry_Listener class and provides a string or pattern (regex) which will result in events being dropped that do not match the value of a defined set of keys in the event. Defined keys: ``virtual_name, policy_name, Access_Profile, context_name``                                                                                                                                               |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| enableHostConnectivityCheck | true, **false**                |  This value applies to the Telemetry_Consumer and Telmetry_System class. If set to true, Telemetry Streaming will check if it can reach the host and return a fail if it cannot reach the host.                                                                                                                                                                                                                                   |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| allowSelfSignedCert         | true, **false**                |  This value applies to the Telemetry_Consumer and Telemetry_System class, as well as the Telemetry_iHealth_Poller **proxy** object.  If set to true, allows you to use self-signed certificates.                                                                                                                                                                                                                                  |
+-----------------------------+--------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

|


.. _pointersyntax:

Pointer Syntax
~~~~~~~~~~~~~~

In certain use cases, such as configuring the generic http consumer with secrets, you may need to reference objects in other parts of the configuration. To reference other objects, Telemetry Streaming uses JSON pointers with syntax derived primarily from Application Services 3.

- RFC 6901 compliant, with some enhancements to account for scenarios not outlined in the RFC
- Pointer types:

  - Absolute pointer: `=/Shared/secretPath`
  - Relative pointer: `=passphrase`
  - Relative (nearest class) pointer: `=@/passphrase`

- Pointer formats (determined by leading character):

  - Resolve value: =
  - Resolve value and base64 decode: +
  - Resolve value and replace property with object (no stringify): >