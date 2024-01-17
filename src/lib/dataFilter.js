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
    DataFilter
};
