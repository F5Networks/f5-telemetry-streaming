/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/**
* Report's overll summary
*
* @param {Object} request         - request with included context
* @param {Object} request.data    - normalized data
* @param {Object} request.context - context information
*
* @returns {Object} Promise resolved with summary object
*/
module.exports = function (request) {
    return new Promise((resolve) => {
        const data = request.data;
        resolve({
            time: data.timestamp,
            host: data.hostname,
            index: data.rbac_system_index,
            source: 'bigip.tmsh.stats.summary',
            sourcetype: 'f5:bigip:stats:iapp:json',
            event: {
                aggr_period: data.aggregationPeriod,
                devicegroup: data.deviceGroup,
                facility: data.facility,
                files_sent: request.context.numberOfRequests,
                bytes_transfered: request.context.dataLength
            }
        });
    });
};
