/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const Ajv = require('ajv');
const fs = require('fs');
const constants = require('./constants');
const util = require('./util');
const deviceUtil = require('./deviceUtil');

const base64NamedKey = 'plainBase64';
const secureVaultNamedKey = 'SecureVault';
const secureVaultCipherPrefix = '$M$';

/**
 * Helpers block start
 */
/**
 * Resolve pointer
 *
 * @private
 * @param {Object} origin               - origin object of which data is descendant
 * @param {String} pointer              - pointer to property in origin where value resides
 * @param {String} srcPointer           - pointer to property in origin from which pointer came
 * @param {Object} options              - options for this function
 * @param {Boolean} [options.stringify] - boolean to enable/disable object stringify
 * @param {String} [options.base64]     - base64 encode|decode string
 *
 * @returns {String|Object} resolved pointer value
 */
function resolvePointer(origin, pointer, srcPointer, options) {
    options = options || {};

    // helper function
    const getValue = (iData, iPath, opts) => {
        opts = opts || {};
        const rKIO = opts.requiresKeyInObject;

        // assume valid path - no need for try/catch
        let done = false;
        let value = iData;
        iPath.forEach((i) => {
            if (done) return; // hacky... but works
            if (rKIO && !Object.prototype.hasOwnProperty.call(value[i], rKIO)) {
                done = true; // nearest key (class)
            } else {
                value = value[i];
            }
        });
        return value;
    };

    let ret = '';
    const pointers = pointer.split('/').filter(i => (i !== '' && i !== '@')); // strip '' or leading '@'
    const sourcePointers = srcPointer.split('/').filter(i => (i !== '')); // strip ''

    // first character in path indicates "relativeness"
    const fC = pointer[0];
    if (fC === '@') {
        // leading '@' wants to proceed from nearest ancestor with 'class'
        const nearestClass = getValue(origin, sourcePointers, { requiresKeyInObject: 'class' });
        ret = getValue(nearestClass, pointers);
    } else if (fC === '/') {
        // absolute JSON pointer - requires pointer to be in 'Shared'
        if (pointers[0] && pointers[0].toLowerCase() !== 'shared') {
            throw new Error(`absolute pointer: ${pointer} requires pointers root to be 'Shared'`);
        }
        ret = getValue(origin, pointers);
    } else {
        // relative JSON pointer (to object where pointer came from)
        const absolutePointers = sourcePointers.slice(0, -1).concat(pointers);
        ret = getValue(origin, absolutePointers);
    }

    if (typeof ret === 'object' && options.stringify !== false) {
        ret = JSON.stringify(ret);
    }
    if (options.base64 === 'decode') {
        ret = util.base64('decode', ret);
    }
    return ret;
}

/**
 * RFC 6901 compliance with a couple enhancements, listed below
 * - based on AS3 pointer syntax, but without AS3-specific nomenclature like `T`, `A`, etc.
 * - support `=pointer`, `+pointer`, `>pointer`
 * - '>' means the resolved object should not be stringified
 * - support absolute JSON pointer (limited to Shared)
 * - support reference to property in the same object `>passphrase` or nearest class `>@/passphrase`
 *
 * @private
 * @param {String} str        - string to expand per pointer syntax
 * @param {Object} origin     - origin object of which str is descendant
 * @param {String} srcPointer - pointer to property in origin from which str came
 *                              note: assumes jsonPointers:true resulting in pointer like '/root/ptr'
 *
 * @returns {String} fully expanded string
 */
function expandPointers(str, origin, srcPointer) {
    const bQ = '`';
    if (str.indexOf(bQ) === -1) {
        return str; // nothing to expand
    }

    const m = str.length;
    const lastIndex = m - 1;
    let i = str.indexOf(bQ);
    let ret = i ? str.slice(0, i) : '';
    let end;
    let ptr;
    let resolved;

    // scan string and append to ret as we go along
    while (i < m) {
        const c = str[i + 1]; // 'i' normally equals '`'

        switch (c) {
        case undefined: // done - cleanup
            i += 1;
            break;
        case bQ: // escaped backquote - add and continue
            ret += c;
            i += 2;
            break;
        case '=': // standard JSON pointer - simply replace value
        case '+': // like '=' but decode base64 to string
        case '>': // like '=' but don't stringify object
            end = str.indexOf(bQ, (i + 2)); // get closing backquote
            if (end === -1) {
                throw new Error(`${str} '${c}' at ${i} missing second backquote`);
            }

            // '>' assumes fetched value is an object, as such it can be the only
            // value in the string - disallow anything besides a single pointer
            if (c === '>' && !(i === 0 && end === lastIndex)) {
                throw new Error(`${str} '${c}' syntax requires single pointer as the value`);
            }

            ptr = str.slice((i + 2), end); // gotcha, now resolve
            resolved = resolvePointer(
                origin, ptr, srcPointer,
                {
                    stringify: c !== '>',
                    base64: c === '+' ? 'decode' : null
                }
            );

            if (c === '>') {
                ret = resolved; // special case where resolved replaces ret
            } else {
                ret += resolved;
            }
            i = end + 1;
            break;
        default:
            throw new Error(`${str} unrecognized pointer syntax '${c}' at ${[i + 1]}`);
        }

        // now check if we are done scanning
        if (i >= lastIndex) break;

        let next = str.indexOf(bQ, i);
        if (next === -1) {
            next = lastIndex + 1;
        }
        // add either 1) up to next pointer or 2) end of string
        ret += str.slice(i, next);
        i = next;
    }

    return ret;
}
/**
 * Helpers block end
 */

