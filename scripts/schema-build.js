/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');

// const base = require('../src/nodejs/schema/base_schema.json');

const SCHEMA_DIR = `${__dirname}/../src/nodejs/schema`;
const outputFile = '../../../dist/ts.schema.json';

const safeTraverse = (p, o) => p.reduce((xs, x) => (xs && xs[x] ? xs[x] : null), o);

function writeSchema(name, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(`${SCHEMA_DIR}/${name}`, JSON.stringify(data, null, 2), (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}

function combineSchemas() {
    const paths = fs.readdirSync(`${SCHEMA_DIR}/`)
        .filter(name => !(name.includes('draft')) && name.endsWith('schema.json'))
        .map(fileName => `${SCHEMA_DIR}/${fileName}`);

    const base = { definitions: {} };
    const contents = [];
    const defs = {};

    paths.forEach((path) => {
        const content = JSON.parse(fs.readFileSync(path, 'utf8'));
        contents.push(content);
        if (content.definitions) {
            Object.assign(defs, content.definitions);
        }
    });

    contents.forEach((content) => {
        if (content.allOf) {
            content.allOf.forEach((tsClass) => {
                const classType = safeTraverse(['if', 'properties', 'class', 'const'], tsClass);

                if (classType) {
                    const tmp = {};
                    const propKeys = Object.keys(tsClass.then.properties);
                    propKeys.forEach((propKey) => {
                        const prop = tsClass.then.properties[propKey];

                        // dereference all values
                        const ref = prop.$ref;
                        if (ref) {
                            const def = ref.split('/').pop();
                            tsClass.then.properties[propKey] = defs[def];
                        } else if (prop.allOf) {
                            const def = prop.allOf[0].$ref.split('/').pop();
                            tsClass.then.properties[propKey] = defs[def];
                        } else if (prop.oneOf) {
                            const def = prop.oneOf[1].allOf[1].$ref.split('/').pop();
                            tsClass.then.properties[propKey] = defs[def];
                        }

                        // inherit default value on top of the definition
                        if (prop.$ref || prop.allOf || prop.oneOf) {
                            tsClass.then.properties[propKey].default = prop.default;
                        }
                    });

                    tmp[classType] = tsClass.then;
                    tmp[classType].description = tsClass.description;
                    base.definitions = Object.assign(base.definitions, tmp);
                }
            });
        }
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
