/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

const gcpUtil = require('./../../../src/lib/consumers/shared/gcpUtil');
const nock = require('nock');

chai.use(chaiAsPromised);
const assert = chai.assert;

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

            return gcpUtil.getAccessToken({ privateKey: 'key', privateKeyId: 'keyId' })
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
});
