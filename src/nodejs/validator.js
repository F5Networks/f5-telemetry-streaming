/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const Ajv = require('ajv');
const logger = require('./logger.js');
const util = require('./util.js');
const schema = require('./config/schema-main.json');

/**
 * Validate schema
 *
 * @param {Object} obj - object to validate
 *
 * @returns {Object} Promise which is resolved with the validated schema
 */
function validateSchema(obj) {
    // allows defaults assigment
    const ajv = new Ajv({ useDefaults: true });
    const validate = ajv.compile(schema);
    const valid = validate(obj);

    if (!valid) {
        const error = util.stringify(validate.errors);
        logger.error(`validateSchema invalid: ${error}`);
        return Promise.reject(new Error(error));
    }
    return Promise.resolve(obj);
}

module.exports = {
    validateConfig: validateSchema
};
