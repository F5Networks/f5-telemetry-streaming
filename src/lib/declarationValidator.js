/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const Ajv = require('ajv');
const ajvKeywords = require('ajv-keywords');

const CLASSES = require('./constants').CONFIG_CLASSES;
const customKeywords = require('./customKeywords');
const util = require('./utils/misc');

const actionsSchema = require('../schema/latest/actions_schema.json');
const baseSchema = require('../schema/latest/base_schema.json');
const consumerSchema = require('../schema/latest/consumer_schema.json');
const controlsSchema = require('../schema/latest/controls_schema.json');
const endpointsSchema = require('../schema/latest/endpoints_schema.json');
const iHealthPollerSchema = require('../schema/latest/ihealth_poller_schema.json');
const listenerSchema = require('../schema/latest/listener_schema.json');
const namespaceSchema = require('../schema/latest/namespace_schema.json');
const pullConsumerSchema = require('../schema/latest/pull_consumer_schema.json');
const sharedSchema = require('../schema/latest/shared_schema.json');
const systemPollerSchema = require('../schema/latest/system_poller_schema.json');
const systemSchema = require('../schema/latest/system_schema.json');


/**
 * Process errors
 *
 * @param {Array} errors - array of errors
 *
 * @returns {Array<Object} array of processed errors
 */
function processErrors(errors) {
    const errorsResp = [];
    errors.forEach((parentError) => {
        if (parentError instanceof Ajv.ValidationError) {
            parentError.errors.forEach((childError) => {
                errorsResp.push({
                    keyword: childError.keyword,
                    propertyName: childError.propertyName,
                    dataPath: childError.dataPath,
                    schemaPath: childError.schemaPath,
                    params: childError.params,
                    message: childError.message
                });
            });
        } else {
            errorsResp.push(parentError);
        }
    });
    return errorsResp;
}

module.exports = {
    /**
     * Pre-compile schema
     *
     * @returns {SchemaValidatorFunctions} AJV validator functions
     */
    getValidators() {
        const schemas = {
            actions: actionsSchema,
            base: baseSchema,
            consumer: consumerSchema,
            pullConsumer: pullConsumerSchema,
            controls: controlsSchema,
            endpoints: endpointsSchema,
            namespaces: namespaceSchema,
            iHealthPoller: iHealthPollerSchema,
            listener: listenerSchema,
            shared: sharedSchema,
            system: systemSchema,
            systemPoller: systemPollerSchema
        };
        const ajvOptions = {
            coerceTypes: true,
            extendRefs: true,
            jsonPointers: true,
            passContext: true,
            useDefaults: true
        };
        const ajv = new Ajv(ajvOptions);
        ajvKeywords(ajv, [
            'uniqueItemProperties'
        ]);
        // add schemas
        Object.keys(schemas).forEach((k) => {
            // ignore base, that will be added later
            if (k !== 'base') {
                ajv.addSchema(schemas[k]);
            }
        });
        // add keywords
        Object.keys(customKeywords.keywords).forEach((k) => {
            ajv.addKeyword(k, customKeywords.keywords[k]);
        });
        const validators = {
            full: ajv.compile(schemas.base)
        };
        // retrieve previously compiled schema
        validators[CLASSES.NAMESPACE_CLASS_NAME] = ajv.getSchema(`${namespaceSchema.$id}#/definitions/namespace`);
        return validators;
    },

    /**
     * Validate data
     *
     * @param {Object} validator - validator
     * @param {Object} data - data to validate
     * @param {Object} [additionalContext] - additional context to pass to validator
     *
     * @returns {Promise} resolved with validated data
     */
    validate(validator, data, additionalContext) {
        let errors;
        const context = { deferred: {} };
        Object.assign(context, additionalContext || {});

        try {
            validator.call(context, data);
        } catch (err) {
            errors = [err];
        }
        if (!errors && validator.errors) {
            errors = validator.errors;
        }

        if (errors) {
            return Promise.reject(new Error(util.stringify(processErrors(errors))));
        }
        if (Object.keys(context.deferred).length === 0) {
            return Promise.resolve(data);
        }

        errors = [];
        const deferred = context.deferred;
        const safeWrapper = promiseFn => promiseFn().catch(e => errors.push(e));

        const processDeferred = (idx) => {
            if (idx >= customKeywords.asyncOrder.length) {
                return Promise.resolve();
            }
            const promises = [];
            const keywords = customKeywords.asyncOrder[idx];
            keywords.forEach((keyword) => {
                if (deferred[keyword]) {
                    deferred[keyword].forEach((deferredFn) => {
                        promises.push(safeWrapper(deferredFn));
                    });
                }
            });
            return Promise.all(promises)
                .then(() => {
                    if (errors.length) {
                        return Promise.reject(new Error(util.stringify(processErrors(errors))));
                    }
                    return processDeferred(idx + 1);
                });
        };
        return processDeferred(0)
            .then(() => Promise.resolve(data));
    }
};

/**
 * @typedef SchemaValidatorFunctions
 * @type {Object}
 * @property {Function} full - validator to validate entire declaration
 * @property {Function} Telemetry_Namespace - validator to validate Telemetry_Namespace object only
 */
