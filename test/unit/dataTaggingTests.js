/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const dataTagging = require('../../src/lib/dataTagging');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Data Tagging', () => {
    describe('addTag', () => {
        it('should make deep copy of tag\'s value (example 1)', () => {
            const actionCtx = {
                enable: true,
                setTag: {
                    tag: {
                        key: 'value'
                    }
                }
            };
            const dataCtx = {
                data: {
                    foo: 'bar'
                }
            };
            const deviceCtx = {
                deviceVersion: '13.0.0.0',
                provisioning: { ltm: { name: 'ltm', level: 'nominal' } }
            };
            const expectedCtx = {
                data: {
                    foo: 'bar',
                    tag: {
                        key: 'value'
                    }
                }
            };
            dataTagging.addTags(dataCtx, actionCtx, deviceCtx);
            delete actionCtx.setTag.tag.key;
            // data with injected tag should be not affected
            assert.deepStrictEqual(dataCtx, expectedCtx);
        });

        it('should make deep copy of tag\'s value (example 2)', () => {
            const actionCtx = {
                enable: true,
                setTag: {
                    tag: {
                        key: 'value'
                    }
                },
                locations: {
                    virtualServers: {
                        '.*': true
                    }
                }
            };
            const dataCtx = {
                data: {
                    virtualServers: {
                        vs1: {},
                        vs2: {}
                    }
                }
            };
            const deviceCtx = {
                deviceVersion: '13.0.0.0',
                provisioning: { ltm: { name: 'ltm', level: 'nominal' } }
            };
            const expectedCtx = {
                data: {
                    virtualServers: {
                        vs1: {
                            tag: {
                                key: 'value'
                            }
                        },
                        vs2: {
                            tag: {
                                key: 'value'
                            }
                        }
                    }
                }
            };
            dataTagging.addTags(dataCtx, actionCtx, deviceCtx);
            delete actionCtx.setTag.tag.key;
            // data with injected tag should be not affected
            assert.deepStrictEqual(dataCtx, expectedCtx);
            // data with injected tag should be not affected
            dataCtx.data.virtualServers.vs1.tag.key = 'newValue';
            assert.strictEqual(dataCtx.data.virtualServers.vs2.tag.key, 'value');
        });
    });
});
