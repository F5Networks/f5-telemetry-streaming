/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const properties = require('./config/properties.json');
const logger = require('./logger.js');
const normalizeUtil = require('./normalizeUtil');
const dataUtil = require('./dataUtil.js');

/**
 * Performs actions on the data
 *
 * @param {Object} data - data to process
 * @param {Array} actions - actions to perfrom on the data
 */
function handleActions(data, actions) {
    actions.forEach((action) => {
        if (action.enable && action.setTag) {
            if (typeof action.ifAllMatch === 'undefined' || checkData(data, action.ifAllMatch)) {
                addTags(data, action.setTag, action.locations);
            }
        }
    });
}

/**
 * Checks the conditions against the data
 *
 * @param {Object} data - The data to check
 * @param {Object} conditions - The conditions to check against the data
 * @param {Array} conditionMatches - Will be given false if something doens't match
 *
 * @returns {Boolean}
 */
function checkData(data, conditions, conditionMatches) {
    conditionMatches = conditionMatches || [];
    Object.keys(conditions).forEach((condition) => {
        const matches = dataUtil.getMatches(data, condition);

        if (typeof conditions[condition] !== 'object' && matches.length > 0) {
            // The condition to check is not an object and matches have been found in the data
            matches.forEach((match) => {
                if (data[match] !== conditions[condition]
                    && !data[match].toString().match(conditions[condition].toString())) {
                    conditionMatches.push(false);
                }
            });
        } else if (typeof conditions[condition] === 'object' && matches.length > 0) {
            // The next condition is an object so we do recursion and matches for the key have been found
            matches.forEach((match) => {
                checkData(data[match], conditions[condition], conditionMatches);
            });
        } else {
            // No matches were found so the condition was not met
            conditionMatches.push(false);
            logger.debug(`No matches were found for ${condition}`);
        }
    });
    return conditionMatches.indexOf(false) === -1;
}

/**
 * Applies the tags to the data
 *
 * @param {Object} data - The data to be tagged
 * @param {Object} tags - The tags to apply to the data
 * @param {Object} locations - The locations to apply tags to
 */
function addTags(data, tags, locations) {
    if (!locations) {
        if (data.telemetryEventCategory === 'systemInfo') {
            // Apply tags to default locations (where addKeysByTag is true) for system info
            Object.keys(properties.stats).forEach((stat) => {
                if (properties.stats[stat].addKeysByTag && data[stat] && typeof data[stat] === 'object') {
                    Object.keys(data[stat]).forEach((item) => {
                        Object.keys(tags).forEach((tag) => {
                            addTag(data, tag, tags, item, stat);
                        });
                    });
                }
            });
        } else {
            // Apply tags to default locations of events
            Object.keys(tags).forEach((tag) => {
                addTag(data, tag, tags);
            });
        }
    } else {
        dataUtil.getDeepMatches(data, locations).forEach((match) => {
            Object.keys(tags).forEach((tag) => {
                addTag(match.data, tag, tags, match.key);
            });
        });
    }
}

/**
 * Adds the tag to the data
 *
 * @param {Object} data - The data to be tagged
 * @param {String} tag - The key of the tag to be applied
 * @param {Object} tags - The tags that will be applied
 * @param {String} location - The location to tag the data
 * @param {String} stat - The stat that will be tagged in the data
 */
function addTag(data, tag, tags, location, stat) {
    if (properties.definitions[tags[tag]]) {
        const def = properties.definitions[tags[tag]];
        if (data.telemetryEventCategory === 'systemInfo') {
            // Apply tag to system info default locations (when addKeysByTag is true)
            const stats = Object.keys(properties.stats).filter(key => properties.stats[key].addKeysByTag);
            stats.forEach((s) => {
                if (typeof data[s] !== 'undefined') {
                    Object.keys(data[s]).forEach((item) => {
                        const match = normalizeUtil._checkForMatch(item, def.pattern, def.group);
                        if (match) {
                            data[s][item][tag] = match;
                        }
                    });
                }
            });
        } else {
            // Apply properties.definitions tags to events that have a key from classifyByKeys
            const matchingKeys = properties.events.classifyByKeys.filter(key => Object.keys(data).indexOf(key) > -1);
            if (matchingKeys.length) {
                const match = normalizeUtil._checkForMatch(data[matchingKeys[0]], def.pattern, def.group);
                if (match) {
                    data[tag] = match;
                }
            }
        }
    } else if (!location) {
        // No location was provided so the tag is applied at the base of the data
        data[tag] = tags[tag];
    } else if (location && !stat) {
        // A location to apply the tag was provided
        data[location][tag] = tags[tag];
    } else {
        // A particular stat along with an item inside that stat are provided to be tagged
        data[stat][location][tag] = tags[tag];
    }
}

module.exports = {
    handleActions,
    addTags,
    checkData,
    addTag
};
