# json-dup-key-validator [![NPM version](https://img.shields.io/npm/v/json-duplicate-key-handle.svg)](https://www.npmjs.com/package/json-duplicate-key-handle) [![Build Status](https://travis-ci.org/jackyjieliu/json-duplicate-key-handle.svg?branch=master)](https://travis-ci.org/jackyjieliu/json-duplicate-key-handle)

A json handler that has an option to check for duplicated keys

## Install
`npm install json-duplicate-key-handle`
## Usage

### NOTE: Updated usage for Telemetry Streaming:
#### Mimic existing behavior - append a '1' to key name
```js
const jsonHandler = require('json-duplicate-key-handle');

const appendingHandler = (keys, key, values, value) => {
    if (keys.indexOf(key.value) !== -1) {
        key.value += '1';
    }
    keys.push(key.value);
    values.push(value.value);
};

// Returns the object and handle if duplicate key
jsonHandler.parse(jsonString, allowDuplicatedKeys, appendingHandler);
```

#### On duplicate key, update the key type to an array, and push the duplicate value
```js
const jsonHandler = require('json-duplicate-key-handle');

const arrayHandler = (keys, key, values, value) => {
    const existingKey = keys.indexOf(key.value);
    if (existingKey !== -1) {
        const existingValue = values[existingKey];
        if (Array.isArray(existingValue)) {
            values[existingKey] = existingValue.concat(value.value);
        } else {
            values[existingKey] = [existingValue].concat(value.value);
        }
    } else {
        keys.push(key.value);
        values.push(value.value);
    }
};

// Returns the object and handle if duplicate key
jsonHandler.parse(jsonString, allowDuplicatedKeys, arrayHandler);
```

```js
var jsonHandler = require('json-duplicate-key-handle');

// Returns error or undefined if json is valid
jsonHandler.validate(jsonString, allowDuplicatedKeys);

// Returns the object and handle if duplicate key
jsonHandler.parse(jsonString, allowDuplicatedKeys);
```
## API
## .validate(jsonString, allowDuplicatedKeys)
Validates a json string and returns error if any, undefined if the json string is valid.
#### jsonString
Type: `String`

JSON string to parse
#### allowDuplicatedKeys
Type: `Boolean`

Default: `false`

Whether duplicated keys are allowed in an object or not

## .parse(jsonString, allowDuplicatedKeys)
Parses a json string and returns the parsed result
#### jsonString
Type: `String`

JSON string to parse
#### allowDuplicatedKeys
Type: `Boolean`

Default: `false`

Whether duplicated keys are allowed in an object or not