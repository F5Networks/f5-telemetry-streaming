/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const configWorker = require('../../src/lib/config');
const systemPoller = require('../../src/lib/systemPoller');
const pullConsumers = require('../../src/lib/pullConsumers');
const util = require('../../src/lib/util');
const constants = require('../../src/lib/constants');
const config = require('../../src/lib/config');

const pullConsumersTestsData = require('./pullConsumersTestsData');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Pull Consumers', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('config listener', () => {
        it('should load required pull consumer type (consumerType=default)', () => {
            const exampleConfig = {};
            exampleConfig[constants.CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME] = {
                My_Consumer: {
                    class: 'Consumer',
                    type: 'default'
                }
            };
            config.emit('change', exampleConfig); // emit change event, then wait a short period
            return assert.isFulfilled(new Promise(resolve => setTimeout(() => { resolve(); }, 250))
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.deepEqual(Object.keys(loadedConsumers), ['default'], 'should load default consumer');
                }));
        });

        it('should not have a reference to invalid pull consumer types (consumerType=unknowntype)', () => {
            const exampleConfig = {};
            exampleConfig[constants.CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME] = {
                My_Consumer_Fake: {
                    class: 'Consumer',
                    type: 'unknowntype'
                }
            };
            config.emit('change', exampleConfig); // emit change event, then wait a short period
            return assert.isFulfilled(new Promise(resolve => setTimeout(() => { resolve(); }, 250))
                .then(() => {
                    const loadedConsumers = Object.keys(pullConsumers.getConsumers());
                    assert.strictEqual(loadedConsumers.indexOf('unknowntype'), -1, 'should load default consumer');
                }));
        });

        it('should unload unrequired pull consumers', () => {
            config.emit('change', {}); // emit change event, then wait a short period
            return new Promise(resolve => setTimeout(() => { resolve(); }, 250))
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.strictEqual(Object.keys(loadedConsumers).length, 0);
                })
                .catch(err => Promise.reject(err));
        });
    });

    describe('.processClientRequest()', () => {
        let declaration;
        let returnCtx;

        beforeEach(() => {
            returnCtx = null;

            sinon.stub(configWorker, 'getConfig').callsFake(() => configWorker.validate(declaration)
                .then(validated => Promise.resolve(util.formatConfig(validated)))
                .then(validated => Promise.resolve({ parsed: validated })));

            sinon.stub(systemPoller, 'fetchPollerData').callsFake((conf, poller) => {
                if (returnCtx) {
                    return returnCtx(conf, poller);
                }
                return Promise.resolve([
                    { data: { mockedResponse: { pollerName: poller } } }
                ]);
            });

            // Load Pull Consumer config, with default consumer
            const defaultConfig = {
                [constants.CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME]: {
                    My_Consumer: {
                        class: 'Consumer',
                        type: 'default'
                    }
                }
            };
            config.emit('change', defaultConfig); // emit change event
        });

        /* eslint-disable implicit-arrow-linebreak */
        pullConsumersTestsData.processClientRequest.forEach(testConf =>
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                declaration = testConf.declaration;
                const restOpMock = new testUtil.MockRestOperation(testConf.requestOpts);

                if (typeof testConf.returnCtx !== 'undefined') {
                    returnCtx = testConf.returnCtx;
                }
                return new Promise((resolve) => {
                    restOpMock.complete = function () {
                        resolve();
                    };
                    pullConsumers.processClientRequest(restOpMock);
                })
                    .then(() => {
                        assert.deepStrictEqual(
                            { body: restOpMock.body, code: restOpMock.statusCode },
                            testConf.expectedResponse
                        );
                    });
            }));
    });
});
