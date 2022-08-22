/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assignDefaults = require('lodash/defaultsDeep');
const cloneDeep = require('lodash/cloneDeep');
const clone = require('lodash/clone');
const hasKey = require('lodash/has');
const mergeWith = require('lodash/mergeWith');
const trim = require('lodash/trim');
const objectGet = require('lodash/get');
const childProcess = require('child_process');
const fs = require('fs');
const net = require('net');
// deep require support is deprecated for versions 7+ (requires node8+)
const uuidv4 = require('uuid/v4');
const jsonDuplicateKeyHandle = require('json-duplicate-key-handle');

const constants = require('../constants');

/** @module utils/misc */

/*
 * General helper functions (objects, primitives, etc)
 */

const VERSION_COMPARATORS = ['==', '===', '<', '<=', '>', '>=', '!=', '!=='];

/**
 * Convert async callback function to promise-based funcs
 *
 * Note: when error passed to callback then all other args will be attached
 * to it and can be access via 'error.callbackArgs' property
 *
 * @sync
 * @public
 *
 * @property {Object} module - origin module
 * @property {String} funcName - function name
 *
 * @returns {Function<Promise>} proxy function
 */
function proxyForNodeCallbackFuncs(module, funcName) {
    return function () {
        return new Promise((resolve, reject) => {
            const args = Array.from(arguments);
            args.push(function () {
                const cbArgs = Array.from(arguments);
                // error usually is first arg
                if (cbArgs[0]) {
                    cbArgs[0].callbackArgs = cbArgs.slice(1);
                    reject(cbArgs[0]);
                } else {
                    resolve(cbArgs.slice(1));
                }
            });
            module[funcName].apply(module, args);
        });
    };
}

/**
 * Promisify FS module
 *
 * @sync
 * @public
 * @param {Object} fsModule - FS module
 *
 * @returns {Object} node FS module
 */
function promisifyNodeFsModule(fsModule) {
    const newFsModule = Object.create(fsModule);
    Object.keys(fsModule).forEach((key) => {
        if (typeof fsModule[`${key}Sync`] !== 'undefined') {
            newFsModule[key] = proxyForNodeCallbackFuncs(fsModule, key);
        }
    });
    return newFsModule;
}

/**
 * 'traverseJSON' block - START
 */
/**
 * 'key' callback for traverseJSONKey
 *
 * @sync
 * @private
 *
 * @param {TraverseJSONCallback | undefined} cb - callback
 * @param {Array} parentInfo - parent info
 * @param {any} key - key to inspect
 * @param {Array} waiting - list of items to inspect
 *
 * @returns {boolean} true when item added to waiting list
 */
function traverseJSONCb(parentCtx, key, waiting, cb) {
    const parentItem = parentCtx[0];
    if (cb && cb(parentItem, key) === false) {
        return false;
    }
    const currentItem = parentItem[key];

    if (typeof currentItem === 'object' && currentItem !== null) {
        // to keep the order of item in waiting list need to push next elem in array first
        if (Array.isArray(parentItem) && (key + 1) < parentItem.length) {
            waiting.push([parentItem, parentCtx[1], key + 1]);
        }
        waiting.push([currentItem, key]);
        return true;
    }
    return false;
}

/**
 * Traverse object and its nested data (non-recursive)
 *
 * Note:
 * - mutates 'data' when 'cb' and/or 'breakCircularRef' specified)
 * - doesn't mutates 'options'
 *
 * @sync
 * @public
 *
 * @example
 * traverseJSON(data, cb, options);
 * traverseJSON(data, options, cb);
 * traverseJSON(data, options);
 * traverseJSON(data, cb);
 *
 * @param {any} data - data to traverse
 * @param {TraverseJSONCallback} [cb] - callback
 * @param {object} [options] - options
 * @param {any} [options.breakCircularRef = false] - break circular references by replacing with arg's value
 * @param {number} [options.maxDepth = 0] - max depth
 *
 * @returns {void} once process finished or stopped
 */
