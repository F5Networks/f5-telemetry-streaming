# Introduction

This is the top-level documentation which provides notes and information about contributing to this project.  It is broken down into a couple of key sections, listed below.

- [Overview](#overview)
- [Contributing](#contributing)

---
## Overview

The telemetry streaming system includes a number of key components, listed below.

*System*: Target system (BIG-IP) to use for stats polling, iHealth polling.

*System Poller*: Polls a system on a defined interval for information such as device statistics, virtual server statistics, pool statistics and much more.

*iHealth Poller*: Creates system's Qkview file, uploads it to F5 iHealth Service and polls diagnostics from it on a defined schedule.

*Event Listener*: Provides a listener, on both TCP and UDP protocols, that can accept events in a specific format and process them.

*Consumer*: Accepts information from disparate systems and provides the tools to process that information.  In the context of Telemetry Streaming this simply means providing a mechanism by which to integrate with existing analytics products.

---
### Diagram

![diagram](images/diagram.png)

---
### Anatomy of a Request

How does the project handle a typical `POST` request?

`POST /mgmt/shared/telemetry/declare`

```json
{
    "class": "Telemetry",
    "My_System": {
        "class": "Telemetry_System",
        "systemPoller": {
            "interval": 60
        }
    },
    "My_Listener": {
        "class": "Telemetry_Listener",
        "port": 6514
    },
    "My_Consumer": {
        "class": "Telemetry_Consumer",
        "type": "Splunk",
        "host": "192.0.2.1",
        "protocol": "https",
        "port": 8088,
        "passphrase": {
            "cipherText": "apikey"
        }
    }
}
```

*Response*:

```javascript
{
    "message": "success",
    "declaration": {
        "class": "Telemetry",
        "My_System": {
            "class": "Telemetry_System",
            "systemPoller": {
                "interval": 60,
                "enable": true,
                "trace": false,
                "tag": {
                    "tenant": "`T`",
                    "application": "`A`"
                }
            },
            "enable": true,
            "trace": false,
            "host": "localhost",
            "port": 8100,
            "protocol": "http"
        },
        "My_Listener": {
            "class": "Telemetry_Listener",
            "port": 6514,
            "enable": true,
            "trace": false,
            "tag": {
                "tenant": "`T`",
                "application": "`A`"
            },
            "match": ""
        },
        "My_Consumer": {
            "class": "Telemetry_Consumer",
            "type": "Splunk",
            "host": "192.0.2.1",
            "protocol": "https",
            "port": 8088,
            "passphrase": {
                "cipherText": "$M$Q7$xYs5xGCgf6Hlxsjd5AScwQ==",
                "class": "Secret",
                "protected": "SecureVault"
            },
            "enable": true,
            "trace": false,
            "format": "default"
        },
        "schemaVersion": "1.11.0"
    }
}
```

---
#### Anatomy of a Request (cont.)

What happens in the system internals between request and response?

- LX worker receives request which validates URI, etc.
    - ref: [restWorker.js](../src/nodejs/restWorker.js)
- Request is validated using JSON schema and AJV, config event fires
    - ref: [config.js](../src/lib/config.js)
- System poller, event listener, etc. configures system resources
    - ref: [systemPoller.js](../src/lib/systemPoller.js), [eventListener.js](../src/lib/eventListener.js), etc.
- Client response sent with validated config
    - ref: [config.js](../src/lib/config.js)
    ```javascript
        return promise.then((config) => {
        util.restOperationResponder(restOperation, 200,
            { message: 'success', declaration: config });
    })
    ```

---
## Contributing

Ok, overview done!  Now let's dive into the major areas to be aware of as a developer.

- [Core Modules](#core-modules)
- [Adding System Poller Stats](#adding-system-poller-stats)
- [Adding a New Consumer](#adding-a-new-consumer)
- [Testing methodology](#testing-methodology)
- [Release methodology](#release-methodology)
- [Public documentation methodology](#public-documentation-methodology)

---
### Core modules

All core modules are included inside `../src/lib/`

- [restWorker.js](../src/nodejs/restWorker.js)
    - Purpose: Hook for incoming HTTP requests
- [config.js](../src/lib/config.js)
    - Purpose: Handle configuration actions... such as validation, persistent storage, etc.
- [systemPoller.js](../src/lib/systemPoller.js)
    - Purpose: Handles CRUD-like actions for any system pollers required based on client configuration
    - Related: See [iHealthPoller.js](../src/lib/iHealthPoller.js)
- [eventListener.js](../src/lib/eventListener.js)
    - Purpose: Handles CRUD-like actions for any event listeners required based on client configuration.
- [systemStats.js](../src/lib/systemStats.js)
    - Purpose: Called by system poller to create stats object based on the static JSON configuration files available in `config/` directory such as [properties.json](../src/lib/properties.json)
- [consumers.js](../src/lib/consumers.js)
    - Purpose: Handles load/unload actions for any consumers required based on client configuration. Consumers must exist in `consumers` directory, see [Adding a New Consumer](#adding-a-new-consumer)
- [forwarder.js](../src/lib/forwarder.js)
    - Purpose: Handles calling each loaded consumer when an event is ready for forwarding (system poller event, event listener event, etc.)

---
### Adding System Poller Stats

Adding stats to the system poller is a frequent activity, below describes the configuration based approach to making an addition.

#### Adding System Poller Stats - Paths.json

Collect the raw data from the device by adding a new endpoint to the paths configuration file.

[Paths.json](../src/lib/paths.json)

*Basic Example:*

```javascript
{
    "path": "/mgmt/tm/sys/global-settings"
}
```

*Advanced Macros:* These macros signal the system to retrieve the data in specific, additional ways.

```javascript
{
    "path": "/mgmt/tm/sys/someEndpoint", // REST endpoint
    "includeStats": true, // Certain data is only available via /mgmt/tm/sys/someEndpoint as opposed to /mgmt/tm/sys/someEndpoint/stats, this property accommodates for this by making call to /stats (for each item) and adding that data to the original object
    "expandReferences": { "membersReference": { "endpointSuffix": "/stats" } }, // Certain data requires getting a list of objects and then in each object expanding/following references to a child object.  'membersReference' is the name of that key (currently looking under 'items' in the data returned) and will result in self link data being retrieved and 'membersReference' key being replaced with that data. If 'endpointSuffix' is supplied, a suffix is added to each self link prior to retrieval, otherwise, the value of self link as is will be used. In cases like gslb where both config and stats are needed, both the `link` and `link/stats` need to be fetched, hence, the resulting config is "expandReferences": { "membersReference": { "includeStats": true } }, which is equivalent to "expandReferences": { "membersReference": { "endpointSuffix": "", "includeStats": true } }. TODO: revisit keywords/ naming here to consolidate and avoid confusion
    "endpointFields": [ "name", "fullPath", "selfLink", "ipProtocol", "mask" ], // Will collect only these fields from the endpoint. Useful when using includeStats and the same property exists in both endpoints. Also can be used instead of a large exclude/include statement in properties.json
    "body": "{ \"command\": \"run\", \"utilCmdArgs\": \"-c \\\"/bin/df -P | /usr/bin/tr -s ' ' ','\\\"\" }", // Certain information may require using POST instead of GET and require an HTTP body, if body is defined that gets used along with a POST. Body can be either string or object
    "name": "someStatRef", // Alternate name to reference in properties.json, default is to use the endpoint
    "ignoreCached": true // Invalidate cached response of previous request to endpoint
}
```

---
#### Adding System Poller Stats - Properties.json

Enable and define how the data should look by adding a new key under *stats* in the properties configuration file.

[Properties.json](../src/lib/properties.json)

*Basic Example:*

```javascript
{
    "hostname": {
        "key": "/mgmt/tm/sys/global-settings::hostname"
    }
}
```

*Advanced Macros:* These macros can manipulate the data in some specific, additional ways. The "normalization" process will run in the order specified in the "normalization" array.  The following block describes the complete list:

```javascript
{
    "someKey": {
        "key": "/mgmt/tm/sys/someUri::someChildKey", // /uri (or alt name in paths.json) + key(s) separated by '::' to navigate into object and get a specific value
        "keyArgs": { // Arguments that can be passed to the associated alt name endpoint in paths.json
            "replaceStrings": { "\\$tmstatsTable": "cpu_info_stat" } // Key/value pairs that replace matching strings in request body. The key is treated as a regular expression
        }
        "normalize": false, // This can override normalization, can be useful when adding new info/stat
        "disabled": true, // This alerts the engine to ignore specific info/stat
        "normalization": [
            {
                "convertArrayToMap": { "keyName": "name", "keyNamePrefix": "name/" }, // Converts an array to a map using the value of a standard key such as 'name' in each object in the array.  Optionally add a prefix to that value (useful if filterKeys is also used)
            },
            {
                "includeFirstEntry": { "pattern": "/stats", "excludePattern": "/members/",  "runFunctions": [ {"name": "someCustomFunc" } ]  }, // This is useful if aggregating data from /endpoint and /endpoint/stats typically.  Allows a complex object to by merged instead of nesting down into entries, instead the values in the first entry of 'entries' will be copied to the top level object and then discarded.  There may be multiple 'entries', of which only some should follow this property, that is supported with an optional pattern, excludePattern and runFunctions.
            },
            {
                "filterKeys": { "exclude": [ "removeMe"] }, // Filter all keys in object using either an inclusion or exclusion list - include also supported, not an exact match
            },
            {
                "renameKeys": { "name/": { "pattern": "name\/(.*)", "group": 1 }, "~": { "replaceCharacter": "/" },  }, // Rename keys, useful if key contains unnecessary prefix/suffix or needs a specific character replaced. This can also be an array with 1+ rename key objects inside it to guarantee order.
            },
            {
                "runFunctions": [{ "name": "getPercentFromKeys", "args": { "totalKey": "memoryTotal", "partialKey": "memoryUsed" } }], // Run custom functions, nail meet hammer.  This is to be used for one-offs where creating a standard macro does not make sense, keeping in mind each custom function could be used multiple times.  The function should already exist inside of normalizeUtil.js.
            },
            {
                "addKeysByTag": true || { "skip": [ "members" ] }, // Add keys by tag(s) defined in the configuration, default value to use should be 'true'.  The global property 'addKeysByTag' contains the default behavior regarding keys to skip, etc.
            }
        ]
        "comment": "some comment", // Simple means to provide a comment in properties.json about a particular stat for other contributors
        "if": { "deviceVersionGreaterOrEqual": "13.0" }, // Simple conditional block. Every key inside "if" is predefined function to test which returns 'true' or 'false'. If several key are encountered then logical AND will be used to compute final result. More information about available function below. By default result is true for empty block.
        "then": { "pkey": "pvalue" }, // Optional block. When condition(s) inside "if" is True, the data inside "then" will be used. It is allowed to have nested "if...then...else" block.
        "else": { "pkey1": "plvalue1" }, // Optional block. When condition(s) inside "if" is False, the data inside "else" will be used. It is allowed to have nested "if...then...else" block.
        "structure": { "parentKey": "system" }, // any stat can be gently placed inside another parent key as needed, this defines how to specify that and reference the parent key
        "system": { "structure": { "folder": true } } // a top level key can be defined and filled in with other stats, this should be the properties of that key
    }
}
```

---
#### Adding System Poller Stats - Context Data

Certain properties require dynamic data to be pulled from the system prior to *stats* processing.

```javascript
{
    "someStat": {
        "key": "/mgmt/tm/cm/device::items::{{HOSTNAME}}::description" // "HOSTNAME" (surrounded by '{{' and '}}') is context key which contains device's hostname
    }
}
```

This context data is defined on the same level as *stats* in the properties configuration file. There are two ways to define the context object:

*Object (current):*

```javascript
{
    "context": {
        "someCtxKey1": {
            "key": "/mgmt/tm/sys/global-settings::hostname" // other Macros properties are available too. Context data is not available!
        }
    }
}
```

*Array of objects (future, as needed):* This definition allows to specify loading order to resolve dependency when context Macros requires contextual information from other Macros:

```javascript
{
    "context": [
        {
            "someCtxKey1": {
                "key": "/mgmt/tm/sys/global-settings::hostname" // other Macros properties are available too. Context data is not available for the first set of Macros.
            }
        },
        {
            "someCtxKey2": {
                "key": "/mgmt/tm/sys/global-settings::{{someCtxKey1}}" // other Macros properties are available too. Context data is available now!
            }
        }
    ]
}
```

---
#### Adding System Poller Stats - Conditional blocks
Some stats may only be available in certain conditions, for example on BIG-IP v13+.  This is the list of functions available inside the `"if"` block.  These functions should exist inside [systemStats.js](../src/lib/systemStats.js).

*deviceVersionGreaterOrEqual:* Function to compare current device's version against provided one.
```javascript
{
   "if": {
        "deviceVersionGreaterOrEqual": "13.0"
   }
}
```

*isModuleProvisioned:* Function to compare current device's provisioned modules against provided one.
```javascript
{
   "if": {
        "isModuleProvisioned": "asm"
   }
}
```

---
### Adding a New Consumer

Adding a new consumer involves two "simple" steps:

- Add a new plugin to ../src/lib/consumers
- Add any new configuration properties to the consumer [schema](../src/schema/latest/consumer_schema.json)

Additional information about adding a new consumer plugin can be found in the [consumer readme](../src/lib/consumers/README.md)

---
### Testing methodology

Additional information about the testing methodology can be found in the [test readme](../test/README.md)

---
### Release methodology

Build/publish makes heavy use of GitLab and [.gitlab-ci.yml](../.gitlab-ci.yml).  Check out CI file and GitLab documentation for more details.

- Add *new* RPM to `dist/` directory (from build artifact on mainline development branch)
- Publish to artifactory (automated on new tags)
- Push to GitLab (mainline release branch)
- Push to GitHub (mainline release branch)

*Local development build process*: Various strategies exist here, see the following for an inexhaustive list.

- Build locally using `buildRpm.sh` or similar, copy RPM to BIG-IP
- VS Code `tasks.json` to copy `src/` files to BIG-IP and run `restart restnoded`
- Matthe Zinke's ICRDK [development kit](https://github.com/f5devcentral/f5-icontrollx-dev-kit/blob/master/README.md)
- Vim on BIG-IP (enough said, you know who you are)

Note: See Release Checklist on Confluence for complete details.

---
### Public documentation methodology

In general, see the documentation team for more details... however there is a process.

The current process involves adding a `doc` label to an issue to note it requires public documentation.  This will cause the issue to show up in a documentation board in GitLab, the developer responsible for the feature is also responsible for generating the artifacts required by the documentation team member.

See the [examples](../examples/declarations) directory for curated artifacts such as declaration examples, output examples, AS3 declaration example, etc.

See the [INTERNAL_README.md](../INTERNAL_README.md) for an internal explanation of most features.
