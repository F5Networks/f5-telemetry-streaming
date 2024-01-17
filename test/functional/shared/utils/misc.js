/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const Ajv = require('ajv');
const cloneDeep = require('lodash/cloneDeep');
const defaultTo = require('lodash/defaultTo');
const fs = require('fs');
const hasKey = require('lodash/has');

/**
 * @module test/functional/shared/utils/misc
 */

const ENV_TRUTHY_VALS = ['true', 'yes'];

// eslint-disable-next-line no-multi-assign
const miscUtils = module.exports = {
    /**
     * Cast value from process.env to specific type
     *
     * @param {string} type - type to cast value to
     * @param {string} val - value from process.env
     *
     * @returns {any} value
     */
    castEnvVarTo(type, val) {
        if (type === 'boolean') {
            val = (val || '').toLowerCase().trim();
            if (ENV_TRUTHY_VALS.indexOf(val) !== -1) {
                return true;
            }
            val = parseInt(val, 10);
            return !Number.isNaN(val) && val > 0;
        }
        throw new Error(`Unsupported type '${type}'`);
    },

    /**
     * Create folder (sync method)
     *
     * @param {string} fpath - path to folder
     */
    createDir(fpath) {
        if (!fs.existsSync(fpath)) {
            try {
                fs.mkdirSync(fpath);
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
            }
        }
    },

    deepCopy: cloneDeep,

    /**
     * Get first element
     * @param {Object} args - 'arguments'
     * @param {string} typeName - type name
     * @param {Object} [options] - options
     * @param {any} [options.defaultValue] - default value
     * @param {number} [options.fromIndex] - the index to start the search at
     *
     * @returns {GetArgByTypeRet}
     */
    getArgByType(args, typeName, options) {
        options = defaultTo(options, {});
        const ret = {
            found: false
        };
        const fromIndex = defaultTo(options.fromIndex, -1);
        Array.prototype.find.call(args, (elem, idx) => {
            // eslint-disable-next-line valid-typeof
            if (idx >= fromIndex && typeof elem === typeName) {
                ret.found = true;
                ret.position = idx;
                ret.value = elem;
                return true;
            }
            return false;
        });
        if (!ret.found && hasKey(options, 'defaultValue')) {
            ret.value = options.defaultValue;
        }
        return ret;
    },

    /**
     * Get arg from process.env
     *
     * @param {string} name - env arg name
     * @param {Object} [options] - options
     * @param {string} [options.castTo] - cast to type
     * @param {any} [options.defaultValue = undefined] - default value
     *
     * @returns {string | undefined} value
     * @throws {Error} when no 'defaultValue' provided and process.env doesn't have such key
     */
    getEnvArg(name, options) {
        options = defaultTo(options, {});
        if (hasKey(process.env, name)) {
            const val = process.env[name];
            return options.castTo
                ? miscUtils.castEnvVarTo(options.castTo, val)
                : val;
        }
        if (hasKey(options, 'defaultValue')) {
            return options.defaultValue;
        }
        throw new Error(`process.env has no such property "${name}"`);
    },

    /**
     * Get package details
     *
     * @returns {{name: string, path: string}} { name: 'foo.rpm', path: '/tmp/foo.rpm' }
     */
    getPackageDetails() {
        // default to new build directory if it exists, otherwise use dist directory
        const dir = `${__dirname}/../../../../dist`;

        const distFiles = fs.readdirSync(dir);
        const packageFiles = distFiles.filter((f) => f.endsWith('.rpm'));

        // get latest rpm file (by timestamp since epoch)
        // note: this might not work if the artifact resets the timestamps
        const latest = { file: null, time: 0 };
        packageFiles.forEach((f) => {
            const fStats = fs.lstatSync(`${dir}/${f}`);
            if (fStats.birthtimeMs >= latest.time) {
                latest.file = f;
                latest.time = fStats.birthtimeMs;
            }
        });
        const packageFile = latest.file;
        if (!packageFile) {
            throw new Error(`Unable to find RPM in ${dir}`);
        }

        return {
            name: packageFile,
            path: dir
        };
    },

    /**
     * Generate random string
     *
     * @param {integer} [length=6] - length
     *
     * @returns {string} random string
     */
    randomString(length) {
        length = arguments.length > 0 ? length : 6;
        return Math.random().toString(20).slice(2, 2 + length);
    },

    /**
     * Read file and try to parse its data as JSON
     *
     * @param {string} path - path to a file
     * @param {boolean} [async = false] - sync or async
     *
     * @returns {any | Promise<any>} parsed data
     */
    readJsonFile(path, async) {
        async = miscUtils.getArgByType(arguments, 'boolean', {
            defaultValue: false,
            fromIndex: 1
        }).value;
        if (!async) {
            const data = fs.readFileSync(path);
            try {
                return JSON.parse(data);
            } catch (parseErr) {
                throw new Error(`Unable to parse JSON data from file "${path}": ${parseErr}`);
            }
        }
        return new Promise((resolve, reject) => {
            try {
                resolve(miscUtils.readJsonFile(path));
            } catch (readErr) {
                reject(readErr);
            }
        });
    },

    /**
     * Validate data against JSON schema
     *
     * @param {string} data - data to validate
     * @param {string} schema - JSON schema to use during validation
     *
     * @returns {boolean | object} true on successful validation or object with errors
     */
    validateAgainstSchema(data, schema) {
        const ajv = new Ajv({ useDefaults: true });
        const validator = ajv.compile(schema);
        const valid = validator(data);
        if (!valid) {
            return { errors: validator.errors };
        }
        return true;
    }
};

/**
 * @typedef GetArgByTypeRet
 * @type {Object}
 * @property {boolean} found - true if element found
 * @property {number} [position] - element's position in 'arguments'
 * @property {any} [value] - value
 */
