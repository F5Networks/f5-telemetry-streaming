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

const fs = require('fs');

const endpoints = require('../src/lib/paths.json').endpoints;
const stats = require('../src/lib/properties.json').stats;

const ENDPOINT_KEY_SEP = '::';
const IGNORE_PROPERTIES = ['tmstats'];
const OUTPUT_RST_FILE = 'docs/poller-default-output-reference.rst';

/**
 * Split data into line
 *
 * @param {String} data - data to split
 *
 * @returns {Array<String>} lines
 */
function splitLines(data) {
    return data.split(/\r\n|\r|\n/);
}

/**
 * Deep copy of object
 *
 * @param {Any} obj
 *
 * @returns {Any} deep copy
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Find endpoint by property name
 *
 * @param {String} statKey
 *
 * @returns {Object} endpoint
 * @throws {Error} when unable to find endpoint
 */
function findEndpoint(statKey) {
    let findCb;
    const endpointKey = statKey.split(ENDPOINT_KEY_SEP)[0];
    if (endpointKey.startsWith('/')) {
        findCb = item => item.path === endpointKey;
    } else {
        findCb = item => item.name === endpointKey;
    }
    const endpoint = endpoints.find(findCb);
    if (!endpoint) {
        throw new Error(`Unable to find endpoint for property with key - ${statKey}`);
    }
    return endpoint;
}

/**
 * Replace variables in body with values
 *
 * @param {Object|String} body - request body
 * @param {Object} keys        - keys/vars to replace
 *
 * @returns {Object|String}
 */
function replaceBodyVars(body, keys) {
    let isObject = false;
    if (typeof body !== 'string') {
        isObject = true;
        body = JSON.stringify(body);
    }
    Object.keys(keys).forEach((key) => {
        body = body.replace(new RegExp(key), keys[key]);
    });
    if (isObject) {
        body = JSON.parse(body);
    }
    return body;
}

/**
 * Remove any conditional props and move nested data on top
 *
 * @property {Object} statObj
 *
 * @returns {Object}
 */
function reduceConditionals(statObj) {
    if (typeof statObj.if !== 'undefined') {
        if (statObj.then) {
            Object.assign(statObj, reduceConditionals(statObj.then));
        }
        if (statObj.else) {
            Object.assign(statObj, reduceConditionals(statObj.else));
        }
    }
    return statObj;
}

/**
 * Build stats map
 */
function buildMap() {
    const outData = {};
    // time to add other stats
    Object.keys(stats).forEach((statName) => {
        const reducedStatObj = reduceConditionals(deepClone(stats[statName]));
        if (reducedStatObj.structure && reducedStatObj.structure.folder) {
            // skip folders
            return;
        }
        const outValue = {};
        if (reducedStatObj.key) {
            const endpoint = findEndpoint(reducedStatObj.key);
            outValue.httpMethod = 'GET';
            outValue.endpoint = endpoint.path;
            if (typeof endpoint.body !== 'undefined') {
                outValue.httpMethod = 'POST';
                outValue.body = deepClone(endpoint.body);
            }
            if (typeof reducedStatObj.keyArgs !== 'undefined') {
                outValue.body = replaceBodyVars(outValue.body, reducedStatObj.keyArgs.replaceStrings);
            }
            const keyParts = reducedStatObj.key.split(ENDPOINT_KEY_SEP);
            if (keyParts.length > 1) {
                outValue.property = keyParts.slice(1).join(' -> ');
            }
        }
        if (reducedStatObj.structure && reducedStatObj.structure.parentKey) {
            if (typeof outData[reducedStatObj.structure.parentKey] === 'undefined') {
                outData[reducedStatObj.structure.parentKey] = {
                    folder: true,
                    stats: {}
                };
            }
            outData[reducedStatObj.structure.parentKey].stats[statName] = outValue;
        } else {
            outData[statName] = outValue;
        }
    });
    IGNORE_PROPERTIES.forEach((key) => {
        delete outData[key];
    });
    return outData;
}

/**
 * Generate markdown
 *
 * @param {Object} map - stats map
 * @param {Integer} level - depth level
 *
 * @returns {String} markdown document
 */
// eslint-disable-next-line no-unused-vars
function generateMarkdown(map, level) {
    if (arguments.length < 2) {
        level = 2;
    }
    const mdLines = [];
    const mapKeys = Object.keys(map);
    mapKeys.sort();

    mapKeys.forEach((key) => {
        const value = map[key];
        mdLines.push(`${'#'.repeat(level)} ${key}`);
        if (value.folder) {
            mdLines.push(generateMarkdown(value.stats, level + 1));
        } else {
            mdLines.push(`Endpoint: ${value.endpoint}`);
            mdLines.push(`HTTP method: ${value.httpMethod}`);
            if (value.property) {
                mdLines.push(`Property: ${value.property}`);
            }
            if (value.body) {
                mdLines.push(`Body: \n\`\`\`json\n${JSON.stringify(value.body, null, 2)}\n\`\`\``);
            }
            mdLines.push('\n');
        }
    });
    return mdLines.join('\n');
}

/**
 * Generate RST document
 *
 * @param {Object} map - stats map
 *
 * @returns {String} restructured text document
 */
function generateRestructuredText(map) {
    function asTitle(title) {
        return '='.repeat(title.length);
    }
    function asSubTitle(title) {
        return '-'.repeat(title.length);
    }
    function asSmallTitle(title) {
        return '`'.repeat(title.length);
    }
    function indent(data, num, char) {
        num = num || 0;
        char = char || ' ';
        return splitLines(data).map(line => char.repeat(num) + line).join('\n');
    }
    const mainTitle = 'Appendix B: Telemetry Streaming Default Output Reference';
    const rstLines = [
        '.. _poller-default-output-reference:\n',
        mainTitle,
        asTitle(mainTitle),
        'This page is a reference for the Telemetry Streaming default output generated by the **Telemetry_System_Poller**.',
        'Note: This reference document is currently a work in progress.',
        ''
    ];
    function _generate(data, parent) {
        const dataKeys = Object.keys(data);
        dataKeys.sort();
        dataKeys.forEach((key) => {
            const value = data[key];
            rstLines.push(key);
            if (parent) {
                rstLines.push(asSmallTitle(key));
            } else {
                rstLines.push(asSubTitle(key));
            }
            if (value.folder) {
                _generate(value.stats, key);
            } else {
                if (parent) {
                    rstLines.push(`:Parent: \`${parent}\`_`);
                }
                rstLines.push(`:Endpoint: ${value.endpoint}`);
                rstLines.push(`:HTTP Method: ${value.httpMethod}`);
                if (value.property) {
                    rstLines.push(`:Property: ${value.property}`);
                }
                if (value.body) {
                    const spaceIndent = 3;
                    rstLines.push(':Body:');
                    rstLines.push(indent('.. code-block:: json', spaceIndent));
                    rstLines.push(indent(':linenos:', spaceIndent * 2));
                    rstLines.push('');
                    rstLines.push(indent(JSON.stringify(value.body, null, 2), spaceIndent * 2));
                }
            }
            rstLines.push('');
        });
    }
    _generate(map);
    return rstLines.join('\n');
}

function main() {
    // eslint-disable-next-line no-console
    console.log(`Building ${OUTPUT_RST_FILE} for Reference section`);
    fs.writeFileSync(OUTPUT_RST_FILE, generateRestructuredText(buildMap()));
}

main();
