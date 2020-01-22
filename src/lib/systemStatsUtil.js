/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const mustache = require('mustache');
const util = require('./util.js');

const CONDITIONAL_FUNCS = {
    deviceVersionGreaterOrEqual,
    isModuleProvisioned
};

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
 * @param {String} moduletoCompare           - module to compare against
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

    /**
     * Evaluate conditional block
     *
     * @param {Object} contextData - contextData object
     * @param {Object} conditionalBlock - block to evaluate, where object's key - conditional operator
     *                                    object's value - params for that operator
     *
     * @returns {boolean} conditional result
     */
    _resolveConditional(contextData, conditionalBlock) {
        let ret = true;
        Object.keys(conditionalBlock).forEach((key) => {
            const func = CONDITIONAL_FUNCS[key];
            if (func === undefined) {
                throw new Error(`Unknown property in conditional block ${key}`);
            }
            ret = ret && func(contextData, conditionalBlock[key]);
        });
        return ret;
    },

    /**
     * Render key using mustache template system
     *
     * @param {Object} contextData - contextData object
     * @param {Object} property - property object
     *
     * @returns {Object} rendered property object
     */
    _renderPropTemplate(contextData, property) {
        // should be easy to add support for more complex templates like {{ #something }}
        // but not sure we are really need it now.
        // For now just supporting simple templates which
        // generates single string only
        if (property.key) property.key = mustache.render(property.key, contextData);
        return property;
    },

    /**
     * Property pre-processing to resolve conditionals
     *
     * @param {Object} contextData - contextData object
     * @param {Object} property - property object
     *
     * @returns {Object} pre-processed deep copy of property object
     */
    _preprocessProperty(contextData, property) {
        if (property.if) {
            const newObj = {};
            // property can result in 'false' when
            // 'else' or 'then' were not defined.
            while (property) {
                // copy all non-conditional data on same level to new object
                // eslint-disable-next-line no-loop-func
                Object.keys(property).forEach((key) => {
                    if (!(key === 'if' || key === 'then' || key === 'else')) {
                        newObj[key] = property[key];
                    }
                });
                // so, we copied everything we needed.
                // break in case there is no nested 'if' block
                if (!property.if) {
                    break;
                }
                // trying to resolve conditional
                property = this._resolveConditional(contextData, property.if)
                    ? property.then : property.else;
            }
            property = newObj;
        }
        // deep copy
        return util.deepCopy(property);
    },

    /**
     * Render property based on template and conditionals
     *
     * @param {Object} contextData - contextData object
     * @param {Object} property - property object
     *
     * @returns {Object} rendered property
     */
    renderProperty(contextData, property) {
        return this._renderPropTemplate(contextData, this._preprocessProperty(contextData, property));
    }

};
