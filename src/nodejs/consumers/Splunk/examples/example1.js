/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const translator = require('../translator.js');

const normalizedData = {
    hostname: 'sevedge3nic01latest.westus.cloudapp.azure.com',
    version: '14.0.0.1',
    versionBuild: '0.0.2',
    location: 'Seattle',
    description: 'My BIG-IP description',
    marketingName: 'BIG-IP Virtual Edition',
    platformId: 'Z100',
    chassisId: '6743d724-7b83-a34b-62d42aa19ad8',
    baseMac: '00:0d:3a:36:c2:8d',
    callBackUrl: 'https://10.0.1.4',
    configReady: 'yes',
    licenseReady: 'yes',
    provisionReady: 'yes',
    syncMode: 'standalone',
    syncColor: 'green',
    syncStatus: 'Standalone',
    syncSummary: ' ',
    failoverStatus: 'ACTIVE',
    failoverColor: 'green',
    cpu: 3,
    memory: 53,
    tmmCpu: 1,
    tmmMemory: 10,
    tmmTraffic: {
        '0.0':{
            'clientSideTraffic.bitsIn': 578325968,
            'clientSideTraffic.bitsOut': 737135256
        },
        '0.1': {
            'clientSideTraffic.bitsIn': 21199789160,
            'clientSideTraffic.bitsOut': 65142806432
        },
        '0.2': {
            'clientSideTraffic.bitsIn': 595942208,
            'clientSideTraffic.bitsOut': 797632696
        },
        '0.3': {
            'clientSideTraffic.bitsIn': 21236391800,
            'clientSideTraffic.bitsOut': 65315361584
        }
    },
    diskStorage: {
        '/': {
            Filesystem: '/dev/mapper/vg--db--sda-set.1.root',
            '1024-blocks': '436342',
            Used: '226736',
            Available: '187078',
            Capacity: '55%',
            Mounted: '/'
        },
        '/dev/shm': {
            Filesystem: 'none',
            '1024-blocks': '7181064',
            Used: '633076',
            Available: '6547988',
            Capacity: '9%',
            Mounted: '/dev/shm'
        },
        '/config': {
            Filesystem: '/dev/mapper/vg--db--sda-set.1._config',
            '1024-blocks': '3269592',
            Used: '590144',
            Available: '2513356',
            Capacity: '20%',
            Mounted: '/config'
        },
        '/usr': {
            Filesystem: '/dev/mapper/vg--db--sda-set.1._usr',
            '1024-blocks': '4136432',
            Used: '3248400',
            Available: '677908',
            Capacity: '83%',
            Mounted: '/usr'
        },
        '/var': {
            Filesystem: '/dev/mapper/vg--db--sda-set.1._var',
            '1024-blocks': '3096336',
            Used: '937168',
            Available: '2001884',
            Capacity: '32%',
            Mounted: '/var'
        },
        '/shared': {
            Filesystem: '/dev/mapper/vg--db--sda-dat.share',
            '1024-blocks': '20642428',
            Used: '482804',
            Available: '19111048',
            Capacity: '3%',
            Mounted: '/shared'
        },
        '/var/log': {
            Filesystem: '/dev/mapper/vg--db--sda-dat.log',
            '1024-blocks': '3023760',
            Used: '232172',
            Available: '2637988',
            Capacity: '9%',
            Mounted: '/var/log'
        },
        '/appdata': {
            Filesystem: '/dev/mapper/vg--db--sda-dat.appdata',
            '1024-blocks': '25717852',
            Used: '815240',
            Available: '23596196',
            Capacity: '4%',
            Mounted: '/appdata'
        },
        '/shared/rrd.1.2': {
            Filesystem: 'none',
            '1024-blocks': '7181064',
            Used: '48064',
            Available: '7133000',
            Capacity: '1%',
            Mounted: '/shared/rrd.1.2'
        },
        '/var/run': {
            Filesystem: 'none',
            '1024-blocks': '7181064',
            Used: '1592',
            Available: '7179472',
            Capacity: '1%',
            Mounted: '/var/run'
        },
        '/var/tmstat': {
            Filesystem: 'none',
            '1024-blocks': '7181064',
            Used: '31760',
            Available: '7149304',
            Capacity: '1%',
            Mounted: '/var/tmstat'
        },
        '/var/prompt': {
            Filesystem: 'prompt',
            '1024-blocks': '4096',
            Used: '28',
            Available: '4068',
            Capacity: '1%',
            Mounted: '/var/prompt'
        },
        '/var/apm/mount/apmclients-7170.2018.627.21-3.0.iso': {
            Filesystem: '/var/sam/images/apmclients-7170.2018.627.21-3.0.iso',
            '1024-blocks': '298004',
            Used: '298004',
            Available: '0',
            Capacity: '100%',
            Mounted: '/var/apm/mount/apmclients-7170.2018.627.21-3.0.iso'
        },
        '/var/loipc': {
            Filesystem: 'none',
            '1024-blocks': '7181064',
            Used: '0',
            Available: '7181064',
            Capacity: '0%',
            Mounted: '/var/loipc'
        },
        '/mnt/sshplugin_tempfs': {
            Filesystem: 'none',
            '1024-blocks': '7181064',
            Used: '0',
            Available: '7181064',
            Capacity: '0%',
            Mounted: '/mnt/sshplugin_tempfs'
        }
    },
    networkInterfaces: {
        '1.1': {
            'counters.bitsIn': 132930044520,
            'counters.bitsOut': 44831270152,
            status: 'up'
        },
        '1.2': {
            'counters.bitsIn': 5280,
            'counters.bitsOut': 35280,
            status: 'up'
        },
        mgmt: {
            'counters.bitsIn': 17996740136,
            'counters.bitsOut': 12832676432,
            status: 'up'
        }
    },
    provisionState: {
        afm: { level: 'nominal' },
        am: { level: 'none' },
        apm: { level: 'nominal' },
        asm: { level: 'nominal' },
        avr: { level: 'none' },
        dos: { level: 'none' },
        fps: { level: 'none' },
        gtm: { level: 'none' },
        ilx: { level: 'none' },
        lc: { level: 'none' },
        ltm: { level: 'nominal' },
        pem: { level: 'none' },
        sslo: { level: 'none' },
        swg: { level: 'none' },
        urldb: { level: 'none' }
    },
    virtualServerStats: {
        '~Common~analytics.app~analytics_cred_vs': {
            'clientside.bitsIn': 444290800,
            'clientside.bitsOut': 336265408,
            'clientside.curConns': 0,
            destination: '255.255.255.254:41003',
            'status.availabilityState': 'unknown',
            'status.enabledState': 'enabled'
        },
        '~Common~analytics.app~analytics_format_vs': {
            'clientside.bitsIn': 547604424,
            'clientside.bitsOut': 410546464,
            'clientside.curConns': 0,
            destination: '255.255.255.254:41001',
            'status.availabilityState': 'available',
            'status.enabledState': 'enabled'
        },
        '~Common~analytics.app~analytics_send_vs': {
            'clientside.bitsIn': 566090176,
            'clientside.bitsOut': 418556312,
            'clientside.curConns': 0,
            destination: '255.255.255.254:41002',
            'status.availabilityState': 'available',
            'status.enabledState': 'enabled'
        },
        '~Common~app.app~app_vs': {
            'clientside.bitsIn': 19432504,
            'clientside.bitsOut': 81610864,
            'clientside.curConns': 0,
            destination: '10.0.2.10:80',
            'status.availabilityState': 'available',
            'status.enabledState': 'enabled'
        },
        '~Sample_01~A1~serviceMain': {
            'clientside.bitsIn': 0,
            'clientside.bitsOut': 0,
            'clientside.curConns': 0,
            destination: '10.0.1.10:80',
            'status.availabilityState': 'offline',
            'status.enabledState': 'enabled'
        }
    },
    poolStats: {
        '~Common~analytics.app~analytics_cred_pool': {
            'serverside.bitsIn': 0,
            'serverside.bitsOut': 0,
            'serverside.curConns': 0,
            'status.availabilityState': 'available',
            'status.enabledState': 'enabled'
        },
        '~Common~analytics.app~analytics_format_pool': {
            'serverside.bitsIn': 9465480,
            'serverside.bitsOut': 1959488,
            'serverside.curConns': 0,
            'status.availabilityState': 'available',
            'status.enabledState': 'enabled'
        },
        '~Common~analytics.app~analytics_logging_offbox': {
            'serverside.bitsIn': 4275336,
            'serverside.bitsOut': 2860976,
            'serverside.curConns': 0,
            'status.availabilityState': 'available',
            'status.enabledState': 'enabled'
        },
        '~Common~analytics.app~analytics_send_vs_pool': {
            'serverside.bitsIn': 27830016,
            'serverside.bitsOut': 9966712,
            'serverside.curConns': 0,
            'status.availabilityState': 'available',
            'status.enabledState': 'enabled'
        },
        '~Common~app.app~app_pool': {
            'serverside.bitsIn': 18753968,
            'serverside.bitsOut': 96238400,
            'serverside.curConns': 0,
            'status.availabilityState': 'available',
            'status.enabledState': 'enabled'
        },
        '~Sample_01~A1~web_pool': {
            'serverside.bitsIn': 0,
            'serverside.bitsOut': 0,
            'serverside.curConns': 0,
            'status.availabilityState': 'offline',
            'status.enabledState': 'enabled'
        }
    }
};

const replacer = (k, v) => { return v === undefined ? 'NOT_DEFINED': v };

translator(normalizedData, {}).then(res => console.log('Trasnalted data\n', JSON.stringify(res, replacer, 4)));