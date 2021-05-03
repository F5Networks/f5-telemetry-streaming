/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const constants = require('../../../src/lib/constants');
const InfoHandler = require('../../../src/lib/requestHandlers/infoHandler');
const testUtil = require('../shared/util');
const packageJson = require('../../../package.json');
const schemaJson = require('../../../src/schema/latest/base_schema.json');

chai.use(chaiAsPromised);
const assert = chai.assert;


describe('InfoHandler', () => {
    let restOpMock;
    let requestHandler;

    beforeEach(() => {
        restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
        restOpMock.uri = testUtil.parseURL('http://localhost:8100/mgmt/shared/telemetry/info');
        requestHandler = new InfoHandler(restOpMock);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return info data on GET request', () => {
        sinon.stub(constants, 'VERSION').value('TS_VERSION');
        sinon.stub(constants, 'RELEASE').value('TS_RELEASE');
        sinon.stub(constants.SCHEMA_INFO, 'CURRENT').value('TS_SCHEMA_CURRENT');
        sinon.stub(constants.SCHEMA_INFO, 'MINIMUM').value('TS_SCHEMA_MINIMUM');
        sinon.stub(process, 'version').value('NODE_VERSION');

        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(), {
                    nodeVersion: 'NODE_VERSION',
                    version: 'TS_VERSION',
                    release: 'TS_RELEASE',
                    schemaCurrent: 'TS_SCHEMA_CURRENT',
                    schemaMinimum: 'TS_SCHEMA_MINIMUM'
                }, 'should return expected body');
            });
    });

    it('should return info data on GET request (real data)', () => requestHandler.process()
        .then((handler) => {
            assert.ok(handler === requestHandler, 'should return a reference to original handler');
            assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');

            const pkgInfo = packageJson.version.split('-');
            const schemaInfo = schemaJson.properties.schemaVersion.enum;
            assert.deepStrictEqual(requestHandler.getBody(), {
                nodeVersion: process.version,
                version: pkgInfo[0],
                release: pkgInfo[1],
                schemaCurrent: schemaInfo[0],
                schemaMinimum: schemaInfo[schemaInfo.length - 1]
            }, 'should return expected body');
        }));
});
