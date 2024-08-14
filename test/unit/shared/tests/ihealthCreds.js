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
        value: undefined,
        error: /credentials should be an object/
    },
    {
        value: {},
        error: /credentials should be a non-empty collection/
    },
    {
        value: { username: 10 },
        error: /username should be a string/
    },
    {
        value: { username: '' },
        error: /username should be a non-empty collection/
    },
    {
        value: { username: 'test_user_1' },
        error: /passphrase should be a string/
    },
    {
        value: { username: 'test_user_1', passphrase: '' },
        error: /passphrase should be a non-empty collection/
    },
    {
        value: { username: 'test_user_1', passphrase: 10 },
        error: /passphrase should be a string/
    }
];

module.exports = () => deepCopy(testData);
