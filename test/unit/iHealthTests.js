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
const configUtil = require('../../src/lib/configUtil');
/* eslint-disable no-unused-vars */
const ihealth = require('../../src/lib/ihealth');
const ihealthPoller = require('../../src/lib/ihealthPoller');
const constants = require('../../src/lib/constants');
const util = require('../../src/lib/util');
const deviceUtil = require('../../src/lib/deviceUtil');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('iHealth', () => {
    let uuidCounter = 0;
    const validateAndNormalize = function (declaration) {
        return configWorker.validate(util.deepCopy(declaration))
            .then(validated => configUtil.normalizeConfig(validated));
    };

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
    describe('config "on change" event', () => {
        const defaultDeclaration = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                iHealthPoller: {
                    username: 'IHEALTH_ACCOUNT_USERNAME',
                    passphrase: {
                        cipherText: 'IHEALTH_ACCOUNT_PASSPHRASE'
                    },
                    interval: {
                        timeWindow: {
                            start: '23:15',
                            end: '02:15'
                        }
                    }
                }
            }
        };

        const expectedOutput = {
            enable: true,
            class: 'Telemetry_iHealth_Poller',
            id: 'uuid2',
            name: 'iHealthPoller_1',
            namespace: constants.DEFAULT_UNNAMED_NAMESPACE,
            iHealth: {
                name: 'iHealthPoller_1',
                credentials: {
                    passphrase: {
                        cipherText: '$M$foo',
                        class: 'Secret',
                        protected: 'SecureVault'
                    },
                    username: 'IHEALTH_ACCOUNT_USERNAME'
                },
                downloadFolder: undefined,
                interval: {
                    day: undefined,
                    frequency: 'daily',
                    timeWindow: {
                        end: '02:15',
                        start: '23:15'
                    }
                },
                proxy: {
                    connection: {
                        allowSelfSignedCert: undefined,
                        host: undefined,
                        port: undefined,
                        protocol: undefined
                    },
                    credentials: {
                        passphrase: undefined,
                        username: undefined
                    }
                }
            },
            system: {
                connection: {
                    allowSelfSignedCert: false,
                    port: 8100,
                    protocol: 'http'
                },
                credentials: {
                    passphrase: undefined,
                    username: undefined
                },
                host: 'localhost',
                name: 'My_System'
            },
            trace: false
        };

        let activeTracersStub;
        let allTracersStub;
        let ihealthPollerInstanceStub;

        beforeEach(() => {
            activeTracersStub = [];
            allTracersStub = [];

            sinon.stub(util.tracer, 'createFromConfig').callsFake((className, objName, config) => {
                allTracersStub.push(objName);
                if (config.trace) {
                    activeTracersStub.push(objName);
                }
                return null;
            });

            sinon.stub(deviceUtil, 'encryptSecret').resolves('$M$foo');
            sinon.stub(deviceUtil, 'getDeviceType').resolves(constants.DEVICE_TYPE.BIG_IP);
            sinon.stub(ihealthPoller, 'updateStorage');
            sinon.stub(ihealthPoller, 'create').callsFake((namespace, sysKey, iHealthPoller, testOnly) => {
                const createArgs = [namespace, sysKey, iHealthPoller, testOnly].filter(x => x !== undefined);
                ihealthPollerInstanceStub = {
                    getTracer: () => {},
                    getKey: () => createArgs.join('::'),
                    process: () => {}
                };
                return ihealthPollerInstanceStub;
            });
        });

        it('should build iHealthPoller instance', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            return validateAndNormalize(newDeclaration)
                .then(normalized => configWorker.emitAsync('change', normalized))
                .then(() => {
                    assert.strictEqual(ihealthPollerInstanceStub.getKey(), 'f5telemetry_default::My_System');
                    assert.deepEqual(ihealthPollerInstanceStub.config, expectedOutput);
                });
        });

        it('should build iHealthPoller instance from referenced iHealthPoller', () => {
            const newDeclaration = testUtil.deepCopy(defaultDeclaration);
            const testExpectedOutput = testUtil.deepCopy(expectedOutput);

            newDeclaration.My_iHealth_Poller = newDeclaration.My_System.iHealthPoller;
            newDeclaration.My_iHealth_Poller.class = 'Telemetry_iHealth_Poller';
            newDeclaration.My_System.iHealthPoller = 'My_iHealth_Poller';
            testExpectedOutput.iHealth.name = 'My_iHealth_Poller';
            testExpectedOutput.name = 'My_iHealth_Poller';
            return validateAndNormalize(newDeclaration)
                .then(normalized => configWorker.emitAsync('change', normalized))
                .then(() => {
                    assert.strictEqual(ihealthPollerInstanceStub.getKey(), 'f5telemetry_default::My_System');
                    assert.deepEqual(ihealthPollerInstanceStub.config, testExpectedOutput);
                });
        });
    });
});