function traverseJSON(data, cb, options) {
    // support objects/arrays for now, but should not be a problem to extend
    // to support other types
    if (arguments.length < 2
        || typeof data !== 'object'
        || data === null
        || (Array.isArray(data) && data.length === 0)
    ) {
        return;
    }

    cb = arguments[1];
    options = arguments[2];
    if (typeof cb !== 'function') {
        options = cb;
        cb = arguments[2];
    }

    const breakCircularRef = objectGet(options, 'breakCircularRef', false);
    const maxDepth = objectGet(options, 'maxDepth', 0);

    if (!(cb || breakCircularRef !== false)) {
        return;
    }

    // - array of arrays - [currentLvl, obj1, obj2...]
    // - like a stack
    // - have to store currentLvl because it's value may 'jump', e.g. from 0 to 3
    const buckets = [];

    // - fast search 0(1) - recursion detection
    // - according to docs it keeps keys in order of insertion
    // - stores object's key in parent item
    const bucketsMap = new Map();

    // [[item, key-or-index-in-parent-object, next-index-in-array]]
    const waiting = [[data, null]];

    // current item from 'waiting' list - [item, key-or-index-in-parent-object, next-index-in-array]
    let currentCtx;
    let currentLvl;
    let stopNotRequested = true;

    /**
     * Add current item to stack if allowed
     *
     * @returns {boolean} true when item added
     */
    const addToStack = () => {
        if (maxDepth && bucketsMap.size >= maxDepth) {
            return false;
        }
        // create new bucket or push current item to recent one
        let len = buckets.length;
        if (!len || buckets[len - 1][0] !== currentLvl) {
            buckets.push([currentLvl]);
            len += 1;
        }
        buckets[len - 1].push(currentCtx[0]);
        bucketsMap.set(currentCtx[0], currentCtx[1]);
        return true;
    };

    // trying to have less unnecessary calculations/data
    let innerCb;
    if (cb) {
        if (cb.length < 3) {
            innerCb = (parent, itemKey) => cb(parent, itemKey);
        } else if (cb.length < 4) {
            innerCb = (parent, itemKey) => cb(parent, itemKey, bucketsMap.size);
        } else {
            /**
             * Stop function execution
             *
             * @returns {void}
             */
            const stopCb = () => {
                stopNotRequested = false;
            };
            if (cb.length < 5) {
                innerCb = (parent, itemKey) => cb(parent, itemKey, bucketsMap.size, stopCb);
            } else {
                /**
                 * Compute current path
                 *
                 * @returns {Array<string | integer>} path
                 */
                const getCurrentPath = () => {
                    const it = bucketsMap.values();
                    const p = [];
                    // skip first element - it is root object, it doesn't have a parent
                    it.next();
                    let result = it.next();
                    while (!result.done) {
                        p.push(result.value);
                        result = it.next();
                    }
                    return p;
                };
                innerCb = (parent, itemKey) => cb(parent, itemKey, bucketsMap.size, stopCb, getCurrentPath());
            }
        }
    }
    /**
     * @param {string | integer} key - item's key
     * @returns {boolean} true when item added to waiting list
     */
    const keyCb = (key) => traverseJSONCb(currentCtx, key, waiting, innerCb);

    /**
     * Example #1:
     *
     * const root = { level1: { level2: { level3: 'value } } };
     *
     * when algo reaches 'level3' then stack will look like following (simplified):
     * [
     *   [0, root-object, level1, level2]
     * ]
     *
     * Waiting list will look like following:
     * [] -> empty, no more items to inspect
     *
     * Note: '0' for each item in stack means that 'level3' is child for 'level2',
     *  'level2' is child for 'level1' and so on.
     *
     * Example #2:
     *
     * const root = {
     *      level1_a: { level2_a: {level3_a: 'value' }},
     *      level1_b: { level2_b: {level3_b: {}, level3_c: 'value' }}
     * };
     *
     * when algo reaches 'level3_c' then stack will look like following (simplified):
     * [
     *   [0, root-object],
     *   [1, level1_b, level2_b]
     * ]
     *
     * Waiting list will look like following:
     * [
     *     level1_a,
     *     level3_b
     * ]
     */

    while (waiting.length && stopNotRequested) {
        // [item, parent-key-or-index]
        // if it has 3rd element, then 'item' in stack already
        currentCtx = waiting.pop();
        currentLvl = waiting.length;

        // remove buckets from other levels if needed
        for (let i = buckets.length - 1; i >= 0; i -= 1) {
            if (buckets[i][0] > currentLvl) {
                const toRemove = buckets.pop();
                for (let j = 1; j < toRemove.length; j += 1) {
                    bucketsMap.delete(toRemove[j]);
                }
            }
        }

        // if it has 3rd element, then 'item' in stack already,
        // no need to check for circular ref
        if (currentCtx.length === 2) {
            const existingCtx = bucketsMap.get(currentCtx[0]);
            if (typeof existingCtx !== 'undefined') {
                // circular ref found
                if (breakCircularRef !== false) {
                    // replace circular-ref in parent object with new value to break a loop
                    const bucket = buckets[buckets.length - 1];
                    bucket[bucket.length - 1][currentCtx[1]] = breakCircularRef;
                }
                // skip item, it was inspected already
                // eslint-disable-next-line no-continue
                continue;
            }
        }

        if (Array.isArray(currentCtx[0])) {
            // if it has 3rd element, then 'item' in stack already
            let allowed = true;
            if (currentCtx.length === 2) {
                allowed = addToStack();
            }
            if (allowed) {
                const itemLen = currentCtx[0].length;
                // start from 0 or continue with next index in queue
                for (let i = (currentCtx.length > 2 ? currentCtx[2] : 0);
                    stopNotRequested && i < itemLen && !keyCb(i);
                    i += 1);
            }
        } else if (addToStack()) {
            const objKeys = Object.keys(currentCtx[0]);
            const objLen = objKeys.length;
            for (let i = 0; stopNotRequested && i < objLen; i += 1) {
                keyCb(objKeys[i]);
            }
        }
    }
}
/**
 * 'traverseJSON' block - END
 */

