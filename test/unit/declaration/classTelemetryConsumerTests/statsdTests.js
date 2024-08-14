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
const moduleCache = require('../../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../../shared/assert');
const common = require('../common');
const schemaValidationUtil = require('../../shared/schemaValidation');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> Statsd', () => {
    const basicSchemaTestsValidator = (decl) => shared.validateMinimal(decl);
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = common.stubCoreModules();
        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        sinon.restore();
    });

    it('should pass minimal declaration', () => shared.validateMinimal(
        {
            type: 'Statsd',
            host: 'host'
        },
        {
            type: 'Statsd',
            host: 'host',
            protocol: 'udp',
            port: 8125,
            convertBooleansToMetrics: false
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Statsd',
            host: 'host',
            protocol: 'tcp',
            port: 80,
            convertBooleansToMetrics: true
        },
        {
            type: 'Statsd',
            host: 'host',
            protocol: 'tcp',
            port: 80,
            convertBooleansToMetrics: true
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'Statsd',
            host: 'host',
            port: 80,
            addTags: { method: 'sibling' }
        },
        [
            {
                property: 'protocol',
                enumTests: { allowed: ['tcp', 'udp'], notAllowed: ['https'] }
            },
            {
                property: 'addTags.method',
                enumTests: { allowed: ['sibling'], notAllowed: ['parent'] },
                requiredTests: true
            },
            {
                property: 'addTags',
                additionalPropsTests: { notAllowed: true },
                optionalPropTests: true
            }
        ]
    );

    it('should fail when invalid \'convertBooleansToMetrics\' value specified', () => assert.isRejected(
        shared.validateMinimal({
            type: 'Statsd',
            host: 'host',
            convertBooleansToMetrics: 'something'
        }),
        /convertBooleansToMetrics\/type.*should be boolean/
    ));
});
