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
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false,
                    trace: true,
                    enableHostConnectivityCheck: true,
                    allowSelfSignedCert: true
                }
            },
            'My_Consumer',
            consumerProps,
            {
                class: 'Telemetry_Consumer',
                type: 'default',
                enable: false,
                trace: true,
                enableHostConnectivityCheck: true,
                allowSelfSignedCert: true
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
                My_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'default'
                }
            },
            'My_Consumer',
            consumerProps,
            {
                class: 'Telemetry_Consumer',
                type: 'default',
                enable: true,
                trace: false,
                allowSelfSignedCert: false
            },
            expectedProps,
            addtlContext
        );
    }
};
