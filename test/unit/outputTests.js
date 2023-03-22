/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const Ajv = require('ajv');
const fs = require('fs');

const assert = require('./shared/assert');

moduleCache.remember();

describe('Example Output', () => {
    before(() => {
        moduleCache.restore();
    });

    function validateAgainstSchema(data, schema) {
        const ajv = new Ajv({ useDefaults: true });
        const validator = ajv.compile(schema);
        const valid = validator(data);
        if (!valid) {
            return { errors: validator.errors };
        }
        return true;
    }

    // baseDir contains 1+ folders, each of which contain a schema.json and output.json file
    const baseDir = 'examples/output';
    const schemaDir = 'shared/output_schemas';
    const disabledFolders = ['request_logs', 'avr', 'consumers'];

    fs.readdirSync(baseDir).forEach((dir) => {
        if (disabledFolders.indexOf(dir) !== -1) {
            return;
        }

        const schemaFile = `${schemaDir}/${dir}_schema.json`; // example directory name + _schema.json
        const outputFile = `${baseDir}/${dir}/output.json`;

        it(`should validate output in '${baseDir}/${dir}'`, () => {
            const schema = JSON.parse(fs.readFileSync(schemaFile));
            const data = JSON.parse(fs.readFileSync(outputFile));

            const valid = validateAgainstSchema(data, schema);
            if (valid !== true) {
                assert.fail(`output is not valid: ${JSON.stringify(valid.errors)}`);
            }
        });
    });
});