/**
 * Validators block start
 */
/**
 * Check that reference has proper class and property exists
 *
 * @throws {Error} when reference is invalid
 * @returns {Boolean} true if reference is valid
 */
function declarationClassPropCheck(schemaObj, dataObj) {
    // Given sample obj
    // {
    //   class: "The_Class",
    //   collProp: { { key1: val1 }, { key2: val2 } }
    // }
    const origin = dataObj.rootData;
    const srcPath = dataObj.data;
    const options = schemaObj.schema;

    // remove leading and trailing '/'
    const trimPath = val => val.substring(
        val.startsWith('/') ? 1 : 0,
        val.endsWith('/') ? (val.length - 1) : val.length
    );

    // the path defined by the user in their declaration, e.g. The_Class/key_1/.../key_n
    const dataParts = trimPath(srcPath).split('/');
    if (options.partsNum && dataParts.length !== options.partsNum) {
        let exampleFormat = 'ObjectName';
        if (options.partsNum) {
            for (let i = 1; i < options.partsNum; i += 1) {
                exampleFormat = `${exampleFormat}/key${i}`;
            }
        } else {
            exampleFormat = `${exampleFormat}/key1/.../keyN`;
        }
        throw new Error(`"${srcPath}" does not follow format "${exampleFormat}"`);
    }

    // the path defined in the schema {class}/{propLevel_1}/../{propLevel_n}, e.g. The_Class/collProp
    const schemaParts = trimPath(options.path).split('/');
    const className = schemaParts[0];
    const classInstanceName = dataParts[0];
    let objInstance = origin[classInstanceName];

    if (typeof objInstance !== 'object' || objInstance.class !== className) {
        throw new Error(`"${classInstanceName}" must be of object type and class "${className}"`);
    }

    const pathParts = schemaParts.slice(1).concat(dataParts.slice(1));
    /* eslint-disable no-return-assign */
    if (!pathParts.every(key => typeof (objInstance = objInstance[key]) !== 'undefined')) {
        const resolvedPath = `${classInstanceName}/${pathParts.join('/')}`;
        throw new Error(`Unable to find "${resolvedPath}"`);
    }
    return true;
}

/**
 * Encrypt secret
 *
 * @throws {Error} when secret is invalid
 * @returns {Boolean|Function} true if secret is valid and doesn't require encryption
 *      or function that returns {Promise} resolved once secret encrypted
 */
function f5secretCheck(schemaObj, dataObj) {
    /**
     * we handle a number of passphrase object in this function,
     * the following describes each of them:
     * - 'cipherText': this means we plan to store a plain text secret locally,
     *   which requires we encrypt it first. This also assumes that we are
     *   running on a BIG-IP where we have the means to do so.
     * - 'environmentVar': undefined
     */
    const data = dataObj.data;

    if (typeof data[constants.PASSPHRASE_ENVIRONMENT_VAR] !== 'undefined') {
        return true;
    }
    if (typeof data[constants.PASSPHRASE_CIPHER_TEXT] === 'undefined') {
        throw new Error(`missing ${constants.PASSPHRASE_CIPHER_TEXT} or ${constants.PASSPHRASE_ENVIRONMENT_VAR}`);
    }
    if (data.protected === secureVaultNamedKey) {
        if (data[constants.PASSPHRASE_CIPHER_TEXT].startsWith(secureVaultCipherPrefix)) {
            return true;
        }
        throw new Error(`'${constants.PASSPHRASE_CIPHER_TEXT}' should be encrypted by ${constants.DEVICE_TYPE.BIG_IP} when 'protected' is '${secureVaultNamedKey}'`);
    }
    let secret = data[constants.PASSPHRASE_CIPHER_TEXT];
    if (data.protected === base64NamedKey) {
        try {
            secret = util.base64('decode', data[constants.PASSPHRASE_CIPHER_TEXT]);
        } catch (e) {
            throw new Error(`Unable to decode base64 data: ${e}`);
        }
    }
    return () => deviceUtil.getDeviceType()
        .then((deviceType) => {
            if (deviceType !== constants.DEVICE_TYPE.BIG_IP) {
                return Promise.reject(new Error(`Specifying '${constants.PASSPHRASE_CIPHER_TEXT}' requires running on ${constants.DEVICE_TYPE.BIG_IP}`));
            }
            return deviceUtil.encryptSecret(secret);
        })
        .then((encryptedSecret) => {
            data[constants.PASSPHRASE_CIPHER_TEXT] = encryptedSecret;
            data.protected = secureVaultNamedKey;
        });
}

