/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        common.stubCoreModules();
    });

    afterEach(() => {
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
