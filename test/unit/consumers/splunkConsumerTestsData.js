/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

module.exports = {
    legacySystemData: [
        {
            expectedData: [
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.system_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        version: '14.1.0.6',
                        build: '0.0.9',
                        location: 'missing data',
                        description: 'missing data',
                        'marketing-name': 'missing data',
                        'platform-id': 'missing data',
                        'failover-state': 'OFFLINE',
                        'chassis-id': 'missing data',
                        mode: 'standalone',
                        'sync-status': 'Standalone',
                        'sync-summary': ' ',
                        'sync-color': 'green',
                        asm_state: '',
                        last_asm_change: '',
                        apm_state: '',
                        afm_state: '',
                        last_afm_deploy: '',
                        ltm_config_time: '2019-12-10T18:13:26.000Z',
                        gtm_config_time: '2147483647'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.interface_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        interface_name: '1.0',
                        interface_status: 'up'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.interface_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        interface_name: 'mgmt',
                        interface_status: 'up'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '428150',
                        Capacity: '20%',
                        name: '/',
                        Filesystem: '/',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '4079780',
                        Capacity: '1%',
                        name: '/dev',
                        Filesystem: '/dev',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '4088828',
                        Capacity: '1%',
                        name: '/dev/shm',
                        Filesystem: '/dev/shm',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '4088828',
                        Capacity: '1%',
                        name: '/run',
                        Filesystem: '/run',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '4088828',
                        Capacity: '0%',
                        name: '/sys/fs/cgroup',
                        Filesystem: '/sys/fs/cgroup',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '5186648',
                        Capacity: '84%',
                        name: '/usr',
                        Filesystem: '/usr',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '15350768',
                        Capacity: '2%',
                        name: '/shared',
                        Filesystem: '/shared',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '4088828',
                        Capacity: '2%',
                        name: '/shared/rrd.1.2',
                        Filesystem: '/shared/rrd.1.2',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '3030800',
                        Capacity: '34%',
                        name: '/var',
                        Filesystem: '/var',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '2171984',
                        Capacity: '2%',
                        name: '/config',
                        Filesystem: '/config',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '4088828',
                        Capacity: '1%',
                        name: '/var/tmstat',
                        Filesystem: '/var/tmstat',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '4096',
                        Capacity: '1%',
                        name: '/var/prompt',
                        Filesystem: '/var/prompt',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '2958224',
                        Capacity: '8%',
                        name: '/var/log',
                        Filesystem: '/var/log',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '25717852',
                        Capacity: '4%',
                        name: '/appdata',
                        Filesystem: '/appdata',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '4088828',
                        Capacity: '0%',
                        name: '/var/loipc',
                        Filesystem: '/var/loipc',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_usage',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        '1024-blocks': '817768',
                        Capacity: '0%',
                        name: '/run/user/91',
                        Filesystem: '/run/user/91',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_latency',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        'r/s': '6.30',
                        'w/s': '3.81',
                        '%util': '0.61',
                        name: 'sda',
                        Device: 'sda',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_latency',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        'r/s': '0.00',
                        'w/s': '0.00',
                        '%util': '0.00',
                        name: 'dm-0',
                        Device: 'dm-0',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_latency',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        'r/s': '0.02',
                        'w/s': '1.65',
                        '%util': '0.09',
                        name: 'dm-1',
                        Device: 'dm-1',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_latency',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        'r/s': '0.74',
                        'w/s': '1.15',
                        '%util': '0.10',
                        name: 'dm-2',
                        Device: 'dm-2',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_latency',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        'r/s': '0.07',
                        'w/s': '2.09',
                        '%util': '0.10',
                        name: 'dm-3',
                        Device: 'dm-3',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_latency',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        'r/s': '0.28',
                        'w/s': '0.28',
                        '%util': '0.01',
                        name: 'dm-4',
                        Device: 'dm-4',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_latency',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        'r/s': '0.08',
                        'w/s': '0.36',
                        '%util': '0.04',
                        name: 'dm-5',
                        Device: 'dm-5',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_latency',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        'r/s': '3.97',
                        'w/s': '0.00',
                        '%util': '0.18',
                        name: 'dm-6',
                        Device: 'dm-6',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_latency',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        'r/s': '0.03',
                        'w/s': '0.01',
                        '%util': '0.00',
                        name: 'dm-7',
                        Device: 'dm-7',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.disk_latency',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        'r/s': '0.38',
                        'w/s': '1.37',
                        '%util': '0.10',
                        name: 'dm-8',
                        Device: 'dm-8',
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.cert',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        cert_name: 'ca-bundle.crt',
                        cert_subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        cert_expiration_date: 1893455999
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.cert',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        cert_name: 'default.crt',
                        cert_subject: 'emailAddress=root@localhost.localdomain,CN=localhost.localdomain,OU=IT,O=MyCompany,L=Seattle,ST=WA,C=US',
                        cert_expiration_date: 1887142817
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.cert',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        cert_name: 'f5-ca-bundle.crt',
                        cert_subject: 'CN=Entrust Root Certification Authority - G2,OU=(c) 2009 Entrust, Inc. - for authorized use only,OU=See www.entrust.net/legal-terms,O=Entrust, Inc.,C=US',
                        cert_expiration_date: 1922896554
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.cert',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        cert_name: 'f5-irule.crt',
                        cert_subject: 'emailAddress=support@f5.com,CN=support.f5.com,OU=Product Development,O=F5 Networks,L=Seattle,ST=Washington,C=US',
                        cert_expiration_date: 1815944413
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.virtual_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/Shared/telemetry_local',
                        app: 'Shared',
                        appComponent: '',
                        tenant: 'Common',
                        availability_state: 'unknown',
                        enabled_state: 'enabled',
                        status_reason: ''
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.virtual_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/something',
                        appComponent: '',
                        tenant: 'Common',
                        availability_state: 'unknown',
                        enabled_state: 'enabled',
                        status_reason: ''
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.virtual_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/telemetry_gjd',
                        appComponent: '',
                        tenant: 'Common',
                        availability_state: 'unknown',
                        enabled_state: 'enabled',
                        status_reason: ''
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.virtual_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/testvs',
                        appComponent: '',
                        tenant: 'Common',
                        availability_state: 'unknown',
                        enabled_state: 'enabled',
                        status_reason: ''
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.virtual',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/Shared/telemetry_local',
                        app: 'Shared',
                        appComponent: '',
                        tenant: 'Common',
                        iapp_name: 'Shared',
                        ip: '255.255.255.254:6514',
                        mask: '255.255.255.255',
                        port: '255.255.255.254:6514',
                        protocol: 'tcp'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.virtual',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/something',
                        appComponent: '',
                        tenant: 'Common',
                        ip: '192.0.2.0:8787',
                        mask: '255.255.255.255',
                        port: '192.0.2.0:8787',
                        protocol: 'tcp'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.virtual',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/telemetry_gjd',
                        appComponent: '',
                        tenant: 'Common',
                        ip: '255.255.255.254:1234',
                        mask: '255.255.255.255',
                        port: '255.255.255.254:1234',
                        protocol: 'tcp'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.virtual',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/testvs',
                        appComponent: '',
                        tenant: 'Common',
                        ip: '192.0.2.0:7788',
                        mask: '255.255.255.255',
                        port: '192.0.2.0:7788',
                        protocol: 'tcp'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.virtual.profiles',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/Shared/telemetry_local',
                        profile_name: '/Common/tcp',
                        profile_type: 'profile',
                        tenant: 'Common',
                        app: 'Shared',
                        appComponent: ''
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.virtual.profiles',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/Shared/telemetry_local',
                        profile_name: '/Common/app/http',
                        profile_type: 'profile',
                        tenant: 'Common',
                        app: 'Shared',
                        appComponent: ''
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.virtual.profiles',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/something',
                        profile_name: '/Common/tcpCustom',
                        profile_type: 'profile',
                        tenant: 'Common',
                        appComponent: ''
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.virtual.profiles',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/something',
                        profile_name: '/Common/app/http',
                        profile_type: 'profile',
                        tenant: 'Common',
                        appComponent: ''
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.virtual.pools',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/something',
                        appComponent: '',
                        tenant: 'Common',
                        pool_name: '/Common/static'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.objectmodel.virtual.pools',
                    sourcetype: 'f5:bigip:config:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        virtual_name: '/Common/testvs',
                        appComponent: '',
                        tenant: 'Common',
                        pool_name: '/Common/static'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.pool_member_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        pool_name: '/Common/Shared/telemetry',
                        pool_member_name: '/Common/Shared/255.255.255.254:6514',
                        callbackurl: '',
                        address: '255.255.255.254',
                        port: 6514,
                        session_status: '',
                        availability_state: 'unknown',
                        enabled_state: 'enabled'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.pool_member_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        pool_name: '/Common/static',
                        pool_member_name: '/Common/192.0.2.0:8081',
                        callbackurl: '',
                        address: '192.0.2.0',
                        port: 8081,
                        session_status: '',
                        availability_state: 'unknown',
                        enabled_state: 'enabled'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.pool_member_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        pool_name: '/Common/telemetry-local',
                        pool_member_name: '/Common/192.0.2.1:6514',
                        callbackurl: '',
                        address: '192.0.2.1',
                        port: 6514,
                        session_status: '',
                        availability_state: 'unknown',
                        enabled_state: 'enabled'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.pool_member_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        pool_name: '/Sample_01/A1/web_pool',
                        pool_member_name: '/Sample_01/192.0.1.10:80',
                        callbackurl: '',
                        address: '192.0.1.10',
                        port: 80,
                        session_status: '',
                        availability_state: 'unknown',
                        enabled_state: 'enabled'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.pool_member_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        pool_name: '/Sample_01/A1/web_pool',
                        pool_member_name: '/Sample_01/192.0.1.11:80',
                        callbackurl: '',
                        address: '192.0.1.11',
                        port: 80,
                        session_status: '',
                        availability_state: 'unknown',
                        enabled_state: 'enabled'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.pool_member_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        pool_name: '/Sample_01/A1/web_pool',
                        pool_member_name: '/Sample_01/192.0.1.12:80',
                        callbackurl: '',
                        address: '192.0.1.12',
                        port: 80,
                        session_status: '',
                        availability_state: 'unknown',
                        enabled_state: 'enabled'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.pool_member_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        pool_name: '/Sample_01/A1/web_pool',
                        pool_member_name: '/Sample_01/192.0.1.13:80',
                        callbackurl: '',
                        address: '192.0.1.13',
                        port: 80,
                        session_status: '',
                        availability_state: 'unknown',
                        enabled_state: 'enabled'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.tmsh.pool_member_status',
                    sourcetype: 'f5:bigip:status:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        pool_name: '/Sample_event_sd/My_app/My_pool',
                        pool_member_name: '/Sample_event_sd/192.0.2.6:80',
                        callbackurl: '',
                        address: '192.0.2.6',
                        port: 80,
                        session_status: '',
                        availability_state: 'unknown',
                        enabled_state: 'enabled'
                    }
                },
                {
                    time: 1576001615000,
                    host: 'bigip1',
                    source: 'bigip.stats.summary',
                    sourcetype: 'f5:bigip:stats:iapp:json',
                    event: {
                        aggr_period: 60,
                        device_base_mac: 'fa:16:3e:da:e9:7b',
                        devicegroup: 'bigip1',
                        facility: 'myFacility',
                        files_sent: 1,
                        bytes_transfered: 19747
                    }
                }
            ]
        }
    ]
};
