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

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const jwt = require('jsonwebtoken');
const nock = require('nock');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');

const gcpUtil = sourceCode('src/lib/consumers/shared/gcpUtil');

moduleCache.remember();

describe('Google Cloud Util Tests', () => {
    before(() => {
        moduleCache.restore();
    });

    describe('getAccessToken', () => {
        const accessTokenResponse = {
            access_token: 'hereHaveSomeAccess',
            expires_in: 1000
        };
        let jwtSignStub;

        beforeEach(() => {
            jwtSignStub = sinon.stub(jwt, 'sign').returns('somejsonwebtoken');
        });

        afterEach(() => {
            jwtSignStub.restore();
        });

        it('should get an Access Token from a signed JWT', () => {
            nock('https://oauth2.googleapis.com/token')
                .post('')
                .reply(200, (_, body) => {
                    assert.isTrue(/&assertion=somejsonwebtoken/.test(body));
                    return accessTokenResponse;
                });

            return gcpUtil.getAccessToken(
                {
                    useServiceAccountToken: false, privateKey: 'key', privateKeyId: 'keyId'
                }
            )
                .then((token) => {
                    assert.isTrue(nock.isDone());
                    assert.strictEqual(token, 'hereHaveSomeAccess');
                });
        });

        it('should cache multiple tokens', () => {
            nock('https://oauth2.googleapis.com/token')
                .post('')
                .times(2)
                .reply(200, accessTokenResponse);

            return Promise.all([
                gcpUtil.getAccessToken({ privateKey: 'key', privateKeyId: 'keyId_1' }),
                gcpUtil.getAccessToken({ privateKey: 'key', privateKeyId: 'keyId_2' })
            ])
                .then((tokens) => {
                    assert.isTrue(nock.isDone());
                    assert.strictEqual(jwtSignStub.callCount, 2);
                    assert.deepStrictEqual(tokens, ['hereHaveSomeAccess', 'hereHaveSomeAccess']);
                });
        });
    });

    describe('getAccessToken', () => {
        const accessTokenResponse = {
            access_token: 'hereHaveSomeAccess',
            expires_in: 1000
        };

        it('should get an Access Token from the instance metadata', () => {
            nock('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/abc')
                .get('/token')
                .reply(200, () => accessTokenResponse);

            return gcpUtil.getAccessToken({ useServiceAccountToken: true, serviceEmail: 'abc' })
                .then((token) => {
                    assert.isTrue(nock.isDone());
                    assert.strictEqual(token, 'hereHaveSomeAccess');
                });
        });
    });
});
