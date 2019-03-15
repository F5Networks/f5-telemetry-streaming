/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');
const fs = require('fs');
const util = require('./shared/util.js');

/* eslint-disable global-require */

describe('Example Output', () => {
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    // baseDir contains 1+ folders, each of which contain a schema.json and output.json file
    const baseDir = `${__dirname}/../examples/output`;
    const schemaDir = `${__dirname}/../shared/output_schemas`;
    const dirs = fs.readdirSync(baseDir);
    dirs.forEach((dir) => {
        const schemaFile = `${schemaDir}/${dir}_schema.json`; // example directory name + _schema.json
        const outputFile = `${baseDir}/${dir}/output.json`;
        it(`should validate output in ${dir}`, () => {
            const schema = JSON.parse(fs.readFileSync(schemaFile));
            const data = JSON.parse(fs.readFileSync(outputFile));

            const valid = util.validateAgainstSchema(data, schema);
            if (valid !== true) {
                assert.fail(`output is not valid: ${JSON.stringify(valid.errors)}`);
            }
        });
    });
});
