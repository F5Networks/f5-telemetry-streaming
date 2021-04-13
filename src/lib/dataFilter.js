/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const util = require('./utils/misc');
const dataUtil = require('./utils/data');

/**
 * Data Filter Class
 */
class DataFilter {
    /**
     * Constructor
     *
     * @param {Component} config - consumer config object
     */
    constructor(consumerConfig) {
        this.excludeList = {};
        applyGlobalFilters.call(this, consumerConfig);
    }

    /**
     * Filter data
     *
     * @param {Object} dataCtx      - data context
     * @param {Object} dataCtx.data - actual data to filter
     * @param {string} dataCtx.type - type of data to filter
     *
     * @returns {Object} Deep copy data context with filtered data
     */
    apply(dataCtx) {
        const dataCtxCopy = util.deepCopy(dataCtx);
        applyExcludeList.call(this, dataCtxCopy.data);
        return dataCtxCopy;
    }
}

/**
 * PRIVATE METHODS
 */
/**
 * Add default global filters based on consumer config
 *
 * @this DataFilter
 * @param {Component} config - consumer config object
 *
 * @returns {void}
 */
function applyGlobalFilters(config) {
    // tmstats is only supported by Splunk legacy until users can specify desired tables
    if (config.type !== 'Splunk' || config.format !== 'legacy') {
        this.excludeList = Object.assign(this.excludeList, { tmstats: true });
    }
}

/**
 * Removes properties from data object based on excludeList
 *
 * @this DataFilter
 * @returns {void}
 */
function applyExcludeList(data) {
    const matches = dataUtil.getDeepMatches(data, this.excludeList);
    // Delete matching property. Can be performed on array but must avoid reindexing until all
    // matches are removed
    matches.forEach((match) => {
        delete match.data[match.key];
    });
    // Reindex any arrays that were modified
    matches.forEach((match) => {
        if (Array.isArray(match.data)) {
            for (let i = match.data.length - 1; i >= 0; i -= 1) {
                if (typeof match.data[i] === 'undefined') {
                    match.data.splice(i, 1);
                }
            }
        }
    });
}


module.exports = {
    DataFilter,

    /**
     * Handle filter actions
     * Note:
     *  - data will be modified in place - make a copy (if need) before passing to this function.
     *
     * @public
     *
     * @param {Object}  dataCtx                 - data collected from a BIG-IP
     * @param {Object}  dataCtx.data            - data to process
     * @param {String}  dataCtx.type            - type of data to process
     * @param {Object}  actionCtx               - Action property block
     * @param {Object}  [actionCtx.includeData] - 'Include' filter definition
     * @param {Object}  [actionCtx.excludeData] - 'Exclude' filter definition
     * @param {Object}  [actionCtx.locations]   - The locations of data to be filtered
     * @param {Object}  [actionCtx.ifAllMatch]  - conditions to check before
     * @param {Object}  [actionCtx.ifAnyMatch]  - conditions to check before
     *
     * @returns {void}
     */
    handleAction(dataCtx, actionCtx) {
        if ((actionCtx.includeData || actionCtx.excludeData)
                && !util.isObjectEmpty(dataCtx.data) // completely short-circuit if dataCtx.data is empty
                && dataUtil.checkConditions(dataCtx, actionCtx)) {
            if (actionCtx.includeData) {
                dataUtil.preserveStrictMatches(dataCtx.data, actionCtx.locations, true);
            } else if (actionCtx.excludeData) {
                dataUtil.removeStrictMatches(dataCtx.data, actionCtx.locations);
            }
        }
    }
};
