# Introduction

This is the top-level documentation which provides notes and information about contributing to this project.

## System Poller

### Adding Info (stats)

1. Collect the raw data from the device by adding a new endpoint to paths.json, which resides under the */config* directory.
    * Example (basic):
        ```json
        {
            "endpoint": "/mgmt/tm/sys/global-settings"
        }
        ```
    * Macros (advanced): Paths.json can retrieve the data in some additional, specific ways using custom macros.  These are defined with some explanation in the following block.
        ```json
        {
            "endpoint": "/mgmt/tm/sys/someEndpoint", // REST endpoint
            "expandReferences": { "membersReference": { "endpointSuffix": "/stats" } }, // Certain data requires getting a list of objects and then in each object expanding/following references to a child object.  'membersReference' is the name of that key (currently looking under 'items' in the data returned) and will result in self link data being retrived and 'membersReference' key being replaced with that data.  'endpointSuffix' defines adding a suffix for each self link prior to retrieval.
            "body": "{ \"command\": \"run\", \"utilCmdArgs\": \"-c \\\"/bin/df -P | /usr/bin/tr -s ' ' ','\\\"\" }", // Certain information may require using POST instead of GET and require an HTTP body, if body is defined that gets used along with a POST
            "name": "someStatRef" // Alternate name to reference in properties.json, default is to use the endpoint
        }
        ```
2. Enable and define how the data should look by adding a new key under *stats* in properties.json, which resides under the */config* directory.
    * Example (basic):
        ```json
        "hostname": {
            "key": "/mgmt/tm/sys/global-settings::hostname"
        }
        ```
    * Macros (advanced): Properties.json can manipulate the data in some additional, specific ways using custom macros.  These are defined along with some explanation in the following block.
        ```json
        "someKey": {
            "key": "/mgmt/tm/sys/someUri::someChildKey", // /uri (or alt name in paths.json) + key(s) seperated by '::' to navigate into object and get a specific value
            "normalize": false, // This can override normalization, can be useful when adding new info/stat
            "disabled": true, // This alerts the engine to ignore specific info/stat
            "convertArrayToMap": { "keyName": "name", "keyNamePrefix": "name/" }, // Converts an array to a map using the value of a standard key such as 'name' in each object in the array.  Optionally add a prefix to that value (useful if filterKeys is also used)
            "filterKeys": [ "name/", "hostname" ], // Filter all keys in object using provided list
            "renameKeys": { "name/": { "pattern": "name\/(.*)", "group": 1 } }, // Rename keys using a regex pattern, typically useful if key contains unneccesary prefix/suffix
            "runFunction": { "name": "getPercentFromKeys", "args": { "totalKey": "memoryTotal", "partialKey": "memoryUsed" } }, // Run custom function, nail meet hammer.  This is to be used for one-offs where creating a standard macro does not make sense, keeping in mind each custom function could be used multiple times.  The function should already exist inside of normalizeUtil.js.
            "comment": "some comment" // Simple means to provide a comment in properties.json about a particular info/stat for other contributors
        }
        ```