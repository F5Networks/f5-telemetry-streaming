/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js');

/**
 * Check to see if a property can be found inside the data. Checks by using property as a literal string and
 * then checks as a regular expression if no results are found from the literal string search.
 *
 * @param {Object} data - The data to check for matches
 * @param {string} property - The property being searched for
 *
 * @returns {Array}
 */
function getMatches(data, property) {
    const matches = [];

    Object.keys(data).forEach((key) => {
        if (key === property) {
            matches.push(key);
        }
    });

    if (matches.length === 0) {
        Object.keys(data).forEach((key) => {
            if (key.match(property)) {
                matches.push(key);
            }
        });
    }

    return matches;
}

/**
 * Traverses the data object and searches for matches based on the match object and its structure.
 *
 * @param {Object} data - The data to search for matching properties in
 * @param {Object} matchObj - The property structure to match against in the data object
 *
 * @returns {Array} - Array of objects that contain the parent data object and key of each successful match
 */
function getDeepMatches(data, matchObj) {
    let deepMatches = [];

    // properties were provided and will be searched through
    Object.keys(matchObj).forEach((key) => {
        const matches = getMatches(data, key);

        if (typeof matchObj[key] !== 'object' && matches.length > 0) {
            // A specific property has been found (value of true) and matches in the data are found
            matches.forEach((match) => {
                deepMatches.push({
                    data,
                    key: match
                });
            });
        } else if (typeof matchObj[key] === 'object' && matches.length > 0) {
            // The next property is an object and matches in the data have been found
            matches.forEach((match) => {
                deepMatches = deepMatches.concat(getDeepMatches(data[match], matchObj[key]));
            });
        } else {
            // No matches for the property key were found in the data
            logger.debug(`The data does not have anything that matches the property key ${key}`);
        }
    });

    return deepMatches;
}

module.exports = {
    getMatches,
    getDeepMatches
};
