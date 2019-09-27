/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const systemPoller = require('../../src/lib/systemPoller');
const config = require('../../src/lib/config');
const systemStats = require('../../src/lib/systemStats');

chai.use(chaiAsPromised);
const assert = chai.assert;

function MockRestOperation(opts) {
    this.method = opts.method || 'GET';
    this.body = opts.body;
    this.statusCode = null;
    this.uri = {};
    this.uri.pathname = opts.uri;
}
MockRestOperation.prototype.getUri = function () { return this.uri; };
MockRestOperation.prototype.setStatusCode = function (status) { this.statusCode = status; };
MockRestOperation.prototype.getStatusCode = function () { return this.statusCode; };
MockRestOperation.prototype.setBody = function (body) { this.body = body; };
MockRestOperation.prototype.getBody = function () { return this.body; };
MockRestOperation.prototype.complete = function () { };

describe('systemPoller', () => {
    describe('.processClientRequest', () => {
        let getConfigData;

        beforeEach(() => {
            sinon.stub(config, 'getConfig').callsFake(() => Promise.resolve(getConfigData));
        });

        afterEach(() => {
            sinon.restore();
        });

        it('should set status code of 400', () => {
            const restOperation = new MockRestOperation({ uri: 'path/' });
            systemPoller.processClientRequest(restOperation);
            assert.equal(restOperation.getStatusCode(), 400);
            assert.deepEqual(restOperation.getBody(), { code: 400, message: 'Bad Request. System\'s or System Poller\'s name not specified.' });
        });

        it('should set status code of 200', (done) => {
            getConfigData = {
                parsed: {
                    Controls: {
                        controls: {
                            class: 'Controls',
                            debug: true,
                            logLevel: 'info'
                        }
                    },
                    Telemetry_System: {
                        My_System: {
                            class: 'Telemetry_System_Poller',
                            systemPoller: {
                                interval: 60,
                                actions: [
                                    {
                                        setTag: {
                                            facility: 'facilityValue'
                                        },
                                        locations: {
                                            system: true
                                        }
                                    }
                                ]
                            },
                            host: 'localhost',
                            port: 8100,
                            protocol: 'http'
                        }
                    }
                }
            };
            sinon.stub(systemStats.prototype, 'collect').callsFake(() => Promise.resolve({}));

            const restOperation = new MockRestOperation({ uri: 'shared/telemetry/systempoller/Telemetry_System/My_System' });
            restOperation.complete = function () {
                assert.equal(restOperation.getStatusCode(), 200);
                done();
            };
            systemPoller.processClientRequest(restOperation);
        });

        it('should reject with 404 status', (done) => {
            getConfigData = {
                parsed: {
                    Controls: {
                        controls: {
                            class: 'Controls',
                            debug: true,
                            logLevel: 'info'
                        }
                    }
                }
            };
            const expected = {
                code: 404,
                message: 'Error: System Poller declaration not found.'
            };
            const restOperation = new MockRestOperation({ uri: 'shared/telemetry/systempoller/Telemetry_System/My_System' });
            restOperation.complete = function () {
                assert.deepEqual(restOperation.getBody(), expected);
                done();
            };
            systemPoller.processClientRequest(restOperation);
        });
    });
});
