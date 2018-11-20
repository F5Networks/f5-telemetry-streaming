/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';


function overall(request) {
    const data = request.globalCtx.event.data;
    return {
        time: data.timestamp,
        host: data.hostname,
        index: data.rbac_system_index,
        source: 'bigip.tmsh.stats.summary',
        sourcetype: 'f5:bigip:stats:iapp:json',
        event: {
            aggr_period: data.aggregationPeriod,
            devicegroup: data.deviceGroup,
            facility: data.facility,
            files_sent: request.results.numberOfRequests,
            bytes_transfered: request.results.dataLength
        }
    };
}


const stats = [
    function (request) {
        const data = request.globalCtx.event.data;
        const networkInterfaces = data.networkInterfaces;
        if (networkInterfaces === undefined) return undefined;

        return {
            time: data.timestamp,
            host: data.hostname,
            index: data.rbac_system_index,
            source: 'bigip.tmsh.system_status',
            sourcetype: 'f5:bigip:status:iapp:json',
            event: {
                iapp_version: data.iappVersion,
                aggr_period: data.aggregationPeriod,
                device_base_mac: data.baseMac,
                devicegroup: data.deviceGroup,
                facility: data.facility,
                version: data.version,
                build: data.versionBuild,
                location: data.location,
                callbackurl: undefined,
                description: data.description,
                'marketing-name': data.marketingName,
                'platform-id': data.platformId,
                'failover-state': data.failoverState,
                'chassis-id': data.chassisId,
                mode: data.syncMode,
                'sync-status': data.syncStatus,
                'sync-summary': data.syncSummary,
                'sync-color': data.syncColor,
                asm_state: data.asmState,
                last_asm_change: data.lastAsmChange,
                apm_state: data.apmState,
                afm_state: data.afmState,
                last_afm_deploy: data.lastAfmDeploy,
                ltm_config_time: data.ltmConfigTime,
                gtm_config_time: data.gtmConfigTime
            }
        };
    },

    function (request) {
        const data = request.globalCtx.event.data;
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
    },

    function (request) {
        const data = request.globalCtx.event.data;
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
    }
];


module.exports = {
    overall,
    stats
};
