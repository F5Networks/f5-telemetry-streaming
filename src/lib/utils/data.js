/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('../logger');
const util = require('./misc');

/**
 * Checks the conditions against the data.
 *
 * @private - use for testing only
 *
 * @param {Object} dataCtx    - complete data context collected from BIG-IP
 * @param {Object} actionCtx  - individual action context
 *
 * @returns {Boolean} True if a condition is met, or if a matching function is not provided.
 */
function checkConditions(dataCtx, actionCtx) {
    let func;
    let condition;

    if (!util.isObjectEmpty(actionCtx.ifAnyMatch)) {
        func = checkAnyMatches;
        condition = actionCtx.ifAnyMatch;
    }
    if (!util.isObjectEmpty(actionCtx.ifAllMatch)) {
        func = checkAllMatches;
        condition = actionCtx.ifAllMatch;
    }
    if (func) {
        return util.isObjectEmpty(dataCtx.data) ? false : func(dataCtx.data, condition);
    }
    return true;
}

function checkAnyMatches(data, matchObjects) {
    // Use 'Array.prototype.some' to check whether at least 1 condition is true
    return matchObjects.some(conditions => checkAllMatches(data, conditions));
}

function checkAllMatches(data, conditions) {
    // Use 'Array.prototype.every' to check whether every condition is true
    return Object.keys(conditions).every((conditionKey) => {
        const matches = getMatches(data, conditionKey);

        if (matches.length === 0) {
            logger.debug(`No matches were found for "${conditionKey}"`);
            return false;
        }

        const conditionVals = conditions[conditionKey];

        if (typeof conditionVals !== 'object') {
            return matches.every(match => checkScalarValue(data[match], conditionVals));
        }

        if (Array.isArray(conditionVals)) {
            return matches.every((match) => {
                const dataMatch = data[match];
                // If conditionVals is array, dataMatch must also be an array for matching to occur.
                if (!Array.isArray(dataMatch) && dataMatch.length !== conditionVals.length) {
                    return false;
                }

                // Arrays have no order guarantee; sort both, then compare each array item
                dataMatch.sort();
                conditionVals.sort();
                return conditionVals.every((conditionVal, index) => checkScalarValue(dataMatch[index], conditionVal));
            });
        }

        // the next condition is an object (and not array); do recursion and matches for the key have been found
        return matches.every(match => checkAllMatches(data[match], conditionVals));
    });
}

function checkScalarValue(data, condition) {
    // Perform easiest strict equality (===) comparison (before type conversion or regex)
    // Perform this check first, since we may have null === null, which should evaluate true
    if (data === condition) {
        return true;
    }
    // Function only performs matching on scalar values against scalar values
    if (typeof data === 'object' || typeof condition === 'object') {
        return false;
    }

    // 'data' and 'condition' are simple scalars - but not strictly equal (different type, or requires regex)
    try {
        // Force each to be strings for later comparison
        condition = condition.toString();
        data = data.toString();

        // Perform another strict equality (which will be more performant than a regex match),
        // with types converted to strings, before attempting regex match.
        return data === condition || data.match(condition);
    } catch (err) {
        // Possible to have invalid regex - catch and log error. Return false. Matching unsuccessful.
        if (err instanceof SyntaxError) {
            logger.exception(`checkScalarValue error (data = "${data}" condition = "${condition}")`, err);
            return false;
        }
        throw err;
    }
}

/**
 * Check to see if a property can be found inside the data. Checks by using property as a literal string and
 * then checks as a regular expression if no results are found from the literal string search.
 *
 * @param {Object || Array} data - The data to check for matches
 * @param {string} property      - The property being searched for
 * @param {Boolean} propAsKey    - if true then check property (string) against data key (regex)
 *                                 else check property (regex) against data key (string)
 *
 * @returns {Array}
 */
function getMatches(data, property, propAsKey) {
    // let's try direct access to the property
    // it works both for Arrays and Objects)
    if (Object.prototype.hasOwnProperty.call(data, property)) {
        return [property];
    }
    const checkFx = propAsKey ? (key => property.match(key)) : (key => key.match(property));
    return Object.keys(data).filter(checkFx);
}

/**
 * Traverses the data object and searches for matches based on the match object and its structure.
 *
 * @param {Object}  data        - The data to search for matching properties in
 * @param {Object}  matchObj    - The property structure to match against in the data object
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

/**
 * Traverses the data object and searches for matches based on
 * the match object and its structure. Search is not strict,
 * callback will be call on any match on any depth.
 * Completely ignores any values, tries to find matched keys only.
 *
 * Example 1:
 * data object is { a: { b: { c: {} } } }
 * matchObj object is { a: { b: { d: { } } } }
 *
 * callback will be call for 'a' and 'b'.
 *
 * Example 2:
 * data object is { a: { b: { c: 'value' } } }
 * matchObj object is { a: { b: { c: 'anotherValue' } } }
 *
 * callback will be call for 'a', 'b' and 'c' (despite on different values).
 *
 * @param {Object} data                 - The data to search for matching properties in
 * @param {Object} matchObj             - The property structure to match against in the data object
 * @param {Function<String, Object>} cb - The callback function to call when match found.
 *      Optional: callback can return string - the key to use to traverse the data object.
 *
 * @returns {void}
 */
function searchAnyMatches(data, matchObj, cb) {
    if (Array.isArray(matchObj)) {
        matchObj.forEach(matchItem => searchAnyMatches(data, matchItem, cb));
    } else {
        Object.keys(matchObj).forEach((matchKey) => {
            getMatches(data, matchKey).forEach((key) => {
                let item = data[key];
                const nextMatchObj = matchObj[matchKey];
                const nestedKey = cb(key, item);
                if (nestedKey) {
                    item = item[nestedKey];
                }
                if (typeof item === 'object' && typeof nextMatchObj === 'object') {
                    searchAnyMatches(item, nextMatchObj, cb);
                }
            });
        });
    }
}

