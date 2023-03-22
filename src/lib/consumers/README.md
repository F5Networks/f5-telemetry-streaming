# Introduction

This is the top-level documentation which provides notes and information about contributing new consumers to this project.

## Consumers

Consumer plugins get added by folder according to the matching name in the configuration schema.  In that folder should be an index.js file with a function that can be called when an event occurs and passed a ```context``` object.

```javascript
module.exports = function (context) {
    // do something
};
```

### Context

This describes the structure of the context object.

```javascript
/**
* Consumer Context
*
* @param {Object} context                                      - context of execution
* @param {Object} context.config                               - consumer's config
* @param {Object} context.logger                               - logger instance
* @param {function(string):void} context.logger.info           - log info message
* @param {function(string):void} context.logger.error          - log error message
* @param {function(string):void} context.logger.debug          - log debug message
* @param {function(string, err):void} context.logger.exception - log error message with error's traceback
* @param {Object} context.event                                - event to process
* @param {Object} context.event.data                           - actual data to process
* @param {String} context.event.type                           - type of data to process: systemInfo|event
* @param {Object|undefined} context.tracer                     - tracer object
* @param {function(string):void} context.tracer.write          - write data to tracer
*
* @returns {Void|Promise}
*/
```

### Adding new consumers

Creating and testing new consumers within TS itself by posting expected declaration and watching logs, etc. is an entirely valid way to add a new consumer.  However getting the index.js file right initially might require some iteration, and ideally this can be locally.  Below is an example script to call the consumer with a mock event.

```javascript
const index = require('./index');

const mockLogger = {
    debug: msg => console.log(msg),
    info: msg => console.log(msg),
    error: msg => console.log(msg)
};

const mockContext = {
    config: {
        host: '192.168.2.1',
        protocol: 'https',
        path: '/'
    },
    event: {
        data: {
            foo: 'bar'
        }
    },
    logger: mockLogger
};

index(mockContext);
```

### Logging

Please be aware that this solution should anticipate processing a moderately high volume of events at any given time, with that being said there are a couple thoughts around logging.

- Do NOT log at info level during "normal" behavior
- Do log at error level if consumer does not receive event
- If unsure what level a log message should be at, use debug

### Metrics-only Consumers

Value conversion rules:

- *boolean* -> **Number**(*boolean*) - **true** === 1 and **false** === 0
