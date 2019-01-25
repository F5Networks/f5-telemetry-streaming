Telemetry Streaming Frequently Asked Questions (FAQ)
----------------------------------------------------


**What is Telemetry Streaming?**

See the |intro| for a description of Telemetry Streaming. This entry contains information on what TS is and what it is not.

*Telemetry Streaming is:*

-  A javascript |ilx| plug-in
-  A project based on the intent of the |iapp|
-  A |declare| interface for |apps| on BIG-IP
-  |idempotent|
-  |support|
-  |atomic| (TS declarations)
-  Able to support |multi|
-  Able to support |rd| association with any IP address according to traditional
   BIG-IP syntax, for example ``10.10.10.10%2``

*BUT... it is:*

-  **not** used to on-board or license a BIG-IP device
-  **not** intended for configuring Route Domains, Routes, Self IPs, VLANs, or other Layer 2/3 objects or components
-  **not** a mechanism to provide differential authorization or RBAC
-  **not** an iApp, nor does it configure iApps
-  **not** created to include a graphical interface (GUI)
-  **not** a replacement for iWorkflow

| 

**When is Telemetry Streaming a good fit and when it is not?**

*Telemetry Streaming is a good fit where:*

- You require a declarative interface to abstract away the complexity of BIG-IP configuration.

*Telemetry Streaming may not be a good fit where:*

- Declarative interface is not desirable
- Organization is unwilling or unable to deploy iControl Extension RPM on BIG-IP
- Organization wants to continue using imperative interfaces (GUI, TMSH, iControl REST APIs) to configure BIG-IP (not just monitor or troubleshoot).

|

**Why did F5 create iControl LX and AS3 when there are already TCL iApps?**

- TCL iApps are a great solution for templatizing and simplifying specific application service.
- Each TCL iApp focuses on the delivery of a single application service.
- iControl LX gives new flexibility and capabilities not available in traditional TCL iApps.
- iControl LX / iApps LX enables users to do everything they can do with TCL iApps and much more.
- iControl LX enables users to deliver AS3 which provides a single declarative interface to enable a wide variety of BIG-IP configurations, not just a single application service.
- iControl LX enables users to harness the power and flexibility of Node.js to enable new capabilities, 3rd-party integrations, and support DevOps pipelines.

|


**Which TMOS versions does Telemetry Streaming support?**

Telemetry Streaming supports TMOS 13.x

|

**How do I get started with Telemetry Streaming?**

See the :doc:`quick-start` to jump right into using TS.

|

**What is a "Telemetry Streaming Declaration"?**

- Telemetry Streaming uses a declarative model, meaning you provide a JSON declaration rather than a set of imperative commands.
- You do not need to sequence the declaration in a specific order; Telemetry Streaming will figure out the steps and order of operations for you, making it declarative.
- Telemetry Streaming is well-defined according to the rules of the JSON Schema, and validates declarations according to the JSON Schema.

|

**What is the delivery cadence for Telemetry Streaming?**

Telemetry Streaming is on a monthly delivery cadence, typically at beginning of every month.

|


.. _upgrade-ref:

**What if I upgrade my BIG-IP system, how to I migrate my Telemetry Streaming configuration?**

When you upgrade your BIG-IP system, you simply install Telemetry Streaming on the upgraded BIG-IP system and re-deploy your declaration.  For example, you installed Telemetry Streaming on your BIG-IP running version 12.1.1 and deployed a declaration.  You decide to upgrade your BIG-IP system to 13.1. Once the upgrade to 13.1 is complete, you must install Telemetry Streaming on the BIG-IP.  After you install Telemetry Streaming, you send the same declaration you used pre-upgrade to the 13.1 BIG-IP system. Your upgraded BIG-IP will then have the same configuration as the previous version.

|

**What happens on the front-end and back-end of Telemetry Streaming?**

- *Front-end*:  
  Telemetry Streaming exposes a declarative iControl LX REST API on the front-end: /mgmt/shared/appsvcs/declare.

- *Back-end*:  
  Telemetry Streaming uses iControl REST APIs on the back-end to communicate with BIG-IP. Telemetry Streaming can use 3rd party REST APIs to communicate with 3rd party systems, enabling integration opportunities.

|

**How do I report issues, feature requests, and get help with Telemetry Streaming?**

- You can use GitHub Issues to submit feature requests or problems with Telemetry Streaming.
- Because F5 Networks created and fully tested Telemetry Streaming, it is fully supported by F5. This means you can get assistance if necessary from F5 Technical Support.

|




.. |intro| raw:: html

   <a href="https://clouddocs.f5.com/products/extensions/f5-appsvcs-extension/3/#introduction" target="_blank">Introduction</a>

.. |ilx| raw:: html

   <a href="https://clouddocs.f5.com/products/iapp/iapp-lx/latest/" target="_blank">iControl LX</a>

.. |iapp| raw:: html

   <a href="https://github.com/F5Networks/f5-application-services-integration-iApp" target="_blank">appsvcs_integration iApp</a>

.. |declare| raw:: html

   <a href="https://f5.com/about-us/blog/articles/in-container-land-declarative-configuration-is-king-27226" target="_blank">declarative</a>

.. |apps| raw:: html

   <a href="https://f5.com/resources/white-papers/automating-f5-application-services-a-practical-guide-29792" target="_blank">configuring applications</a>

.. |idempotent| raw:: html

   <a href="https://whatis.techtarget.com/definition/idempotence" target="_blank">idempotent</a>

.. |support| raw:: html

   <a href="https://f5.com/support/support-policies" target="_blank">supported by F5</a>

.. |atomic| raw:: html

   <a href="https://www.techopedia.com/definition/3466/atomic-operation" target="_blank">atomic</a>

.. |multi| raw:: html

   <a href="https://en.wikipedia.org/wiki/Multitenancy" target="_blank">multi-tenancy</a>

.. |rd| raw:: html

   <a href="https://support.f5.com/kb/en-us/products/big-ip_ltm/manuals/product/tmos-routing-administration-13-1-0/9.html#guid-ebe7b3ea-c89f-4abc-976d-9c98755dd566" target="_blank">route domain</a>