Quick Start
===========

If you are familiar with the BIG-IP system, and generally familiar with REST and
using APIs, this section contains the minimum amount of information to get you
up and running with Telemetry Services.

.. sidebar:: :fonticon:`fa fa-info-circle fa-lg` Note:

   The Package Management LX tab will not show up in the user interface unless you have previously used the command line to create a file called "enable" in the directory /var/log/.

#. Download the latest RPM package from |github| in the **dist** directory.
#. Upload and install the RPM package on the using the BIG-IP GUI:

   - :guilabel:`Main tab > iApps > Package Management LX > Import`
   - Select the downloaded file and click :guilabel:`Upload`
   - For complete instructions see :ref:`installgui-ref` or
     :ref:`installcurl-ref`.

#. Be sure to see the known issues on GitHub (https://github.com/F5Networks/f5-telemetry/issues)  and :doc:`tips-warnings` pages to review any known issues and other important information before you attempt to use Telemetry.
#. Provide authorization (basic auth) to the BIG-IP system:  

   - If using a RESTful API client like Postman, in the :guilabel:`Authorization` tab, type the user name and password for a BIG-IP user account with Administrator permissions.
   - If using cURL, see :ref:`installcurl-ref`.

#. *Optional*: Using a RESTful API client like Postman, POST an open and
   closed bracket (**{}**) to the URI
   ``https://<BIG-IP>/mgmt/shared/telemetry/selftest`` to ensure Telemetry Services is running
   properly.

#. Copy one of the :ref:`examples` which best matches the configuration you want
   to use.  Alternatively, you can use the simple "Hello World" example below,
   which is a good start if you don't have an example in mind.

#. Paste the declaration into your API client, and modify names and IP addresses
   as applicable.  See :ref:`schema-reference` for additional options you can
   declare.

#. POST to the URI ``https://<BIG-IP>/mgmt/shared/telemetry/declare``

**Quick Start Example**

.. code-block:: json
   :linenos:

    {
        "class": "Telemetry",
        "configuration": {
            "My_Poller": {
                "class": "System_Poller",
                "enabled": true,
                "trace": false,
                "interval": 60,
                "host": "x.x.x.x",
                "port": 443,
                "username": "myuser",
                "passphrase": "mypassphrase",
            },
            "My_Listener": {
                "class": "Event_Listener",
                "enabled": true,
                "trace": false,
                "port": 6514
            },
            "My_Consumer": {
                "class": "Consumer",
                "enabled": true,
                "trace": false,
                "type": "Azure_Log_Analytics",
                "host": "myworkspaceid",
                "passphrase": "mysharedkey"
                
            }
        }
    }




