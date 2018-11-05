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
};