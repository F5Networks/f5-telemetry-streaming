/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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

const errors = require('../../../src/lib/errors');
const systemPoller = require('../../../src/lib/systemPoller');
const SystemPollerHandler = require('../../../src/lib/requestHandlers/systemPollerHandler');
const ErrorHandler = require('../../../src/lib/requestHandlers/errorHandler');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;


describe('SystemPollerHandler', () => {
    let restOpMock;
    let requestHandler;

    beforeEach(() => {
        restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
        restOpMock.uri = testUtil.parseURL('http://localhost:8100/mgmt/shared/telemetry/systempoller/system/poller');
        requestHandler = new SystemPollerHandler(restOpMock, { system: 'system', poller: 'poller' });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return 200 on GET request', () => {
        let systemNameFromRequest;
        let pollerNameFromRequest;
        let includeDisabledVal;

        sinon.stub(systemPoller, 'getPollersConfig').callsFake((systemName, options) => {
            systemNameFromRequest = systemName;
            pollerNameFromRequest = options.pollerName;
            includeDisabledVal = options.includeDisabled;
            return Promise.resolve({});
        });
        sinon.stub(systemPoller, 'fetchPollersData').resolves([{ data: 'expectedData' }]);

        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(), ['expectedData'], 'should return expected body');
                assert.strictEqual(systemNameFromRequest, 'system', 'should match system name from request');
                assert.strictEqual(pollerNameFromRequest, 'poller', 'should match poller name from request');
                assert.strictEqual(includeDisabledVal, true, 'should include disabled configs too');
            });
    });


    it('should return 404 when unable to make config lookup', () => {
        sinon.stub(systemPoller, 'getPollersConfig').rejects(new errors.ConfigLookupError('expectedError'));
        return requestHandler.process()
            .then((handler) => {
                assert.isTrue(handler instanceof ErrorHandler, 'should return a reference to error handler');
                assert.strictEqual(handler.getCode(), 404, 'should return expected code');
                assert.deepStrictEqual(handler.getBody(), {
                    code: 404,
                    message: 'expectedError'
                }, 'should return expected body');
            });
    });

    it('should reject when caught unknown error', () => {
        sinon.stub(systemPoller, 'getPollersConfig').rejects(new Error('expectedError'));
        return assert.isRejected(requestHandler.process(), 'expectedError');
    });
});
