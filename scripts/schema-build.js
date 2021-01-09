/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');

// const base = require('../src/schema/latest/base_schema.json');

const SCHEMA_DIR = `${__dirname}/../src/schema/latest`;
const outputFile = `${__dirname}/../dist/ts.schema.json`;

const safeTraverse = (pathArray, parentObject) => pathArray.reduce(
    (curObj, curPath) => (typeof curObj !== 'undefined' && typeof curObj[curPath] !== 'undefined' ? curObj[curPath] : undefined),
    parentObject
);

const normalizeReference = (ref, schemaId) => {
    ref = ref.startsWith('#') ? `${schemaId}${ref}` : ref;
    return ref.split('#').join('');
};

const getReferenceValue = (ref, schemaId, schemaMap) => {
    const normalizedRef = normalizeReference(ref, schemaId);
    const refParts = normalizedRef.split('/');
    const definition = safeTraverse(refParts, schemaMap);
    assert.notStrictEqual(definition, undefined, `Unable to dereference '${ref}' from schema with id '${schemaId}'`);
    return {
        definition,
        schemaId: refParts[0]
    };
};

function writeSchema(name, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(name, JSON.stringify(data, null, 2), (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

function combineSchemas() {
    const base = { definitions: {} };
    const schemaMap = {};

    fs.readdirSync(`${SCHEMA_DIR}/`)
        .filter(name => !(name.includes('draft')) && name.endsWith('schema.json'))
        .map(fileName => `${SCHEMA_DIR}/${fileName}`)
        .forEach((path) => {
            const schema = JSON.parse(fs.readFileSync(path, 'utf8'));
            assert.notStrictEqual(schema.$id, undefined, `Schema at path '${path}' should have $id property`);

            if (schema.$id === 'base_schema.json') {
                Object.assign(base, schema);
            }

            schemaMap[schema.$id] = schema;
        });

    Object.keys(schemaMap).forEach((schemaId) => {
        const schema = schemaMap[schemaId];
        if (!schema.allOf) {
            return;
        }

        schema.allOf.forEach((tsClass) => {
            const classType = safeTraverse(['if', 'properties', 'class', 'const'], tsClass);
            if (!classType) {
                return;
            }

            const tmp = {};
            const properties = tsClass.then.properties;

            Object.keys(properties).forEach((propKey) => {
                const prop = properties[propKey];
                // dereference all values
                if (prop.$ref) {
                    properties[propKey] = getReferenceValue(prop.$ref, schemaId, schemaMap).definition;
                } else if (prop.allOf) {
                    properties[propKey] = getReferenceValue(prop.allOf[0].$ref, schemaId, schemaMap).definition;
                } else if (prop.oneOf) {
                    let value;
                    if (propKey === 'systemPoller') {
                        // Telemetry_System -> systemPoller property -> ref to systemPollerObjectRef -> systemPoller
                        value = getReferenceValue(prop.oneOf[1].$ref, schemaId, schemaMap);
                        value = getReferenceValue(value.definition.allOf[1].$ref, value.schemaId, schemaMap).definition;
                    } else if (propKey === 'iHealthPoller') {
                        // Telemetry_System -> iHealthPoller property -> ref to iHealthPollerRef -> iHealthPoller
                        value = getReferenceValue(prop.oneOf[1].$ref, schemaId, schemaMap);
                        value = getReferenceValue(value.definition.allOf[1].$ref, value.schemaId, schemaMap).definition;
                    } else {
                        value = getReferenceValue(prop.oneOf[1].allOf[1].$ref, schemaId, schemaMap).definition;
                    }
                    properties[propKey] = value;
                }
                // inherit default value on top of the definition
                if (prop.$ref || prop.allOf || prop.oneOf) {
                    properties[propKey].default = prop.default;
                }
            });

            tmp[classType] = tsClass.then;
            tmp[classType].description = tsClass.description;
            base.definitions = Object.assign(base.definitions, tmp);
        });
    });
    return writeSchema(outputFile, base);
}

module.exports = {
    combineSchemas
};

if (require.main === module) {
    combineSchemas().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
