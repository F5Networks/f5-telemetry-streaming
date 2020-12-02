/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');

const endpoints = require('../src/lib/paths.json').endpoints;
const stats = require('../src/lib/properties.json').stats;

const outputRst = 'docs/ts-output-reference.rst';
const ENDPOINT_KEY_SEP = '::';


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
    // at first let's add folders
    Object.keys(stats).forEach((statKey) => {
        const statObj = stats[statKey];
        if (statObj.structure && statObj.structure.folder) {
            outData[statKey] = {
                folder: true,
                stats: {}
            };
        }
    });
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
            outData[reducedStatObj.structure.parentKey].stats[statName] = outValue;
        } else {
            outData[statName] = outValue;
        }
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
    const rstLines = [
        '.. _ts-output-reference:\n',
        'Appendix B: Telemetry Streaming Default Output Reference',
        '============================',
        'This page is a reference for the Telemetry Streaming default output generated by **Telemetry_System_Poller**',
        'Please note: this reference document is currently a work in progress.',
        '\n'
    ];
    function asSubTitle(title) {
        return '-'.repeat(title.length);
    }
    function indent(data, num, char) {
        num = num || 0;
        char = char || ' ';
        return splitLines(data).map(line => char.repeat(num) + line).join('\n');
    }
    function _generate(data, parent) {
        const dataKeys = Object.keys(data);
        dataKeys.sort();
        dataKeys.forEach((key) => {
            const value = data[key];
            rstLines.push(key);
            rstLines.push(asSubTitle(key));
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
                    rstLines.push('.. code-block:: json');
                    rstLines.push(indent(':linenos:', spaceIndent));
                    rstLines.push(indent(JSON.stringify(value.body, null, 2), spaceIndent));
                }
            }
            rstLines.push('\n');
        });
    }
    _generate(map);
    return rstLines.join('\n');
}

function main() {
    console.log(`Building ${outputRst} for Reference section`);
    fs.writeFileSync(outputRst, generateRestructuredText(buildMap()));
}

main();
