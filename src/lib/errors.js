/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
 * NOTE: This file SHOULD contain only parent classes or classes that used across multiple modules
 */

/**
 * Base Error Class - parent class for all errors in TS
 */
class BaseError extends Error {}

/**
 * Config Lookup Error Class
 */
class ConfigLookupError extends BaseError {}

/**
 * Object not found in Config Error
 */
class ObjectNotFoundInConfigError extends ConfigLookupError {}

module.exports = {
    BaseError,
    ConfigLookupError,
    ObjectNotFoundInConfigError
};
