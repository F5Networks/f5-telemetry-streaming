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

const assert = require('../utils/assert');
const defaultPropertiesConfig = require('../properties.json');
const defaultEndpointsConfig = require('../paths.json');
const miscUtils = require('../utils/misc');
const utils = require('./utils');

/**
 * @module systemPoller/properties
 */

const customEndpointNormalization = [
    {
        renameKeys: {
            patterns: {
                '~': {
                    replaceCharacter: '/',
                    exactMatch: false
                }
            }
        }
    },
    {
        filterKeys: {
            exclude: ['kind', 'selfLink']
        }
    }
];
const defaultTags = { name: { pattern: '(.*)', group: 1 } };

/**
 * Pre-processes Telemetry Context Endpoints and Stats
 *
 * @returns {{ endpoints: [], properties: {} }} preprocessed Telemetry Context Endpoints
 */
function contextProperties() {
    const properties = miscUtils.deepCopy(defaultPropertiesConfig.context);

    Object.entries(properties).forEach(([propertyKey, property]) => {
        property.normalization = makeNormalizationOptions(propertyKey, property, false, {});
    });

    return {
        endpoints: defaultEndpointsConfig.endpoints,
        properties
    };
}

/**
 * Pre-processes custom Telemetry_Endpoints.
 * Pre-processing includes:
 * - Converts SNMP custom endpoint objects to properties
 * - Converts custom endpoint into `property` object
 * - Filter endpoints based on `dataActions` configuration
 *
 * @param {object} endpoints - Telemetry Endpoints object
 * @param {object[]} dataActions - data actions
 *
 * @returns {{ endpoints: [], properties: {} }} preprocessed Telemetry Custom Endpoints
 */
function customEndpoints(endpoints, dataActions) {
    assert.oneOfAssertions(
        () => assert.object(endpoints, 'endpoints'),
        () => assert.emptyObject(endpoints, 'endpoints')
    );
    assert.array(dataActions, 'dataActions');

    const properties = {};
    endpoints = Object.entries(miscUtils.deepCopy(endpoints))
        .map(([name, endpoint]) => {
            assert.bigip.customEndpoint(endpoint, `endpoint[${name}]`);

            const propertyKey = endpoint.name;
            endpoint.name = name; // override name to make endpoint be available for lookup

            if (endpoint.protocol === 'snmp') {
                endpoint.body = {
                    command: 'run',
                    utilCmdArgs: `-c "snmpwalk -L n -O ${endpoint.numericalEnums ? 'e' : ''}QUs -c public localhost ${endpoint.path}"`
                };
                endpoint.path = '/mgmt/tm/util/bash';
            }

            properties[propertyKey] = makePropertyFromCustomEndpoint(name, endpoint);
            properties[propertyKey].normalization = makeNormalizationOptions(
                propertyKey,
                properties[propertyKey],
                true
            );
            return endpoint;
        });

    return {
        endpoints,
        properties: utils.filterStats(properties, dataActions)
    };
}

/**
 * Pre-processes Telemetry Default Endpoints and Stats
 * Pre-processing includes:
 * - Filter endpoints based on `dataActions` configuration
 *
 * @returns {{ endpoints: [], properties: {} }} preprocessed Telemetry Default Endpoints
 */
function defaultProperties({
    contextData = undefined,
    dataActions = undefined,
    includeTMStats = true,
    tags = undefined
}) {
    assert.oneOfAssertions(
        () => assert.object(contextData, 'contextData'),
        () => assert.emptyObject(contextData, 'contextData')
    );
    assert.array(dataActions, 'dataActions');
    assert.boolean(includeTMStats, 'includeTMStats');
    assert.oneOfAssertions(
        () => assert.not.defined(tags, 'tags'),
        () => assert.object(tags, 'tags'),
        () => assert.emptyObject(tags, 'tags')
    );

    // filter and copy reduced amount of data first
    const properties = miscUtils.deepCopy(
        utils.filterStats(defaultPropertiesConfig.stats, dataActions, !includeTMStats)
    );
    Object.entries(properties).forEach(([propertyKey, property]) => {
        property = utils.renderProperty(contextData, property);

        if (property.disabled) {
            delete properties[propertyKey];
            return;
        }

        property.normalization = makeNormalizationOptions(propertyKey, property, false, tags);
    });

    return {
        endpoints: defaultEndpointsConfig.endpoints,
        properties
    };
}

