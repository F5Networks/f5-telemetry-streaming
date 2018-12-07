# Introduction

This is the top-level documentation which provides notes and information about contributing to this project.

## System Poller

### Adding Info (stats)

1. Collect the raw data from the device by adding a new endpoint to [Paths.json](../src/nodejs/config/paths.json), which resides under the */config* directory.
    * Example (basic):

        ```javscript
        {
            "endpoint": "/mgmt/tm/sys/global-settings"
        }
        ```
    * Macros (advanced): [Paths.json](../src/nodejs/config/paths.json) can retrieve the data in some additional, specific ways using custom macros.  These are defined with some explanation in the following block.

        ```javascript
        {
            "endpoint": "/mgmt/tm/sys/someEndpoint", // REST endpoint
            "expandReferences": { "membersReference": { "endpointSuffix": "/stats" } }, // Certain data requires getting a list of objects and then in each object expanding/following references to a child object.  'membersReference' is the name of that key (currently looking under 'items' in the data returned) and will result in self link data being retrived and 'membersReference' key being replaced with that data.  'endpointSuffix' defines adding a suffix for each self link prior to retrieval.
            "body": "{ \"command\": \"run\", \"utilCmdArgs\": \"-c \\\"/bin/df -P | /usr/bin/tr -s ' ' ','\\\"\" }", // Certain information may require using POST instead of GET and require an HTTP body, if body is defined that gets used along with a POST
            "name": "someStatRef" // Alternate name to reference in properties.json, default is to use the endpoint
        }
        ```
2. Enable and define how the data should look by adding a new key under *stats* in [Properties.js](../src/nodejs/config/properties.json), which resides under the */config* directory.
    * Example (basic):

        ```javascript
        "hostname": {
            "key": "/mgmt/tm/sys/global-settings::hostname"
        }
        ```
    * Macros (advanced): [Properties.json](../src/nodejs/config/properties.json) can manipulate the data in some additional, specific ways using custom macros.  These are defined along with some explanation in the following block.

        ```javascript
        "someKey": {
            "key": "/mgmt/tm/sys/someUri::someChildKey", // /uri (or alt name in paths.json) + key(s) seperated by '::' to navigate into object and get a specific value
            "normalize": false, // This can override normalization, can be useful when adding new info/stat
            "disabled": true, // This alerts the engine to ignore specific info/stat
            "convertArrayToMap": { "keyName": "name", "keyNamePrefix": "name/" }, // Converts an array to a map using the value of a standard key such as 'name' in each object in the array.  Optionally add a prefix to that value (useful if filterKeys is also used)
            "filterKeys": [ "name/", "hostname" ], // Filter all keys in object using provided list
            "renameKeys": { "name/": { "pattern": "name\/(.*)", "group": 1 }, "~": { "replaceCharacter": "/" },  }, // Rename keys, useful if key contains unneccesary prefix/suffix or needs a specific character replaced.  Note: This can also be an array with 1+ rename key objects inside it to guarantee order.
            "runFunction": { "name": "getPercentFromKeys", "args": { "totalKey": "memoryTotal", "partialKey": "memoryUsed" } }, // Run custom function, nail meet hammer.  This is to be used for one-offs where creating a standard macro does not make sense, keeping in mind each custom function could be used multiple times.  The function should already exist inside of normalizeUtil.js.
            "comment": "some comment", // Simple means to provide a comment in properties.json about a particular info/stat for other contributors
            "if": { "deviceVersionGreaterOrEqual": "13.0" }, // Simple conditional block. Every key inside "if" is predefined function to test which returns 'true' or 'false'. If several key are encountered then logical AND will be used to compute final result. More information about available function below. By default result is true for empty block.
            "then": { "pkey": "pvalue" }, // Optional block. When condition(s) inside "if" is True, the data inside "then" will be used. It is allowed to have nested "if...then...else" block.
            "else": { "pkey1": "plvalue1" } // Optional block. When condition(s) inside "if" is False, the data inside "else" will be used. It is allowed to have nested "if...then...else" block.
        }
        ```

    * Context Macros: [Properties.json](../src/nodejs/config/properties.json) allows to define the data which should be preloaded before *stats* processing. It allows to parametrize Macros "key" property using following syntax:

        ```javascript
        "someKey": {
            "key": "/mgmt/tm/cm/device::items::{{HOSTNAME}}::description" // "HOSTNAME" (surrounded by '{{' and '}}') is context key which containts device's hostname
        }
        ```

        Context data should be defined on the same level as *stats* in [Properties.json](../src/nodejs/config/properties.json). There are two ways how the context object can be defined:

        * Object with Macros:

            ```javascript
            "context": {
                "someCtxKey1": {
                    "key": "/mgmt/tm/sys/global-settings::hostname" // other Macros properties are available too. Context data is not availble!
                }
            }
            ```

        * Array of objects with Macros. This definition allows to specify loading order to resolve dependency when context Macros requires contextual information from other Macros:

            ```javascript
            "context": [
                {
                    "someCtxKey1": {
                        "key": "/mgmt/tm/sys/global-settings::hostname" // other Macros properties are available too. Context data is not availble for the first set of Macros.
                    }
                },
                {
                    "someCtxKey2": {
                        "key": "/mgmt/tm/sys/global-settings::{{ someCtxKey1 }}" // other Macros properties are available too. Context data is available now! 
                    }
                }
            ]
            ```

    * Test functions for conditional blocks. Functions should exists inside of [systemStats.js](../src/nodejs/systemStats.js).

        * **deviceVersionGreaterOrEqual** - function to compare current device's version against provided one.
            ```javascript
            "if": {
                "deviceVersionGreaterOrEqual": "13.0"
            }
            ```
