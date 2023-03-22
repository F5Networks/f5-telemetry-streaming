/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const objectGet = require('lodash/get');
const objectSet = require('lodash/set');

const assert = require('../shared/assert');
const fileLogger = require('../../winstonLogger').logger;
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const configWorker = sourceCode('src/lib/config');

// eslint-disable-next-line no-multi-assign
const _module = module.exports = {
    /**
     * Stub core modules
     *
     * @returns {stubs.CoreStubCtx}
     */
    stubCoreModules() {
        return stubs.default.coreStub();
    },

    /**
     * Declaration Validator
     *
     * @param {any} decl - declaration to validate
     * @param {object} addtlContext - additional context
     *
     * @returns {Promise<any>} resolved with validated declaration
     */
    validate(decl, addtlContext) {
        let options;
        decl = testUtil.deepCopy(decl);
        if (addtlContext) {
            options = addtlContext.options || { expanded: true };
            if (addtlContext.constants) {
                decl.Shared = testUtil.assignDefaults(decl.Shared, {
                    class: 'Shared',
                    constants: {
                        class: 'Constants'
                    }
                });
                decl.Shared.constants = testUtil.assignDefaults(
                    decl.Shared.constants, addtlContext.constants
                );
            }
        }
        // TODO: remove later when logger mock will be updated
        fileLogger.debug('Validating declaration', decl);
        return configWorker.processDeclaration(decl, options)
            .catch((err) => {
                fileLogger.debug('Error caught on attempt to validate declaration', err);
                return Promise.reject(err);
            });
    },

    /**
     * Validate part of declaration with assertion against expected data
     *
     * @param {any} baseDecl - base declaration
     * @param {string | Array<string>} objPath - object' path
     * @param {any} objProps - object's property
     * @param {any} expectedBaseObj - expected object's base
     * @param {any} expectedProps - expected object's properties
     * @param {object} addtlContext - additional context
     *
     * @returns {Promise<any>} resolved with validated declaration
     */
    validatePartOfIt(baseDecl, objPath, objProps, expectedBaseObj, expectedProps, addtlContext) {
        baseDecl = testUtil.deepCopy(baseDecl);
        objectSet(
            baseDecl,
            objPath,
            Object.assign(
                objectGet(
                    baseDecl,
                    objPath
                ),
                testUtil.deepCopy(objProps)
            )
        );
        expectedBaseObj = Object.assign(
            testUtil.deepCopy(expectedBaseObj),
            testUtil.deepCopy(expectedProps)
        );

        return _module.validate(baseDecl, addtlContext)
            .then((validated) => {
                if (expectedProps) {
                    assert.deepStrictEqual(
                        objectGet(validated, objPath),
                        expectedBaseObj,
                        `should match expected declaration for ${objPath}`
                    );
                }

                return objectGet(validated, objPath);
            });
    }
};