/**
 * Traverses the data object and removes matches based on
 * the match object and its structure. Search is strict,
 * callback will be call on any match on any depth.
 * Completely ignores any values, tries to find matched keys only.
 *
 * Note:
 *  - array will not be re-indexed if item was removed from it.
 *  - data will be modified in place - make a copy (if need) before passing to this function.
 *
 * Example 1:
 * data object is { a: { b: { c: {} } } }
 * matchObj object is { a: { b: { d: { } } } }
 *
 * callback will not be call
 *
 * Example 2:
 * data object is { a: { b: { c: 'value' } } }
 * matchObj object is { a: { b: { c: 'anotherValue' } } }
 *
 * callback will be call in following order:
 * - 'c'
 * - 'b' if no nested objects left
 * - 'a' if no nested objects left
 *
 * @param {Object} data     - The data to search for matching properties in
 * @param {Object} matchObj - The property structure to match against in the data object
 * @param {Function<String, Object, Boolean>} [cb] - The callback function to call when match found.
 *      Callback arguments: matchName, matchObject, getNestedKey.
 *      Callback should return following: the key to access nested data if getNestedKey is true,
 *      otherwise it should return true (object will be removed) or false.
 *
 * @returns {void}
 */
function removeStrictMatches(data, matchObj, cb) {
    let wasDataRemoved = false;
    Object.keys(matchObj).forEach((matchKey) => {
        getMatches(data, matchKey).forEach((key) => {
            const item = data[key];
            const nestedKey = cb ? cb(key, item, true) : null;
            const nestedData = nestedKey ? item[nestedKey] : item;
            let nextMatchObj = matchObj[matchKey];
            let isMatch = false;
            let hasNested = false;

            if (typeof nextMatchObj !== 'object' || Object.keys(nextMatchObj).length === 0) {
                nextMatchObj = { '.*': true };
                isMatch = true;
            }
            if (typeof nestedData === 'object') {
                wasDataRemoved = removeStrictMatches(nestedData, nextMatchObj, cb) || wasDataRemoved;
                hasNested = Object.keys(nestedData).length > 0;
            }
            if (isMatch && !hasNested && (!cb || cb(key, item, false))) {
                wasDataRemoved = true;
                delete data[key];
            }
        });
    });
    return wasDataRemoved;
}

/**
 * Traverses the data object and removes data that not matches
 * the match object and its structure. Search is strict,
 * callback will be call on any non-match on any depth.
 * Completely ignores any values, tries to find not matched keys only.
 *
 * Note:
 *  - array will not be re-indexed if item was removed from it.
 *  - data will be modified in place - make a copy (if need) before passing to this function.
 *
 * Example 1:
 * data object is { a: { b: { c: {} } } }
 * matchObj object is { a: { b: { d: { } } } }
 *
 * callback will be call for 'c'
 *
 * Example 2:
 * data object is { a: { b: { c: 'value' } } }
 * matchObj object is { a: { b: { c: 'anotherValue' } } }
 *
 * callback will not be call
 *
 * Example 3:
 * data object is { a: { b: { c: 'value' } } }
 * matchObj object is { a: { f: { } } }
 *
 * callback will be call for 'c' and 'b'
 *
 * @param {Object} data      - The data to search for matching properties in
 * @param {Object} matchObj  - The property structure to match against in the data object
 * @param {Boolean} [strict] - if true then keep only full matches (entire path should match)
 *      else keep partial matches too (only parent object matched - then keep parent).
 * @param {Function<String, Object, Boolean>} [cb] - The callback function to call when match found.
 *      Callback arguments: matchName, matchObject, getNestedKey.
 *      Callback should return following: the key to access nested data if getNestedKey is true,
 *      otherwise it should return true (object will be removed) or false.
 *
 * @returns {void}
 */
function preserveStrictMatches(data, matchObj, strict, cb) {
    const hasParentMatch = arguments.length === 5 ? arguments[arguments.length - 1] : true;
    let wasDataPreserved = false;

    Object.keys(data).forEach((key) => {
        const item = data[key];
        const nestedKey = cb ? cb(key, item, true) : null;
        const nestedData = nestedKey ? item[nestedKey] : item;
        const matchObjects = getMatches(matchObj, key, true);
        let isMatch = hasParentMatch && matchObjects.length > 0;
        let hasNested = false;
        let nextMatchObj;

        if (isMatch) {
            nextMatchObj = matchObj[matchObjects[0]];
        }
        if (typeof nextMatchObj !== 'object' || Object.keys(nextMatchObj).length === 0) {
            if (isMatch) {
                // if it is match and no more matchObj - then there is no sense to go deep,
                // all nested data should be kept.
                nextMatchObj = null;
            } else {
                // traverse all nested data
                nextMatchObj = { '.*': true };
            }
        }
        if (nextMatchObj) {
            if (typeof nestedData === 'object') {
                const _wasDataPreserved = preserveStrictMatches(nestedData, nextMatchObj, strict, cb, isMatch);
                hasNested = Object.keys(nestedData).length > 0;
                if (strict) {
                    isMatch = isMatch && _wasDataPreserved;
                }
            } else if (strict) {
                // if nestedData is scalar value then it is invalid match
                isMatch = false;
                hasNested = false;
            }
        }
        if (!isMatch && !hasNested && (!cb || cb(key, item, false))) {
            delete data[key];
        } else {
            wasDataPreserved = true;
        }
    });
    return wasDataPreserved;
}

module.exports = {
    checkConditions,
    getMatches,
    getDeepMatches,
    searchAnyMatches,
    removeStrictMatches,
    preserveStrictMatches
};
