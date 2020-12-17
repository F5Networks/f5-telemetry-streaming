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
                .then(normalized => configWorker.emitAsync('change', normalized))
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
                .then(normalized => configWorker.emitAsync('change', normalized))
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 0, 'should not load disabled consumer');
                });
        });

        it('should return empty list of consumers', () => configWorker.emitAsync('change', {})
            .then(() => {
                const loadedConsumers = consumers.getConsumers();
                assert.strictEqual(loadedConsumers.length, 0);
            }));

        it('should unload unrequired consumers', () => {
            const priorConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };

            return validateAndNormalize(priorConfig)
                .then(normalized => configWorker.emitAsync('change', normalized))
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 1, 'should load default consumer');
                    return configWorker.emitAsync('change', {});
                })
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(Object.keys(loadedConsumers).length, 0, 'should unload default consumer');
                });
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
                .then(normalized => configWorker.emitAsync('change', normalized))
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(Object.keys(loadedConsumers).indexOf('unknowntype'), -1,
                        'should not load invalid consumer type');
                });
        });

        it('should not reload existing consumer when skipUpdate = true', () => {
            let existingComp;
            let newComp;
            const existingConfig = {
                class: 'Telemetry',
                FirstConsumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            };

            const newConfig = {
                class: 'Telemetry',
                FirstConsumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                NewNamespace: {
                    class: 'Telemetry_Namespace',
                    SecondConsumer: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            };
            const moduleLoaderSpy = sinon.spy(util.moduleLoader, 'load');
            return validateAndNormalize(existingConfig)
                .then((normalized) => {
                    existingComp = normalized.components[0];
                    // emit change event, then wait a short period
                    return configWorker.emitAsync('change', normalized);
                })
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers.length, 1, 'should load default consumer');
                    assert.isTrue(moduleLoaderSpy.calledOnce);
                })
                .then(() => validateAndNormalize(newConfig))
                .then((normalized) => {
                    newComp = normalized.components.find(c => c.class === 'Telemetry_Consumer' && c.namespace === 'NewNamespace');
                    // simulate a namespace only declaration request
                    // existing config unchanged, id the same
                    existingComp.skipUpdate = true;
                    normalized.components[0] = existingComp;
                    return configWorker.emitAsync('change', normalized);
                })
                .then(() => {
                    const loadedConsumers = consumers.getConsumers();
                    assert.strictEqual(loadedConsumers[0].id, existingComp.id);
                    assert.strictEqual(loadedConsumers[1].id, newComp.id);
                    assert.isTrue(moduleLoaderSpy.calledTwice);
                });
        });
    });
});
