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

const logger = require('../logger');

/**
 * ModuleLoader class - reusable functions for loading/unloading Node packages
 *
 * @class
 */
class ModuleLoader {}

/**
* Load a module from the given path
*
* @param {String} modulePath - path to module
*
* @returns {Object|null} module or null when failed to load module
*/
ModuleLoader.load = function (modulePath) {
    logger.verbose(`Loading module ${modulePath}`);

    let module = null;
    try {
        module = require(modulePath); // eslint-disable-line
    } catch (err) {
        logger.exception(`Unable to load module ${modulePath}`, err);
    }
    return module;
};

/**
 * Unload a module from a given path
 *
 * @param {String} modulePath - path to module
 */
ModuleLoader.unload = function (modulePath) {
    try {
        delete require.cache[require.resolve(modulePath)];
        logger.verbose(`Module '${modulePath}' was unloaded`);
    } catch (err) {
        logger.exception(`Exception on attempt to unload '${modulePath}' from cache`, err);
    }
};

module.exports = {
    ModuleLoader
};