/**
 * Create function to mask secrets in well formed JSON data (e.g. from JSON.stringify).
 * Also partially supports escaped JSON.
 *
 * @sync
 * @public
 *
 * @param {Array<string>} properties - properties to mask
 * @param {string} mask - mask to use
 *
 * @returns {function(string): string} function to use to mask secrets. Function has read-only
 *  property 'matchesFound' that returns number of matches found during last call
 */
function createJSONStringSecretsMaskFunc(properties, mask) {
    mask = arguments.length > 1 ? mask : constants.SECRETS.MASK;
    // matches counter, should be reset every time
    let matches = 0;

    const regExps = properties.map((propName) => ({
        // it is not an ideal regexp (it is almost impossible to create such regexp) but it should work in most cases
        replace: new RegExp([
            [
                '(',
                // match leading ',' or '{' with spaces and new lines (or escaped  new lines)
                '(?:(?:,|\\{)(?:\\s|\\\\+[rn]{1})*)',
                // match quoted property (escaped quotes too). Group #2 is leading quote.
                // It will be used to match closing quote for property name and quotes for value if value is a string
                `(?:(\\\\{0,}")${propName}\\2\\s*:\\s*)`,
                ')'
            ].join(''),
            [
                '(?:',
                'true',
                '|',
                'false',
                '|',
                'null',
                '|',
                // JSON valid number
                '-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?',
                '|',
                // string (with support for escaped quotes)
                // it should ignore escaped quote(s) in of string
                '\\2(?:\\\\+\\2|.*?)\\2',
                '|',
                // simple array handling
                '\\[[\\s\\S]*?\\]',
                ')'
            ].join(''),
            [
                // match following ',' or '}' (with preceding spaces and new lines or escaped new lines)
                '(,|(?:(?:\\s|\\\\+[rn]{1})*\\}))'
            ].join('')
        ].join(''), 'g'),
        with: (match, p1, p2, p3) => {
            matches += 1;
            return `${p1}${p2}${mask}${p2}${p3}`;
        }
    }));
    function maskJSONStringDefaultSecrets(data) {
        matches = 0;
        let maskedData = data;
        try {
            regExps.forEach((regexp) => {
                maskedData = maskedData.replace(regexp.replace, regexp.with);
            });
        } catch (e) {
            // simply ignore error
        }
        return maskedData;
    }
    Object.defineProperty(maskJSONStringDefaultSecrets, 'matchesFound', {
        get() {
            return matches;
        }
    });
    return maskJSONStringDefaultSecrets;
}

