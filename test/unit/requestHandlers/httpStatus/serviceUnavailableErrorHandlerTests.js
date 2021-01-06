/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const ServiceUnavailableErrorHandler = require('../../../../src/lib/requestHandlers/httpStatus/serviceUnavailableErrorHandler');
const MockRestOperation = require('../../shared/util').MockRestOperation;

chai.use(chaiAsPromised);
const assert = chai.assert;


describe('ServiceUnavailableErrorHandler', () => {
    let requestHandler;

    beforeEach(() => {
        requestHandler = new ServiceUnavailableErrorHandler(new MockRestOperation());
    });

    it('should return code 503', () => {
        assert.strictEqual(requestHandler.getCode(), 503, 'should return expected code');
    });

    it('should return body with message', () => {
        const expectedBody = {
            code: 503,
            message: 'Service Unavailable'
        };
        assert.deepStrictEqual(requestHandler.getBody(), expectedBody, 'should match expected body');
    });

    it('should return self as result of process', () => requestHandler.process()
        .then((handler) => {
            assert.ok(handler === requestHandler, 'should return reference to origin instance');
        }));
});
