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
const deviceUtil = require('../../src/lib/utils/device');
// eslint-disable-next-line no-unused-vars
const ihealth = require('../../src/lib/ihealth');
const ihealthPoller = require('../../src/lib/ihealthPoller');
const persistentStorage = require('../../src/lib/persistentStorage');
const stubs = require('./shared/stubs');
const teemReporter = require('../../src/lib/teemReporter');
const testUtil = require('./shared/util');
const utilMisc = require('../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('iHealth', () => {
    beforeEach(() => {
        stubs.coreStub({
            configWorker,
            deviceUtil,
            persistentStorage,
            teemReporter,
            utilMisc
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('config "on change" event', () => {
        const defaultDeclaration = {
            class: 'Telemetry',
            My_System: {
                class: 'Telemetry_System',
                iHealthPoller: {
                    username: 'test_user',
                    passphrase: {
                        cipherText: 'test_passphrase'
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
            id: 'uuid1',
            name: 'iHealthPoller_1',
            namespace: 'f5telemetry_default',
            systemName: 'My_System',
            iHealth: {
                name: 'iHealthPoller_1',
                credentials: {
                    passphrase: 'test_passphrase',
                    username: 'test_user'
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
            trace: false,
            traceName: 'My_System::iHealthPoller_1'
        };

        let ihealthPollerInstanceStub;

        beforeEach(() => {
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
            return configWorker.processDeclaration(newDeclaration)
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
            testExpectedOutput.traceName = 'My_System::My_iHealth_Poller';
            return configWorker.processDeclaration(newDeclaration)
                .then(() => {
                    assert.strictEqual(ihealthPollerInstanceStub.getKey(), 'f5telemetry_default::My_System');
                    assert.deepEqual(ihealthPollerInstanceStub.config, testExpectedOutput);
                });
        });
    });
});
