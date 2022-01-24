/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const FLOAT_REGEXP_STRICT = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)$/;
const FLOAT_REGEXP = /([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)/;
const ISO_DATE_REGEXP = /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(.[0-9]+)?(Z)?$/;

/**
 * Keys to do not treat as metrics at all
 */
const DEFAULT_METRICS_TO_IGNORE = [];

/**
 * Keys to do not treat as metrics and treat as tags
 * - name - might be 1.1 or 1.x, e.g. see system.networkInterfaces
 * - port - TCP/UDP port and etc.
 */
const DEFAULT_METRICS_TO_TAGS = ['name', 'port'];

/**
 * Keys to do not treat as tags
 * - Capacity - usually is XX% (10%) (system.diskStorage)
 */
const DEFAULT_TAGS_TO_IGNORE = ['Capacity'];

/**
 * Keys to do not treat as tags and treat as metrics
 */
const DEFAULT_TAGS_TO_METRICS = [];

module.exports = {
    /**
     * Inspects payload for metrics and tags
     *
     * Note:
     * - mutates 'tsData' when 'parseMetrics' set to true
     * - user can modify 'tags' object received via 'onTags' callback
     * - names from 'metricsToIgnore' are ignored completely (can't be used as tag)
     * - 'metricsToTags' setting ignores 'metricsToIgnore' and 'tagsToMetrics' settings
     * - 'tagsToIgnore' setting ignores 'metricsToTags'
     * - 'tagsToMetrics' will ignore any units (if exists) and data will not be normalized:
     *      example: e.g. string is 'disk space left 2500Kb only' - it will fetch '2500' and
     *      if next time string will be 'disk space left 4.5mb' - it will fetch '4.5' that
     *      actually is bigger than 2500 (mb > kb) but numbers without units gives us misleading info
     * - 'boolsToMetrics' setting will convert boolean values to metrics. true -> 1 and false -> 0
     *      - booleans will be treated as metrics, and will ignore 'tagsToIgnore' and 'tagsToMetrics'
     *
     * @param {object} tsData - TS data to inspect
     * @param {object} [options] - options
     * @param {boolean} [options.allowIsoDateTag = false] - allow ISO Date be a tag
     * @param {boolean} [options.collectTags = false] - enable tags collection
     * @param {boolean} [options.excludeNameFromPath = false] - exclude name from path
     * @param {number} [options.maxDepth] - max depth to look metrics and tags for
     * @param {Array<string>} [options.metricsToIgnore] - metrics to ignore
     * @param {Array<string>} [options.metricsToTags] - metrics to tags
     * @param {MetricFoundCb} [options.onMetric] - callback to call once metric found
     * @param {TagsFoundCb} [options.onTags] - callback to call once all tags collected for current depth/level
     * @param {boolean} [options.parseMetrics = false] - parse and re-assign metrics
     * @param {Array<string>} [options.tagsToIgnore] - tags to ignore
     * @param {Array<string>} [options.tagsToMetrics] - tags to metrics
     * @param {boolean} [options.boolsToMetrics = false] - whether to convert boolean values to metrics
     *
     * @returns {void} once done with inspecting a data
     */
    findMetricsAndTags(tsData, options) {
        options = options || {};
        // metrics to convert use as tags (no a metric anymore)
        const metricsToTags = options.metricsToTags || DEFAULT_METRICS_TO_TAGS;
        // metrics to ignore + should include metrics that should be used as tags
        const metricsToIgnore = (options.metricsToIgnore || DEFAULT_METRICS_TO_IGNORE).concat(metricsToTags);
        // tags to convert to metrics
        const tagsToMetrics = options.tagsToMetrics || DEFAULT_TAGS_TO_METRICS;
        // tags to ignore + should include tags that should be used as metrics
        const tagsToIgnore = (options.tagsToIgnore || DEFAULT_TAGS_TO_IGNORE).concat(tagsToMetrics);

        (function inner(data, stack) {
            /**
             * NOTE: ALL callbacks should receive COPY of 'stack' to avoid any damage
             */
            const tags = options.collectTags ? {} : undefined;

            // disable/enable check for collection of objects
            let isCollectionOfObjects = !!options.excludeNameFromPath;

            // convert strings to numbers and collect tags (if needed) on first iteration
            Object.keys(data).forEach((itemKey) => {
                const itemData = data[itemKey];
                if (typeof itemData === 'object') {
                    isCollectionOfObjects = isCollectionOfObjects && true;
                    return;
                }
                isCollectionOfObjects = false;
                if (metricsToTags.indexOf(itemKey) === -1) {
                    let parsedVal = itemData;
                    if (typeof parsedVal === 'boolean'
                        && options.boolsToMetrics
                        && metricsToIgnore.indexOf(itemKey) === -1) {
                        data[itemKey] = parsedVal ? 1 : 0;
                        return; // early return, within "if" to stop evaluating 'parsedVal'
                    }
                    if (typeof parsedVal === 'string') {
                        // still have to parse data despite on "options.parseMetrics" value
                        // to differentiate between "metric" and "non-metric" data
                        parsedVal = parseNumberStrict(itemData);
                        if (parsedVal === false && tagsToMetrics.indexOf(itemKey) !== -1) {
                            parsedVal = parseNumber(itemData);
                        }
                    }
                    if (Number.isFinite(parsedVal)) {
                        if (options.parseMetrics && metricsToIgnore.indexOf(itemKey) === -1) {
                            data[itemKey] = parsedVal;
                        }
                        return; // early return, metric was found and converted
                    } // otherwise parsing failed and it can be a used a tag
                }
                if (options.collectTags
                    && tagsToIgnore.indexOf(itemKey) === -1
                    && canBeTag(itemData, options)) {
                    tags[itemKey] = itemData;
                }
            });

            if (options.onTags
                && !isCollectionOfObjects
                && objectHasKeys(tags)) {
                options.onTags(stack.slice(0), tags);
            }

            const ignoreKeysInPath = isCollectionOfObjects && options.excludeNameFromPath;

            // traversing object and reporting metrics (and tags) on second iteration
            Object.keys(data).forEach((itemKey) => {
                const itemData = data[itemKey];
                if (typeof itemData === 'object') {
                    if (!ignoreKeysInPath) {
                        stack.push(itemKey);
                    }
                    if (!options.maxDepth || options.maxDepth < stack.length) {
                        inner(itemData, stack);
                    }
                    if (!ignoreKeysInPath) {
                        stack.pop();
                    }
                } else if (Number.isFinite(itemData)
                    && options.onMetric
                    && metricsToIgnore.indexOf(itemKey) === -1) {
                    options.onMetric(stack.concat(itemKey), itemData, tags);
                }
            });
        }(tsData, []));
    }
};

/**
 * Check if data can be used as a tag
 *
 * @param {any} data - data to check
 * @param {object} options - options
 * @param {boolean} options.allowIsoDateTag - allow ISO Date strings as tag value
 *
 * @returns {boolean} true when data can be used as tag
 */
function canBeTag(data, options) {
    if (typeof data === 'string') {
        if (!data.trim() || (!options.allowIsoDateTag && ISO_DATE_REGEXP.test(data))) {
            return false;
        }
    }
    return true;
}

/**
 * Checks if object has keys
 *
 * Note: this is faster than Object.keys().length
 *
 * @param {object} obj - object to check
 *
 * @returns {boolean} true when object has at least one key
 */
function objectHasKeys(obj) {
    // eslint-disable-next-line guard-for-in, no-restricted-syntax, prefer-const, no-unreachable-loop
    for (let x in obj) {
        return true;
    }
    return false;
}

/**
 * Parses string to integer or float (fetches first number)
 *
 * @param {string} val - string to parse
 *
 * @returns {number | boolean} parsed number or false if unable to parse it
 */
function parseNumber(val) {
    val = val.match(FLOAT_REGEXP);
    if (val) {
        val = parseFloat(val[0]);
        if (typeof val === 'number' && Number.isFinite(val)) {
            return val;
        }
    }
    return false;
}

/**
 * Parses string to integer or float (only digits and '.' allowed)
 *
 * @param {string} val - string to parse
 *
 * @returns {number | boolean} parsed number or false if unable to parse it
 */
function parseNumberStrict(val) {
    if (FLOAT_REGEXP_STRICT.test(val)) {
        val = parseFloat(val);
        if (typeof val === 'number' && Number.isFinite(val)) {
            return val;
        }
    }
    return false;
}

/**
 * @callback MetricFoundCb
 * @param {Array<String>} path - metric path
 * @param {any} value - metric value
 * @param {object} tags - tags
 */
/**
 * @callback TagsFoundCb
 * @param {Array<String>} path - tags path
 * @param {object} tags - all tags for current level
 */
