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

/* eslint-disable global-require */

/**
 * Object's ID might be one of the following:
 * - obj.traceName
 * - obj.namespace::obj.name
 * - UUID
 */

module.exports = {
    iHealthPollerNormalization: require('./normalizeDeclarationIHealthPollerTestsData'),
    eventListenerNormalization: require('./normalizeDeclarationEventListenerTestsData'),
    systemPollerNormalization: require('./normalizeDeclarationSystemPollerTestsData'),
    systemNormalization: require('./normalizeDeclarationSystemTestsData'),
    endpointsNormalization: require('./normalizeDeclarationEndpointsTestsData'),
    pullConsumerNormalization: require('./normalizeDeclarationPullConsumerTestsData'),
    traceValueNormalization: require('./normalizeDeclarationTraceValueTestsData'),
    emptyDeclaration: {
        name: 'Empty Declaration',
        tests: [
            {
                name: 'should normalize empty declaration',
                declaration: {
                    class: 'Telemetry'
                },
                expected: {
                    components: [],
                    mappings: {}
                }
            }
        ]
    },
    keepDataUnmodified: {
        name: 'Ignore certain classes',
        tests: [
            {
                name: 'should ignore Controls classes',
                declaration: {
                    class: 'Telemetry',
                    controls: {
                        class: 'Controls',
                        logLevel: 'verbose',
                        debug: true
                    }
                },
                expected: {
                    mappings: {},
                    components: [
                        {
                            class: 'Controls',
                            logLevel: 'verbose',
                            debug: true,
                            name: 'controls',
                            id: 'f5telemetry_default::controls',
                            memoryThresholdPercent: 90,
                            namespace: 'f5telemetry_default'
                        }
                    ]
                }
            }
        ]
    }
};
