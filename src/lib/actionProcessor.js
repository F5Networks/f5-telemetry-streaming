/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger');
const dataTagging = require('./dataTagging');
const util = require('./utils/misc');
const dataUtil = require('./utils/data');

/**
 * Process actions like filtering or tagging
 *
 * @param {Object}  dataCtx               - wrapper with data to process
 * @param {Object}  dataCtx.data          - data to process
 * @param {String}  dataCtx.type          - type of data to process
 * @param {Object}  [actions]             - actions to apply to data (e.g. filters, tags)
 * @param {Boolean} [actions.enable]      - whether or not to enable the given action
 * @param {Object}  [actions.setTag]      - apply tag
 * @param {Object}  [actions.includeData] - include data
 * @param {Object}  [actions.excludeData] - exclude data
 * @param {Object}  deviceCtx             - device context
 */

function processActions(dataCtx, actions, deviceCtx) {
    actions = actions || [];
    actions.forEach((actionCtx) => {
        if (!actionCtx.enable) {
            return;
        }
        let handler = null;
        if (actionCtx.setTag) {
            handler = handleDataTagging;
        } else if (actionCtx.includeData || actionCtx.excludeData) {
            handler = handleDataFilter;
        } else if (actionCtx.JMESPath) {
            handler = handleJMESPath;
        }
        if (!handler) {
            const errMsg = `actionProcessor:processActions error: unknown action - ${JSON.stringify(actionCtx)}`;
            logger.error(errMsg);
            throw new Error(errMsg);
        }
        handler(dataCtx, actionCtx, deviceCtx);
    });
}

/**
 * PRIVATE METHODS
 */
/**

/**
 * Handle filter actions (includeData or excludeData)
 * Note:
 *  - data will be modified in place - make a copy (if need) before passing to this function.
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
function handleDataFilter(dataCtx, actionCtx) {
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

/**
 * Handle tagging actions on the data.
 * Note:
 *  - data will be modified in place - make a copy (if need) before passing to this function.
 *  - supports only data from SystemPoller and EventLister
 *
 * @param {Object}  dataCtx                - data context wrapper
 * @param {Object}  dataCtx.data           - data to process
 * @param {String}  dataCtx.type           - type of data to process
 * @param {Object}  actionCtx              - 'setTag' action to perform on the data
 * @param {Object}  deviceCtx              - device context
 * @param {Object}  [actionCtx.setTag]     - tag(s) that will be applied
 * @param {Object}  [actionCtx.locations]  - where the tags should be applied
 * @param {Object}  [actionCtx.ifAllMatch] - conditions to check before
 * @param {Object}  [actionCtx.ifAnyMatch] - conditions to check before
 *
 * @returns {void}
 */
function handleDataTagging(dataCtx, actionCtx, deviceCtx) {
    if (!util.isObjectEmpty(actionCtx.setTag)
            && dataUtil.checkConditions(dataCtx, actionCtx)) {
        dataTagging.addTags(dataCtx, actionCtx, deviceCtx);
    }
}

/**
 * Handle JMESPath actions on the data.
 * Note:
 *  - data will be modifed in place - make a copy (if needed) before passing to this function.
 *
 * @param {Object}  dataCtx                 - data context wrapper
 * @param {Object}  dataCtx.data            - data to process
 * @param {Object}  actionCtx               - 'JMESPath' action to perform on the data
 * @param {Object}  [actionCtx.expression]  - JMESPath expression to apply to the data
 */
function handleJMESPath(dataCtx, actionCtx) {
    // completely short-circuit if no JMESPath action, or if dataCtx.data or actionCtx.expression is empty
    if ((actionCtx.JMESPath) && !util.isObjectEmpty(dataCtx.data) && !util.isObjectEmpty(actionCtx.expression)) {
        dataUtil.applyJMESPathExpression(dataCtx, actionCtx.expression);
    }
}

module.exports = {
    processActions
};
