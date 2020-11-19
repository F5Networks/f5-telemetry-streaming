Telemetry Streaming Namespaces
==============================
Telemetry Streaming v1.16 introduces the concept of of *namespaces*, which is a grouping of Telemetry components.  With namespaces, you can declare separate configurations to allow better control of data forwarding. Namespaces are declared in the new **Telemetry_Namespace** class, which acts as the container for the namespace.

The following are important notes about namespaces.

- The components declared on the top level of a declaration are treated as part of a default namespace with no name. As such they will behave as grouped together and will not conflict with the other "named" namespaces. All existing behavior for this default namespace will be preserved.
- Each namespace works separately from another and cannot share configuration or object references. 
- While each namespace must have a unique name, the components in a namespace can share the same name as the components in another namespace. 
- Namespaces are not tied in any way to RBAC. 
- Currently, Telemetry Streaming only only supports a full declaration sent to **/telemetry/declare**. If there are multiple namespaces, they must all be declared in the POST body. 
- All namespaces inherit the top level **controls** object. 
- For pull consumers: If a pull consumer is declared under a namespace, the URI to get the data should specify the namespace in path, for example **/mgmt/shared/telemetry/namespace/${namespaceName} pullconsumer/${pullConsumerName}**


The following examples show how you can use namespaces in your Telemetry Streaming declarations.

Basic declaration with namespace only
-------------------------------------
In this example, all objects are in the namespace named **My_Namespace**.  Because there is only one namespace, except for the name, this is essentially the same as if there were no namespace specified.

.. literalinclude:: ../examples/declarations/basic_namespace.json
    :language: json

|

Multiple namespaces in a declaration
------------------------------------
In this example, we show how you can use multiple namespaces in a declaration.  This shows how namespaces can be used to group components by function.

Note that the Consumers in each namespace are using the same name (highlighted in the example).


.. literalinclude:: ../examples/declarations/multiple_namespaces.json
    :language: json
    :emphasize-lines: 15, 41

|

Default and custom namespaces in a declaration
----------------------------------------------
In this example, we show how you can use the default namespace (where you do not specify a named namespace), and a named namespace in a declaration.  

The lines that are not highlighted in the example are all part of the default namespace. The highlighted lines are a part of the custom **My_Namespace** namespace.


.. literalinclude:: ../examples/declarations/default_and_custom_namespace.json
    :language: json
    :emphasize-lines: 24-37