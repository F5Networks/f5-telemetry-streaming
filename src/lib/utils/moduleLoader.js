/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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
    logger.debug(`Loading module ${modulePath}`);

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
        logger.debug(`Module '${modulePath}' was unloaded`);
    } catch (err) {
        logger.exception(`Exception on attempt to unload '${modulePath}' from cache`, err);
    }
};

module.exports = {
    ModuleLoader
};
