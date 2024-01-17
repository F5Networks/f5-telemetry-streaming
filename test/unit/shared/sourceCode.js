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
 * Load module from project's root directory.
 * Main intention is to:
 * - reduce number of explicit usage of imports with relative path
 * - reduce number of eslint warning regarding dynamic or global imports
 *
 * @param {string} modulePath - relative path, e.g. src/lib/config
 *
 * @returns {Object} loaded module
 */
module.exports = function (modulePath) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(require.resolve(`${__dirname}/../../../${modulePath}`));
};
