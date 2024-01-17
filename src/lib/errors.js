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

/**
 * Validation error
 */
class ValidationError extends BaseError {}

module.exports = {
    BaseError,
    ConfigLookupError,
    ObjectNotFoundInConfigError,
    ValidationError
};
