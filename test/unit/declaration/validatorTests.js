/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const common = require('./common');
const declValidator = require('./common').validate;
const sourceCode = require('../shared/sourceCode');

const constants = sourceCode('src/lib/constants');

moduleCache.remember();

describe('Declarations -> Validator', () => {
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = common.stubCoreModules();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should validate multiple declarations in parallel', () => {
        const decl1 = {
            class: 'Telemetry',
            My_iHealth_1: {
                class: 'Telemetry_iHealth_Poller',
                username: 'username',
                passphrase: {
                    cipherText: 'cipherText'
                },
                interval: {
                    timeWindow: {
                        start: '00:00',
                        end: '03:00'
                    }
                },
                proxy: {
                    host: 'localhost'
                }
            }
        };
        const decl2 = {
            class: 'Telemetry',
            My_iHealth_2: {
                class: 'Telemetry_iHealth_Poller',
                username: 'username',
                passphrase: {
                    cipherText: 'cipherText'
                },
                interval: {
                    timeWindow: {
                        start: '00:00',
                        end: '03:00'
                    }
                },
                proxy: {
                    host: 'localhost'
                }
            }
        };
        return assert.isFulfilled(Promise.all([
            declValidator(decl1),
            declValidator(decl2)
        ]));
    });

    it('should validate multiple invalid declarations in parallel', () => {
        const pathErrMsg = /downloadFolder.*Unable to access path/;
        const declClassErrMsg = /\\"My_Endpoints\\" must be of object type and class \\"Telemetry_Endpoints\\"/;
        const deviceCheckErrMsg = /requires running on BIG-IP/;
        const networkErrMsg = /failed network check/;

        const errMap = {
            invalidPath: pathErrMsg,
            invalidHost: networkErrMsg,
            invalidClass: declClassErrMsg,
            invalidDevice: deviceCheckErrMsg
        };

        coreStub.utilMisc.networkCheck.rejects(new Error('failed network check'));
        coreStub.deviceUtil.getDeviceType.resolves(constants.DEVICE_TYPE.CONTAINER);

        const decl1 = {
            class: 'Telemetry',
            My_iHealth: {
                class: 'Telemetry_iHealth_Poller',
                downloadFolder: '/some/invalid/dir',
                username: 'username',
                passphrase: {
                    cipherText: 'cipherText'
                },
                interval: {
                    timeWindow: {
                        start: '08:00',
                        end: '18:00'
                    },
                    frequency: 'daily'
                }
            }
        };
        const decl2 = {
            class: 'Telemetry',
            My_Consumer: {
                class: 'Telemetry_Consumer',
                type: 'Graphite',
                host: '192.168.2.1',
                enableHostConnectivityCheck: true
            }
        };
        const decl3 = {
            class: 'Telemetry',
            My_Endpoints: {
                class: 'Telemetry_System'
            },
            My_System: {
                class: 'Telemetry_System',
                systemPoller: {
                    interval: 100,
                    endpointList: [
                        'My_Endpoints/something'
                    ]
                }
            }
        };
        const decl4 = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                passphrase: {
                    cipherText: 'mycipher'
                }
            }
        };
        const errors = {};
        const validate = (name, decl) => declValidator(decl).catch((e) => {
            errors[name] = e.message || e;
        });
        return Promise.all([
            validate('invalidPath', decl1),
            validate('invalidHost', decl2),
            validate('invalidClass', decl3),
            validate('invalidDevice', decl4)
        ])
            .then(() => {
                Object.keys(errMap).forEach((errKey) => {
                    const errMsg = errors[errKey];
                    assert.notStrictEqual(errMsg, undefined, `should have error for key "${errKey}"`);
                    assert.ok(errMap[errKey].test(errMsg), `should have error for key "${errKey}`);
                    // check that there are no errors from other declarations
                    Object.keys(errMap).forEach((anotherErrKey) => {
                        if (anotherErrKey === errKey) {
                            return;
                        }
                        assert.notOk(errMap[anotherErrKey].test(errMsg), `should have not error for key "${anotherErrKey}`);
                    });
                });
            });
    });
});
