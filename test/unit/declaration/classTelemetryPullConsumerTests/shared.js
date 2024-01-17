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

const validatePartOfIt = require('../common').validatePartOfIt;

module.exports = {
    /**
     * Validate full declaration
     *
     * @param {object} consumerProps - consumer properties
     * @param {object} expectedProps - expected properties
     * @param {object} addtlContext - additional context
     *
     * @returns {Promise<any>} resolved with validated declaration
     */
    validateFull(consumerProps, expectedProps, addtlContext) {
        return validatePartOfIt(
            {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_Poller']
                },
                My_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_Other_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    enable: false,
                    trace: true,
                    systemPoller: ['My_Poller', 'My_Other_Poller']
                }
            },
            'My_Pull_Consumer',
            consumerProps,
            {
                class: 'Telemetry_Pull_Consumer',
                type: 'default',
                enable: false,
                trace: true,
                systemPoller: ['My_Poller', 'My_Other_Poller']
            },
            expectedProps,
            addtlContext
        );
    },

    /**
     * Validate minimal declaration
     *
     * @param {object} consumerProps - consumer properties
     * @param {object} expectedProps - expected properties
     * @param {object} addtlContext - additional context
     *
     * @returns {Promise<any>} resolved with validated declaration
     */
    validateMinimal(consumerProps, expectedProps, addtlContext) {
        return validatePartOfIt(
            {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: ['My_Poller']
                },
                My_Poller: {
                    class: 'Telemetry_System_Poller'
                },
                My_Pull_Consumer: {
                    class: 'Telemetry_Pull_Consumer',
                    type: 'default',
                    systemPoller: 'My_Poller'
                }
            },
            'My_Pull_Consumer',
            consumerProps,
            {
                class: 'Telemetry_Pull_Consumer',
                type: 'default',
                systemPoller: 'My_Poller',
                enable: true,
                trace: false
            },
            expectedProps,
            addtlContext
        );
    }
};
