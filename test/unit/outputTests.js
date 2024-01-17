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