/**
 * Check connectivity to host
 *
 * @returns {Boolean|Function} true if port not specified or verification not required
 *      or function that returns {Promise} resolved once host is reachable
 */
function hostConnectivityCheck(schemaObj, dataObj) {
    const parentData = dataObj.parentData || {};
    // enable host connectivity check with this property - return otherwise
    if (parentData.enableHostConnectivityCheck !== true || typeof parentData.port === 'undefined') {
        return true;
    }
    return () => util.networkCheck(dataObj.data, dataObj.parentData.port);
}

/**
 * Check if path exists in filesystem
 *
 * @returns {Function} that returns {Promise} resolved once path is valid
 */
function fsPathExistsCheck(schemaObj, dataObj) {
    return () => new Promise((resolve, reject) => {
        fs.access(dataObj.data, (fs.constants || fs).R_OK, (err) => {
            if (err) {
                reject(new Error(`Unable to access path "${dataObj.data}": ${err}`));
            } else {
                resolve(true);
            }
        });
    });
}

/**
 * Check time window size
 *
 * @throws {Error} when time window is invalid
 * @returns {Boolean} true if time window is valid
 */
function timeWindowSizeCheck(schemaObj, dataObj) {
    const data = dataObj.data;
    // start/end required - schema should validate this
    if (!(data.start && data.end)) {
        return true;
    }

    function timeStrToMinutes(timeStr) {
        const parts = timeStr.split(':');
        const hour = parts[0];
        const minute = parts[1];
        return parseInt(hour, 10) * 60 + parseInt(minute, 10);
    }

    const minWindowSize = schemaObj.schema;
    // at that point we rely on schema validation - strings should be valid
    const timeStart = timeStrToMinutes(data.start);
    let timeEnd = timeStrToMinutes(data.end);
    // if timeEnd < timeStart that move clock forward for 1 day - 1440 minutes.
    timeEnd = timeStart > timeEnd ? timeEnd + 1440 : timeEnd;

    if (timeStart === timeEnd || (timeEnd - timeStart < minWindowSize)) {
        throw new Error(`specify window with size of a ${minWindowSize} minutes or more`);
    }
    return true;
}

/**
 * Check that reference has proper class
 *
 * @throws {Error} when reference is invalid
 * @returns {Boolean} true if reference is valid
 */
function declarationClassCheck(schemaObj, dataObj) {
    const declarationClass = schemaObj.schema;
    const objectInstance = dataObj.rootData[dataObj.data];
    if (typeof objectInstance !== 'object' || objectInstance.class !== declarationClass) {
        throw new Error(`declaration with name "${dataObj.data}" and class "${declarationClass}" doesn't exist`);
    }
    return true;
}

/**
 * Expand JSON pointer
 *
 * @throws {Error} when unable to expand JSON pointer
 * @returns {Boolean} true if JSON pointer was expanded
 */
function f5expandCheck(schemaObj, dataObj) {
    if (!(this.expand === true)) {
        return true;
    }
    if (typeof dataObj.data !== 'string') {
        // keyword may be applied to objects that support multiple types for
        // idempotency - so simply return if data is not a string
        return true;
    }

    dataObj.parentData[dataObj.propertyName] = expandPointers(dataObj.data, dataObj.rootData, dataObj.dataPath);
    return true;
}
/**
 * Validators block end
 */

/**
 * Validation runner block start
 */
/**
 * Convert error to Ajv.ValidationError
 *
 * @param {Error} err        - error object
 * @param {Object} schemaObj - schema info
 * @param {Object} dataObj   - data info
 *
 * @returns {Error}
 */
function getValidationError(err, schemaObj, dataObj) {
    return new Ajv.ValidationError([{
        dataPath: dataObj.dataPath,
        propertyName: dataObj.propertyName,
        keyword: schemaObj.keyword,
        message: err.message || err.toString(),
        params: {}
    }]);
}

/**
 * Run validation function
 *
 * @param {Object}   this    - ajv instance of context if passed to ajv.validator function
 * @param {Function} func    - validation function
 * @param {Object} schemaObj - schema info
 * @param {Object} dataObj   - data info
 *
 * @returns {Boolean|Function} returns true/false if validation passed/failed or
 *      function (deferred operation) that returns {Promise}
 *      to execute once global validation process done and succeed
 */
