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

const common = require('../common');
const schemaValidationUtil = require('../../shared/schemaValidation');
const shared = require('./shared');

moduleCache.remember();

describe('Declarations -> Telemetry_Consumer -> Graphite', () => {
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
            type: 'Graphite',
            host: 'host'
        },
        {
            type: 'Graphite',
            host: 'host',
            protocol: 'https',
            port: 443,
            path: '/events/'
        }
    ));

    it('should allow full declaration', () => shared.validateFull(
        {
            type: 'Graphite',
            host: 'host',
            protocol: 'http',
            port: 80,
            path: 'path'
        },
        {
            type: 'Graphite',
            host: 'host',
            protocol: 'http',
            port: 80,
            path: 'path'
        }
    ));

    schemaValidationUtil.generateSchemaBasicTests(
        basicSchemaTestsValidator,
        {
            type: 'Graphite',
            host: 'host'
        },
        'path',
        { stringLengthTests: true }
    );
});
