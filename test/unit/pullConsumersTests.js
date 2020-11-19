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

const constants = require('../../src/lib/constants');
const configWorker = require('../../src/lib/config');
const systemPoller = require('../../src/lib/systemPoller');
const pullConsumers = require('../../src/lib/pullConsumers');
const CONFIG_CLASSES = require('../../src/lib/constants').CONFIG_CLASSES;

const pullConsumersTestsData = require('./data/pullConsumersTestsData');
const testUtil = require('./shared/util');
const util = require('../../src/lib/util');
const configUtil = require('../../src/lib/configUtil');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Pull Consumers', () => {
    let uuidCounter = 0;

    beforeEach(() => {
        sinon.stub(util, 'generateUuid').callsFake(() => {
            uuidCounter += 1;
            return `uuid${uuidCounter}`;
        });
        // config.emit change event will trigger the poller as well
        sinon.stub(util, 'update').callsFake(() => {});
        sinon.stub(util, 'start').callsFake(() => {});
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
        it('should load required pull consumer type (consumerType=default)', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                    type: 'default',
                    systemPoller: 'My_Poller'
                },
                My_Poller: {
                    class: CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME
                }
            };
            return validateAndNormalize(exampleConfig)
                .then((normalized) => {
                    // emit change event, then wait a short period
                    configWorker.emit('change', normalized);
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                })
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.deepEqual(Object.keys(loadedConsumers), ['default'], 'should load default consumer');
                });
        });

        it('should not load disabled pull consumer', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                    type: 'default',
                    systemPoller: 'My_Poller',
                    enable: false
                },
                My_Poller: {
                    class: CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME
                }
            };
            return validateAndNormalize(exampleConfig)
                .then((normalized) => {
                    // emit change event, then wait a short period
                    configWorker.emit('change', normalized);
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                })
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.deepStrictEqual(loadedConsumers, {}, 'should not load disabled consumer');
                });
        });

        it('should fail to load invalid pull consumer types (consumerType=unknowntype)', () => {
            const exampleConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                    type: 'unknowntype',
                    systemPoller: 'My_Poller'
                },
                My_Poller: {
                    class: CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME
                }
            };
            // config will not pass schema validation
            // but this test allows catching if consumer module/dir is not configured properly
            return configUtil.normalizeConfig(exampleConfig)
                .then((normalized) => {
                    // emit change event, then wait a short period
                    configWorker.emit('change', { normalized });
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                })
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.strictEqual(Object.keys(loadedConsumers).indexOf('unknowntype'), -1,
                        'should not load invalid consumer type');
                });
        });

        it('should unload unrequired pull consumers', () => {
            const priorConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                    type: 'default',
                    systemPoller: 'My_Poller'
                },
                My_Poller: {
                    class: CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME
                }
            };
            return validateAndNormalize(priorConfig)
                .then((normalized) => {
                    // emit change event, then wait a short period
                    configWorker.emit('change', normalized);
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                })
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.deepEqual(Object.keys(loadedConsumers), ['default'], 'should load default consumer');
                    configWorker.emit('change', {});
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                })
                .then(() => {
                    const loadedConsumers = pullConsumers.getConsumers();
                    assert.deepStrictEqual(loadedConsumers, {}, 'should unload default consumer');
                })
                .catch(err => Promise.reject(err));
        });
    });

    describe('.getData()', () => {
        let declaration;
        let returnCtx;

        beforeEach(() => {
            returnCtx = null;
            sinon.stub(systemPoller, 'process').callsFake((pollerConfig) => {
                if (returnCtx) {
                    return returnCtx(declaration, pollerConfig);
                }
                return Promise.resolve({ data: { mockedResponse: { pollerName: pollerConfig.name } } });
            });
            sinon.stub(configWorker, 'getConfig').callsFake(() => validateAndNormalize(declaration)
                .then(normalized => Promise.resolve({ normalized })));
            // Load Pull Consumer config, with default consumer
            const defaultConfig = {
                class: 'Telemetry',
                My_Consumer: {
                    class: CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME,
                    type: 'default',
                    systemPoller: 'My_Poller'
                },
                My_Poller: {
                    class: CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME
                }
            };
            return validateAndNormalize(defaultConfig)
                .then((normalized) => {
                    configWorker.emit('change', normalized);
                    return new Promise(resolve => setTimeout(() => { resolve(); }, 250));
                });
        });

        const runTestCase = testConf => testUtil.getCallableIt(testConf)(testConf.name, () => {
            declaration = testConf.declaration;
            if (typeof testConf.returnCtx !== 'undefined') {
                returnCtx = testConf.returnCtx;
            }
            return pullConsumers.getData(testConf.consumerName, testConf.namespace)
                .then((data) => {
                    assert.deepStrictEqual(data, testConf.expectedResponse);
                })
                .catch((err) => {
                    if (testConf.errorRegExp) {
                        return assert.match(err, testConf.errorRegExp, 'should match error reg exp');
                    }
                    return Promise.reject(err);
                });
        });

        describe('default (no namespace)', () => pullConsumersTestsData.getData.forEach(testConf => runTestCase(testConf)));

        describe('default (no namespace), lookup using f5telemetry_default name',
            () => pullConsumersTestsData.getData.forEach((testConf) => {
                testConf.namespace = constants.DEFAULT_UNNAMED_NAMESPACE;
                runTestCase(testConf);
            }));

        describe('with namespace only', () => {
            const namespaceOnlyTestsData = util.deepCopy(pullConsumersTestsData.getData);
            namespaceOnlyTestsData.forEach((testConf) => {
                testConf.declaration = {
                    class: 'Telemetry',
                    Namespace_Only: testConf.declaration
                };
                testConf.declaration.Namespace_Only.class = 'Telemetry_Namespace';
                testConf.namespace = 'Namespace_Only';
                return runTestCase(testConf);
            });
        });

        describe('mix - default (no namespace) and with namespaces', () => {
            const namespaceOnlyTestsData = util.deepCopy(pullConsumersTestsData.getData);
            namespaceOnlyTestsData.forEach((testConf) => {
                testConf.declaration.Wanted_Namespace = util.deepCopy(testConf.declaration);
                testConf.declaration.Wanted_Namespace.class = 'Telemetry_Namespace';
                testConf.declaration.Extra_Namespace = {
                    class: 'Telemetry_Namespace',
                    A_System_Poller: {
                        class: 'Telemetry_System_Poller'
                    }
                };
                testConf.namespace = 'Wanted_Namespace';
                return runTestCase(testConf);
            });

            it('should return an error if consumer exists in namespace but no namespace provided', () => {
                declaration = {
                    class: 'Telemetry',
                    Some_System_Poller: {
                        class: 'Telemetry_System_Poller'
                    },
                    Some_Consumer: {
                        class: 'Telemetry_Pull_Consumer',
                        type: 'default',
                        systemPoller: 'Some_System_Poller'
                    },
                    Wanted_Namespace: {
                        class: 'Telemetry_Namespace',
                        Wanted_Poller: {
                            class: 'Telemetry_System_Poller'
                        },
                        Wanted_Consumer: {
                            class: 'Telemetry_Pull_Consumer',
                            type: 'default',
                            systemPoller: 'Wanted_Poller'
                        }
                    }
                };
                return assert.isRejected(pullConsumers.getData('Wanted_Consumer'),
                    'Pull Consumer with name \'Wanted_Consumer\' doesn\'t exist (namespace: f5telemetry_default)');
            });
        });
    });
});
