/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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
