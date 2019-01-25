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
- BIG-IP capabilities focus on LTM (note AS3 will be delivering some ASM / AFM capabilities in upcoming releases).
- Organizations need to deploy BIG-IP configs as Infrastructure as Code (IaC) via integration with DevOps pipelines.

*Telemetry Streaming may not be a good fit where:*

- Declarative interface is not desirable
- Organization is unwilling or unable to deploy iControl Extension RPM on BIG-IP
- Organization requires BIG-IQ analytics and/or AS3 integration (AS3 support is coming to BIG-IQ later in CY18)
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

**What is the AS3 Schema?**

For detailed information on the AS3 Schema, see :ref:`understanding-the-json-schema`.  

Briefly:

- The JSON Schema document prescribes the syntax of an AS3 declaration.
- The AS3 declaration schema controls what objects may appear in a declaration, what name they may or must use, what properties they may have, which of those you must supply in the declaration, and which AS3 may fill with default values.
- The schema also specifies the ranges of values which certain properties may take on.

|


**What is the delivery cadence for Telemetry Streaming?**

Telemetry Streaming is on a monthly delivery cadence, typically at beginning of every month.

|


**Is there a migration path for AS3 releases?**

F5 intends to ensure all AS3 releases schemas/APIs are backwards compatible, so we recommend migrating to the newest supported version of AS3. Because F5 guarantees AS3 schema backwards-compatibility, upgrades to newer versions of AS3 should be seamless.

|

.. _upgrade-ref:

**What if I upgrade my BIG-IP system, how to I migrate my AS3 configuration?**

When you upgrade your BIG-IP system, you simply install AS3 on the upgraded BIG-IP system and re-deploy your declaration.  For example, you installed AS3 on your BIG-IP running version 12.1.1 and deployed a declaration.  You decide to upgrade your BIG-IP system to 13.1. Once the upgrade to 13.1 is complete, you must install AS3 on the BIG-IP.  After you install AS3, you send the same declaration you used pre-upgrade to the 13.1 BIG-IP system. Your upgraded BIG-IP will then have the same configuration as the previous version.

|

**What happens on the front-end and back-end of AS3?**

- *Front-end*:  
  AS3 exposes a declarative iControl LX REST API on the front-end: /mgmt/shared/appsvcs/declare.

- *Back-end*:  
  AS3 uses iControl REST APIs on the back-end to communicate with BIG-IP. AS3 can use 3rd party REST APIs to communicate with 3rd party systems, enabling integration opportunities.

|

**Does AS3 support multi-tenancy?**

- Yes, AS3 creates and uses additional partitions to enable multi-tenancy
- AS3 does NOT write to the common partition
- AS3 does NOT have access to tenants/partitions that it hasn't created

|

**Why doesn't AS3 write to the Common partition?**

- AS3 does not write to the Common partition to ensure there is no impact to an existing device configuration where both AS3 and legacy configuration methods are being used
- While use of separate partitions may be new behavior for some users, F5 has designed AS3 in this manner in order to deliver the safest possible deployment mechanism on BIG-IP
- The use of separate partitions also prevents possible naming collisions and maintains a logical object hierarchy that allows AS3 to deliver stable transactions (atomicity) and idempotency

|

.. _common-ref:

**Which existing objects can AS3 reference in the Common partition?**

Some properties in AS3 are polymorphic, allowing you to choose among predefined resources selected by name, a declared resource, or a BIG-IP resource defined outside AS3. When a value in this category is an object, it must have exactly one property, either **use** or **bigip**.  

**use** indicates a reference to another class object in the declaration.  **bigip** indicates a component pathname to an object that was created outside of AS3 (typically in /Common).

Using the **bigip** clause allows you to specify pre-existing objects, such as pools, SNATs, iRules, HTTP profiles, HTTP Compression profiles, HTTP Acceleration profile, TCP profiles, UDP profiles, Multiplex profiles, WAF policies, IAM policies, Firewall policies, NAT policies, Endpoint policies, Server TLS profiles, client TLS profiles, SSL certificates, and SSL keys.

To reference these objects, you simply include a line in your declaration such as:

.. code-block:: javascript

   "profileTCP": {
      "bigip": "/Common/mptcp-mobile-optimized"
   } 

Some of the example declarations in :ref:`additional-examples` contain these references. For more information on referencing objects, see :ref:`the reference documentation<shared-ref>`.  Also see our video about referencing objects on the BIG-IP: https://www.youtube.com/watch?v=b55noytozMU.



|

**Does AS3 replace iWorkflow?**

- AS3 does not replace iWorkflow
- An iWorkflow-like GUI-based Service Catalog is not built into AS3
- You can build GUI-based Service Catalog capabilities with third-party tools like Ansible Tower

|

**Is AS3 backwards-compatible with AS2.x API calls?**

No.

|

**How do I migrate from AS2.x to AS3?**

See :ref:`migration` for migration strategies for the most common use cases. 

|

**How do I report issues, feature requests, and get help with AS3?**

- You can use GitHub Issues to submit feature requests or problems with AS3.
- Because F5 Networks created and fully tested AS3, it is fully supported by F5. This means you can get assistance if necessary from F5 Technical Support.
- Community Help:
    We encourage you to use our Slack channel for discussion and assistance on AS3 (click the f5-appsvcs-extension channel).
    Some F5 employees are members of this community, and they typically monitor the channel Monday-Friday 9-5 PST and will offer best-effort assistance.
    You should not consider this Slack channel community support as a substitute for F5 Technical Support.
    See the Slack Channel Statement for guidelines on using this channel.

|

**What is the difference between AS3 Selective and Complete updates and why is this important?**

- *Selective* is the default behavior in which tenants not explicitly referenced in declaration rePOSTing are NOT modified.
- When you enable *Complete* update, AS3 WILL delete tenants not explicitly referenced in declaration rePOSTing  (e.g. if the tenant is no longer in the declaration, that is an implicit instruction to delete the tenant so that the resulting config truly represents what you requested).
- It is important to know the difference to prevent you from accidentally deleting tenants if you don't reference them when updating a declaration.  See :ref:`adc-class-ref` for usage.

 
|

**Does AS3 support token authentication?  This is critical to support remote authentication roles (TACACS).**

- AS3 relies on the iControl LX framework for auth, and takes either Basic Auth credentials or iControl REST tokens (X-F5-Auth-Token) to authenticate to target devices.
- The AS3 user must supply one or the other; AS3 does not convert Basic Auth (name + passphrase) credentials to iControl REST tokens itself.

|

**Given AS3’s tenancy model uses administrative partitions, does this mean I need to explicitly specify my SSL certificates and keys in each tenant partition?**
 
No. While AS3 does not write to the Common partition, AS3.3.0 introduces the ability to reference SSL certificates and keys defined in the clientssl profile in the **Common** partition. This simplifies your AS3 declarations enabling you to accelerate secure deployments of your app services.
 
|

**What can I do with the Service Discovery capability introduced in AS3.3.0?**
 
AS3.3 introduces the ability to use F5's Service Discovery feature for Amazon Web Services (AWS) and Google Cloud Platform. Service Discovery enables the BIG-IP system to automatically update members in a load balancing pool based on cloud application hosts. You simply tag your cloud resources with key and value information, and then in the declaration you POST information about your cloud environment, including the cloud tag key and tag value you specified, and the BIG-IP VE programmatically discovers (or removes) members with those tags.
 
|

**How do I include Service Discovery in my AS3 declaration?**
 
See :doc:`service-discovery` for information.


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