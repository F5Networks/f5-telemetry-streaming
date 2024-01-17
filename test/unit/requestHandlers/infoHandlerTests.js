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

const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const InfoHandler = sourceCode('src/lib/requestHandlers/infoHandler');
const packageJson = sourceCode('package.json');
const schemaJson = sourceCode('src/schema/latest/base_schema.json');

moduleCache.remember();

describe('InfoHandler', () => {
    let restOpMock;
    let requestHandler;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
        restOpMock.uri = testUtil.parseURL('http://localhost:8100/mgmt/shared/telemetry/info');
        requestHandler = new InfoHandler(restOpMock);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return info data on GET request (real data)', () => requestHandler.process()
        .then((handler) => {
            assert.ok(handler === requestHandler, 'should return a reference to original handler');
            assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');

            const pkgInfo = packageJson.version.split('-');
            const schemaInfo = schemaJson.properties.schemaVersion.enum;
            assert.deepStrictEqual(requestHandler.getBody(), {
                branch: 'gitbranch',
                buildID: 'githash',
                buildTimestamp: 'buildtimestamp',
                fullVersion: packageJson.version,
                nodeVersion: process.version,
                release: pkgInfo[1],
                schemaCurrent: schemaInfo[0],
                schemaMinimum: schemaInfo[schemaInfo.length - 1],
                version: pkgInfo[0]
            }, 'should return expected body');
        }));
});
