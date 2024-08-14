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

const host = 'remoteproxyhost';

const testData = [
    {
        value: {},
        error: /proxy should be a non-empty collection/
    },
    {
        value: { connection: {} },
        error: /proxy.connection should be a non-empty collection/
    },
    {
        value: { connection: { host }, credentials: {} },
        error: /credentials should be a non-empty collection/
    },
    {
        value: { connection: { host }, credentials: { username: 10 } },
        error: /credentials.username should be a string/
    },
    {
        value: { connection: { host }, credentials: { username: '' } },
        error: /credentials.username should be a non-empty collection/
    },
    {
        value: { connection: { host }, credentials: { username: 'test_user_1', passphrase: '' } },
        error: /credentials.passphrase should be a non-empty collection/
    },
    {
        value: { connection: { host }, credentials: { username: 'test_user_1', passphrase: 10 } },
        error: /credentials.passphrase should be a string/
    },
    {
        value: { connection: { host, allowSelfSignedCert: null } },
        error: /connection.allowSelfSignedCert should be a boolean/
    },
    {
        value: { connection: { host, allowSelfSignedCert: 1 } },
        error: /connection.allowSelfSignedCert should be a boolean/
    },
    {
        value: { connection: { host, port: null } },
        error: /connection.port should be a safe number/
    },
    {
        value: { connection: { host, port: 0 } },
        error: /connection.port should be > 0/
    },
    {
        value: { connection: { host, port: 2 ** 16 + 1 } },
        error: /connection.port should be </
    },
    {
        value: { connection: { host, protocol: null } },
        error: /connection.protocol should be a string/
    },
    {
        value: { connection: { host, protocol: 10 } },
        error: /connection.protocol should be a string/
    },
    {
        value: { connection: { host, protocol: 'protocol' } },
        error: /connection.protocol should be one of/
    }
];

module.exports = () => deepCopy(testData);
