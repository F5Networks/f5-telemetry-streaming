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

const { deepCopy } = require('../util');

const testData = [
    {
        value: {},
        error: /connection should be a non-empty collection/
    },
    {
        value: { allowSelfSignedCert: null },
        error: /allowSelfSignedCert should be a boolean/
    },
    {
        value: { allowSelfSignedCert: 1 },
        error: /allowSelfSignedCert should be a boolean/
    },
    {
        value: { port: null },
        error: /port should be a safe number/
    },
    {
        value: { port: 0 },
        error: /port should be > 0/
    },
    {
        value: { port: 2 ** 16 + 1 },
        error: /port should be </
    },
    {
        value: { protocol: null },
        error: /protocol should be a string/
    },
    {
        value: { protocol: 'protocol' },
        error: /protocol should be one of/
    },
    {
        value: { protocol: 10 },
        error: /protocol should be a string/
    }
];

module.exports = () => deepCopy(testData);
