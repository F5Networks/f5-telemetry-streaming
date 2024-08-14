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

moduleCache.remember();

describe('Declarations -> Telemetry_Namespace', () => {
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = common.stubCoreModules();
        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        sinon.restore();
    });

    describe('Telemetry_Namespace', () => {
        let minimalDeclaration;
        let minimalExpected;
        let fullDeclaration;
        let fullExpected;

        const validateMinimal = (namespaceProps, expectedProps, addtlContext) => common.validatePartOfIt(
            minimalDeclaration,
            'My_Namespace',
            namespaceProps,
            minimalExpected,
            expectedProps,
            addtlContext
        );

        const validateFull = (namespaceProps, expectedProps, addtlContext) => common.validatePartOfIt(
            fullDeclaration,
            'My_Namespace',
            namespaceProps,
            fullExpected,
            expectedProps,
            addtlContext
        );

        beforeEach(() => {
            minimalDeclaration = {
                class: 'Telemetry',
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_System: {
                        class: 'Telemetry_System'
                    }
                }
            };

            minimalExpected = {
                class: 'Telemetry_Namespace',
                My_System: {
                    class: 'Telemetry_System',
                    allowSelfSignedCert: false,
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http'
                }
            };

            fullDeclaration = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 60
                    }
                },
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    My_NS_System: {
                        class: 'Telemetry_System',
                        systemPoller: ['My_NS_Poller']
                    },
                    My_NS_Poller: {
                        class: 'Telemetry_System_Poller',
                        interval: 60
                    },
                    My_NS_Consumer: {
                        class: 'Telemetry_Consumer',
                        type: 'Generic_HTTP',
                        host: '1.2.3',
                        protocol: 'http',
                        port: 8080
                    }
                }
            };

            fullExpected = {
                class: 'Telemetry_Namespace',
                My_NS_System: {
                    class: 'Telemetry_System',
                    allowSelfSignedCert: false,
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    systemPoller: ['My_NS_Poller']
                },
                My_NS_Poller: {
                    class: 'Telemetry_System_Poller',
                    actions: [{
                        enable: true,
                        setTag: {
                            application: '`A`',
                            tenant: '`T`'
                        }
                    }],
                    allowSelfSignedCert: false,
                    enable: true,
                    host: 'localhost',
                    port: 8100,
                    protocol: 'http',
                    interval: 60,
                    workers: 5,
                    chunkSize: 30
                },
                My_NS_Consumer: {
                    class: 'Telemetry_Consumer',
                    allowSelfSignedCert: false,
                    enable: true,
                    method: 'POST',
                    path: '/',
                    trace: false,
                    type: 'Generic_HTTP',
                    host: '1.2.3',
                    protocol: 'http',
                    port: 8080,
                    outputMode: 'processed',
                    compressionType: 'none'
                }
            };
        });

        it('should pass minimal declaration', () => validateMinimal({}, {}));

        it('should allow full declaration', () => validateFull({}, {}));

        it('should not allow nested Namespace', () => assert.isRejected(
            validateMinimal({
                nestedNamespace: {
                    class: 'Telemetry_Namespace'
                }
            }),
            /should be equal to one of the allowed values/
        ));
    });
});
