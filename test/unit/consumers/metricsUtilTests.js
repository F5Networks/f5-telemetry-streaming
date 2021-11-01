/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const metricsUtil = require('../../../src/lib/consumers/shared/metricsUtil');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Metrics Util Tests', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('.findMetricsAndTags()', () => {
        let collectedMetrics;
        let collectedTags;
        let defaultOptions;

        beforeEach(() => {
            collectedMetrics = [];
            collectedTags = [];
            defaultOptions = {
                collectTags: true,
                parseMetrics: true,
                onMetric: (mpath, mvalue, mtags) => collectedMetrics.push([mpath.join('.'), mvalue, mtags]),
                onTags: (tpath, tagsValues) => collectedTags.push([tpath.join('.'), tagsValues])
            };
        });

        it('should not modify original object when parsing disabled', () => {
            const origin = {
                metricString: '10.0',
                nested: {
                    metricString: '12.0',
                    dataArray: [
                        '13.0',
                        'string'
                    ]
                }
            };
            metricsUtil.findMetricsAndTags(origin);
            assert.deepStrictEqual(origin, {
                metricString: '10.0',
                nested: {
                    metricString: '12.0',
                    dataArray: [
                        '13.0',
                        'string'
                    ]
                }
            }, 'should not modify input data');
        });

        it('should not modify original object when parsing disabled and tags collection enabled', () => {
            const origin = {
                metricString: '10.0',
                tagData: 'tag',
                nested: {
                    metricString: '12.0',
                    tagData: 'tag2',
                    dataArray: [
                        '13.0',
                        'string'
                    ]
                }
            };
            metricsUtil.findMetricsAndTags(origin, {
                collectTags: true,
                onTags: () => {}
            });
            assert.deepStrictEqual(origin, {
                metricString: '10.0',
                tagData: 'tag',
                nested: {
                    metricString: '12.0',
                    tagData: 'tag2',
                    dataArray: [
                        '13.0',
                        'string'
                    ]
                }
            }, 'should not modify input data');
        });

        it('should parse and re-assign metrics when parsing enabled', () => {
            const origin = {
                metricString: '10.0',
                tagData: 'tag',
                nested: {
                    metricString: '12.0',
                    tagData: 'tag2',
                    dataArray: [
                        '13.0',
                        'string'
                    ]
                }
            };
            metricsUtil.findMetricsAndTags(origin, {
                parseMetrics: true
            });
            assert.deepStrictEqual(origin, {
                metricString: 10,
                tagData: 'tag',
                nested: {
                    metricString: 12,
                    tagData: 'tag2',
                    dataArray: [
                        13,
                        'string'
                    ]
                }
            }, 'should parse metrics and update input data');
        });

        it('should convert "name", "port" props to tags', () => {
            const origin = {
                system: {
                    networkInterfaces: {
                        '1.0': {
                            name: '1.0',
                            tag: 'tag',
                            bitsIn: '20'
                        }
                    }
                },
                vs: {
                    vs1: {
                        name: 'vs1',
                        port: '3000',
                        bitsIn: '10'
                    }
                }
            };
            metricsUtil.findMetricsAndTags(origin, defaultOptions);

            assert.deepStrictEqual(origin, {
                system: {
                    networkInterfaces: {
                        '1.0': {
                            name: '1.0',
                            tag: 'tag',
                            bitsIn: 20
                        }
                    }
                },
                vs: {
                    vs1: {
                        name: 'vs1',
                        port: '3000',
                        bitsIn: 10
                    }
                }
            }, 'should parse metrics and update original data');

            assert.sameDeepMembers(collectedTags, [
                ['system.networkInterfaces.1.0', { name: '1.0', tag: 'tag' }],
                ['vs.vs1', { name: 'vs1', port: '3000' }]
            ], 'should collect all expected tags');

            assert.sameDeepMembers(collectedMetrics, [
                ['system.networkInterfaces.1.0.bitsIn', 20, { name: '1.0', tag: 'tag' }],
                ['vs.vs1.bitsIn', 10, { name: 'vs1', port: '3000' }]
            ], 'should collect all expected metrics');
        });

        it('should not treat "Capacity" prop as a tag by default', () => {
            const origin = {
                system: {
                    diskStorage: {
                        '/var': {
                            name: '/var',
                            Capacity: '90%',
                            size: '1000'
                        }
                    }
                }
            };
            metricsUtil.findMetricsAndTags(origin, defaultOptions);

            assert.deepStrictEqual(origin, {
                system: {
                    diskStorage: {
                        '/var': {
                            name: '/var',
                            Capacity: '90%',
                            size: 1000
                        }
                    }
                }
            }, 'should parse metrics and update original data');

            assert.sameDeepMembers(collectedTags, [
                ['system.diskStorage./var', { name: '/var' }]
            ], 'should collect all expected tags');

            assert.sameDeepMembers(collectedMetrics, [
                ['system.diskStorage./var.size', 1000, { name: '/var' }]
            ], 'should collect all expected metrics');
        });

        it('should collect all tags and metrics', () => {
            const origin = {
                metricString: '10.0',
                tagData: 'tag',
                nested: {
                    name: '14.0', // should ignore it by default
                    metricString: '12.0',
                    tagData: 'tag2',
                    dataArray: [
                        '13.0',
                        'string'
                    ]
                },
                virtuals: {
                    vs1: {
                        name: 'vs1',
                        ip: 'ip1',
                        bitsIn: '1000'
                    },
                    vs2: {
                        name: 'vs2',
                        ip: 'ip2',
                        bitsIn: '2000'
                    }
                },
                networkInterfaces: {
                    '1.0': {
                        name: '1.0',
                        bitsOut: '1000',
                        type: 'coper'
                    },
                    '2.0': {
                        name: '2.0',
                        bitsOut: '2000',
                        type: 'optical'
                    }
                },
                distStorage: {
                    '/var': {
                        name: '/var',
                        size: '1000',
                        Capacity: '10%'
                    },
                    '/home': {
                        name: '/home',
                        size: '2000',
                        Capacity: '20%'
                    }
                }
            };
            metricsUtil.findMetricsAndTags(origin, defaultOptions);
            assert.sameDeepMembers(collectedTags, [
                ['', { tagData: 'tag' }],
                ['distStorage./var', { name: '/var' }],
                ['distStorage./home', { name: '/home' }],
                ['nested', { name: '14.0', tagData: 'tag2' }],
                // eslint-disable-next-line quote-props
                ['nested.dataArray', { '1': 'string' }],
                ['networkInterfaces.1.0', { name: '1.0', type: 'coper' }],
                ['networkInterfaces.2.0', { name: '2.0', type: 'optical' }],
                ['virtuals.vs1', { name: 'vs1', ip: 'ip1' }],
                ['virtuals.vs2', { name: 'vs2', ip: 'ip2' }]
            ], 'should collect all expected tags');

            assert.sameDeepMembers(collectedMetrics, [
                ['distStorage./var.size', 1000, { name: '/var' }],
                ['distStorage./home.size', 2000, { name: '/home' }],
                ['metricString', 10, { tagData: 'tag' }],
                ['nested.metricString', 12, { name: '14.0', tagData: 'tag2' }],
                // eslint-disable-next-line quote-props
                ['nested.dataArray.0', 13, { '1': 'string' }],
                ['networkInterfaces.1.0.bitsOut', 1000, { name: '1.0', type: 'coper' }],
                ['networkInterfaces.2.0.bitsOut', 2000, { name: '2.0', type: 'optical' }],
                ['virtuals.vs1.bitsIn', 1000, { name: 'vs1', ip: 'ip1' }],
                ['virtuals.vs2.bitsIn', 2000, { name: 'vs2', ip: 'ip2' }]
            ], 'should collect all expected metrics');
        });

        it('should collect all tags and metrics and exclude name from path', () => {
            const origin = {
                metricString: '10.0',
                tagData: 'tag',
                nested: {
                    name: '14.0', // should ignore it by default
                    metricString: '12.0',
                    tagData: 'tag2',
                    dataArray: [
                        '13.0',
                        'string'
                    ]
                },
                virtuals: {
                    vs1: {
                        name: 'vs1',
                        ip: 'ip1',
                        bitsIn: '1000'
                    },
                    vs2: {
                        name: 'vs2',
                        ip: 'ip2',
                        bitsIn: '2000'
                    }
                },
                pools: {
                    pool1: {
                        name: 'pool1',
                        bitsIn: '5000',
                        members: {
                            member1: {
                                name: 'member1',
                                bitsIn: '6000'
                            }
                        }
                    }
                },
                networkInterfaces: {
                    '1.0': {
                        name: '1.0',
                        bitsOut: '1000',
                        type: 'coper'
                    },
                    '2.0': {
                        name: '2.0',
                        bitsOut: '2000',
                        type: 'optical'
                    }
                },
                distStorage: {
                    '/var': {
                        name: '/var',
                        size: '1000',
                        Capacity: '10%'
                    },
                    '/home': {
                        name: '/home',
                        size: '2000',
                        Capacity: '20%'
                    }
                }
            };
            metricsUtil.findMetricsAndTags(
                origin,
                Object.assign({ excludeNameFromPath: true }, defaultOptions)
            );
            assert.sameDeepMembers(collectedTags, [
                ['', { tagData: 'tag' }],
                ['distStorage', { name: '/var' }],
                ['distStorage', { name: '/home' }],
                ['nested', { name: '14.0', tagData: 'tag2' }],
                // eslint-disable-next-line quote-props
                ['nested.dataArray', { '1': 'string' }],
                ['networkInterfaces', { name: '1.0', type: 'coper' }],
                ['networkInterfaces', { name: '2.0', type: 'optical' }],
                ['pools', { name: 'pool1' }],
                ['pools.members', { name: 'member1' }],
                ['virtuals', { name: 'vs1', ip: 'ip1' }],
                ['virtuals', { name: 'vs2', ip: 'ip2' }]
            ], 'should collect all expected tags');

            assert.sameDeepMembers(collectedMetrics, [
                ['distStorage.size', 1000, { name: '/var' }],
                ['distStorage.size', 2000, { name: '/home' }],
                ['metricString', 10, { tagData: 'tag' }],
                ['nested.metricString', 12, { name: '14.0', tagData: 'tag2' }],
                // eslint-disable-next-line quote-props
                ['nested.dataArray.0', 13, { '1': 'string' }],
                ['networkInterfaces.bitsOut', 1000, { name: '1.0', type: 'coper' }],
                ['networkInterfaces.bitsOut', 2000, { name: '2.0', type: 'optical' }],
                ['pools.bitsIn', 5000, { name: 'pool1' }],
                ['pools.members.bitsIn', 6000, { name: 'member1' }],
                ['virtuals.bitsIn', 1000, { name: 'vs1', ip: 'ip1' }],
                ['virtuals.bitsIn', 2000, { name: 'vs2', ip: 'ip2' }]
            ], 'should collect all expected metrics');
        });

        it('should collect all tags and metrics at max depth === 1', () => {
            const origin = {
                metricString: '10.0',
                tagData: 'tag',
                nested: {
                    name: '14.0', // should ignore it by default
                    metricString: '12.0',
                    tagData: 'tag2',
                    dataArray: [
                        '13.0',
                        'string'
                    ]
                },
                virtuals: {
                    vs1: {
                        name: 'vs1',
                        ip: 'ip1',
                        bitsIn: '1000'
                    },
                    vs2: {
                        name: 'vs2',
                        ip: 'ip2',
                        bitsIn: '2000'
                    }
                },
                networkInterfaces: {
                    '1.0': {
                        name: '1.0',
                        bitsOut: '1000',
                        type: 'coper'
                    },
                    '2.0': {
                        name: '2.0',
                        bitsOut: '2000',
                        type: 'optical'
                    }
                },
                distStorage: {
                    '/var': {
                        name: '/var',
                        size: '1000',
                        Capacity: '10%'
                    },
                    '/home': {
                        name: '/home',
                        size: '2000',
                        Capacity: '20%'
                    }
                }
            };
            metricsUtil.findMetricsAndTags(
                origin,
                Object.assign({ maxDepth: 1 }, defaultOptions)
            );
            assert.sameDeepMembers(collectedTags, [
                ['', { tagData: 'tag' }]
            ], 'should collect all expected tags');

            assert.sameDeepMembers(collectedMetrics, [
                ['metricString', 10, { tagData: 'tag' }]
            ], 'should collect all expected metrics');
        });

        it('should collect all tags and metrics and ignore non-default metrics and tags', () => {
            const origin = {
                metricString: '10.0',
                tagData: 'tag',
                nested: {
                    name: '14.0', // should ignore it by default
                    metricString: '12.0',
                    tagData: 'tag2',
                    dataArray: [
                        '13.0',
                        'string'
                    ]
                },
                virtuals: {
                    vs1: {
                        name: 'vs1',
                        ip: 'ip1',
                        bitsIn: '1000',
                        port: 3000,
                        metricToTag: 20
                    },
                    vs2: {
                        name: 'vs2',
                        ip: 'ip2',
                        bitsIn: '2000',
                        port: 4000
                    }
                },
                networkInterfaces: {
                    '1.0': {
                        name: '1.0',
                        bandwidth: '2000',
                        bitsOut: '1000',
                        type: 'coper'
                    },
                    '2.0': {
                        name: '2.0',
                        bandwidth: '3000',
                        bitsOut: '2000',
                        type: 'optical',
                        tagToMetric: 'still not a metric :-('
                    }
                },
                distStorage: {
                    '/var': {
                        name: '/var',
                        size: '1000',
                        Capacity: '10%',
                        tagToMetric: 'disk has 40.50mb left'
                    },
                    '/home': {
                        name: '/home',
                        size: '2000',
                        Capacity: '20%',
                        tagToMetric: '20ms'
                    }
                }
            };
            metricsUtil.findMetricsAndTags(
                origin,
                Object.assign({
                    metricsToIgnore: ['bitsIn', 'bitsOut'],
                    metricsToTags: ['metricToTag', 'name', 'port'],
                    tagsToIgnore: ['Capacity', 'ip', 'tagData', 'type'],
                    tagsToMetrics: ['tagToMetric']
                }, defaultOptions)
            );
            assert.sameDeepMembers(collectedTags, [
                ['distStorage./home', { name: '/home' }],
                ['distStorage./var', { name: '/var' }],
                ['nested', { name: '14.0' }],
                // eslint-disable-next-line quote-props
                ['nested.dataArray', { '1': 'string' }],
                ['networkInterfaces.1.0', { name: '1.0' }],
                ['networkInterfaces.2.0', { name: '2.0' }],
                ['virtuals.vs1', { name: 'vs1', port: 3000, metricToTag: 20 }],
                ['virtuals.vs2', { name: 'vs2', port: 4000 }]
            ], 'should collect all expected tags');

            assert.sameDeepMembers(collectedMetrics, [
                ['distStorage./home.size', 2000, { name: '/home' }],
                ['distStorage./home.tagToMetric', 20, { name: '/home' }],
                ['distStorage./var.size', 1000, { name: '/var' }],
                ['distStorage./var.tagToMetric', 40.50, { name: '/var' }],
                ['metricString', 10, {}],
                ['nested.metricString', 12, { name: '14.0' }],
                // eslint-disable-next-line quote-props
                ['nested.dataArray.0', 13, { '1': 'string' }],
                ['networkInterfaces.1.0.bandwidth', 2000, { name: '1.0' }],
                ['networkInterfaces.2.0.bandwidth', 3000, { name: '2.0' }]
            ], 'should collect all expected metrics');
        });

        it('should not allow ISO Dates in tags', () => {
            const origin = {
                sslCerts: {
                    'ca-bundle.crt': {
                        expirationDate: 0,
                        expirationString: '2019-01-01T01:01:01Z',
                        issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        name: 'ca-bundle.crt'
                    }
                }
            };
            metricsUtil.findMetricsAndTags(origin, defaultOptions);

            assert.deepStrictEqual(origin, {
                sslCerts: {
                    'ca-bundle.crt': {
                        expirationDate: 0,
                        expirationString: '2019-01-01T01:01:01Z',
                        issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        name: 'ca-bundle.crt'
                    }
                }
            }, 'should parse metrics and update original data');

            assert.sameDeepMembers(collectedTags, [
                [
                    'sslCerts.ca-bundle.crt',
                    {
                        issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        name: 'ca-bundle.crt'
                    }
                ]
            ], 'should collect all expected tags');

            assert.sameDeepMembers(collectedMetrics, [
                [
                    'sslCerts.ca-bundle.crt.expirationDate',
                    0,
                    {
                        issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        name: 'ca-bundle.crt'
                    }
                ]
            ], 'should collect all expected metrics');
        });

        it('should allow ISO Dates in tags', () => {
            const origin = {
                sslCerts: {
                    'ca-bundle.crt': {
                        expirationDate: 0,
                        expirationString: '2019-01-01T01:01:01Z',
                        issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        name: 'ca-bundle.crt'
                    }
                }
            };
            metricsUtil.findMetricsAndTags(origin, Object.assign({ allowIsoDateTag: true }, defaultOptions));

            assert.deepStrictEqual(origin, {
                sslCerts: {
                    'ca-bundle.crt': {
                        expirationDate: 0,
                        expirationString: '2019-01-01T01:01:01Z',
                        issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        name: 'ca-bundle.crt'
                    }
                }
            }, 'should parse metrics and update original data');

            assert.sameDeepMembers(collectedTags, [
                [
                    'sslCerts.ca-bundle.crt',
                    {
                        expirationString: '2019-01-01T01:01:01Z',
                        issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        name: 'ca-bundle.crt'
                    }
                ]
            ], 'should collect all expected tags');

            assert.sameDeepMembers(collectedMetrics, [
                [
                    'sslCerts.ca-bundle.crt.expirationDate',
                    0,
                    {
                        expirationString: '2019-01-01T01:01:01Z',
                        issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        name: 'ca-bundle.crt'
                    }
                ]
            ], 'should collect all expected metrics');
        });

        it('should ignore invalid numbers', () => {
            const origin = {
                invalidMetric: `${Number.MAX_VALUE}1`,
                invalidMetricToTagString: `${Number.MAX_VALUE}1`,
                invalidTagString: `invalid number - ${Number.MAX_VALUE}1`,
                invalidTagToMetricString: `invalid number - ${Number.MAX_VALUE}1`,
                validMetric: `${Number.MAX_VALUE}`,
                validMetricToTagString: `${Number.MAX_VALUE}`,
                validTagString: `invalid number - ${Number.MAX_VALUE}`,
                validTagToMetricString: `invalid number - ${Number.MAX_VALUE}`
            };
            metricsUtil.findMetricsAndTags(
                origin,
                Object.assign({
                    metricsToTags: ['invalidMetricToTagString', 'validMetricToTagString'],
                    tagsToMetrics: ['invalidTagToMetricString', 'validTagToMetricString']
                }, defaultOptions)
            );
            const expectedTags = {
                invalidMetric: `${Number.MAX_VALUE}1`,
                invalidMetricToTagString: `${Number.MAX_VALUE}1`,
                invalidTagString: `invalid number - ${Number.MAX_VALUE}1`,
                validMetricToTagString: `${Number.MAX_VALUE}`,
                validTagString: `invalid number - ${Number.MAX_VALUE}`
            };
            assert.sameDeepMembers(collectedTags, [
                ['', expectedTags]
            ], 'should collect all expected tags');

            assert.sameDeepMembers(collectedMetrics, [
                ['validMetric', Number.MAX_VALUE, expectedTags],
                ['validTagToMetricString', Number.MAX_VALUE, expectedTags]
            ], 'should collect all expected metrics');
        });

        it('should not allow empty strings as tags', () => {
            const origin = {
                metric: 10,
                application: ''
            };
            metricsUtil.findMetricsAndTags(origin, defaultOptions);

            assert.sameDeepMembers(collectedTags, [], 'should collect all expected tags');
            assert.sameDeepMembers(collectedMetrics, [
                ['metric', 10, {}]
            ], 'should collect all expected metrics');
        });
    });
});
