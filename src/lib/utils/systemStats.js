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

const mustache = require('mustache');

const constants = require('../constants');
const util = require('./misc');

/** @module systemStatsUtil */

/**
 * Comparison functions
 * TODO: these are mostly BIG-IP specific, we might want to move these out when we support other platforms
 */
const CONDITIONAL_FUNCS = {
    /**
     * Compare device versions
     *
     * @param {Object} contextData               - context data
     * @param {Object} contextData.deviceVersion - device's version to compare
     * @param {String} versionToCompare          - version to compare against
     *
     * @returns {boolean} true when device's version is greater or equal
     */
    deviceVersionGreaterOrEqual(contextData, versionToCompare) {
        const deviceVersion = contextData.deviceVersion;
        if (deviceVersion === undefined) {
            throw new Error('deviceVersionGreaterOrEqual: context has no property \'deviceVersion\'');
        }
        return util.compareVersionStrings(deviceVersion, '>=', versionToCompare);
    },

    /**
     * Compare provisioned modules
     *
     * @param {Object} contextData               - context data
     * @param {Object} contextData.provisioning  - provision state of modules to compare
     * @param {String} moduleToCompare           - module to compare against
     *
     * @returns {boolean} true when device's module is provisioned
     */
    isModuleProvisioned(contextData, moduleToCompare) {
        const provisioning = contextData.provisioning;
        if (provisioning === undefined) {
            throw new Error('isModuleProvisioned: context has no property \'provisioning\'');
        }
        return ((provisioning[moduleToCompare] || {}).level || 'none') !== 'none';
    },

    /**
     * Compares Bash state between device and expected Bash state
     *
     * @param {Object}  contextData                 - context data
     * @param {Boolean} contextData.bashDisabled    - whether or not Bash has been disabled
     * @param {Boolean} stateToCompare              - state of Bash to check against
     *
     * @returns {boolean} true when device's bash state is the same as the desired state
     */
    isBashDisabled(contextData, stateToCompare) {
        const bashDisabled = contextData.bashDisabled;
        if (bashDisabled === undefined) {
            throw new Error('isBashDisabled: context has no property \'bashDisabled\'');
        }
        return bashDisabled === stateToCompare;
    }
};

/**
 * Evaluate conditional block
 *
 * @param {Object} contextData      - contextData object
 * @param {Object} conditionalBlock - block to evaluate, where object's key - conditional operator
 *                                    object's value - params for that operator
 *
 * @returns {boolean} conditional result
 */
function resolveConditional(contextData, conditionalBlock) {
    return Object.keys(conditionalBlock).every((key) => {
        const func = CONDITIONAL_FUNCS[key];
        if (func === undefined) {
            throw new Error(`Unknown property '${key}' in conditional block`);
        }
        return func(contextData, conditionalBlock[key]);
    });
}

/**
 * Render property using mustache template system.
 *
 * Note: mutates 'property'
 *
 * @param {Object} contextData - context object
 * @param {Object} property    - property object
 *
 * @returns {void} when finished
 */
function renderTemplate(contextData, property) {
    util.traverseJSON(property, (parent, key) => {
        const val = parent[key];
        if (typeof val === 'string') {
            const startIdx = val.indexOf('{{');
            if (startIdx !== -1 && val.indexOf('}}', startIdx) > startIdx) {
                parent[key] = mustache.render(val, contextData);
            }
        }
    });
}

/**
 * Property pre-processing to resolve conditionals
 *
 * Note: mutates 'property'
 *
 * @param {Object} contextData - context object
 * @param {Object} property    - property object
 *
 * @returns {void} when finished
 */
function preprocessProperty(contextData, property) {
    // put 'property' inside of object to be able to
    // process  'if' on the top level
    util.traverseJSON({ property }, (parent, key) => {
        const val = parent[key];
        // run while 'if' block exist on current level
        while (typeof val === 'object'
            && !Array.isArray(val)
            && val !== null
            && typeof val.if !== 'undefined'
        ) {
            const block = resolveConditional(contextData, val.if) ? val.then : val.else;
            // delete blocks at first to avoid collisions with nested blocks
            delete val.if;
            delete val.then;
            delete val.else;

            if (typeof block === 'object' && !Array.isArray(block)) {
                Object.assign(val, block);
            }
        }
    });
}

module.exports = {
    /**
     * Render property based on template and conditionals
     *
     * Note: mutates 'property'
     *
     * @param {Object} contextData - contextData object
     * @param {Object} property    - property object
     *
     * @returns {Object} rendered property
     */
    renderProperty(contextData, property) {
        renderTemplate(contextData, property);
        preprocessProperty(contextData, property);
        return property;
    },

    /**
     * Split key
     *
     * @param {String} key - key to split
     *
     * @returns {Object} Return data formatted like { rootKey: 'key, childKey: 'key' }
     */
    splitKey(key) {
        const idx = key.indexOf(constants.STATS_KEY_SEP);
        const ret = { rootKey: key.slice(0, idx === -1 ? key.length : idx) };
        if (idx !== -1) {
            ret.childKey = key.slice(idx + constants.STATS_KEY_SEP.length, key.length);
        }
        return ret;
    }
};
