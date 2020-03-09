/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const mustache = require('mustache');
const util = require('./util');

/**
 * Comparison functions
 * TODO: these are mostly BIG-IP specific, we might want to move these out when we support other platforms
 */

/**
 * Compare device versions
 *
 * @param {Object} contextData               - context data
 * @param {Object} contextData.deviceVersion - device's version to compare
 * @param {String} versionToCompare          - version to compare against
 *
 * @returns {boolean} true when device's version is greater or equal
 */
function deviceVersionGreaterOrEqual(contextData, versionToCompare) {
    const deviceVersion = contextData.deviceVersion;
    if (deviceVersion === undefined) {
        throw new Error('deviceVersionGreaterOrEqual: context has no property \'deviceVersion\'');
    }
    return util.compareVersionStrings(deviceVersion, '>=', versionToCompare);
}

/**
 * Compare provisioned modules
 *
 * @param {Object} contextData               - context data
 * @param {Object} contextData.provisioning  - provision state of modules to compare
 * @param {String} moduleToCompare           - module to compare against
 *
 * @returns {boolean} true when device's module is provisioned
 */
function isModuleProvisioned(contextData, moduleToCompare) {
    const provisioning = contextData.provisioning;
    if (provisioning === undefined) {
        throw new Error('isModuleProvisioned: context has no property \'provisioning\'');
    }
    return ((provisioning[moduleToCompare] || {}).level || 'none') !== 'none';
}

module.exports = {

    CONDITIONAL_FUNCS: {
        deviceVersionGreaterOrEqual,
        isModuleProvisioned
    },

    /**
     * Evaluate conditional block
     *
     * @param {Object} contextData      - contextData object
     * @param {Object} conditionalBlock - block to evaluate, where object's key - conditional operator
     *                                    object's value - params for that operator
     *
     * @returns {boolean} conditional result
     */
    _resolveConditional(contextData, conditionalBlock) {
        return Object.keys(conditionalBlock).every((key) => {
            const func = this.CONDITIONAL_FUNCS[key];
            if (func === undefined) {
                throw new Error(`Unknown property '${key}' in conditional block`);
            }
            return func(contextData, conditionalBlock[key]);
        });
    },

    /**
     * Render property using mustache template system.
     *
     * @param {Object} contextData - contextData object
     * @param {Object} property    - property object
     *
     * @returns {Object} rendered property object
     */
    _renderTemplate(contextData, property) {
        // traverse object without recursion
        const stack = [property];
        const forKey = (key) => {
            const val = stack[0][key];
            switch (typeof val) {
            case 'object':
                if (val !== null) {
                    stack.push(val);
                }
                break;
            case 'string':
                if (val.indexOf('{{') !== -1) {
                    stack[0][key] = mustache.render(val, contextData);
                }
                break;
            default:
                break;
            }
        };
        while (stack.length) {
            // expecting objects only to be in stack var
            Object.keys(stack[0]).forEach(forKey);
            stack.shift();
        }
        return property;
    },

    /**
     * Property pre-processing to resolve conditionals
     *
     * @param {Object} contextData - contextData object
     * @param {Object} property    - property object
     *
     * @returns {Object} pre-processed deep copy of property object
     */
    _preprocessProperty(contextData, property) {
        // traverse object without recursion
        const stack = [property];
        let obj;

        const forKey = (key) => {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                stack.push(obj[key]);
            }
        };

        while (stack.length) {
            obj = stack[0];
            if (obj.if) {
                const ifBlock = obj.if;
                const thenBlock = obj.then;
                const elseBlock = obj.else;
                delete obj.if;
                delete obj.then;
                delete obj.else;
                if (this._resolveConditional(contextData, ifBlock)) {
                    if (thenBlock) {
                        Object.assign(obj, thenBlock);
                    }
                } else if (elseBlock) {
                    Object.assign(obj, elseBlock);
                }
            } else {
                Object.keys(obj).forEach(forKey);
                stack.shift();
            }
        }
        return property;
    },

    /**
     * Render property based on template and conditionals
     *
     * @param {Object} contextData - contextData object
     * @param {Object} property    - property object
     *
     * @returns {Object} rendered property
     */
    renderProperty(contextData, property) {
        return this._preprocessProperty(
            contextData,
            this._renderTemplate(contextData, property)
        );
    }
};
