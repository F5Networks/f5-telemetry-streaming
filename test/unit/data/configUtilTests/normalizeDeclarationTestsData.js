/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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
                        logLevel: 'debug',
                        debug: true
                    }
                },
                expected: {
                    mappings: {},
                    components: [
                        {
                            class: 'Controls',
                            logLevel: 'debug',
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