function runValidationFunction(func, schemaObj, dataObj) {
    try {
        return func.call(this, schemaObj, dataObj);
    } catch (err) {
        schemaObj.validateFn.errors = schemaObj.validateFn.errors || [];
        schemaObj.validateFn.errors.push(getValidationError(err, schemaObj, dataObj));
        return false;
    }
}

/**
 * Wrap deferred async function to catch errors correctly
 *
 * @param {Object}   this    - ajv instance of context if passed to ajv.validator function
 * @param {Function} func    - validation function
 * @param {Object} schemaObj - schema info
 * @param {Object} dataObj   - data info
 *
 * @returns {Function}
 */
function wrapAsyncValidationFunction(func, schemaObj, dataObj) {
    return () => func()
        .catch(err => Promise.reject(getValidationError(err, schemaObj, dataObj)));
}

/**
 * Run validation process
 *
 * @param {Object}   this    - ajv instance of context if passed to ajv.validator function
 * @param {Function} func    - validation function
 * @param {Object} schemaObj - schema info
 * @param {Object} dataObj   - data info
 *
 * @returns {Boolean} false when validation failed or true if validation succeed or requires
 *      execution of deferred function if global validation process succeed
 */
function validate(func, schemaObj, dataObj) {
    let result = runValidationFunction.call(this, func, schemaObj, dataObj);
    if (typeof result === 'function') {
        this.deferred[schemaObj.keyword] = this.deferred[schemaObj.keyword] || [];
        this.deferred[schemaObj.keyword].push(wrapAsyncValidationFunction.call(this, result, schemaObj, dataObj));
        result = true;
    }
    return result;
}

/**
 * Create validation function for custom keyword
 *
 * @param {String}   keyword - keyword
 * @param {Function} func    - validation function
 *
 * @returns {Function} custom keyword validation function
 */
function createValidationFunction(keyword, func) {
    return function _validate(schema, data, parentSchema, dataPath, parentData, propertyName, rootData) {
        return validate.call(
            this,
            func,
            {
                schema, parentSchema, keyword, validateFn: _validate
            },
            {
                data, dataPath, parentData, propertyName, rootData
            }
        );
    };
}
/**
 * Validation runner block end
 */

module.exports = {
    asyncOrder: [
        ['hostConnectivityCheck', 'pathExists'],
        ['f5secret']
    ],
    keywords: {
        f5secret: {
            type: 'object',
            errors: true,
            modifying: true,
            metaSchema: {
                type: 'boolean'
            },
            validate: createValidationFunction('f5secret', f5secretCheck)
        },
        hostConnectivityCheck: {
            type: 'string',
            errors: true,
            modifying: false,
            metaSchema: {
                type: 'boolean'
            },
            validate: createValidationFunction('hostConnectivityCheck', hostConnectivityCheck)
        },
        timeWindowMinSize: {
            type: 'object',
            errors: true,
            modifying: false,
            metaSchema: {
                type: 'integer',
                minimum: 1,
                maximum: 1439,
                description: 'Time window size in minutes. From 1m to 23h 59m.'
            },
            validate: createValidationFunction('timeWindowMinSize', timeWindowSizeCheck)
        },
        declarationClass: {
            type: 'string',
            errors: true,
            modifying: false,
            metaSchema: {
                type: 'string',
                description: 'Check if declaration with provided name and class exists'
            },
            validate: createValidationFunction('declarationClass', declarationClassCheck)
        },
        declarationClassProp: {
            type: 'string',
            errors: true,
            modifying: false,
            metaSchema: {
                type: 'object',
                description: 'Automatically resolve a path with given {declarationClass}/{propLevel_1}/...{propLevel_n}',
                properties: {
                    partsNum: {
                        description: 'Expected number of parts the value should consist of. 0 - no limits',
                        type: 'integer',
                        minimum: 0,
                        maximum: 100,
                        default: 0
                    },
                    path: {
                        description: '{declarationClass}/{propLevel_1}/...{propLevel_n}',
                        type: 'string',
                        minLength: 1
                    }
                }
            },
            validate: createValidationFunction('declarationClassProp', declarationClassPropCheck)
        },
        pathExists: {
            type: 'string',
            errors: true,
            modifying: true,
            metaSchema: {
                type: 'boolean',
                description: 'Check that path exists'
            },
            validate: createValidationFunction('pathExists', fsPathExistsCheck)
        },
        f5expand: {
            type: 'string',
            errors: true,
            modifying: true,
            metaSchema: {
                type: 'boolean'
            },
            validate: createValidationFunction('f5expand', f5expandCheck)
        }
    }
};
