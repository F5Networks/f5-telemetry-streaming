Quick Start
===========

If you are familiar with the BIG-IP system, and generally familiar with REST and
using APIs, this section contains the minimum amount of information to get you
up and running with Telemetry Streaming.

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Version Notice:

   In BIG-IP versions prior to 14.0.0, the Package Management LX tab will not show up in the user interface unless you run the following command from the BIG-IP CLI: ``touch /var/config/rest/iapps/enable``.

#. Download the latest RPM package from |github| in the **dist** directory.
#. Upload and install the RPM package on the using the BIG-IP GUI:

   - :guilabel:`Main tab > iApps > Package Management LX > Import`
   - Select the downloaded file and click :guilabel:`Upload`
   - For complete instructions see :ref:`installgui-ref` or
     :ref:`installcurl-ref`.

#. Be sure to see the known issues on GitHub (https://github.com/F5Networks/f5-telemetry-streaming/issues) to review any known issues and other important information before you attempt to use Telemetry Streaming.

#. Provide authorization (basic auth) to the BIG-IP system:  

   - If using a RESTful API client like Postman, in the :guilabel:`Authorization` tab, type the user name and password for a BIG-IP user account with Administrator permissions.
   - If using cURL, see :ref:`installcurl-ref`.

#. Using a RESTful API client like Postman, send a GET request to the URI
   ``https://{{host}}/mgmt/shared/telemetry/info`` to ensure Telemetry Streaming is running
   properly.

#. Copy one of the :ref:`examples` which best matches the configuration you want
   to use.  Alternatively, you can use the simple "Hello World" example below,
   which is a good start if you don't have an example in mind.

#. Paste the declaration into your API client, and modify names and IP addresses
   as applicable.

#. POST to the URI ``https://<BIG-IP>/mgmt/shared/telemetry/declare``

**Quick Start Example**

.. literalinclude:: ../../examples/declarations/basic.json
    :language: json
    :linenos:

    


    
.. |github| raw:: html

   <a href="https://github.com/F5Networks/f5-telemetry-streaming" target="_blank">F5 Telemetry Streaming site on GitHub</a>

