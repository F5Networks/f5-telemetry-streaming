/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    eventData: [
        {
            expectedData: [
                {
                    allowSelfSignedCert: true,
                    body: [
                        {
                            AggrInterval: '300',
                            AvgConcurrentConnections: '66',
                            AvgCpu: '1096',
                            AvgCpuAnalysisPlane: '0',
                            AvgCpuControlPlane: '0',
                            AvgCpuDataPlane: '0',
                            AvgMemory: '3751',
                            AvgThroughput: '237991',
                            ConcurrentConnectionsHealth: '0',
                            CpuHealth: '10',
                            EOCTimestamp: '1576002300',
                            Entity: 'SystemMonitor',
                            HitCount: '1',
                            MaxConcurrentConnections: '66',
                            MaxCpu: '1096',
                            MemoryHealth: '37',
                            SlotId: '0',
                            ThroughputHealth: '0',
                            TotalBytes: '2379912',
                            errdefs_msgno: '22282286',
                            hostname: 'telemetry.bigip.com',
                            telemetryEventCategory: 'AVR'
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:5AKOPxGUtNUt32E7JJKzj0gRQdtO1abqhj6LxSOgWwo=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_AVR',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                }
            ]
        }
    ],
    systemData: [
        {
            expectedData: [
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            afmState: 'quiescent',
                            apmState: 'Policies Consistent',
                            asmState: 'Policies Consistent',
                            baseMac: '00:0d:3a:30:34:51',
                            callBackUrl: 'https://10.0.1.100',
                            chassisId: '9c3abad5-513a-1c43-5bc2be62e957',
                            configReady: 'yes',
                            cpu: 0,
                            description: 'Telemetry BIG-IP',
                            diskLatency: {
                                'dm-0': {
                                    '%util': '0.00',
                                    name: 'dm-0',
                                    'r/s': '0.00',
                                    'w/s': '0.00'
                                },
                                'dm-1': {
                                    '%util': '0.01',
                                    name: 'dm-1',
                                    'r/s': '0.01',
                                    'w/s': '11.01'
                                },
                                'dm-2': {
                                    '%util': '0.00',
                                    name: 'dm-2',
                                    'r/s': '0.14',
                                    'w/s': '2.56'
                                },
                                'dm-3': {
                                    '%util': '0.01',
                                    name: 'dm-3',
                                    'r/s': '0.01',
                                    'w/s': '4.28'
                                },
                                'dm-4': {
                                    '%util': '0.00',
                                    name: 'dm-4',
                                    'r/s': '0.00',
                                    'w/s': '0.00'
                                },
                                'dm-5': {
                                    '%util': '0.00',
                                    name: 'dm-5',
                                    'r/s': '0.04',
                                    'w/s': '1.52'
                                },
                                'dm-6': {
                                    '%util': '0.00',
                                    name: 'dm-6',
                                    'r/s': '0.13',
                                    'w/s': '0.00'
                                },
                                'dm-7': {
                                    '%util': '0.00',
                                    name: 'dm-7',
                                    'r/s': '0.00',
                                    'w/s': '0.05'
                                },
                                'dm-8': {
                                    '%util': '0.01',
                                    name: 'dm-8',
                                    'r/s': '0.11',
                                    'w/s': '4.72'
                                },
                                sda: {
                                    '%util': '0.09',
                                    name: 'sda',
                                    'r/s': '1.46',
                                    'w/s': '8.25'
                                },
                                sdb: {
                                    '%util': '0.04',
                                    name: 'sdb',
                                    'r/s': '1.00',
                                    'w/s': '0.00'
                                }
                            },
                            diskStorage: {
                                '/': {
                                    '1024-blocks': '436342',
                                    Capacity: '55%',
                                    Capacity_Float: 0.55,
                                    name: '/'
                                },
                                '/appdata': {
                                    '1024-blocks': '51607740',
                                    Capacity: '3%',
                                    Capacity_Float: 0.03,
                                    name: '/appdata'
                                },
                                '/config': {
                                    '1024-blocks': '3269592',
                                    Capacity: '11%',
                                    Capacity_Float: 0.11,
                                    name: '/config'
                                },
                                '/dev/shm': {
                                    '1024-blocks': '7181064',
                                    Capacity: '9%',
                                    Capacity_Float: 0.09,
                                    name: '/dev/shm'
                                },
                                '/mnt/sshplugin_tempfs': {
                                    '1024-blocks': '7181064',
                                    Capacity: '0%',
                                    Capacity_Float: 0,
                                    name: '/mnt/sshplugin_tempfs'
                                },
                                '/shared': {
                                    '1024-blocks': '20642428',
                                    Capacity: '3%',
                                    Capacity_Float: 0.03,
                                    name: '/shared'
                                },
                                '/shared/rrd.1.2': {
                                    '1024-blocks': '7181064',
                                    Capacity: '1%',
                                    Capacity_Float: 0.01,
                                    name: '/shared/rrd.1.2'
                                },
                                '/usr': {
                                    '1024-blocks': '4136432',
                                    Capacity: '83%',
                                    Capacity_Float: 0.83,
                                    name: '/usr'
                                },
                                '/var': {
                                    '1024-blocks': '3096336',
                                    Capacity: '37%',
                                    Capacity_Float: 0.37,
                                    name: '/var'
                                },
                                '/var/apm/mount/apmclients-7170.2018.627.21-3.0.iso': {
                                    '1024-blocks': '298004',
                                    Capacity: '100%',
                                    Capacity_Float: 1,
                                    name: '/var/apm/mount/apmclients-7170.2018.627.21-3.0.iso'
                                },
                                '/var/log': {
                                    '1024-blocks': '3023760',
                                    Capacity: '8%',
                                    Capacity_Float: 0.08,
                                    name: '/var/log'
                                },
                                '/var/loipc': {
                                    '1024-blocks': '7181064',
                                    Capacity: '0%',
                                    Capacity_Float: 0,
                                    name: '/var/loipc'
                                },
                                '/var/prompt': {
                                    '1024-blocks': '4096',
                                    Capacity: '1%',
                                    Capacity_Float: 0.01,
                                    name: '/var/prompt'
                                },
                                '/var/run': {
                                    '1024-blocks': '7181064',
                                    Capacity: '1%',
                                    Capacity_Float: 0.01,
                                    name: '/var/run'
                                },
                                '/var/tmstat': {
                                    '1024-blocks': '7181064',
                                    Capacity: '1%',
                                    Capacity_Float: 0.01,
                                    name: '/var/tmstat'
                                }
                            },
                            failoverColor: 'green',
                            failoverStatus: 'ACTIVE',
                            gtmConfigTime: '2019-06-07T18:11:53.000Z',
                            hostname: 'telemetry.bigip.com',
                            lastAfmDeploy: '2019-06-17T21:24:29.000Z',
                            lastAsmChange: '2019-06-19T20:15:28.000Z',
                            licenseReady: 'yes',
                            location: 'Seattle',
                            ltmConfigTime: '2019-06-19T21:13:40.000Z',
                            machineId: 'cd5e51b8-74ef-44c8-985c-7965512c2e87',
                            marketingName: 'BIG-IP Virtual Edition',
                            memory: 0,
                            networkInterfaces: {
                                1.1: {
                                    'counters.bitsIn': 0,
                                    'counters.bitsOut': 0,
                                    name: '1.1',
                                    status: 'up'
                                },
                                1.2: {
                                    'counters.bitsIn': 0,
                                    'counters.bitsOut': 0,
                                    name: '1.2',
                                    status: 'up'
                                },
                                mgmt: {
                                    'counters.bitsIn': 0,
                                    'counters.bitsOut': 0,
                                    name: 'mgmt',
                                    status: 'up'
                                }
                            },
                            platformId: 'Z100',
                            provisionReady: 'yes',
                            provisioning: {
                                afm: {
                                    level: 'nominal',
                                    name: 'afm'
                                },
                                am: {
                                    level: 'none',
                                    name: 'am'
                                },
                                apm: {
                                    level: 'nominal',
                                    name: 'apm'
                                },
                                asm: {
                                    level: 'nominal',
                                    name: 'asm'
                                },
                                avr: {
                                    level: 'nominal',
                                    name: 'avr'
                                },
                                dos: {
                                    level: 'none',
                                    name: 'dos'
                                },
                                fps: {
                                    level: 'none',
                                    name: 'fps'
                                },
                                gtm: {
                                    level: 'none',
                                    name: 'gtm'
                                },
                                ilx: {
                                    level: 'none',
                                    name: 'ilx'
                                },
                                lc: {
                                    level: 'none',
                                    name: 'lc'
                                },
                                ltm: {
                                    level: 'nominal',
                                    name: 'ltm'
                                },
                                pem: {
                                    level: 'none',
                                    name: 'pem'
                                },
                                sslo: {
                                    level: 'none',
                                    name: 'sslo'
                                },
                                swg: {
                                    level: 'none',
                                    name: 'swg'
                                },
                                urldb: {
                                    level: 'none',
                                    name: 'urldb'
                                }
                            },
                            configSyncSucceeded: true,
                            syncColor: 'green',
                            syncMode: 'standalone',
                            syncStatus: 'Standalone',
                            syncSummary: ' ',
                            systemTimestamp: '2019-01-01T01:01:01Z',
                            swap: 0,
                            tmmCpu: 0,
                            tmmMemory: 0,
                            tmmTraffic: {
                                'clientSideTraffic.bitsIn': 0,
                                'clientSideTraffic.bitsOut': 0,
                                'serverSideTraffic.bitsIn': 0,
                                'serverSideTraffic.bitsOut': 0
                            },
                            version: '14.0.0.1',
                            versionBuild: '0.0.2'
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:7Qvg23cc+JUi7xlcTMaAvciJbMqG6IokCH0V4kEopHE=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_system',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/app.app/app_vs': {
                                appService: '/Common/foofoo.app/foofoo',
                                application: 'foofoo.app',
                                availabilityState: 'offline',
                                'clientside.bitsIn': 0,
                                'clientside.bitsOut': 0,
                                'clientside.curConns': 0,
                                'clientside.maxConns': 0,
                                'clientside.pktsIn': 0,
                                'clientside.pktsOut': 0,
                                'clientside.totConns': 0,
                                destination: '10.5.6.7:80',
                                enabledState: 'enabled',
                                ipProtocol: 'tcp',
                                mask: '255.255.255.255',
                                name: '/Common/foofoo.app/foofoo_vs',
                                pool: '/Common/foofoo.app/foofoo_pool',
                                profiles: {
                                    '/Common/app/http': {
                                        application: 'app',
                                        name: '/Common/app/http',
                                        tenant: 'Common'
                                    },
                                    '/Common/tcp': {
                                        name: '/Common/tcp',
                                        tenant: 'Common'
                                    }
                                },
                                'status.statusReason': 'The virtual server is available',
                                tenant: 'Common'
                            },
                            '/Example_Tenant/A1/serviceMain': {
                                application: 'A1',
                                availabilityState: 'offline',
                                'clientside.bitsIn': 0,
                                'clientside.bitsOut': 0,
                                'clientside.curConns': 0,
                                'clientside.maxConns': 0,
                                'clientside.pktsIn': 0,
                                'clientside.pktsOut': 0,
                                'clientside.totConns': 0,
                                destination: '192.0.2.11:443',
                                enabledState: 'enabled',
                                ipProtocol: 'tcp',
                                mask: '255.255.255.0',
                                name: '/Example_Tenant/A1/serviceMain',
                                pool: '/Example_Tenant/A1/barbar_pool',
                                profiles: {},
                                'status.statusReason': 'The children pool member(s) either don\'t have service checking enabled, or service check results are not available yet',
                                tenant: 'Example_Tenant'
                            },
                            '/Example_Tenant/A1/serviceMain-Redirect': {
                                application: 'A1',
                                availabilityState: 'unknown',
                                'clientside.bitsIn': 0,
                                'clientside.bitsOut': 0,
                                'clientside.curConns': 0,
                                'clientside.maxConns': 0,
                                'clientside.pktsIn': 0,
                                'clientside.pktsOut': 0,
                                'clientside.totConns': 0,
                                destination: '192.0.2.11:80',
                                enabledState: 'enabled',
                                name: '/Example_Tenant/A1/serviceMain-Redirect',
                                profiles: {
                                    '/Common/app/http': {
                                        application: 'app',
                                        name: '/Common/app/http',
                                        tenant: 'Common'
                                    },
                                    '/Common/customTcp': {
                                        name: '/Common/customTcp',
                                        tenant: 'Common'
                                    }
                                },
                                'status.statusReason': 'The children pool member(s) either don\'t have service checking enabled, or service check results are not available yet',
                                tenant: 'Example_Tenant'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:fXbTcwglyeCjGtg2DLxT6ZgotDRZqDMMs7+7ZCV8bhc=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_virtualServers',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/app.app/app_pool': {
                                activeMemberCnt: 0,
                                application: 'app.app',
                                availabilityState: 'available',
                                enabledState: 'enabled',
                                members: {
                                    '/Common/10.0.3.5:80': {
                                        addr: '10.0.3.5',
                                        availabilityState: 'available',
                                        enabledState: 'enabled',
                                        monitorStatus: 'up',
                                        port: 0,
                                        'serverside.bitsIn': 0,
                                        'serverside.bitsOut': 0,
                                        'serverside.curConns': 0,
                                        'serverside.maxConns': 0,
                                        'serverside.pktsIn': 0,
                                        'serverside.pktsOut': 0,
                                        'serverside.totConns': 0,
                                        'status.statusReason': 'Pool member is available'
                                    }
                                },
                                name: '/Common/app.app/app_pool',
                                'serverside.bitsIn': 0,
                                'serverside.bitsOut': 0,
                                'serverside.curConns': 0,
                                'serverside.maxConns': 0,
                                'serverside.pktsIn': 0,
                                'serverside.pktsOut': 0,
                                'serverside.totConns': 0,
                                'status.statusReason': 'The pool is available',
                                tenant: 'Common'
                            },
                            '/Common/telemetry-local': {
                                activeMemberCnt: 0,
                                application: '',
                                availabilityState: 'available',
                                enabledState: 'enabled',
                                members: {
                                    '/Common/10.0.1.100:6514': {
                                        addr: '10.0.1.100',
                                        availabilityState: 'available',
                                        enabledState: 'enabled',
                                        monitorStatus: 'down',
                                        port: 0,
                                        'serverside.bitsIn': 0,
                                        'serverside.bitsOut': 0,
                                        'serverside.curConns': 0,
                                        'serverside.maxConns': 0,
                                        'serverside.pktsIn': 0,
                                        'serverside.pktsOut': 0,
                                        'serverside.totConns': 0,
                                        'status.statusReason': 'Pool member has been marked down by a monitor'
                                    }
                                },
                                name: '/Common/telemetry-local',
                                'serverside.bitsIn': 0,
                                'serverside.bitsOut': 0,
                                'serverside.curConns': 0,
                                'serverside.maxConns': 0,
                                'serverside.pktsIn': 0,
                                'serverside.pktsOut': 0,
                                'serverside.totConns': 0,
                                'status.statusReason': 'The pool is available',
                                tenant: 'Common'
                            },
                            '/Example_Tenant/A1/hsl_pool': {
                                activeMemberCnt: 0,
                                application: 'A1',
                                availabilityState: 'offline',
                                enabledState: 'enabled',
                                members: {
                                    '/Example_Tenant/192.168.120.6:514': {
                                        addr: '192.168.120.6',
                                        availabilityState: 'offline',
                                        enabledState: 'enabled',
                                        monitorStatus: 'up',
                                        port: 0,
                                        'serverside.bitsIn': 0,
                                        'serverside.bitsOut': 0,
                                        'serverside.curConns': 0,
                                        'serverside.maxConns': 0,
                                        'serverside.pktsIn': 0,
                                        'serverside.pktsOut': 0,
                                        'serverside.totConns': 0,
                                        'status.statusReason': 'Pool member is available'
                                    }
                                },
                                name: '/Example_Tenant/A1/hsl_pool',
                                'serverside.bitsIn': 0,
                                'serverside.bitsOut': 0,
                                'serverside.curConns': 0,
                                'serverside.maxConns': 0,
                                'serverside.pktsIn': 0,
                                'serverside.pktsOut': 0,
                                'serverside.totConns': 0,
                                'status.statusReason': 'The pool is available',
                                tenant: 'Example_Tenant'
                            },
                            '/Example_Tenant/A1/web_pool': {
                                activeMemberCnt: 0,
                                application: 'A1',
                                availabilityState: 'offline',
                                enabledState: 'enabled',
                                members: {
                                    '/Example_Tenant/192.0.2.12:80': {
                                        addr: '192.0.2.12',
                                        availabilityState: 'offline',
                                        enabledState: 'enabled',
                                        monitorStatus: 'up',
                                        port: 0,
                                        'serverside.bitsIn': 0,
                                        'serverside.bitsOut': 0,
                                        'serverside.curConns': 0,
                                        'serverside.maxConns': 0,
                                        'serverside.pktsIn': 0,
                                        'serverside.pktsOut': 0,
                                        'serverside.totConns': 0,
                                        'status.statusReason': 'Pool member is available'
                                    },
                                    '/Example_Tenant/192.0.2.13:80': {
                                        addr: '192.0.2.13',
                                        availabilityState: 'offline',
                                        enabledState: 'enabled',
                                        monitorStatus: 'up',
                                        port: 0,
                                        'serverside.bitsIn': 0,
                                        'serverside.bitsOut': 0,
                                        'serverside.curConns': 0,
                                        'serverside.maxConns': 0,
                                        'serverside.pktsIn': 0,
                                        'serverside.pktsOut': 0,
                                        'serverside.totConns': 0,
                                        'status.statusReason': 'Pool member is available'
                                    }
                                },
                                name: '/Example_Tenant/A1/web_pool',
                                'serverside.bitsIn': 0,
                                'serverside.bitsOut': 0,
                                'serverside.curConns': 0,
                                'serverside.maxConns': 0,
                                'serverside.pktsIn': 0,
                                'serverside.pktsOut': 0,
                                'serverside.totConns': 0,
                                'status.statusReason': 'The pool is available',
                                tenant: 'Example_Tenant'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:1oFmIkjCcPPDKVHQCVaCRMod3Cvpx4nc15WA/MWjNJw=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_pools',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/app.app/app_policy': {
                                actions: {
                                    'default:1': {
                                        invoked: 0,
                                        succeeded: 0
                                    }
                                },
                                application: 'app.app',
                                invoked: 0,
                                name: '/Common/app.app/app_policy',
                                succeeded: 0,
                                tenant: 'Common'
                            },
                            '/Common/telemetry': {
                                actions: {
                                    'default:0': {
                                        invoked: 0,
                                        succeeded: 0
                                    }
                                },
                                application: '',
                                invoked: 0,
                                name: '/Common/telemetry',
                                succeeded: 0,
                                tenant: 'Common'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:E0MFCzLc6Z3ZDof9nhYp8/ldmp+L0SivJMxKIUQLX7k=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_ltmPolicies',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/app.app/app_http': {
                                '2xxResp': 0,
                                '3xxResp': 0,
                                '4xxResp': 0,
                                '5xxResp': 0,
                                application: 'app.app',
                                cookiePersistInserts: 0,
                                getReqs: 0,
                                maxKeepaliveReq: 0,
                                name: '/Common/app.app/app_http',
                                numberReqs: 0,
                                postReqs: 0,
                                respGreaterThan2m: 0,
                                respLessThan2m: 0,
                                tenant: 'Common',
                                v10Reqs: 0,
                                v10Resp: 0,
                                v11Reqs: 0,
                                v11Resp: 0,
                                v9Reqs: 0,
                                v9Resp: 0
                            },
                            '/Common/http': {
                                '2xxResp': 0,
                                '3xxResp': 0,
                                '4xxResp': 0,
                                '5xxResp': 0,
                                application: '',
                                cookiePersistInserts: 0,
                                getReqs: 0,
                                maxKeepaliveReq: 0,
                                name: '/Common/http',
                                numberReqs: 0,
                                postReqs: 0,
                                respGreaterThan2m: 0,
                                respLessThan2m: 0,
                                tenant: 'Common',
                                v10Reqs: 0,
                                v10Resp: 0,
                                v11Reqs: 0,
                                v11Resp: 0,
                                v9Reqs: 0,
                                v9Resp: 0
                            },
                            '/Example_Tenant/A1/custom_http_profile': {
                                '2xxResp': 0,
                                '3xxResp': 0,
                                '4xxResp': 0,
                                '5xxResp': 0,
                                application: 'A1',
                                cookiePersistInserts: 0,
                                getReqs: 0,
                                maxKeepaliveReq: 0,
                                name: '/Example_Tenant/A1/custom_http_profile',
                                numberReqs: 0,
                                postReqs: 0,
                                respGreaterThan2m: 0,
                                respLessThan2m: 0,
                                tenant: 'Example_Tenant',
                                v10Reqs: 0,
                                v10Resp: 0,
                                v11Reqs: 0,
                                v11Resp: 0,
                                v9Reqs: 0,
                                v9Resp: 0
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:IkF4hrWwU+QsuqJQ5RuUD+tiMfOHP8aJvpESMv+vAXA=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_httpProfiles',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/clientssl': {
                                activeHandshakeRejected: 0,
                                application: '',
                                'cipherUses.adhKeyxchg': 0,
                                'cipherUses.aesBulk': 0,
                                'cipherUses.aesGcmBulk': 0,
                                'cipherUses.camelliaBulk': 0,
                                'cipherUses.chacha20Poly1305Bulk': 0,
                                'cipherUses.desBulk': 0,
                                'cipherUses.dhRsaKeyxchg': 0,
                                'cipherUses.dheDssKeyxchg': 0,
                                'cipherUses.ecdhEcdsaKeyxchg': 0,
                                'cipherUses.ecdhRsaKeyxchg': 0,
                                'cipherUses.ecdheEcdsaKeyxchg': 0,
                                'cipherUses.ecdheRsaKeyxchg': 0,
                                'cipherUses.edhRsaKeyxchg': 0,
                                'cipherUses.ideaBulk': 0,
                                'cipherUses.md5Digest': 0,
                                'cipherUses.nullBulk': 0,
                                'cipherUses.nullDigest': 0,
                                'cipherUses.rc2Bulk': 0,
                                'cipherUses.rc4Bulk': 0,
                                'cipherUses.rsaKeyxchg': 0,
                                'cipherUses.shaDigest': 0,
                                currentActiveHandshakes: 0,
                                currentCompatibleConnections: 0,
                                currentConnections: 0,
                                currentNativeConnections: 0,
                                decryptedBytesIn: 0,
                                decryptedBytesOut: 0,
                                encryptedBytesIn: 0,
                                encryptedBytesOut: 0,
                                fatalAlerts: 0,
                                handshakeFailures: 0,
                                name: '/Common/clientssl',
                                peercertInvalid: 0,
                                peercertNone: 0,
                                peercertValid: 0,
                                'protocolUses.dtlsv1': 0,
                                'protocolUses.sslv2': 0,
                                'protocolUses.sslv3': 0,
                                'protocolUses.tlsv1': 0,
                                'protocolUses.tlsv1_1': 0,
                                'protocolUses.tlsv1_2': 0,
                                'protocolUses.tlsv1_3': 0,
                                recordsIn: 0,
                                recordsOut: 0,
                                sniRejects: 0,
                                tenant: 'Common',
                                totCompatConns: 0,
                                totNativeConns: 0
                            },
                            '/Example_Tenant/A1/webtls': {
                                activeHandshakeRejected: 0,
                                application: 'A1',
                                'cipherUses.adhKeyxchg': 0,
                                'cipherUses.aesBulk': 0,
                                'cipherUses.aesGcmBulk': 0,
                                'cipherUses.camelliaBulk': 0,
                                'cipherUses.chacha20Poly1305Bulk': 0,
                                'cipherUses.desBulk': 0,
                                'cipherUses.dhRsaKeyxchg': 0,
                                'cipherUses.dheDssKeyxchg': 0,
                                'cipherUses.ecdhEcdsaKeyxchg': 0,
                                'cipherUses.ecdhRsaKeyxchg': 0,
                                'cipherUses.ecdheEcdsaKeyxchg': 0,
                                'cipherUses.ecdheRsaKeyxchg': 0,
                                'cipherUses.edhRsaKeyxchg': 0,
                                'cipherUses.ideaBulk': 0,
                                'cipherUses.md5Digest': 0,
                                'cipherUses.nullBulk': 0,
                                'cipherUses.nullDigest': 0,
                                'cipherUses.rc2Bulk': 0,
                                'cipherUses.rc4Bulk': 0,
                                'cipherUses.rsaKeyxchg': 0,
                                'cipherUses.shaDigest': 0,
                                currentActiveHandshakes: 0,
                                currentCompatibleConnections: 0,
                                currentConnections: 0,
                                currentNativeConnections: 0,
                                decryptedBytesIn: 0,
                                decryptedBytesOut: 0,
                                encryptedBytesIn: 0,
                                encryptedBytesOut: 0,
                                fatalAlerts: 0,
                                handshakeFailures: 0,
                                name: '/Example_Tenant/A1/webtls',
                                peercertInvalid: 0,
                                peercertNone: 0,
                                peercertValid: 0,
                                'protocolUses.dtlsv1': 0,
                                'protocolUses.sslv2': 0,
                                'protocolUses.sslv3': 0,
                                'protocolUses.tlsv1': 0,
                                'protocolUses.tlsv1_1': 0,
                                'protocolUses.tlsv1_2': 0,
                                'protocolUses.tlsv1_3': 0,
                                recordsIn: 0,
                                recordsOut: 0,
                                sniRejects: 0,
                                tenant: 'Example_Tenant',
                                totCompatConns: 100,
                                totNativeConns: 100
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:3bKXfVgHp75WNYpskuw06OGi59rQmJcibOdute3ysSY=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_clientSslProfiles',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/serverssl': {
                                activeHandshakeRejected: 0,
                                application: '',
                                'cipherUses.adhKeyxchg': 0,
                                'cipherUses.aesBulk': 0,
                                'cipherUses.aesGcmBulk': 0,
                                'cipherUses.camelliaBulk': 0,
                                'cipherUses.chacha20Poly1305Bulk': 0,
                                'cipherUses.desBulk': 0,
                                'cipherUses.dhRsaKeyxchg': 0,
                                'cipherUses.dheDssKeyxchg': 0,
                                'cipherUses.ecdhEcdsaKeyxchg': 0,
                                'cipherUses.ecdhRsaKeyxchg': 0,
                                'cipherUses.ecdheEcdsaKeyxchg': 0,
                                'cipherUses.ecdheRsaKeyxchg': 0,
                                'cipherUses.edhRsaKeyxchg': 0,
                                'cipherUses.ideaBulk': 0,
                                'cipherUses.md5Digest': 0,
                                'cipherUses.nullBulk': 0,
                                'cipherUses.nullDigest': 0,
                                'cipherUses.rc2Bulk': 0,
                                'cipherUses.rc4Bulk': 0,
                                'cipherUses.rsaKeyxchg': 0,
                                'cipherUses.shaDigest': 0,
                                currentActiveHandshakes: 0,
                                currentCompatibleConnections: 0,
                                currentConnections: 0,
                                currentNativeConnections: 0,
                                decryptedBytesIn: 0,
                                decryptedBytesOut: 0,
                                encryptedBytesIn: 0,
                                encryptedBytesOut: 0,
                                fatalAlerts: 0,
                                handshakeFailures: 0,
                                name: '/Common/serverssl',
                                peercertInvalid: 0,
                                peercertNone: 0,
                                peercertValid: 0,
                                'protocolUses.dtlsv1': 0,
                                'protocolUses.sslv2': 0,
                                'protocolUses.sslv3': 0,
                                'protocolUses.tlsv1': 0,
                                'protocolUses.tlsv1_1': 0,
                                'protocolUses.tlsv1_2': 0,
                                'protocolUses.tlsv1_3': 0,
                                recordsIn: 0,
                                recordsOut: 0,
                                tenant: 'Common',
                                totCompatConns: 0,
                                totNativeConns: 0
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:EJXLWlrW18LS9xrmeCdEC05Z8tTN3mUvm6RAzMi6Cg4=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_serverSslProfiles',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            'ca-bundle.crt': {
                                expirationDate: 0,
                                expirationString: '2019-01-01T01:01:01Z',
                                issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                                name: 'ca-bundle.crt',
                                subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US'
                            },
                            'default.crt': {
                                email: 'root@localhost.localdomain',
                                expirationDate: 0,
                                expirationString: '2019-01-01T01:01:01Z',
                                issuer: 'emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US',
                                name: 'default.crt',
                                subject: 'emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US'
                            },
                            'f5-ca-bundle.crt': {
                                expirationDate: 0,
                                expirationString: '2019-01-01T01:01:01Z',
                                issuer: 'CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US',
                                name: 'f5-ca-bundle.crt',
                                subject: 'CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US'
                            },
                            'f5-irule.crt': {
                                email: 'support@f5.com',
                                expirationDate: 0,
                                expirationString: '2019-01-01T01:01:01Z',
                                issuer: 'emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US',
                                name: 'f5-irule.crt',
                                subject: 'emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:EzEJLzxg7dkhDVSrwISns1SoLpl9fMoW2MKQCnvdG9A=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_sslCerts',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/http-tunnel': {
                                application: '',
                                hcInBroadcastPkts: 0,
                                hcInMulticastPkts: 0,
                                hcInOctets: 0,
                                hcInUcastPkts: 0,
                                hcOutBroadcastPkts: 0,
                                hcOutMulticastPkts: 0,
                                hcOutOctets: 0,
                                hcOutUcastPkts: 0,
                                inDiscards: 0,
                                inErrors: 0,
                                inUnknownProtos: 0,
                                name: '/Common/http-tunnel',
                                outDiscards: 0,
                                outErrors: 0,
                                tenant: 'Common'
                            },
                            '/Common/socks-tunnel': {
                                application: '',
                                hcInBroadcastPkts: 0,
                                hcInMulticastPkts: 0,
                                hcInOctets: 0,
                                hcInUcastPkts: 0,
                                hcOutBroadcastPkts: 0,
                                hcOutMulticastPkts: 0,
                                hcOutOctets: 0,
                                hcOutUcastPkts: 0,
                                inDiscards: 0,
                                inErrors: 0,
                                inUnknownProtos: 0,
                                name: '/Common/socks-tunnel',
                                outDiscards: 0,
                                outErrors: 0,
                                tenant: 'Common'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:qdPsT7QrVBBRPZGG8/VWayuOonbwMrH6cinD43R7jZI=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_networkTunnels',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/device_trust_group': {
                                commitIdTime: '2019-06-10T17:23:02.000Z',
                                lssTime: '-',
                                name: '/Common/device_trust_group',
                                tenant: 'Common',
                                timeSinceLastSync: '-',
                                type: 'sync-only'
                            },
                            '/Common/example_device_group': {
                                commitIdTime: '2019-05-31T01:11:48.000Z',
                                lssTime: '2019-05-31T01:11:48.000Z',
                                name: '/Common/example_device_group',
                                tenant: 'Common',
                                timeSinceLastSync: '1221553',
                                type: 'sync-failover'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:uY0dzcxY1UIXSVSBHpvdTPjOZjswUHsLHyBU0oVAfrc=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_deviceGroups',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth': {
                                application: '',
                                events: {
                                    HTTP_REQUEST: {
                                        aborts: 0,
                                        avgCycles: 19014,
                                        failures: 0,
                                        maxCycles: 19014,
                                        minCycles: 8804,
                                        priority: 500,
                                        totalExecutions: 4
                                    },
                                    RULE_INIT: {
                                        aborts: 0,
                                        avgCycles: 19014,
                                        failures: 0,
                                        maxCycles: 19014,
                                        minCycles: 8804,
                                        priority: 500,
                                        totalExecutions: 4
                                    }
                                },
                                name: '/Common/_sys_APM_ExchangeSupport_OA_BasicAuth',
                                tenant: 'Common'
                            },
                            '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth': {
                                application: '',
                                events: {
                                    RULE_INIT: {
                                        aborts: 0,
                                        avgCycles: 28942,
                                        failures: 0,
                                        maxCycles: 28942,
                                        minCycles: 20102,
                                        priority: 500,
                                        totalExecutions: 4
                                    }
                                },
                                name: '/Common/_sys_APM_ExchangeSupport_OA_NtlmAuth',
                                tenant: 'Common'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:RWPxN+yDuFgMUqK9tzE+P8oixQC4uZcZDcmhZbTPbr8=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_iRules',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/www.aone.tstest.com': {
                                aliases: [
                                    'www.aone.com'
                                ],
                                alternate: 0,
                                cnameResolutions: 0,
                                dropped: 0,
                                enabled: true,
                                failureRcode: 'noerror',
                                failureRcodeResponse: 'disabled',
                                failureRcodeTtl: 0,
                                fallback: 0,
                                lastResortPool: '',
                                loadBalancingDecisionLogVerbosity: [
                                    'pool-traversal'
                                ],
                                minimalResponse: 'enabled',
                                name: '/Common/www.aone.tstest.com',
                                persistCidrIpv4: 32,
                                persistCidrIpv6: 128,
                                persisted: 0,
                                persistence: 'disabled',
                                poolLbMode: 'round-robin',
                                pools: [
                                    '/Common/ts_a_pool',
                                    '/Common/ts_cname_pool'
                                ],
                                preferred: 0,
                                rcode: 0,
                                requests: 0,
                                resolutions: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                rules: [
                                    '/Common/test_irule'
                                ],
                                'status.availabilityState': 'offline',
                                'status.enabledState': 'enabled',
                                'status.statusReason': 'No enabled pools available',
                                tenant: 'Common',
                                ttlPersistence: 3600,
                                wipType: 'A'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:udje+RB8j6HnkFUGbmBN7XrNu8p5Hr+1p2FDpyZPVZI=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_aWideIps',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/www.aaaaone.tstest.com': {
                                aliases: [
                                    'www.aaaaone.com',
                                    'www.aaaathree.com',
                                    'www.aaaatwo.com'
                                ],
                                alternate: 0,
                                cnameResolutions: 0,
                                dropped: 0,
                                enabled: true,
                                failureRcode: 'formerr',
                                failureRcodeResponse: 'enabled',
                                failureRcodeTtl: 0,
                                fallback: 0,
                                lastResortPool: '/Common/ts_aaaa_pool',
                                loadBalancingDecisionLogVerbosity: [
                                    'pool-traversal'
                                ],
                                minimalResponse: 'disabled',
                                name: '/Common/www.aaaaone.tstest.com',
                                persistCidrIpv4: 32,
                                persistCidrIpv6: 128,
                                persisted: 0,
                                persistence: 'disabled',
                                poolLbMode: 'round-robin',
                                pools: [
                                    '/Common/ts_aaaa_pool'
                                ],
                                preferred: 0,
                                rcode: 0,
                                requests: 0,
                                resolutions: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.availabilityState': 'offline',
                                'status.enabledState': 'enabled',
                                'status.statusReason': 'No enabled pools available',
                                tenant: 'Common',
                                ttlPersistence: 3600,
                                wipType: 'AAAA'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:Cvzdih7SN7aLM0kpbyZrHC5wGWX1AoRfeaWwqz7LrjY=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_aaaaWideIps',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/www.cnameone.tstest.com': {
                                aliases: [
                                    'www.cname.com'
                                ],
                                alternate: 0,
                                cnameResolutions: 0,
                                dropped: 0,
                                enabled: true,
                                failureRcode: 'noerror',
                                failureRcodeResponse: 'disabled',
                                failureRcodeTtl: 0,
                                fallback: 0,
                                lastResortPool: '',
                                minimalResponse: 'enabled',
                                name: 'www.cnameone.tstest.com',
                                persistCidrIpv4: 32,
                                persistCidrIpv6: 128,
                                persisted: 0,
                                persistence: 'disabled',
                                poolLbMode: 'round-robin',
                                pools: [
                                    '/Common/ts_cname_pool'
                                ],
                                preferred: 0,
                                rcode: 0,
                                requests: 0,
                                resolutions: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.availabilityState': 'unknown',
                                'status.enabledState': 'enabled',
                                'status.statusReason': 'Checking',
                                tenant: 'Common',
                                ttlPersistence: 3600,
                                wipType: 'CNAME'
                            },
                            '/Common/www.cnametwo.tstest.com': {
                                aliases: [
                                    'www.cname2.com',
                                    'www.cnametwo.com'
                                ],
                                alternate: 0,
                                cnameResolutions: 0,
                                dropped: 0,
                                enabled: true,
                                failureRcode: 'noerror',
                                failureRcodeResponse: 'disabled',
                                failureRcodeTtl: 0,
                                fallback: 0,
                                lastResortPool: '/Common/ts_cname_pool',
                                loadBalancingDecisionLogVerbosity: [
                                    'pool-selection',
                                    'pool-traversal',
                                    'pool-member-selection',
                                    'pool-member-traversal'
                                ],
                                minimalResponse: 'enabled',
                                name: 'www.cnametwo.tstest.com',
                                persistCidrIpv4: 32,
                                persistCidrIpv6: 128,
                                persisted: 0,
                                persistence: 'disabled',
                                poolLbMode: 'topology',
                                preferred: 0,
                                rcode: 0,
                                requests: 0,
                                resolutions: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                rules: [
                                    '/Common/test_irule'
                                ],
                                'status.availabilityState': 'unknown',
                                'status.enabledState': 'enabled',
                                'status.statusReason': 'Checking',
                                tenant: 'Common',
                                ttlPersistence: 3600,
                                wipType: 'CNAME'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:SyBlvtHOAcr0DOu249kbsP0QdWM7d9oduaEgZOgAIZU=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_cnameWideIps',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/www.mxone.tstest.com': {
                                aliases: [
                                    'www.mxone.com',
                                    'www.mxtwo.com'
                                ],
                                alternate: 0,
                                cnameResolutions: 0,
                                dropped: 0,
                                enabled: true,
                                failureRcode: 'noerror',
                                failureRcodeResponse: 'disabled',
                                failureRcodeTtl: 0,
                                fallback: 0,
                                lastResortPool: '/Common/ts_mx_pool',
                                loadBalancingDecisionLogVerbosity: [
                                    'pool-traversal',
                                    'pool-member-selection'
                                ],
                                minimalResponse: 'enabled',
                                name: '/Common/www.mxone.tstest.com',
                                persistCidrIpv4: 132,
                                persistCidrIpv6: 128,
                                persisted: 0,
                                persistence: 'enabled',
                                poolLbMode: 'topology',
                                pools: [
                                    '/Common/ts_mx_pool'
                                ],
                                preferred: 0,
                                rcode: 0,
                                requests: 0,
                                resolutions: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.availabilityState': 'offline',
                                'status.enabledState': 'enabled',
                                'status.statusReason': 'No enabled pools available',
                                tenant: 'Common',
                                ttlPersistence: 3600,
                                wipType: 'MX'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:IKqsEtlTQJSiP3isA2SpXTu25WVIoqdzkYH11LQTD58=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_mxWideIps',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/www.naptrone.tstest.com': {
                                aliases: [
                                    'www.naptrone.com',
                                    'www.naptrtwo.com'
                                ],
                                alternate: 0,
                                cnameResolutions: 0,
                                dropped: 0,
                                enabled: true,
                                failureRcode: 'notimpl',
                                failureRcodeResponse: 'enabled',
                                failureRcodeTtl: 0,
                                fallback: 0,
                                lastResortPool: '/Common/ts_naptr_pool',
                                loadBalancingDecisionLogVerbosity: [
                                    'pool-selection'
                                ],
                                minimalResponse: 'disabled',
                                name: '/Common/www.naptrone.tstest.com',
                                persistCidrIpv4: 32,
                                persistCidrIpv6: 128,
                                persisted: 0,
                                persistence: 'disabled',
                                poolLbMode: 'global-availability',
                                pools: [
                                    '/Common/ts_cname_pool'
                                ],
                                preferred: 0,
                                rcode: 0,
                                requests: 0,
                                resolutions: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.availabilityState': 'offline',
                                'status.enabledState': 'enabled',
                                'status.statusReason': 'No enabled pools available',
                                tenant: 'Common',
                                ttlPersistence: 3600,
                                wipType: 'NAPTR'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:krkZ04SWCAbeIkl+ndEQ2dCZyC2IE9GlnlP33IQPsCA=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_naptrWideIps',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/www.srvone.tstest.com': {
                                aliases: [
                                    'www.srvone.com'
                                ],
                                alternate: 0,
                                cnameResolutions: 0,
                                dropped: 0,
                                enabled: true,
                                failureRcode: 'servfail',
                                failureRcodeResponse: 'enabled',
                                failureRcodeTtl: 0,
                                fallback: 0,
                                lastResortPool: '/Common/ts_cname_pool',
                                minimalResponse: 'disabled',
                                name: '/Common/www.srvone.tstest.com',
                                persistCidrIpv4: 32,
                                persistCidrIpv6: 128,
                                persisted: 0,
                                persistence: 'disabled',
                                poolLbMode: 'round-robin',
                                pools: [
                                    '/Common/ts_srv_pool'
                                ],
                                preferred: 0,
                                rcode: 0,
                                requests: 0,
                                resolutions: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.availabilityState': 'offline',
                                'status.enabledState': 'enabled',
                                'status.statusReason': 'No enabled pools available',
                                tenant: 'Common',
                                ttlPersistence: 3600,
                                wipType: 'SRV'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:rRXLu1ZA+3bohKoRitrCr0iYNT/mRbLTSDqMQtGGOT4=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_srvWideIps',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/ts_a_pool': {
                                alternate: 0,
                                alternateMode: 'round-robin',
                                availabilityState: 'offline',
                                dropped: 0,
                                dynamicRatio: 'disabled',
                                enabled: true,
                                enabledState: 'enabled',
                                fallback: 0,
                                fallbackIp: '8.8.8.8',
                                fallbackMode: 'return-to-dns',
                                limitMaxBps: 0,
                                limitMaxBpsStatus: 'disabled',
                                limitMaxConnections: 0,
                                limitMaxConnectionsStatus: 'disabled',
                                limitMaxPps: 0,
                                limitMaxPpsStatus: 'disabled',
                                loadBalancingMode: 'ratio',
                                manualResume: 'disabled',
                                maxAnswersReturned: 1,
                                members: {
                                    'vs1:/Common/server1': {
                                        alternate: 0,
                                        availabilityState: 'offline',
                                        enabled: true,
                                        enabledState: 'enabled',
                                        fallback: 0,
                                        limitMaxBps: 0,
                                        limitMaxBpsStatus: 'disabled',
                                        limitMaxConnections: 0,
                                        limitMaxConnectionsStatus: 'disabled',
                                        limitMaxPps: 0,
                                        limitMaxPpsStatus: 'disabled',
                                        memberOrder: 2,
                                        monitor: 'default',
                                        name: 'server1:vs1',
                                        poolName: '/Common/ts_a_pool',
                                        poolType: 'A',
                                        preferred: 0,
                                        ratio: 1,
                                        serverName: '/Common/server1',
                                        'status.statusReason': ' Monitor /Common/gateway_icmp from 172.16.100.17 : no route',
                                        vsName: 'vs1'
                                    }
                                },
                                monitor: '/Common/gateway_icmp',
                                name: '/Common/ts_a_pool',
                                poolType: 'A',
                                preferred: 0,
                                qosHitRatio: 5,
                                qosHops: 0,
                                qosKilobytesSecond: 3,
                                qosLcs: 30,
                                qosPacketRate: 1,
                                qosRtt: 50,
                                qosTopology: 0,
                                qosVsCapacity: 0,
                                qosVsScore: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.statusReason': 'No enabled pool members available',
                                tenant: 'Common',
                                ttl: 30,
                                verifyMemberAvailability: 'disabled'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:K8iUcxXTe33O7oIAwHYPBr4uXpAqd8qcqIhN3g9QXfM=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_aPools',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/ts_aaaa_pool': {
                                alternate: 0,
                                alternateMode: 'topology',
                                availabilityState: 'offline',
                                dropped: 0,
                                dynamicRatio: 'enabled',
                                enabled: true,
                                enabledState: 'enabled',
                                fallback: 0,
                                fallbackIp: 'any',
                                fallbackMode: 'return-to-dns',
                                limitMaxBps: 0,
                                limitMaxBpsStatus: 'disabled',
                                limitMaxConnections: 0,
                                limitMaxConnectionsStatus: 'enabled',
                                limitMaxPps: 0,
                                limitMaxPpsStatus: 'disabled',
                                loadBalancingMode: 'round-robin',
                                manualResume: 'disabled',
                                maxAnswersReturned: 1,
                                members: {
                                    'vs3:/Common/gslb_server1': {
                                        alternate: 0,
                                        availabilityState: 'offline',
                                        enabled: true,
                                        enabledState: 'enabled',
                                        fallback: 0,
                                        limitMaxBps: 0,
                                        limitMaxBpsStatus: 'disabled',
                                        limitMaxConnections: 0,
                                        limitMaxConnectionsStatus: 'disabled',
                                        limitMaxPps: 0,
                                        limitMaxPpsStatus: 'disabled',
                                        memberOrder: 0,
                                        monitor: 'default',
                                        name: 'gslb_server1:vs3',
                                        poolName: '/Common/ts_aaaa_pool',
                                        poolType: 'AAAA',
                                        preferred: 0,
                                        ratio: 1,
                                        serverName: '/Common/gslb_server1',
                                        'status.statusReason': ' Monitor /Common/tcp from 172.16.100.17 : state: connect failed',
                                        vsName: 'vs3'
                                    }
                                },
                                monitor: 'min 1 of { /Common/http /Common/tcp }',
                                name: '/Common/ts_aaaa_pool',
                                poolType: 'AAAA',
                                preferred: 0,
                                qosHitRatio: 5,
                                qosHops: 0,
                                qosKilobytesSecond: 3,
                                qosLcs: 30,
                                qosPacketRate: 1,
                                qosRtt: 50,
                                qosTopology: 0,
                                qosVsCapacity: 0,
                                qosVsScore: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.statusReason': 'No enabled pool members available',
                                tenant: 'Common',
                                ttl: 30,
                                verifyMemberAvailability: 'enabled'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:qNp8TYYbrMiUyCojy1nvJQBTZ5Q9Ob1Vux7Yqt2WQcE=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_aaaaPools',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/ts_cname_pool': {
                                alternate: 0,
                                alternateMode: 'round-robin',
                                availabilityState: 'unknown',
                                dropped: 0,
                                dynamicRatio: 'disabled',
                                enabled: true,
                                enabledState: 'enabled',
                                fallback: 0,
                                fallbackMode: 'return-to-dns',
                                loadBalancingMode: 'round-robin',
                                manualResume: 'disabled',
                                members: {
                                    'www.cnameone.tstest.com': {
                                        alternate: 0,
                                        availabilityState: 'unknown',
                                        enabledState: 'enabled',
                                        fallback: 0,
                                        poolName: '/Common/ts_cname_pool',
                                        poolType: 'CNAME',
                                        preferred: 0,
                                        serverName: 'www.cnameone.tstest.com',
                                        'status.statusReason': 'Checking',
                                        vsName: ' '
                                    }
                                },
                                name: 'ts_cname_pool',
                                poolType: 'CNAME',
                                preferred: 0,
                                qosHitRatio: 5,
                                qosHops: 0,
                                qosKilobytesSecond: 3,
                                qosLcs: 30,
                                qosPacketRate: 1,
                                qosRtt: 50,
                                qosTopology: 0,
                                qosVsCapacity: 0,
                                qosVsScore: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.statusReason': 'Checking',
                                tenant: 'Common',
                                ttl: 30,
                                verifyMemberAvailability: 'enabled'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:3jFR/uLKBlik5kLw1lSgn3ItjdLiqd6hwm01NxdKRqk=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_cnamePools',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/ts_mx_pool': {
                                alternate: 0,
                                alternateMode: 'topology',
                                availabilityState: 'offline',
                                dropped: 0,
                                dynamicRatio: 'enabled',
                                enabled: true,
                                enabledState: 'enabled',
                                fallback: 0,
                                fallbackMode: 'return-to-dns',
                                loadBalancingMode: 'round-robin',
                                manualResume: 'enabled',
                                maxAnswersReturned: 12,
                                members: {
                                    'www.aaaaone.tstest.com': {
                                        alternate: 0,
                                        availabilityState: 'offline',
                                        enabledState: 'enabled',
                                        fallback: 0,
                                        poolName: '/Common/ts_mx_pool',
                                        poolType: 'MX',
                                        preferred: 0,
                                        serverName: 'www.aaaaone.tstest.com',
                                        'status.statusReason': 'No Wide IPs available: No enabled pools available',
                                        vsName: ' '
                                    },
                                    'www.aone.tstest.com': {
                                        alternate: 0,
                                        availabilityState: 'offline',
                                        enabledState: 'enabled',
                                        fallback: 0,
                                        poolName: '/Common/ts_mx_pool',
                                        poolType: 'MX',
                                        preferred: 0,
                                        serverName: 'www.aone.tstest.com',
                                        'status.statusReason': 'No Wide IPs available: No enabled pools available',
                                        vsName: ' '
                                    }
                                },
                                name: '/Common/ts_mx_pool',
                                poolType: 'MX',
                                preferred: 0,
                                qosHitRatio: 5,
                                qosHops: 0,
                                qosKilobytesSecond: 3,
                                qosLcs: 30,
                                qosPacketRate: 1,
                                qosRtt: 50,
                                qosTopology: 0,
                                qosVsCapacity: 0,
                                qosVsScore: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.statusReason': 'No enabled pool members available',
                                tenant: 'Common',
                                ttl: 30,
                                verifyMemberAvailability: 'enabled'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:2GmsgLsTGTjFMdNS5ZYVix3mep8UPblSX+onw8TJs74=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_mxPools',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/ts_naptr_pool': {
                                alternate: 0,
                                alternateMode: 'virtual-server-score',
                                availabilityState: 'offline',
                                dropped: 0,
                                dynamicRatio: 'disabled',
                                enabled: true,
                                enabledState: 'enabled',
                                fallback: 0,
                                fallbackMode: 'ratio',
                                loadBalancingMode: 'static-persistence',
                                manualResume: 'enabled',
                                maxAnswersReturned: 1,
                                members: {
                                    'www.aone.tstest.com': {
                                        alternate: 0,
                                        availabilityState: 'offline',
                                        enabledState: 'enabled',
                                        fallback: 0,
                                        poolName: '/Common/ts_naptr_pool',
                                        poolType: 'NAPTR',
                                        preferred: 0,
                                        serverName: 'www.aone.tstest.com',
                                        'status.statusReason': 'No Wide IPs available: No enabled pools available',
                                        vsName: ' '
                                    },
                                    'www.srvone.tstest.com': {
                                        alternate: 0,
                                        availabilityState: 'offline',
                                        enabledState: 'enabled',
                                        fallback: 0,
                                        poolName: '/Common/ts_naptr_pool',
                                        poolType: 'NAPTR',
                                        preferred: 0,
                                        serverName: 'www.srvone.tstest.com',
                                        'status.statusReason': 'No Wide IPs available: No enabled pools available',
                                        vsName: ' '
                                    }
                                },
                                name: '/Common/ts_naptr_pool',
                                poolType: 'NAPTR',
                                preferred: 0,
                                qosHitRatio: 5,
                                qosHops: 0,
                                qosKilobytesSecond: 3,
                                qosLcs: 30,
                                qosPacketRate: 1,
                                qosRtt: 50,
                                qosTopology: 0,
                                qosVsCapacity: 0,
                                qosVsScore: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.statusReason': 'No enabled pool members available',
                                tenant: 'Common',
                                ttl: 300,
                                verifyMemberAvailability: 'enabled'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:mQ+T3zVMUr4ySC2dQsbbgJweNbtIwxRKTfqENpMw7Rg=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_naptrPools',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            '/Common/ts_srv_pool': {
                                alternate: 0,
                                alternateMode: 'packet-rate',
                                availabilityState: 'offline',
                                dropped: 0,
                                dynamicRatio: 'disabled',
                                enabled: true,
                                enabledState: 'enabled',
                                fallback: 0,
                                fallbackMode: 'quality-of-service',
                                loadBalancingMode: 'virtual-server-capacity',
                                manualResume: 'disabled',
                                maxAnswersReturned: 10,
                                members: {
                                    'www.aaaaone.tstest.com': {
                                        alternate: 0,
                                        availabilityState: 'offline',
                                        enabledState: 'enabled',
                                        fallback: 0,
                                        poolName: '/Common/ts_srv_pool',
                                        poolType: 'SRV',
                                        preferred: 0,
                                        serverName: 'www.aaaaone.tstest.com',
                                        'status.statusReason': 'No Wide IPs available: No enabled pools available',
                                        vsName: ' '
                                    },
                                    'www.aone.tstest.com': {
                                        alternate: 0,
                                        availabilityState: 'offline',
                                        enabledState: 'enabled',
                                        fallback: 0,
                                        poolName: '/Common/ts_srv_pool',
                                        poolType: 'SRV',
                                        preferred: 0,
                                        serverName: 'www.aone.tstest.com',
                                        'status.statusReason': 'No Wide IPs available: No enabled pools available',
                                        vsName: ' '
                                    }
                                },
                                name: '/Common/ts_srv_pool',
                                poolType: 'SRV',
                                preferred: 0,
                                qosHitRatio: 5,
                                qosHops: 0,
                                qosKilobytesSecond: 3,
                                qosLcs: 30,
                                qosPacketRate: 1,
                                qosRtt: 50,
                                qosTopology: 0,
                                qosVsCapacity: 0,
                                qosVsScore: 0,
                                returnFromDns: 0,
                                returnToDns: 0,
                                'status.statusReason': 'No enabled pool members available',
                                tenant: 'Common',
                                ttl: 130,
                                verifyMemberAvailability: 'enabled'
                            }
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:YcESvoNtGff8bL31OG0psCRglnxQzwMG3dCUNPE5B2s=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_srvPools',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            cycleEnd: '2019-01-01T01:01:01Z',
                            cycleStart: '2019-01-01T01:01:01Z',
                            pollingInterval: 0
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:Ao/vYptJv0TI5TnHcmSLiGdIwSbCTM0L5xW9Gh4OFbw=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_telemetryServiceInfo',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                },
                {
                    allowSelfSignedCert: false,
                    body: [
                        {
                            value: 'systemInfo'
                        }
                    ],
                    fullURI: 'https://myWorkspace.ods.opinsights.azure.com/api/logs?api-version=2016-04-01',
                    headers: {
                        Authorization: 'SharedKey myWorkspace:HTlS6jtEi0oPBWJtKIlQOpx/IaXTjG4RxnFXr7aE0DY=',
                        'Content-Type': 'application/json',
                        'Log-Type': 'F5Telemetry_telemetryEventCategory',
                        'x-ms-date': 'Thu, 01 Jan 1970 00:00:00 GMT'
                    },
                    method: 'POST'
                }
            ]
        }
    ]
};
