/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');
const fs = require('fs');
const Ajv = require('ajv');

/* eslint-disable global-require */

describe('Example Output', () => {
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    // baseDir contains 1+ folders, each of which contain a schema.json and output.json file
    const baseDir = `${__dirname}/../examples/output`;
    const dirs = fs.readdirSync(baseDir);
    dirs.forEach((dir) => {
        const schemaFile = `${baseDir}/${dir}/schema.json`;
        const outputFile = `${baseDir}/${dir}/output.json`;
        it(`should validate output in ${dir}`, () => {
            const schema = JSON.parse(fs.readFileSync(schemaFile));
            const data = JSON.parse(fs.readFileSync(outputFile));

            // add all keys in 'properties' to the 'required' key array
            Object.keys(schema.properties).forEach((k) => {
                schema.required.push(k);
            });

            const ajv = new Ajv({ useDefaults: true });
            const validator = ajv.compile(schema);

            const valid = validator(data);
            if (!valid) {
                assert.fail(`output is not valid: ${JSON.stringify(validator.errors)}`);
            }
        });
    });
});
