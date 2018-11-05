/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = function (request) {
    const data = request.data;
    const diskStorage = data.diskStorage;
    if (diskStorage === undefined) return undefined;

    const template = {
        time: data.timestamp,
        host: data.hostname,
        index: data.rbac_system_index,
        source: 'bigip.tmsh.disk_usage',
        sourcetype: 'f5:bigip:status:iapp:json',
        event: {
            aggr_period: data.aggregationPeriod,
            device_base_mac: data.baseMac,
            devicegroup: data.deviceGroup,
            facility: data.facility
        }
    };

    return Object.keys(diskStorage).map((key) => {
        const newData = Object.assign({}, template);
        newData.event = Object.assign({}, diskStorage[key]);
        Object.assign(newData.event, template.event);
        return newData;
    });
};