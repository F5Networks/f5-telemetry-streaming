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
* @param {string} context.event.type                           - type of data to process
* @param {Object|undefined} context.tracer                     - tracer object
* @param {function(string):void} context.tracer.write          - write data to tracer
*
* @returns {Void|Promise}
*/
```
