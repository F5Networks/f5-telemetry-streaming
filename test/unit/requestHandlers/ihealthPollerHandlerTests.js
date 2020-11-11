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
const ihealh = require('../../../src/lib/ihealth');
const IHealthPollerHandler = require('../../../src/lib/requestHandlers/ihealthPollerHandler');
const testUtil = require('../shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;


describe('SystemPollerHandler', () => {
    let restOpMock;
    let requestHandler;

    beforeEach(() => {
        restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
        restOpMock.uri = testUtil.parseURL('http://localhost:8100/mgmt/shared/telemetry/ihealthpoller/system/poller');
        requestHandler = new IHealthPollerHandler(restOpMock, { system: 'system', poller: 'poller' });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return 200 on GET request to retrieve current state', () => {
        requestHandler.params = {};
        sinon.stub(ihealh, 'getCurrentState').callsFake(() => ({
            state: 'current'
        }));

        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 200, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(), {
                    code: 200,
                    message: {
                        state: 'current'
                    }
                }, 'should return expected body');
            });
    });

    it('should return 201 on GET request to start new polling cycle', () => {
        sinon.stub(ihealh, 'startPoller').callsFake((systemName, pollerName) => Promise.resolve({
            created: true,
            systemDeclName: systemName,
            iHealthDeclName: pollerName,
            message: 'created'
        }));

        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 201, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(), {
                    code: 201,
                    systemDeclName: 'system',
                    iHealthDeclName: 'poller',
                    message: 'created'
                }, 'should return expected body');
            });
    });

    it('should return 202 on GET request to start polling cycle that running already', () => {
        sinon.stub(ihealh, 'startPoller').callsFake((systemName, pollerName) => Promise.resolve({
            runningAlready: true,
            systemDeclName: systemName,
            iHealthDeclName: pollerName,
            message: 'runningAlready'
        }));

        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 202, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(), {
                    code: 202,
                    systemDeclName: 'system',
                    iHealthDeclName: 'poller',
                    message: 'runningAlready'
                }, 'should return expected body');
            });
    });


    it('should return 404 when unable to make config lookup', () => {
        sinon.stub(ihealh, 'startPoller').rejects(new errors.ConfigLookupError('expectedError'));
        return requestHandler.process()
            .then((handler) => {
                assert.ok(handler === requestHandler, 'should return a reference to original handler');
                assert.strictEqual(requestHandler.getCode(), 404, 'should return expected code');
                assert.deepStrictEqual(requestHandler.getBody(), {
                    code: 404,
                    message: 'expectedError'
                }, 'should return expected body');
            });
    });

    it('should reject when caught unknown error', () => {
        sinon.stub(ihealh, 'startPoller').rejects(new Error('expectedError'));
        return assert.isRejected(requestHandler.process(), 'expectedError');
    });
});