/**
 * Create/update normalization options
 *
 * @param {string} propertyKey
 * @param {object} property
 * @param {boolean} isCustom
 * @param {object} tags
 *
 * @returns {object}
 */
function makeNormalizationOptions(propertyKey, property, isCustom, tags) {
    const result = {
        propertyKey,
        normalization: property.normalization
    };
    const childKey = utils.splitKey(property.key).childKey;
    if (childKey) {
        result.key = childKey;
    }

    if (isCustom) {
        return result;
    }

    const options = {};
    if (property.normalization) {
        const addKeysByTagIsObject = property.normalization.find((n) => n.addKeysByTag && typeof n.addKeysByTag === 'object');

        const filterKeysIndex = property.normalization.findIndex((i) => i.filterKeys);
        if (filterKeysIndex > -1) {
            property.normalization[filterKeysIndex] = {
                filterKeys: [
                    property.normalization[filterKeysIndex].filterKeys,
                    defaultPropertiesConfig.global.filterKeys
                ]
            };
        } else {
            options.filterKeys = [defaultPropertiesConfig.global.filterKeys];
        }

        const renameKeysIndex = property.normalization.findIndex((i) => i.renameKeys);
        if (renameKeysIndex > -1) {
            property.normalization[renameKeysIndex] = {
                renameKeys: [
                    property.normalization[renameKeysIndex].renameKeys,
                    defaultPropertiesConfig.global.renameKeys
                ]
            };
        } else {
            options.renameKeys = [defaultPropertiesConfig.global.renameKeys];
        }

        const addKeysByTagIndex = property.normalization.findIndex((i) => i.addKeysByTag);
        if (addKeysByTagIndex > -1) {
            property.normalization[addKeysByTagIndex] = {
                addKeysByTag: {
                    tags: Object.assign({}, defaultTags, tags),
                    definitions: defaultPropertiesConfig.definitions,
                    opts: addKeysByTagIsObject ? property.normalization[addKeysByTagIndex]
                        .addKeysByTag : defaultPropertiesConfig.global.addKeysByTag
                }
            };
        } else {
            property.normalization.push({
                addKeysByTag: {
                    tags: defaultTags,
                    definitions: defaultPropertiesConfig.definitions,
                    opts: defaultPropertiesConfig.global.addKeysByTag
                }
            });
        }

        property.normalization.push({ formatTimestamps: defaultPropertiesConfig.global.formatTimestamps.keys });
    } else {
        options.filterKeys = [defaultPropertiesConfig.global.filterKeys];
        options.renameKeys = [defaultPropertiesConfig.global.renameKeys];
        options.formatTimestamps = defaultPropertiesConfig.global.formatTimestamps.keys;
        options.addKeysByTag = {
            tags: defaultTags,
            definitions: defaultPropertiesConfig.definitions,
            opts: defaultPropertiesConfig.global.addKeysByTag
        };
    }
    return Object.assign(options, result);
}

/**
 * Converts a Telemetry_Endpoint to a standard property.
 * Only BIG-IP paths currently supported,
 * For e.g. /mgmt/tm/subPath?$select=prop1,prop2
 * (Note that we don't guarantee behavior for all types of query params)
 *
 * @param {string} endpointKey - endpoint key
 * @param {object} endpoint - object to convert
 *
 * @returns {{key: string, isCustom: boolean, normalization: Array}} Converted property
 */
function makePropertyFromCustomEndpoint(endpointKey, endpoint) {
    const normalization = miscUtils.deepCopy(customEndpointNormalization);
    if (endpoint.protocol === 'snmp') {
        normalization.push({
            runFunctions: [{ name: 'restructureSNMPEndpoint', args: {} }]
        });
    }
    const statsIndex = endpoint.path.indexOf('/stats');
    const bigipBasePath = 'mgmt/tm/';
    const baseIndex = endpoint.path.indexOf(bigipBasePath);

    if (statsIndex > -1 && baseIndex > -1) {
        const mgmtTmIndex = endpoint.path.indexOf(bigipBasePath) + bigipBasePath.length;
        const renameKeys = { patterns: {} };
        const pathMatch = endpoint.path.substring(mgmtTmIndex, statsIndex);

        // eslint-disable-next-line no-useless-escape
        renameKeys.patterns[pathMatch] = { pattern: `${pathMatch}\/(.*)`, group: 1 };
        normalization.push({ renameKeys });
    }
    return {
        key: endpointKey,
        normalization
    };
}

module.exports = {
    context: contextProperties,
    custom: customEndpoints,
    default: defaultProperties
};
