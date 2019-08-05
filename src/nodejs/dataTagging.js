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
        const matches = getMatches(data, condition);

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
        // locations were provided and will be searched through
        Object.keys(locations).forEach((location) => {
            const matches = getMatches(data, location);

            if (typeof locations[location] !== 'object' && matches.length > 0) {
                // A specific location has been found (value of true) and matches in the data are found
                matches.forEach((match) => {
                    Object.keys(tags).forEach((tag) => {
                        addTag(data, tag, tags, match);
                    });
                });
            } else if (typeof locations[location] === 'object' && matches.length > 0) {
                // The next locations is an object and matches in the data have been found
                matches.forEach((match) => {
                    addTags(data[match], tags, locations[location]);
                });
            } else {
                // No matches for the location key were found in the data
                logger.debug(`The data does not have anything that matches the location ${location}`);
            }
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
                if (data[s]) {
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
            if (matchingKeys) {
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

/**
 * Check to see if a location can be found inside the data. Checks by using location as a literal string and
 * then checks as a regular expression if no results are found from the literal string search.
 *
 * @param {Object} data - The data to check for matches
 * @param {string} location - The location being searched for
 *
 * @returns {Array}
 */
function getMatches(data, location) {
    const matches = [];

    Object.keys(data).forEach((key) => {
        if (key === location) {
            matches.push(key);
        }
    });

    if (matches.length === 0) {
        Object.keys(data).forEach((key) => {
            if (key.match(location)) {
                matches.push(key);
            }
        });
    }

    return matches;
}

module.exports = {
    handleActions,
    addTags,
    checkData,
    getMatches,
    addTag
};
