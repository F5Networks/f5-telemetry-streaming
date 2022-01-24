/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const BaseRequestHandler = require('../../../src/lib/requestHandlers/baseHandler');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('BaseRequestHandler', () => {
    let restOpMock;
    let requestHandler;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        restOpMock = new testUtil.MockRestOperation({ method: 'get' });
        restOpMock.uri = testUtil.parseURL('http://localhost:8100/mgmt/shared/telemetry/info');
        requestHandler = new BaseRequestHandler(restOpMock);
    });

    describe('.getBody()', () => {
        it('should throw error', () => {
            assert.throws(
                () => requestHandler.getBody(),
                'Method "getBody" not implemented',
                'should throw error for method that not implemented'
            );
        });
    });

    describe('.getCode()', () => {
        it('should throw error', () => {
            assert.throws(
                () => requestHandler.getCode(),
                'Method "getCode" not implemented',
                'should throw error for method that not implemented'
            );
        });
    });

    describe('.getMethod()', () => {
        it('should return HTTP method', () => {
            assert.deepStrictEqual(requestHandler.getMethod(), 'GET', 'should return method in upper case');
        });
    });

    describe('.process()', () => {
        it('should return self', () => requestHandler.process()
            .then((inst) => {
                assert.deepStrictEqual(inst, requestHandler, 'should return same instance');
            }));
    });

    describe('.getContentType()', () => {
        it('should return undefined', () => {
            assert.isUndefined(requestHandler.getContentType(), 'should return undefined by default');
        });
    });
});
