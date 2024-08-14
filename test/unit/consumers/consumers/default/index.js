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

// Consumer API v1

const hrtimestamp = require('../../../../../src/lib/utils/datetime').hrtimestamp;

let DATA_CTXS = [];
const TIMESTAMP = hrtimestamp();

if (((global.consumersTests || {}).default || {}).fail) {
    throw new Error('Expected error on attempt to initialize "default" consumer module');
}

module.exports = function defaultConsumer(dataCtx) {
    DATA_CTXS.push(dataCtx);
};

module.exports.reset = function () {
    DATA_CTXS = [];
};

module.exports.getData = function () {
    return DATA_CTXS;
};

module.exports.getTimestamp = function () {
    return TIMESTAMP;
};
