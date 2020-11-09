/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
const configUtil = require('../../src/lib/configUtil');
const util = require('../../src/lib/util');
const consumers = require('../../src/lib/consumers');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Consumers', () => {
    let uuidCounter = 0;

    beforeEach(() => {
        sinon.stub(util, 'generateUuid').callsFake(() => {
            uuidCounter += 1;
            return `uuid${uuidCounter}`;
        });
    });

    afterEach(() => {
        uuidCounter = 0;
        sinon.restore();
    });

    const validateAndNormalize = function (declaration) {
        return configWorker.validate(util.deepCopy(declaration))
            .then(validated => configUtil.normalizeConfig(validated));
    };

    describe('config listener', () => {
        it('should load required consumers', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };

            return validateAndNormalize(exampleConfig)
                .then((normalized) => {
                    // emit change event, then wait a short period
                    configWorker.emit('change', normalized);
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                })
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 1, 'should load default consumer');
                });
        });

        it('should not load disabled consumers', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                }
            };

            return validateAndNormalize(exampleConfig)
                .then((normalized) => {
                    // emit change event, then wait a short period
                    configWorker.emit('change', normalized);
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                })
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 0, 'should not load disabled consumer');
                });
        });

        it('should return empty list of consumers', () => {
            configWorker.emit('change', {}); // emit change event, then wait a short period
            return new Promise(resolve => setTimeout(() => { resolve(); }, 250))
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 0);
                })
                .catch(err => Promise.reject(err));
        });


        it('should unload unrequired consumers', () => {
            const priorConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };

            return validateAndNormalize(priorConfig)
                .then((normalized) => {
                    // emit change event, then wait a short period
                    configWorker.emit('change', normalized);
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                })
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 1, 'should load default consumer');
                    configWorker.emit('change', {});
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                })
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(Object.keys(loadedConsumers).length, 0, 'should unload default consumer');
                })
                .catch(err => Promise.reject(err));
        });

        it('should fail to load invalid pull consumer types (consumerType=unknowntype)', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'unknowntype'
                }
            };
            // config will not pass schema validation
            // but this test allows catching if consumer module/dir is not configured properly
            return configUtil.normalizeConfig(exampleConfig)
                .then((normalized) => {
                    // emit change event, then wait a short period
                    configWorker.emit('change', normalized);
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                })
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(Object.keys(loadedConsumers).indexOf('unknowntype'), -1,
                        'should not load invalid consumer type');
                });
        });
    });
});
