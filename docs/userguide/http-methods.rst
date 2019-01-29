HTTP Methods
------------
This section contains the current HTTP methods available with Telemetry Streaming.

POST
~~~~
To send your declaration to Telemetry Streaming, use the POST method to the URI
``https://<BIG-IP>/mgmt/telemetry/declare`` and put your declaration in the
body of the post (after :doc:`authentication <authentication>`).  If successful, you see a success message, and the system
echoes your declaration back to you.  In addition to deploying a declaration,
POST supports more actions, like reporting a previous declaration (useful with
remote targets since GET may only have localhost credentials) or returning the
index of saved declarations.

GET
~~~
You can use the GET method to retrieve the declarations you previously sent to
Telemetry STreaming. Use the GET method to the URI
``https://<BIG-IP>/mgmt/telemetry/declare``. Only declarations you create
in Telemetry Streaming return, GET does not return anything that was not created by Telemetry Streaming.

