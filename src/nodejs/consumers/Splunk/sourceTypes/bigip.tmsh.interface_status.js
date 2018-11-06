/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = async function (request) {
    const data = request.data;
    const networkInterfaces = data.networkInterfaces;
    if (networkInterfaces === undefined) return undefined;

    const template = {
        time: data.timestamp,
        host: data.hostname,
        index: data.rbac_system_index,
        source: 'bigip.tmsh.interface_status',
        sourcetype: 'f5:bigip:status:iapp:json',
        event: {
            aggr_period: data.aggregationPeriod,
            device_base_mac: data.baseMac,
            devicegroup: data.deviceGroup,
            facility: data.facility
        }
    };

    return Object.keys(networkInterfaces).map((key) => {
        const newData = Object.assign({}, template);
        newData.event = Object.assign({}, template.event);
        newData.event.interface_name = key;
        newData.event.interface_status = networkInterfaces[key].status;
        return newData;
    });
};