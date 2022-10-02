REST API Endpoints
------------------

Base Endpoint
`````````````

F5 BIG-IP Telemetry Streaming's base URI is **mgmt/shared/telemetry**. The allowed **Content-Type** for POST requests is **application/json**, otherwise HTTP code 415 **Unsupported Media Type** will be returned.

Request example:

.. code-block:: bash

   curl -v -u admin:<admin_password> -X GET http://localhost:8100/mgmt/shared/telemetry/info


Output:

.. code-block:: json

   {"nodeVersion":"v4.6.0","version":"1.0.0","release":"2","schemaCurrent":"1.0.0","schemaMinimum":"1.0.0"}


Response
````````
Response is valid JSON data. When the response is HTTP 200

When the response code is other than 2xx, the response body typically looks like the following object:

.. code-block:: bash

    {
        "code": ERROR_CODE, // number
        "message": "ERROR_MESSAGE" // string
    }
 


Info
````
The endpoint to retrieve information about the application is **<base_endpoint>/info**. The allowed HTTP method is **GET**. 

Output:

.. code-block:: json

    {
        "nodeVersion": "v4.6.0",
        "version": "1.0.0",
        "release": "2",
        "schemaCurrent": "1.0.0",
        "schemaMinimum": "1.0.0"
    }

Declare configuration
`````````````````````

The endpoint to declare/retrieve the configuration is **<base_endpoint>/declare**. The allowed HTTP methods are **POST** and **GET**.