/**
 * 'createJSONObjectSecretsMaskFunc' block - START
 */
/**
 * Check if object has nested objects (not primitives)
 * @sync
 * @private
 *
 * @param {any} obj - data to inspect
 *
 * @returns {boolean} true if object has nested objects
 */
function hasNestedObjects(obj) {
    if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
            return obj.some((v) => typeof v === 'object' && v !== null);
        }
        return Object.keys(obj)
            .some((k) => typeof obj[k] === 'object' && obj[k] !== null);
    }
    return false;
}

/**
 * Create function to mask secrets in data
 *
 * @sync
 * @public
 *
 * @example
 * createSecretsMaskFunc(['prop'])
 *
 * @example
 * createSecretsMaskFunc(['prop'], 'mask')
 *
 * @example
 * createSecretsMaskFunc(['prop'], 2)
 *
 * @example
 * createSecretsMaskFunc(['prop'], 'mask', 2)
 *
 * @param {Array<string>} properties - properties to mask
 * @param {object} [options] - options
 * @param {any} [options.breakCircularRef = false] - break circular references by replacing with arg's value
 * @param {any} [options.mask] - mask to use
 * @param {number} [options.maxDepth = 0] - max depth
 *
 * @returns {function(any, object): any} function to use to mask secrets:
 * - first argument is data to inspect
 * - second argument is 'options' (similar to above) to override pre-defined options
 * - function has read-only property 'matchesFound' that returns
 *   number of matches found during last call
 */
function createJSONObjectSecretsMaskFunc(properties, options) {
    let matches;
    // shallow-copy to avoid modifications
    properties = properties.slice(0);
    properties.sort();

    const defaultMask = objectGet(options, 'mask', constants.SECRETS.MASK);
    const defaultOpts = {
        breakCircularRef: objectGet(options, 'breakCircularRef', false),
        maxDepth: objectGet(options, 'maxDepth', 0)
    };

    /**
     * Note: mutates 'data'
     *
     * @param {any} data - data to inspect
     * @param {object} innerOptions - options similar to parent function
     *
     * @returns {any} processed data
     */
    function maskSecrets(data, innerOptions) {
        matches = 0;
        let traverseOpts = defaultOpts;
        let mask = defaultMask;

        if (arguments.length > 1) {
            traverseOpts = {
                breakCircularRef: objectGet(innerOptions, 'breakCircularRef', defaultOpts.breakCircularRef),
                maxDepth: objectGet(innerOptions, 'maxDepth', defaultOpts.maxDepth)
            };
            mask = objectGet(innerOptions, 'mask', defaultMask);
        }
        traverseJSON(data, traverseOpts, (parent, key) => {
            if (!Array.isArray(parent) && properties.indexOf(key) !== -1 && !hasNestedObjects(parent[key])) {
                parent[key] = mask;
                matches += 1;
            }
        });
        return data;
    }
    Object.defineProperty(maskSecrets, 'matchesFound', {
        get() {
            return matches;
        }
    });
    return maskSecrets;
}
/**
 * 'createJSONObjectSecretsMaskFunc' block - END
 */

