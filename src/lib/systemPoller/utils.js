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
const dataUtil = require('../utils/data');
const util = require('../utils/misc');

/**
 * @module systemPoller/utils
 */

/**
 * Comparison functions
 *
 * NOTE:
 * Functions below are BIG-IP specific.
 */
const CONDITIONAL_FUNCS = {
    /**
     * Compare device versions
     *
     * @param {object} contextData               - context data
     * @param {object} contextData.deviceVersion - device's version to compare
     * @param {string} versionToCompare          - version to compare against
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
     * @param {object} contextData               - context data
     * @param {object} contextData.provisioning  - provision state of modules to compare
     * @param {string} moduleToCompare           - module to compare against
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
     * @param {object}  contextData                 - context data
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
 * Compute stats's path
 *
 * @param {object} stats - stats structure
 * @param {string} statKey - stat's key
 *
 * @returns {string[]} - path to stat
 */
function computeStatPath(stats, statKey) {
    const path = [statKey];
    const stat = stats[statKey];
    if (stat.structure && stat.structure.parentKey) {
        path.push(stat.structure.parentKey);
    }
    return path.reverse();
}

/**
 * Applies all filters from declaration, to the set of System Stat properties that will be collected.
 * Processing of filters occurs sequentially, from top-to-bottom (of the declaration).
 * All filtering of properties / fields by value (ex: VirtualServers matching name of 'test*') must be handled after
 * stats are collected, and will not be filtered by _filterStats().
 *
 * @param {*} stats
 * @param {*} actions
 * @param {boolean} [ignoreTMStats = true] - ignore TMStats data
 *
 * @returns {*} filtered stats
 */
function filterStats(stats, actions, ignoreTMStats = true) {
    /**
     * This function for optimization purpose only - it is not actual data exclusion,
     * it only disables endpoints we are not going to use at all.
     *
     * From the user's point of view this process should be explicit - the user should still think
     * that TS fetches all data.
     *
     * Ideally this function should be ran just once per System Poller's config update but due nature of
     * System Poller and the fact that it runs every 60 secs or more we can compute on demand every time
     * to avoid memory usage.
     */
    const FLAGS = {
        UNTOUCHED: 0,
        PRESERVE: 1
    };
    /**
     * Reasons to create tree of stats that mimics actual TS output:
     * - much easier deal with regular expressions (at least can avoid regex comparisons)
     * - all location pointers are object of objects
     */
    const statsSkeleton = {};
    const nestedKey = 'nested';

    Object.keys(stats).forEach((statKey) => {
        const stat = stats[statKey];
        if (ignoreTMStats && (statKey === 'tmstats' || (stat.structure && stat.structure.parentKey === 'tmstats'))) {
            // definetly data from properties.json - ignore it
            return;
        }

        if (!stat.structure) {
            statsSkeleton[statKey] = { flag: FLAGS.UNTOUCHED };
        } else if (stat.structure.parentKey) {
            if (!statsSkeleton[stat.structure.parentKey]) {
                statsSkeleton[stat.structure.parentKey] = { flag: FLAGS.UNTOUCHED };
            }
            statsSkeleton[stat.structure.parentKey][nestedKey] = statsSkeleton[stat.structure.parentKey][nestedKey]
                || {};
            statsSkeleton[stat.structure.parentKey][nestedKey][statKey] = { flag: FLAGS.UNTOUCHED };
        }
    });

    actions.forEach((actionCtx) => {
        if (!actionCtx.enable) {
            return;
        }
        if (actionCtx.ifAllMatch || actionCtx.ifAnyMatch) {
            // if ifAllMatch or ifAnyMatch points to nonexisting data - VS name, tag or what ever else
            // we have to mark all existing paths with PRESERVE flag
            dataUtil.searchAnyMatches(statsSkeleton, actionCtx.ifAllMatch || actionCtx.ifAnyMatch, (key, item) => {
                item.flag = FLAGS.PRESERVE;
                return nestedKey;
            });
        }
        // if includeData/excludeData paired with ifAllMatch or ifAnyMatch then we can simply ignore it
        // because we can't include/exclude data without conditional check
        if (actionCtx.excludeData && !(actionCtx.ifAllMatch || actionCtx.ifAnyMatch)) {
            dataUtil.removeStrictMatches(statsSkeleton, actionCtx.locations, (key, item, getNestedKey) => {
                if (getNestedKey) {
                    return nestedKey;
                }
                return item.flag !== FLAGS.PRESERVE;
            });
        }
        if (actionCtx.includeData && !(actionCtx.ifAllMatch || actionCtx.ifAnyMatch)) {
            // strict is false - it is okay to have partial matches because we can't be sure
            // for 100% that such data was not added by previous action
            dataUtil.preserveStrictMatches(statsSkeleton, actionCtx.locations, false, (key, item, getNestedKey) => {
                if (getNestedKey) {
                    return nestedKey;
                }
                return item.flag !== FLAGS.PRESERVE;
            });
        }
    });

    const activeStats = {};
    Object.keys(stats).forEach((statKey) => {
        let skeleton = statsSkeleton;
        // path to stat should exists otherwise we can delete it
        const exists = computeStatPath(stats, statKey).every((key) => {
            skeleton = skeleton[key];
            if (skeleton && skeleton[nestedKey]) {
                skeleton = skeleton[nestedKey];
            }
            return skeleton;
        });
        if (exists) {
            activeStats[statKey] = stats[statKey];
        }
    });

    return activeStats;
}

/**
 * Evaluate conditional block
 *
 * @param {object} contextData      - contextData object
 * @param {object} conditionalBlock - block to evaluate, where object's key - conditional operator
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
 * @param {object} contextData - context object
 * @param {object} property    - property object
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
 * Render property based on template and conditionals
 *
 * Note: mutates 'property'
 *
 * @param {object} contextData - contextData object
 * @param {object} property    - property object
 *
 * @returns {object} rendered property
 */
function renderProperty(contextData, property) {
    renderTemplate(contextData, property);
    preprocessProperty(contextData, property);
    return property;
}

/**
 * Split key
 *
 * @param {string} key - key to split
 *
 * @returns {object} Return data formatted like { rootKey: 'key, childKey: 'key' }
 */
function splitKey(key) {
    const idx = key.indexOf(constants.STATS_KEY_SEP);
    const ret = { rootKey: key.slice(0, idx === -1 ? key.length : idx) };
    if (idx !== -1) {
        ret.childKey = key.slice(idx + constants.STATS_KEY_SEP.length, key.length);
    }
    return ret;
}

/**
 * Property pre-processing to resolve conditionals
 *
 * Note: mutates 'property'
 *
 * @param {object} contextData - context object
 * @param {object} property    - property object
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
    filterStats,
    renderProperty,
    splitKey
};
