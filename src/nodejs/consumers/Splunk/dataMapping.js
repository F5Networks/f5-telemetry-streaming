/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

// Canonical format
function defaultFormat(globalCtx) {
    const data = globalCtx.event.data;

    // certain events may not have system object
    let time = Date.parse(new Date()); let host = 'null';
    try {
        time = Date.parse(data.system.systemTimestamp);
        host = data.system.hostname;
    } catch (e) {
        // continue
    }

    return {
        time,
        host,
        source: 'f5.telemetry',
        sourcetype: 'f5:telemetry:json',
        event: data
    };
}

// Old Splunk format
const SOURCE_2_TYPES = {
    'bigip.stats.summary': 'f5:bigip:stats:iapp:json',
    'bigip.tmsh.system_status': 'f5:bigip:status:iapp:json',
    'bigip.tmsh.interface_status': 'f5:bigip:status:iapp:json',
    'bigip.tmsh.disk_usage': 'f5:bigip:status:iapp:json',
    'bigip.tmsh.disk_latency': 'f5:bigip:status:iapp:json',
    'bigip.tmsh.virtual_status': 'f5:bigip:config:iapp:json',
    'bigip.tmsh.pool_member_status': 'f5:bigip:config:iapp:json',
    'bigip.objectmodel.cert': 'f5:bigip:config:iapp:json',
    'bigip.objectmodel.profile': 'f5:bigip:config:iapp:json',
    'bigip.ihealth.diagnostics': 'f5:bigip:ihealth:iapp:json'
};

function getTemplate(sourceName, data, cache) {
    return {
        time: cache.dataTimestamp,
        host: data.system.hostname,
        source: sourceName,
        sourcetype: SOURCE_2_TYPES[sourceName],
        event: {
            aggr_period: data.telemetryServiceInfo.pollingInterval,
            device_base_mac: data.system.baseMac,
            devicegroup: data.system.deviceGroup || '',
            facility: data.system.facility || ''
        }
    };
}

function getData(request, key) {
    let data = request.globalCtx.event.data;
    const splitedKey = key.split('.');

    for (let i = 0; i < splitedKey.length; i += 1) {
        data = data[splitedKey[i]];
        if (data === undefined || data === 'missing data') {
            data = undefined;
            break;
        }
    }
    return data;
}

function overall(request) {
    const data = request.globalCtx.event.data;
    const template = getTemplate('bigip.stats.summary', data, request.cache);
    Object.assign(template.event, {
        files_sent: request.results.numberOfRequests,
        bytes_transfered: request.results.dataLength
    });
    return template;
}

function ihealth(request) {
    const data = request.globalCtx.event.data;
    const diagnostics = getData(request, 'diagnostics');
    const system = getData(request, 'system');
    const template = getTemplate('bigip.ihealth.diagnostics', data, request.cache);
    const output = [];

    diagnostics.forEach((diagnostic) => {
        const newData = Object.assign({}, template);
        const solutions = diagnostic.solution || [];
        const versions = diagnostic.version || [];

        const verStr = verObj => `${verObj.major}.${verObj.minor}.${verObj.maintenance}.${verObj.point}`;

        newData.event = {
            Category: diagnostic.importance,
            Heuristic: diagnostic.name,
            Internal: 'no',
            Title: diagnostic.header,
            Description: diagnostic.summary,
            Solutions: solutions.map(s => s.id).join(' '),
            'Solution Hyperlinks': solutions.map(s => s.value).join(' '),
            version: versions.map(verStr).join(' '),
            hostname: system.hostname,
            ihealth_link: system.ihealthLink,
            qkview_number: system.qkviewNumber
        };
        output.push(newData);
    });
    return output;
}