/**
 * Chunks - class to manage chunked data
 *
 * Using JSON.stringify as default serializer and treats any input string as serialized already
 *
 * @property {integer} currentChunkSize - size of current chunk of data
 * @property {integer} maxChunkSize - max chunk size in bytes
 * @property {function(any): any} serializer - data serializer, returns object with '.length' property
 * @property {integer} totalChunks - number of chunks
 * @property {integer} totalSize - total size of data
 */
class Chunks {
    /**
     * Constructor
     *
     * @param {object} [options] - options
     * @param {integer} [options.maxChunkSize = Number.MAX_SAFE_INTEGER] - max chunk size in bytes
     * @param {function(any): any} [options.serializer] - data serializer,
     *      returns object with '.length' property. If the serializer returns Array then every element will be added
     *      separately
     */
    constructor(options) {
        options = assignDefaults(options, {
            maxChunkSize: Number.MAX_SAFE_INTEGER,
            serializer: (data) => (typeof data !== 'string' ? JSON.stringify(data) : data)
        });
        if (typeof options.maxChunkSize !== 'number' || options.maxChunkSize <= 0) {
            throw new Error(`'maxChunkSize' should be > 0, got '${options.maxChunkSize}' (${typeof options.maxChunkSize})`);
        }

        Object.defineProperties(this, {
            currentChunkSize: {
                get() { return this._current ? this._current.size : 0; }
            },
            maxChunkSize: {
                value: options.maxChunkSize
            },
            serializer: {
                value: options.serializer.bind(this)
            },
            totalChunks: {
                get() { return this._chunks.length; }
            },
            totalSize: {
                get() { return this._chunks.reduce((p, c) => p + c.size, 0); }
            }
        });
        this.clear();
    }

    /**
     * Add data to current chunk
     *
     * @private
     *
     * @param {any} data - data to add
     *
     * @returns {void} once data added
     */
    _add(data) {
        if (!this._current || (this._current.size && this._current.size + data.length > this.maxChunkSize)) {
            this._current = {
                chunk: [],
                size: 0
            };
            this._chunks.push(this._current);
        }
        this._current.chunk.push(data);
        this._current.size += data.length;
    }

    /**
     * Add data to chunks
     *
     * @public
     *
     * @param {any} data - data to add
     *
     * @returns {void} once data added
     */
    add(data) {
        data = this.serializer(data);
        if (Array.isArray(data)) {
            data.forEach((d) => this._add(d));
        } else {
            this._add(data);
        }
    }

    /**
     * Get all chunks
     *
     * @public
     *
     * @returns {Array<Array<any>>} chunks of data
     */
    getAll() {
        return this._chunks.map((c) => c.chunk);
    }

    /**
     * Remove all previously added chunks of data
     *
     * @public
     *
     * @returns {void} once state was reset
     */
    clear() {
        this._chunks = [];
        this._current = null;
    }
}

