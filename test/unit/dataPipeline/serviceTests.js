/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* eslint-disable global-require, import/order */
const moduleCache = require('../shared/restoreCache')();

const pathUtil = require('path');
const sinon = require('sinon');

const assert = require('../shared/assert');
const dataPipelineUtils = require('./utils');
const dummies = require('../shared/dummies');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');

const configUtil = sourceCode('src/lib/utils/config');
const constants = sourceCode('src/lib/constants');
const ConsumersService = sourceCode('src/lib/consumers');
const DataPipeline = sourceCode('src/lib/dataPipeline');
const ResourceMonitor = sourceCode('src/lib/resourceMonitor');

const EVENT_TYPES = constants.EVENT_TYPES;
const PUSH_EVENT = 2;

moduleCache.remember();

describe('Data Pipeline / Service', () => {
    let appEvents;
    let configWorker;
    let consumers;
    let coreStub;
    let currentConfig;
    let dataPipeline;
    let dataPipelineStats;
    let resMon;

    function getConsumerID(name, namespace) {
        const configs = configUtil.getTelemetryConsumers(currentConfig, namespace);
        configs.push(...configUtil.getTelemetryPullConsumers(currentConfig, namespace));

        const consumerConfig = configs.find((conf) => conf.name === name);
        assert.isDefined(consumerConfig);
        return consumerConfig.id;
    }

    function processDeclaration(declaration) {
        return Promise.all([
            appEvents.waitFor('datapipeline.config.done'),
            configWorker.processDeclaration(declaration)
        ]);
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = stubs.default.coreStub();
        coreStub.utilMisc.generateUuid.numbersOnly = false;

        appEvents = coreStub.appEvents.appEvents;
        configWorker = coreStub.configWorker.configWorker;

        dataPipeline = new DataPipeline();
        dataPipeline.initialize(appEvents);

        appEvents.on('config.change', (config) => {
            currentConfig = config;
        });

        appEvents.on('datapipeline.config.done', (stats) => {
            dataPipelineStats = stats;
        });

        await dataPipeline.start();
        await coreStub.startServices();

        assert.isTrue(dataPipeline.isRunning());
    });

    afterEach(async () => {
        await Promise.all([
            consumers ? consumers.destroy() : Promise.resolve(),
            dataPipeline.destroy(),
            resMon ? resMon.destroy() : Promise.resolve()
        ]);
        await coreStub.destroyServices();

        sinon.restore();
    });

    it('should enable processing by default', () => {
        assert.isTrue(dataPipeline.processingEnabled);
    });

    it('should do nothing when no consumers defined', () => dataPipeline.process(
        dataPipelineUtils.makeDataCtx({ data: true })
    )
        .then((dataCtx) => {
            assert.deepStrictEqual(dataCtx, {
                data: {
                    data: true,
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT,
                destinationIds: []
            });
        }));

    it('should write JSON data to tracer', () => {
        const tracer = {
            write: sinon.spy()
        };
        return dataPipeline.process(
            dataPipelineUtils.makeDataCtx({ data: true }),
            PUSH_EVENT,
            null,
            { tracer }
        )
            .then((dataCtx) => {
                assert.deepStrictEqual(tracer.write.callCount, 1, 'should write to tracer only once');
                assert.deepStrictEqual(dataCtx, {
                    data: {
                        data: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: []
                });
                assert.deepStrictEqual(tracer.write.firstCall.args[0], dataCtx);
            });
    });

    it('should not set telemetryEventCategory if exists already', () => dataPipeline.process(
        dataPipelineUtils.makeDataCtx({ data: true, telemetryEventCategory: 'test' })
    )
        .then((dataCtx) => {
            assert.deepStrictEqual(dataCtx, {
                data: {
                    data: true,
                    telemetryEventCategory: 'test'
                },
                type: EVENT_TYPES.LTM_EVENT,
                destinationIds: []
            });
        }));

    [
        EVENT_TYPES.IHEALTH_POLLER,
        EVENT_TYPES.RAW_EVENT
    ].forEach((etype) => it(`should ignore actions for "${etype}" event`, () => dataPipeline.process(
        dataPipelineUtils.makeDataCtx({ data: { foo: 'bar' } }, etype),
        PUSH_EVENT,
        null,
        {
            actions: [
                {
                    enable: true,
                    setTag: { tag: 'value' }
                }
            ]
        }
    )
        .then((dataCtx) => {
            assert.deepStrictEqual(dataCtx, {
                data: {
                    data: { foo: 'bar' },
                    telemetryEventCategory: etype
                },
                type: etype,
                destinationIds: []
            });
        })));

    it('should apply actions to events data', () => dataPipeline.process(
        dataPipelineUtils.makeDataCtx({ data: { foo: 'bar' } }),
        PUSH_EVENT,
        null,
        {
            actions: [
                {
                    enable: true,
                    setTag: { tag: 'value' }
                }
            ]
        }
    )
        .then((dataCtx) => {
            assert.deepStrictEqual(dataCtx, {
                data: {
                    data: { foo: 'bar' },
                    tag: 'value',
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT,
                destinationIds: []
            });
        }));

    it('should apply tagging using device context info (no taga added)', () => dataPipeline.process(
        dataPipelineUtils.makeDataCtx({
            aPools: {
                '/Common/ts_a_pool': {
                    name: '/Common/ts_a_pool',
                    partition: 'Common',
                    alternateMode: 'round-robin',
                    dynamicRatio: 'disabled'
                },
                '/Common/ts_a_pool_2': {
                    name: '/Common/ts_a_pool_2',
                    partition: 'Common',
                    alternateMode: 'round-robin',
                    dynamicRatio: 'disabled'
                }
            }
        }),
        PUSH_EVENT,
        null,
        {
            actions: [
                {
                    enable: true,
                    setTag: { tenant: '`T`', application: '`A`' }
                }
            ],
            deviceContext: {
                provisioning: {
                    gtm: {
                        level: 'none'
                    }
                }
            }
        }
    )
        .then((dataCtx) => {
            assert.deepStrictEqual(dataCtx, {
                data: {
                    aPools: {
                        '/Common/ts_a_pool': {
                            name: '/Common/ts_a_pool',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled'
                        },
                        '/Common/ts_a_pool_2': {
                            name: '/Common/ts_a_pool_2',
                            partition: 'Common',
                            alternateMode: 'round-robin',
                            dynamicRatio: 'disabled'
                        }
                    },
                    telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                },
                type: EVENT_TYPES.LTM_EVENT,
                destinationIds: []
            });
        }));

    [
        'none',
        'nominal'
    ].forEach((plevel) => it(`should apply tagging using device context info (gtm provisioning - ${plevel})`, () => dataPipeline.process(
        dataPipelineUtils.makeDataCtx({
            aPools: {
                '/Common/ts_a_pool': {
                    name: '/Common/ts_a_pool',
                    partition: 'Common',
                    alternateMode: 'round-robin',
                    dynamicRatio: 'disabled'
                },
                '/Common/app/ts_a_pool_2': {
                    name: '/Common/app/ts_a_pool_2',
                    partition: 'Common',
                    alternateMode: 'round-robin',
                    dynamicRatio: 'disabled'
                }
            }
        }, EVENT_TYPES.SYSTEM_POLLER),
        PUSH_EVENT,
        null,
        {
            actions: [
                {
                    enable: true,
                    setTag: { tenant: '`T`', application: '`A`' }
                }
            ],
            deviceContext: {
                bashDisabled: true,
                provisioning: {
                    gtm: {
                        level: plevel
                    }
                }
            }
        }
    )
        .then((dataCtx) => {
            const aPools = {
                '/Common/ts_a_pool': {
                    name: '/Common/ts_a_pool',
                    partition: 'Common',
                    alternateMode: 'round-robin',
                    dynamicRatio: 'disabled'
                },
                '/Common/app/ts_a_pool_2': {
                    name: '/Common/app/ts_a_pool_2',
                    partition: 'Common',
                    alternateMode: 'round-robin',
                    dynamicRatio: 'disabled'
                }
            };
            if (plevel === 'nominal') {
                aPools['/Common/ts_a_pool'].tenant = 'Common';
                aPools['/Common/app/ts_a_pool_2'].tenant = 'Common';
                aPools['/Common/app/ts_a_pool_2'].application = 'app';
            }
            assert.deepStrictEqual(dataCtx, {
                data: {
                    aPools,
                    telemetryEventCategory: EVENT_TYPES.SYSTEM_POLLER
                },
                type: EVENT_TYPES.SYSTEM_POLLER,
                destinationIds: []
            });
        })));

    describe('Data Forwarding', () => {
        beforeEach(() => {
            consumers = new ConsumersService(pathUtil.join(__dirname, 'consumers'));
            consumers.initialize(appEvents);
            return consumers.start()
                .then(() => {
                    assert.isTrue(consumers.isRunning());
                    return processDeclaration(dummies.declaration.base.decrypted({}));
                })
                .then(() => {
                    assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 0 });
                });
        });

        it('should not forward data when not destinationIds set', () => processDeclaration(dummies.declaration.base.decrypted({
            defaultConsumer: dummies.declaration.consumer.default.decrypted({}),
            defaultConsumer2: dummies.declaration.consumer.default.decrypted({ trace: true }),
            defaultConsumer3: dummies.declaration.consumer.default.decrypted({ enable: false })
        }))
            .then(() => {
                assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 2 });
                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data: true }, undefined, [])
                );
            })
            .then(() => {
                const dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 0);
            }));

        it('should not forward data when no data to forward', () => processDeclaration(dummies.declaration.base.decrypted({
            defaultConsumer: dummies.declaration.consumer.default.decrypted({}),
            defaultConsumer2: dummies.declaration.consumer.default.decrypted({ trace: true }),
            defaultConsumer3: dummies.declaration.consumer.default.decrypted({ enable: false })
        }))
            .then(() => {
                assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 2 });
                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data: true }, undefined, [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('defaultConsumer2'),
                        getConsumerID('defaultConsumer3')
                    ]),
                    PUSH_EVENT,
                    null,
                    {
                        actions: [
                            {
                                enable: true,
                                excludeData: {},
                                locations: {
                                    data: true,
                                    telemetryEventCategory: true
                                }
                            }
                        ]
                    }
                );
            })
            .then(() => {
                const dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 0);
            }));

        it('should forward data to a consumer (API v1, push)', () => processDeclaration(dummies.declaration.base.decrypted({
            defaultConsumer: dummies.declaration.consumer.default.decrypted({})
        }))
            .then(() => {
                assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 1 });
                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data: true }, undefined, [getConsumerID('defaultConsumer')])
                );
            })
            .then(() => {
                const dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 1);

                const dataCtx = dataCtxs[dataCtxs.length - 1];

                assert.deepStrictEqual(dataCtx.event, {
                    data: {
                        data: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer')
                    ]
                });

                assert.isDefined(dataCtx.config);
                assert.deepStrictEqual(dataCtx.config.id, getConsumerID('defaultConsumer'));

                assert.isDefined(dataCtx.logger);
                assert.isNull(dataCtx.metadata);
                assert.isNull(dataCtx.tracer);

                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data2: true }, undefined, [getConsumerID('defaultConsumer')])
                );
            })
            .then(() => {
                const dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 2);

                const dataCtx = dataCtxs[dataCtxs.length - 1];

                assert.deepStrictEqual(dataCtx.event, {
                    data: {
                        data2: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer')
                    ]
                });

                assert.isDefined(dataCtx.config);
                assert.deepStrictEqual(dataCtx.config.id, getConsumerID('defaultConsumer'));

                assert.isDefined(dataCtx.logger);
                assert.isNull(dataCtx.metadata);
                assert.isNull(dataCtx.tracer);

                return processDeclaration(dummies.declaration.base.decrypted({
                    defaultConsumer: dummies.declaration.consumer.default.decrypted({ trace: true })
                }));
            })
            .then(() => {
                assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 1 });
                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data3: true }, undefined, [getConsumerID('defaultConsumer')])
                );
            })
            .then(() => {
                const dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 3);

                const dataCtx = dataCtxs[dataCtxs.length - 1];

                assert.deepStrictEqual(dataCtx.event, {
                    data: {
                        data3: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer')
                    ]
                });

                assert.isDefined(dataCtx.config);
                assert.deepStrictEqual(dataCtx.config.id, getConsumerID('defaultConsumer'));

                assert.isDefined(dataCtx.logger);
                assert.isNull(dataCtx.metadata);
                assert.isDefined(dataCtx.tracer);
            }));

        it('should forward data to multiple consumers (API v1, push)', () => processDeclaration(dummies.declaration.base.decrypted({
            defaultConsumer: dummies.declaration.consumer.default.decrypted({}),
            defaultConsumer2: dummies.declaration.consumer.default.decrypted({ trace: true }),
            defaultConsumer3: dummies.declaration.consumer.default.decrypted({ enable: false })
        }))
            .then(() => {
                assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 2 });
                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data: true }, undefined, [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('defaultConsumer2'),
                        getConsumerID('defaultConsumer3')
                    ])
                );
            })
            .then(() => {
                const dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 2);

                dataCtxs.slice(0, 2).forEach((dataCtx) => {
                    assert.deepStrictEqual(dataCtx.event, {
                        data: {
                            data: true,
                            telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                        },
                        type: EVENT_TYPES.LTM_EVENT,
                        destinationIds: [
                            getConsumerID('defaultConsumer'),
                            getConsumerID('defaultConsumer2'),
                            getConsumerID('defaultConsumer3')
                        ]
                    });
                    assert.isDefined(dataCtx.config);
                    assert.isDefined(dataCtx.logger);
                    assert.isNull(dataCtx.metadata);

                    if (dataCtx.config.id === getConsumerID('defaultConsumer')) {
                        assert.isNull(dataCtx.tracer);
                    } else if (dataCtx.config.id === getConsumerID('defaultConsumer2')) {
                        assert.isDefined(dataCtx.tracer);
                    } else {
                        assert.fail(`Unknown consumer ID - ${dataCtx.config.id}`);
                    }
                });
                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data2: true }, undefined, [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('defaultConsumer2'),
                        getConsumerID('defaultConsumer3')
                    ])
                );
            })
            .then(() => {
                const dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 4);

                dataCtxs.slice(2, 2).forEach((dataCtx) => {
                    assert.deepStrictEqual(dataCtx.event, {
                        data: {
                            data2: true,
                            telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                        },
                        type: EVENT_TYPES.LTM_EVENT,
                        destinationIds: [
                            getConsumerID('defaultConsumer'),
                            getConsumerID('defaultConsumer2'),
                            getConsumerID('defaultConsumer3')
                        ]
                    });
                    assert.isDefined(dataCtx.config);
                    assert.isDefined(dataCtx.logger);
                    assert.isNull(dataCtx.metadata);

                    if (dataCtx.config.id === getConsumerID('defaultConsumer')) {
                        assert.isNull(dataCtx.tracer);
                    } else if (dataCtx.config.id === getConsumerID('defaultConsumer2')) {
                        assert.isDefined(dataCtx.tracer);
                    } else {
                        assert.fail(`Unknown consumer ID - ${dataCtx.config.id}`);
                    }
                });
            }));

        it('should forward data to a consumer (API v2, push)', () => processDeclaration(dummies.declaration.base.decrypted({
            splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
        }))
            .then(() => {
                assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 1 });
                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data: true }, undefined, [getConsumerID('splunkConsumer')])
                );
            })
            .then(() => {
                const splunk = require('./consumers/Splunk').getInstances()[0].consumerInstances[0];
                assert.lengthOf(splunk.dataCtxs, 1);

                const dataCtx = splunk.dataCtxs[splunk.dataCtxs.length - 1];

                assert.deepStrictEqual(dataCtx, {
                    data: {
                        data: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('splunkConsumer')
                    ]
                });

                assert.isUndefined(dataCtx.config);
                assert.isUndefined(dataCtx.event);
                assert.isUndefined(dataCtx.logger);
                assert.isUndefined(dataCtx.metadata);
                assert.isUndefined(dataCtx.tracer);

                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data2: true }, undefined, [getConsumerID('splunkConsumer')])
                );
            })
            .then(() => {
                const splunk = require('./consumers/Splunk').getInstances()[0].consumerInstances[0];
                assert.lengthOf(splunk.dataCtxs, 2);

                const dataCtx = splunk.dataCtxs[splunk.dataCtxs.length - 1];

                assert.deepStrictEqual(dataCtx, {
                    data: {
                        data2: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('splunkConsumer')
                    ]
                });

                assert.isUndefined(dataCtx.config);
                assert.isUndefined(dataCtx.event);
                assert.isUndefined(dataCtx.logger);
                assert.isUndefined(dataCtx.metadata);
                assert.isUndefined(dataCtx.tracer);
            }));

        it('should forward data to multiple consumers (API v2, push, no callback)', () => processDeclaration(dummies.declaration.base.decrypted({
            splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({}),
            splunkConsumer2: dummies.declaration.consumer.splunk.minimal.decrypted({}),
            splunkConsumer3: dummies.declaration.consumer.splunk.minimal.decrypted({ enable: false })
        }))
            .then(() => {
                assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 2 });
                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data: true }, undefined, [
                        getConsumerID('splunkConsumer'),
                        getConsumerID('splunkConsumer2'),
                        getConsumerID('splunkConsumer3')
                    ])
                );
            })
            .then(() => {
                const splunk = require('./consumers/Splunk').getInstances()[0];
                splunk.consumerInstances.forEach((slpunkInst) => {
                    assert.lengthOf(slpunkInst.dataCtxs, 1);

                    const dataCtx = slpunkInst.dataCtxs[slpunkInst.dataCtxs.length - 1];

                    assert.deepStrictEqual(dataCtx, {
                        data: {
                            data: true,
                            telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                        },
                        type: EVENT_TYPES.LTM_EVENT,
                        destinationIds: [
                            getConsumerID('splunkConsumer'),
                            getConsumerID('splunkConsumer2'),
                            getConsumerID('splunkConsumer3')
                        ]
                    });

                    assert.isUndefined(dataCtx.config);
                    assert.isUndefined(dataCtx.event);
                    assert.isUndefined(dataCtx.logger);
                    assert.isUndefined(dataCtx.metadata);
                    assert.isUndefined(dataCtx.tracer);
                });

                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data2: true }, undefined, [
                        getConsumerID('splunkConsumer'),
                        getConsumerID('splunkConsumer2'),
                        getConsumerID('splunkConsumer3')
                    ])
                );
            })
            .then(() => {
                const splunk = require('./consumers/Splunk').getInstances()[0];
                splunk.consumerInstances.forEach((slpunkInst) => {
                    assert.lengthOf(slpunkInst.dataCtxs, 2);

                    const dataCtx = slpunkInst.dataCtxs[slpunkInst.dataCtxs.length - 1];

                    assert.deepStrictEqual(dataCtx, {
                        data: {
                            data2: true,
                            telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                        },
                        type: EVENT_TYPES.LTM_EVENT,
                        destinationIds: [
                            getConsumerID('splunkConsumer'),
                            getConsumerID('splunkConsumer2'),
                            getConsumerID('splunkConsumer3')
                        ]
                    });

                    assert.isUndefined(dataCtx.config);
                    assert.isUndefined(dataCtx.event);
                    assert.isUndefined(dataCtx.logger);
                    assert.isUndefined(dataCtx.metadata);
                    assert.isUndefined(dataCtx.tracer);
                });
            }));

        it('should forward data to multiple consumers (API v2, push+pull, with callback)', async () => {
            await processDeclaration(dummies.declaration.base.decrypted({
                splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({}),
                splunkConsumer2: dummies.declaration.consumer.splunk.minimal.decrypted({}),
                splunkConsumer3: dummies.declaration.consumer.splunk.minimal.decrypted({ enable: false })
            }));

            const cb = sinon.spy();

            assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 2 });
            await dataPipeline.process(
                dataPipelineUtils.makeDataCtx({ data: true }, undefined, [
                    getConsumerID('splunkConsumer'),
                    getConsumerID('splunkConsumer2'),
                    getConsumerID('splunkConsumer3')
                ]),
                0b11, // push + pull
                cb
            );

            assert.deepStrictEqual(cb.callCount, 2);
            cb.args.forEach((args) => {
                assert.deepStrictEqual(args, [0b11]);
            });

            const splunk1 = require('./consumers/Splunk').getInstances()[0];
            splunk1.consumerInstances.forEach((slpunkInst) => {
                assert.lengthOf(slpunkInst.dataCtxs, 1);

                const dataCtx = slpunkInst.dataCtxs[slpunkInst.dataCtxs.length - 1];

                assert.deepStrictEqual(dataCtx, {
                    data: {
                        data: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('splunkConsumer'),
                        getConsumerID('splunkConsumer2'),
                        getConsumerID('splunkConsumer3')
                    ]
                });

                assert.isUndefined(dataCtx.config);
                assert.isUndefined(dataCtx.event);
                assert.isUndefined(dataCtx.logger);
                assert.isUndefined(dataCtx.metadata);
                assert.isUndefined(dataCtx.tracer);
            });

            cb.resetHistory();

            await dataPipeline.process(
                dataPipelineUtils.makeDataCtx({ data2: true }, undefined, [
                    getConsumerID('splunkConsumer'),
                    getConsumerID('splunkConsumer2'),
                    getConsumerID('splunkConsumer3')
                ]),
                0b01,
                cb
            );

            assert.deepStrictEqual(cb.callCount, 2);
            cb.args.forEach((args) => {
                assert.deepStrictEqual(args, [0b01]);
            });

            const splunk2 = require('./consumers/Splunk').getInstances()[0];
            splunk2.consumerInstances.forEach((slpunkInst) => {
                assert.lengthOf(slpunkInst.dataCtxs, 2);

                const dataCtx = slpunkInst.dataCtxs[slpunkInst.dataCtxs.length - 1];

                assert.deepStrictEqual(dataCtx, {
                    data: {
                        data2: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('splunkConsumer'),
                        getConsumerID('splunkConsumer2'),
                        getConsumerID('splunkConsumer3')
                    ]
                });

                assert.isUndefined(dataCtx.config);
                assert.isUndefined(dataCtx.event);
                assert.isUndefined(dataCtx.logger);
                assert.isUndefined(dataCtx.metadata);
                assert.isUndefined(dataCtx.tracer);
            });
        });

        it('should apply actions and copy data (API mixed)', () => processDeclaration(dummies.declaration.base.decrypted({
            defaultConsumer: dummies.declaration.consumer.default.decrypted({}),
            genericHttp: dummies.declaration.consumer.genericHttp.minimal.decrypted({
                actions: [
                    {
                        JMESPath: {},
                        expression: '{ message: @ }'
                    }
                ]
            }),
            splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
        }))
            .then(() => {
                assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 3 });
                return dataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data: true }, undefined, [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ])
                );
            })
            .then(() => {
                const splunk = require('./consumers/Splunk').getInstances()[0].consumerInstances[0];
                assert.lengthOf(splunk.dataCtxs, 1);

                let dataCtx = splunk.dataCtxs[splunk.dataCtxs.length - 1];

                assert.deepStrictEqual(dataCtx, {
                    data: {
                        data: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ]
                });

                let dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 1);

                dataCtx = dataCtxs[dataCtxs.length - 1];

                assert.deepStrictEqual(dataCtx.event, {
                    data: {
                        data: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ]
                });

                assert.isDefined(dataCtx.config);
                assert.deepStrictEqual(dataCtx.config.id, getConsumerID('defaultConsumer'));

                assert.isDefined(dataCtx.logger);
                assert.isNull(dataCtx.metadata);
                assert.isNull(dataCtx.tracer);

                dataCtxs = require('./consumers/Generic_HTTP').getData();
                assert.lengthOf(dataCtxs, 1);

                dataCtx = dataCtxs[dataCtxs.length - 1];

                assert.deepStrictEqual(dataCtx.event, {
                    data: {
                        message: {
                            data: true,
                            telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                        }
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ]
                });

                assert.isDefined(dataCtx.config);
                assert.deepStrictEqual(dataCtx.config.id, getConsumerID('genericHttp'));

                assert.isDefined(dataCtx.logger);
                assert.isNull(dataCtx.metadata);
                assert.isNull(dataCtx.tracer);
            }));
    });

    describe('Data Processing State', () => {
        let clock;

        beforeEach(() => {
            clock = stubs.clock();

            consumers = new ConsumersService(pathUtil.join(__dirname, 'consumers'));
            consumers.initialize(appEvents);
            resMon = new ResourceMonitor();
            resMon.initialize(appEvents);

            return consumers.start()
                .then(() => {
                    assert.isTrue(consumers.isRunning());
                    return resMon.start();
                })
                .then(() => {
                    assert.isTrue(resMon.isRunning());
                    return processDeclaration(dummies.declaration.base.decrypted({
                        defaultConsumer: dummies.declaration.consumer.default.decrypted({}),
                        genericHttp: dummies.declaration.consumer.genericHttp.minimal.decrypted({}),
                        poller: dummies.declaration.systemPoller.minimal.decrypted({}),
                        splunkConsumer: dummies.declaration.consumer.splunk.minimal.decrypted({})
                    }));
                })
                .then(() => {
                    assert.deepStrictEqual(dataPipelineStats, { numberOfForwarders: 3 });
                    return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 30 });
                })
                .then(() => {
                    assert.isTrue(dataPipeline.processingEnabled);
                });
        });

        it('should toggle processing state', () => DataPipeline.process(
            dataPipelineUtils.makeDataCtx({ data: true }, undefined, [
                getConsumerID('defaultConsumer'),
                getConsumerID('genericHttp'),
                getConsumerID('splunkConsumer')
            ])
        )
            .then(() => {
                assert.isTrue(dataPipeline.processingEnabled);

                const splunk = require('./consumers/Splunk').getInstances()[0].consumerInstances[0];
                assert.lengthOf(splunk.dataCtxs, 1);

                let dataCtx = splunk.dataCtxs[splunk.dataCtxs.length - 1];
                assert.deepStrictEqual(dataCtx, {
                    data: {
                        data: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ]
                });

                let dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 1);

                dataCtx = dataCtxs[dataCtxs.length - 1];
                assert.deepStrictEqual(dataCtx.event, {
                    data: {
                        data: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ]
                });

                dataCtxs = require('./consumers/Generic_HTTP').getData();
                assert.lengthOf(dataCtxs, 1);

                dataCtx = dataCtxs[dataCtxs.length - 1];
                assert.deepStrictEqual(dataCtx.event, {
                    data: {
                        data: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ]
                });

                coreStub.resourceMonitorUtils.osAvailableMem.free = 10;
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isFalse(dataPipeline.processingEnabled);
                return DataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data: true }, undefined, [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ])
                );
            })
            .then(() => {
                assert.isFalse(dataPipeline.processingEnabled);

                const splunk = require('./consumers/Splunk').getInstances()[0].consumerInstances[0];
                assert.lengthOf(splunk.dataCtxs, 1);

                let dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 1);

                dataCtxs = require('./consumers/Generic_HTTP').getData();
                assert.lengthOf(dataCtxs, 1);

                coreStub.resourceMonitorUtils.osAvailableMem.free = 1000;
                return clock.clockForward(3000, { promisify: true, delay: 1, repeat: 10 });
            })
            .then(() => {
                assert.isTrue(dataPipeline.processingEnabled);
                return DataPipeline.process(
                    dataPipelineUtils.makeDataCtx({ data2: true }, undefined, [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ])
                );
            })
            .then(() => {
                assert.isTrue(dataPipeline.processingEnabled);

                const splunk = require('./consumers/Splunk').getInstances()[0].consumerInstances[0];
                assert.lengthOf(splunk.dataCtxs, 2);

                let dataCtx = splunk.dataCtxs[splunk.dataCtxs.length - 1];
                assert.deepStrictEqual(dataCtx, {
                    data: {
                        data2: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ]
                });

                let dataCtxs = require('./consumers/default').getData();
                assert.lengthOf(dataCtxs, 2);

                dataCtx = dataCtxs[dataCtxs.length - 1];
                assert.deepStrictEqual(dataCtx.event, {
                    data: {
                        data2: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ]
                });

                dataCtxs = require('./consumers/Generic_HTTP').getData();
                assert.lengthOf(dataCtxs, 2);

                dataCtx = dataCtxs[dataCtxs.length - 1];
                assert.deepStrictEqual(dataCtx.event, {
                    data: {
                        data2: true,
                        telemetryEventCategory: EVENT_TYPES.LTM_EVENT
                    },
                    type: EVENT_TYPES.LTM_EVENT,
                    destinationIds: [
                        getConsumerID('defaultConsumer'),
                        getConsumerID('genericHttp'),
                        getConsumerID('splunkConsumer')
                    ]
                });
            }));
    });
});

// TODO: pull v2, push-pull v2
