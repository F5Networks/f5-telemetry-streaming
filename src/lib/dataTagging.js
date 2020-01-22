/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const properties = require('./properties.json');
const normalizeUtil = require('./normalizeUtil');
const dataUtil = require('./dataUtil.js');
const util = require('./util.js');
const systemStatsUtil = require('./systemStatsUtil');
const EVENT_TYPES = require('./constants.js').EVENT_TYPES;

/**
 * Handle tagging actions on the data.
 * Note:
 *  - data will be modified in place - make a copy (if need) before passing to this function.
 *  - supports only data from SystemPoller and EventLister
 *
 * @public
 *
 * @param {Object}  dataCtx                - data context wrapper
 * @param {Object}  dataCtx.data           - data to process
 * @param {String}  dataCtx.type           - type of data to process
 * @param {Object}  actionCtx              - 'setTag' action to perfrom on the data
 * @param {Object}  [actionCtx.setTag]     - tag(s) that will be applied
 * @param {Object}  [actionCtx.locations]  - where thae tags should be applied
 * @param {Object}  [actionCtx.ifAllMatch] - conditions to check before
 *
 * @returns {void}
 */
function handleAction(dataCtx, actionCtx, deviceCtx) {
    if (!util.isObjectEmpty(actionCtx.setTag)
            && (util.isObjectEmpty(actionCtx.ifAllMatch)
                || dataUtil.checkConditions(dataCtx.data, actionCtx.ifAllMatch))) {
        addTags(dataCtx, actionCtx, deviceCtx);
    }
}


/**
 * Applies the tags to the data
 *
 * @private - use for testing only
 *
 * @param {Object} dataCtx             - data context wrapper
 * @param {Object} dataCtx.data        - data to process
 * @param {String} dataCtx.type        - type of data to process
 * @param {Object} deviceCtx           - device context
 * @param {Object} actionCtx           - 'setTag' action to perform on the data
 * @param {Object} actionCtx.setTag    - tag(s) that will be applied
 * @param {Object} actionCtx.locations - where the tags should be applied
 *
 * @returns {void}
 */
function addTags(dataCtx, actionCtx, deviceCtx) {
    const data = dataCtx.data;
    const locations = actionCtx.locations;
    const tags = actionCtx.setTag;

    if (util.isObjectEmpty(locations)) {
        // if no locations provided then try to use set of pre-defined locations from
        // properties.json - like old-style tagging
        if (dataCtx.type === EVENT_TYPES.SYSTEM_POLLER) {
            // Apply tags to default locations (where addKeysByTag is true) for system info
            Object.keys(properties.stats).forEach((statKey) => {
                const items = data[statKey];
                const statProp = systemStatsUtil.renderProperty(deviceCtx, properties.stats[statKey]);
                // tags can be applied to objects only - usually it is collections of objects
                // e.g. Virtual Servers, pools, profiles and etc.
                if (typeof items === 'object'
                        && !util.isObjectEmpty(items)
                        && statProp.normalization
                        && statProp.normalization.find(norm => norm.addKeysByTag)) {
                    Object.keys(items).forEach((itemKey) => {
                        Object.keys(tags).forEach((tagKey) => {
                            addTag(items[itemKey], tagKey, tags[tagKey], itemKey, statProp);
                        });
                    });
                }
            });
        } else {
            // Apply tags to default locations of events (and not iHealth data)
            Object.keys(tags).forEach((tagKey) => {
                addTag(data, tagKey, tags[tagKey], null, properties.events);
            });
        }
    } else {
        const evtProps = dataCtx.type === EVENT_TYPES.SYSTEM_POLLER ? null : properties.events;
        dataUtil.getDeepMatches(data, locations).forEach((match) => {
            Object.keys(tags).forEach((tagKey) => {
                addTag(match.data, tagKey, tags[tagKey], match.key, evtProps);
            });
        });
    }
}

/**
 * Compute tag value
 *
 * @param {Object} data     - The data to be tagged
 * @param {Any}    tagVal   - The tag's value that will be applied
 * @param {String} location - The location to tag the data
 * @param {Object} statProp - The stat's property info, should contain 'addKeysByTag' or
 *                             'classifyByKeys' (see properties.json for more info)
 *
 * @returns {any} tag's value or undefined when unable to compute it
 */
function computeTagValue(data, tagVal, location, statProp) {
    // check is it `A` or `T` or etc.
    if (typeof tagVal === 'string' && properties.definitions[tagVal]) {
        const tagDef = properties.definitions[tagVal];
        // tag value will be computed by the code below.
        // if no match found then tag will not be applied
        tagVal = undefined;
        if (util.isObjectEmpty(statProp) || statProp.normalization) {
            /** Possible cases:
             * 1) new-style tagging - attempt to assign pre-defined tag to specific location.
             * 2) old-style tagging - attempt to assign pre-defined tag to System Poller's data.
             *
             * location - excepted to be VS, pool, profile or etc. name
             */
            const match = normalizeUtil._checkForMatch(location, tagDef.pattern, tagDef.group);
            tagVal = match || undefined;
        } else if (statProp.classifyByKeys) {
            /** Kind like old-style tagging for Event Listener's data but
             * still applicable to new-style tagging too.
             *
             * data - expected to be 'object'
             */
            // need one match only
            statProp.classifyByKeys.some((key) => {
                if (typeof data[key] !== 'undefined') {
                    const match = normalizeUtil._checkForMatch(data[key], tagDef.pattern, tagDef.group);
                    tagVal = match || undefined;
                }
                return typeof tagVal !== 'undefined';
            });
        }
    }
    return tagVal;
}

/**
 * Search for endpoints values in object
 *
 * @param {Object} data                  - the data
 * @param {Function<Object, String, Any} - callback to call when endpoint's value was found
 *
 * @returns {void}
 */
function searchForValues(data, cb) {
    Object.keys(data).forEach((key) => {
        const val = data[key];
        if (typeof val === 'object') {
            searchForValues(val, cb);
        } else {
            cb(data, key, val);
        }
    });
}

/**
 * Adds the tag to the data
 *
 * @private - use for testing only
 *
 * @param {Object} data     - The data to be tagged
 * @param {String} tagKey   - The key of the tag to be applied
 * @param {Any}    tagVal   - The tag's value that will be applied
 * @param {String} location - The location to tag the data
 * @param {Object} statProp - The stat's property info, should contain 'addKeysByTag' or
 *                             'classifyByKeys' (see properties.json for more info)
 */
function addTag(data, tagKey, tagVal, location, statProp) {
    if (typeof tagVal === 'object') {
        tagVal = util.deepCopy(tagVal);
        // recursively inspect object in case if there are tags that should be computed
        searchForValues(tagVal, (_tagItem, _tagKey, _tagValue) => {
            _tagValue = computeTagValue(data, _tagValue, location, statProp);
            if (typeof _tagValue !== 'undefined') {
                // assign newly computed value
                _tagItem[_tagKey] = computeTagValue(data, _tagValue, location, statProp);
            } else {
                // delete tag if no value computed
                delete _tagItem[_tagKey];
            }
        });
    } else {
        tagVal = computeTagValue(data, tagVal, location, statProp);
    }

    if (typeof tagVal !== 'undefined') {
        if (location && typeof data[location] === 'object') {
            data = data[location];
        }
        data[tagKey] = tagVal;
    }
}


module.exports = {
    handleAction
};
