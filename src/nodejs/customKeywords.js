/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const Ajv = require('ajv');
const constants = require('./constants.js');
const util = require('./util.js');

const textNamedKey = 'plainText';
const base64NamedKey = 'plainBase64';
const secureVaultNamedKey = 'SecureVault';


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

const keywords = {
    f5secret: {
        type: 'object',
        errors: true,
        modifying: true,
        async: true,
        metaSchema: {
            type: 'boolean'
        },
        // eslint-disable-next-line no-unused-vars
        compile(schema, parentSchema) {
            // eslint-disable-next-line no-unused-vars
            return function (data, dataPath, parentData, propertyName, rootData) {
                const ajvErrors = [];

                // we handle a number of passphrase object in this function, the following describes each of them
                // 'cipherText': this means we plan to store a plain text secret locally, which requires we encrypt
                // it first. This also assumes that we are running on a BIG-IP where we have the means to do so
                // 'environmentVar': undefined

                // handle 'environmentVar' passphrase object
                if (data[constants.PASSPHRASE_ENVIRONMENT_VAR] !== undefined) {
                    return Promise.resolve(true);
                }
                // handle 'cipherText' passphrase object
                if (data[constants.PASSPHRASE_CIPHER_TEXT] !== undefined) {
                    // if data is already encrypted just return
                    if (data.protected === secureVaultNamedKey) {
                        return Promise.resolve(true);
                    }

                    // base64 decode before encrypting - if needed
                    if (data.protected === base64NamedKey) {
                        data[constants.PASSPHRASE_CIPHER_TEXT] = util.base64('decode', data[constants.PASSPHRASE_CIPHER_TEXT]);
                        data.protected = textNamedKey;
                    }

                    return util.getDeviceType()
                        .then((deviceType) => {
                            // check if on a BIG-IP and fail validation if not
                            if (deviceType !== constants.BIG_IP_DEVICE_TYPE) {
                                throw new Error(`Specifying '${constants.PASSPHRASE_CIPHER_TEXT}' requires running on ${constants.BIG_IP_DEVICE_TYPE}`);
                            }
                            // encrypt secret
                            return util.encryptSecret(data[constants.PASSPHRASE_CIPHER_TEXT]);
                        })
                        .then((secret) => {
                            // update text field with secret - should we base64 encode?
                            data[constants.PASSPHRASE_CIPHER_TEXT] = secret;
                            // set protected key - in case we return validated schema to requestor
                            data.protected = secureVaultNamedKey;

                            // notify success
                            return true;
                        })
                        .catch((e) => {
                            ajvErrors.push({ keyword: 'f5secret', message: e.message, params: {} });
                            throw new Ajv.ValidationError(ajvErrors);
                        });
                }

                // if we make it here we should reject with a useful message
                const message = `missing ${constants.PASSPHRASE_CIPHER_TEXT} or ${constants.PASSPHRASE_ENVIRONMENT_VAR}`;
                return Promise.reject(new Ajv.ValidationError([{ keyword: 'f5secret', message, params: {} }]));
            };
        }
    },
    hostConnectivityCheck: {
        type: 'string',
        errors: true,
        modifying: true,
        async: true,
        metaSchema: {
            type: 'boolean'
        },
        // eslint-disable-next-line no-unused-vars
        compile(schema, parentSchema) {
            // eslint-disable-next-line no-unused-vars
            return function (data, dataPath, parentData, propertyName, rootData) {
                parentData = parentData || {};
                const ajvErrors = [];

                // enable host connectivity check with this property - return otherwise
                if (parentData.enableHostConnectivityCheck !== true) return Promise.resolve(true);

                // port required - schema should validate this
                if (!parentData.port) return Promise.resolve(true);

                return util.networkCheck(data, parentData.port)
                    .then(() => true)
                    .catch((e) => {
                        ajvErrors.push({ keyword: 'hostConnectivityCheck', message: e.message, params: {} });
                        throw new Ajv.ValidationError(ajvErrors);
                    });
            };
        }
    },
    f5expand: {
        // type: 'string',
        errors: true,
        modifying: true,
        async: false,
        metaSchema: {
            type: 'boolean'
        },
        // eslint-disable-next-line no-unused-vars
        compile(schema, parentSchema) {
            // eslint-disable-next-line no-unused-vars
            return function (data, dataPath, parentData, propertyName, rootData) {
                const ajvErrors = [];

                // only process if root contains scratch.expand:true
                if (!(rootData.scratch && rootData.scratch.expand === true)) {
                    return true;
                }
                if (typeof data !== 'string') {
                    // keyword may be applied to objects that support multiple types for
                    // idempotency - so simply return if data is not a string
                    return true;
                }

                try {
                    parentData[propertyName] = expandPointers(data, rootData, dataPath);
                } catch (e) {
                    ajvErrors.push({ keyword: 'f5expand', message: e.message, params: {} });
                    throw new Ajv.ValidationError(ajvErrors);
                }
                return true;
            };
        }
    }
};

module.exports = keywords;