const stats = [
    function (request) {
        const data = getData(request, 'system');
        const template = getTemplate('bigip.tmsh.system_status', request.globalCtx.event.data, request.cache);
        Object.assign(template.event, {
            iapp_version: data.iappVersion,
            version: data.version,
            build: data.versionBuild,
            location: data.location,
            callbackurl: undefined,
            description: data.description,
            'marketing-name': data.marketingName,
            'platform-id': data.platformId,
            'failover-state': data.failoverStatus,
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
        });
        return template;
    },

    function (request) {
        const networkInterfaces = getData(request, 'system.networkInterfaces');
        if (networkInterfaces === undefined) return undefined;

        const template = getTemplate('bigip.tmsh.interface_status', request.globalCtx.event.data, request.cache);
        return Object.keys(networkInterfaces).map((key) => {
            const newData = Object.assign({}, template);
            newData.event = Object.assign({}, template.event);
            newData.event.interface_name = key;
            newData.event.interface_status = networkInterfaces[key].status;
            return newData;
        });
    },

    function (request) {
        const diskStorage = getData(request, 'system.diskStorage');
        if (diskStorage === undefined) return undefined;

        const template = getTemplate('bigip.tmsh.disk_usage', request.globalCtx.event.data, request.cache);
        return Object.keys(diskStorage).map((key) => {
            const newData = Object.assign({}, template);
            newData.event = Object.assign({}, diskStorage[key]);
            newData.event.Filesystem = key;
            Object.assign(newData.event, template.event);
            return newData;
        });
    },

    function (request) {
        const diskLatency = getData(request, 'system.diskLatency');
        if (diskLatency === undefined) return undefined;

        const template = getTemplate('bigip.tmsh.disk_latency', request.globalCtx.event.data, request.cache);
        return Object.keys(diskLatency).map((key) => {
            const newData = Object.assign({}, template);
            newData.event = Object.assign({}, diskLatency[key]);
            newData.event.Device = key;
            Object.assign(newData.event, template.event);
            return newData;
        });
    },

    function (request) {
        const sslCerts = getData(request, 'sslCerts');
        if (sslCerts === undefined) return undefined;

        const template = getTemplate('bigip.objectmodel.cert', request.globalCtx.event.data, request.cache);
        return Object.keys(sslCerts).map((key) => {
            const newData = Object.assign({}, template);
            newData.event = Object.assign({}, template.event);
            newData.event.cert_name = key;
            newData.event.cert_subject = sslCerts[key].subject;
            newData.event.cert_expiration_date = sslCerts[key].expirationDate;
            return newData;
        });
    },

    function (request) {
        const vsStats = getData(request, 'virtualServers');
        if (vsStats === undefined) return undefined;

        const template = getTemplate('bigip.tmsh.virtual_status', request.globalCtx.event.data, request.cache);
        return Object.keys(vsStats).map((key) => {
            const vsStat = vsStats[key];
            const newData = Object.assign({}, template);
            newData.event = Object.assign({}, template.event);
            newData.event.virtual_name = key;
            newData.event.app = vsStat.application;
            newData.event.appComponent = '';
            newData.event.tenant = vsStat.tenant;
            newData.event.availability_state = vsStat.availabilityState;
            newData.event.enabled_state = vsStat.enabledState;
            newData.event.status_reason = '';
            return newData;
        });
    },

    function (request) {
        const poolStats = getData(request, 'pools');
        if (poolStats === undefined) return undefined;

        const template = getTemplate('bigip.tmsh.pool_member_status', request.globalCtx.event.data, request.cache);
        const output = [];

        Object.keys(poolStats).forEach((poolName) => {
            const poolMembers = poolStats[poolName].members;
            Object.keys(poolMembers).forEach((poolMemberName) => {
                const poolMember = poolMembers[poolMemberName];
                const newData = Object.assign({}, template);
                newData.event = Object.assign({}, template.event);
                newData.event.pool_name = poolName;
                newData.event.pool_member_name = poolMemberName;
                newData.event.callbackurl = '';
                newData.event.address = poolMember.addr;
                newData.event.port = poolMember.port;
                newData.event.session_status = '';
                newData.event.availability_state = poolMember.availabilityState;
                newData.event.enabled_state = poolMember.enabledState;
                newData.event.status_reason = poolMember.statusReason;
                output.push(newData);
            });
        });
        return output;
    }
];


module.exports = {
    overall,
    stats,
    ihealth,
    defaultFormat
};