module.exports = {
    Chunks,
    createJSONObjectSecretsMaskFunc,
    createJSONStringSecretsMaskFunc,
    proxyForNodeCallbackFuncs,
    promisifyNodeFsModule,
    traverseJSON,

    /**
     * Assign defaults to object (uses lodash.defaultsDeep under the hood)
     * Note: check when working with arrays, as values may be merged incorrectly
     *
     * @param {Object} obj - object to assign defaults to
     * @param {...Object} defaults - defaults to assign to object
     *
     * @returns {Object}
     */
    assignDefaults,

    /**
     * Check if object has any data or not (for JSON data only)
     *
     * @param {any} obj - object to test
     *
     * @returns {Boolean} 'true' if empty else 'false'
     */
    isObjectEmpty(obj) {
        if (obj === undefined || obj === null) {
            return true;
        }
        if (Array.isArray(obj) || typeof obj === 'string') {
            return obj.length === 0;
        }
        /* eslint-disable no-restricted-syntax */
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                return false;
            }
        }
        return true;
    },

    /**
     * Copy object (uses lodash.clone under the hood)
     *
     * @param {any} obj - object to copy
     *
     * @returns {any} copy of source object
     */
    copy(obj) {
        return clone(obj);
    },

    /**
     * Deep Copy (uses lodash.cloneDeep under the hood).
     * Same as `copy` but copies entire object recursively
     *
     * @param {any} obj - object to copy
     *
     * @returns {any} deep copy of source object
     */
    deepCopy(obj) {
        return cloneDeep(obj);
    },

    /**
     * Merges an Array of Objects into a single Object (uses lodash.mergeWith under the hood).
     * Note: Nested Arrays are concatenated, not overwritten.
     * Note: Passed data gets *spoiled* - copy if you need the original data
     *
     * @param {Array} collection - Array of Objects to be merged.
     *
     * @returns {Object} Object after being merged will all other Objects in the passed Array, or empty object
     *
     * Example:
     *  collection: [
     *      { a: 12, b: 13, c: [17, 18] },
     *      { b: 14, c: [78, 79], d: 11 }
     *  ]
     *  will return:
     *  {
     *      a: 12, b: 14, c: [17, 18, 78, 79], d: 11
     *  }
     */
    mergeObjectArray(collection) {
        if (!Array.isArray(collection)) {
            throw new Error('Expected input of Array');
        }
        // eslint-disable-next-line consistent-return
        function concatArrays(objValue, srcValue) {
            if (Array.isArray(objValue)) {
                return objValue.concat(srcValue);
            }
        }

        for (let i = 1; i < collection.length; i += 1) {
            // only process elements that are Objects
            if (typeof collection[i] === 'object' && !Array.isArray(collection[i])) {
                mergeWith(collection[0], collection[i], concatArrays);
            }
        }
        // First Object in array has been merged with all other Objects - it has the complete data set.
        return collection[0] || {};
    },

    /**
     * Parses a JSON string into an object, while preserving any duplicate keys in the JSON object.
     * Duplicate keys convert the JSON key type to an array.
     *
     * Example:
     * input is { dup: 'yes', nonDup: 12, dup: { inside: 74 } }
     * returned object is { dup: ['yes', { inside: 74 } ], nonDup: 12 }
     *
     * @param {String}  data    - JSON data as a string
     *
     * @returns {Object}    Object with the parsed JSON data
     */
    parseJsonWithDuplicateKeys(data) {
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
        return jsonDuplicateKeyHandle.parse(data, arrayHandler);
    },

    /**
     * Return Node version without 'v'
     */
    getRuntimeInfo() {
        return { nodeVersion: process.version.substring(1) };
    },

    /**
     * Convert a string from camelCase to underscoreCase
     * Returns converted string
     */
    camelCaseToUnderscoreCase(str) {
        return str.split(/(?=[A-Z])/).join('_').toLowerCase();
    },

    /**
     * Compare version strings
     *
     * @param {String} version1   - version to compare
     * @param {String} comparator - comparison operator
     * @param {String} version2   - version to compare
     *
     * @returns {boolean} true or false
     */
    compareVersionStrings(version1, comparator, version2) {
        comparator = comparator === '=' ? '==' : comparator;
        if (VERSION_COMPARATORS.indexOf(comparator) === -1) {
            throw new Error(`Invalid comparator '${comparator}'`);
        }
        const v1parts = version1.split('.');
        const v2parts = version2.split('.');
        const maxLen = Math.max(v1parts.length, v2parts.length);
        let part1;
        let part2;
        let cmp = 0;
        for (let i = 0; i < maxLen && !cmp; i += 1) {
            part1 = parseInt(v1parts[i], 10) || 0;
            part2 = parseInt(v2parts[i], 10) || 0;
            if (part1 < part2) {
                cmp = 1;
            } else if (part1 > part2) {
                cmp = -1;
            }
        }
        // eslint-disable-next-line no-eval
        return eval(`0${comparator}${cmp}`);
    },

    /**
     * Stringify a message with option to pretty format
     *
     * @param {Object|String} msg - message to stringify
     * @param {Boolean} prettyFormat - format JSON string to make it easier to read
     * @returns {Object} Stringified message
     */
    stringify(msg, pretty) {
        if (typeof msg === 'object') {
            try {
                msg = pretty ? JSON.stringify(msg, null, 4) : JSON.stringify(msg);
            } catch (e) {
                // just leave original message intact
            }
        }
        return msg;
    },

    /**
     * Base64 helper
     *
     * @param {String} action - decode|encode
     * @param {String} data - data to process
     *
     * @returns {String} Returns processed data as a string
     */
    base64(action, data) {
        // just decode for now
        if (action === 'decode') {
            return Buffer.from(data, 'base64').toString().trim();
        }
        throw new Error('Unsupported action, try one of these: decode');
    },

    /**
     * Network check - with max timeout interval (5 seconds)
     *
     * @param {String} host               - host address
     * @param {Integer} port              - host port
     * @param {Object}  [options]         - options
     * @param {Integer} [options.timeout] - timeout before fail if unable to establish connection, by default 5s.
     * @param {Integer} [options.period]  - how often to check connection status, by default 100ms.
     *
     * @returns {Promise} Returns promise resolved on successful check
     */
    networkCheck(host, port, options) {
        let done = false;
        const connectPromise = new Promise((resolve, reject) => {
            const client = net.createConnection({ host, port })
                .on('connect', () => {
                    client.end();
                })
                .on('end', () => {
                    done = true;
                    resolve();
                })
                .on('error', (err) => {
                    done = 'error';
                    reject(err);
                });
        });

        options = assignDefaults(options, {
            period: 100,
            timeout: 5 * 1000
        });
        if (options.timeout <= options.period) {
            options.period = options.timeout;
        }
        const timeoutPromise = new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                options.timeout -= options.period;

                const fail = () => {
                    clearInterval(interval);
                    reject(new Error(`unable to connect: ${host}:${port} (timeout exceeded)`)); // max timeout, reject
                };

                if (done === true) {
                    clearInterval(interval);
                    resolve(); // connection success, resolve
                } else if (done === 'error') {
                    fail();
                } else if (options.timeout <= 0) {
                    fail();
                }
            }, options.period);
        });

        return Promise.all([connectPromise, timeoutPromise])
            .then(() => true)
            .catch((e) => {
                throw new Error(`networkCheck: ${e}`);
            });
    },

    /**
     * Get random number from range
     *
     * @param {Number} min - left boundary
     * @param {Number} max - right boundary
     *
     * @returns {Number} random number from range
     */
    getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Rename keys in an object at any level of depth if it passes the given regular expression test.
     *
     * @param {Object}                target         - object to be modified
     * @param {Regular Expression}    match          - regular expression to test
     * @param {String}                replacement    - regular expression match replacement
     */
    renameKeys(target, match, replacement) {
        if (target !== null && typeof target === 'object') {
            Object.keys(target).forEach((member) => {
                this.renameKeys(target[member], match, replacement);
                if (match.test(member)) {
                    const newMember = member.replace(match, replacement);
                    target[newMember] = target[member];
                    delete target[member];
                }
            });
        }
    },

    /**
     * Trim a specific character or string from the beginning or end of a string
     *
     * @param {String}  string      - The full string to be trimmed
     * @param {String}  toRemove    - The character or string to remove
     *
     * @returns {String}    The trimmed string
     */
    trimString(string, toRemove) {
        return trim(string, toRemove);
    },

    /**
     * Generate a random UUID (v4 RFC4122)
     * Uses uuid.v4 under the hood
     *
     * @returns {String}    The UUID value
     */
    generateUuid() {
        return uuidv4();
    },

    /**
     * Convenience method to get value of property on an object given a path
     * Uses lodash.get under the hood
     *
     * @param {Object}  object              - the object to query
     * @param {Array|String}  propertyPath  - property path (e.g. child1.prop1[0].child2)
     * @param {*} defaultValue              - the value to return if property not found. default is undefined
     *
     * @returns {*}    Resolved value of the object property
     */
    getProperty(object, propertyPath, defaultValue) {
        return objectGet(object, propertyPath, defaultValue);
    },

    /**
     * Sleep for N ms.
     *
     * @returns {Promise} resolved once N .ms passed or rejected if canceled via .cancel()
     */
    sleep(sleepTime) {
        /**
         * According to http://www.ecma-international.org/ecma-262/6.0/#sec-promise-executor
         * executor will be called immediately (synchronously) on attempt to create Promise
         */
        let cancelCb;
        const promise = new Promise((resolve, reject) => {
            const timeoutID = setTimeout(() => {
                cancelCb = null;
                resolve();
            }, sleepTime);
            cancelCb = (reason) => {
                cancelCb = null;
                clearTimeout(timeoutID);
                reject(reason || new Error('canceled'));
            };
        });
        /**
         * @param {Error} [reason] - cancellation reason
         *
         * @returns {Boolean} 'true' if cancelCb called else 'false'
         */
        promise.cancel = (reason) => {
            if (cancelCb) {
                cancelCb(reason);
                return true;
            }
            return false;
        };
        return promise;
    },

    /**
     * Mask Secrets in JSON string (as needed)
     *
     * @param {string} msg - message to mask
     *
     * @returns {string} masked message
     */
    maskJSONStringDefaultSecrets: createJSONStringSecretsMaskFunc(constants.SECRETS.PROPS, constants.SECRETS.MASK),

    /**
     * Mask Secrets in JSON data (as needed)
     *
     * @param {any} msg - data to mask
     *
     * @returns {any} masked data
     */
    maskJSONObjectDefaultSecrets: createJSONObjectSecretsMaskFunc(constants.SECRETS.PROPS, constants.SECRETS.MASK),

    /**
     * Generates a unique property name that the object doesn't have
     *
     * - 'originKey' will be returned if it doesn't exist in the object
     *
     * @param {object} object - object
     * @param {string} originKey - origin key
     *
     * @returns {string} unique key
     */
    generateUniquePropName(object, originKey) {
        // flexibility for args can be added later
        const sep = '';
        let startIdx = 0;

        if (!hasKey(object, originKey)) {
            return originKey;
        }
        while (hasKey(object, `${originKey}${sep}${startIdx}`)) {
            startIdx += 1;
        }
        return `${originKey}${sep}${startIdx}`;
    },

    /**
     * Registers callback to execute when application exiting
     *
     * @param {function} cb - callback to register
     *
     * @returns {void} once registered
     */
    onApplicationExit(cb) {
        process.on('SIGINT', cb);
        process.on('SIGTERM', cb);
        process.on('SIGHUP', cb);
        process.on('exit', cb);
    },

    /**
     * Promisified 'child_process'' module
     *
     * @see fs
     */
    childProcess: (function promisifyNodeChildProcessModule(cpModule) {
        const newCpModule = Object.create(cpModule);
        ['exec', 'execFile'].forEach((key) => {
            newCpModule[key] = proxyForNodeCallbackFuncs(cpModule, key);
        });
        return newCpModule;
    }(childProcess)),

    /**
     * Promisified 'fs' module
     *
     * @see fs
     */
    fs: promisifyNodeFsModule(fs)
};

/**
 * 'traverseJSON' callback
 *
 * Note:
 * - if 'path' is empty Array then parent is 'root' object
 *
 * @callback TraverseJSONCallback
 * @param {any} parent - parent object
 * @param {any} key - key to inspect in parent object
 * @param {integer} depth - current stack depth
 * @param {function} stop - function to call when process should be stopped
 * @param {Array} path - path to parent element
 *
 * @returns {boolean} false when item should be ignored
 */
