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

const objectGet = require('lodash/get');
const objectSet = require('lodash/set');

const assert = require('../shared/assert');
const fileLogger = require('../../winstonLogger').logger;
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const srcAssert = sourceCode('src/lib/utils/assert');
const configWorker = sourceCode('src/lib/config');
const constants = sourceCode('src/lib/constants');

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
            .then((ret) => {
                const components = configWorker.currentConfig.components;
                assert.isDefined(components);

                components.forEach((comp) => {
                    if (comp.class === constants.CONFIG_CLASSES.IHEALTH_POLLER_CLASS_NAME) {
                        srcAssert.config.ihealthPoller(comp, 'iHealth Poller Component');
                    }
                    if (comp.class === constants.CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME) {
                        srcAssert.config.systemPoller(comp, 'System Poller Component');
                    }
                    if (comp.class === constants.CONFIG_CLASSES.PULL_CONSUMER_SYSTEM_POLLER_GROUP_CLASS_NAME) {
                        srcAssert.config.pullConsumerPollerGroup(comp, 'Pull Consumer System Poller Group Component');
                    }
                });
                return ret;
            })
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
