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

/* eslint-disable import/order, no-constant-condition, no-use-before-define */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const dummies = require('../shared/dummies');
const helpers = require('./helpers');
const PollerMock = require('./pollerMock');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const SafeEventEmitter = sourceCode('src/lib/utils/eventEmitter');
const SystemPoller = sourceCode('src/lib/systemPoller/poller');

moduleCache.remember();

/**
 * NOTE:
 * - there is no way to test HTTP(s) agent because requests never reach real network socket,
 *   so afterEach verifies that agent was passed to the request module with desired options.
 */

describe('System Poller / Poller ', () => {
    const defaultInteval = 300;
    const remotehost = 'remotehost.remotedonmain';
    let appEvents;
    let configWorker;
    let coreStub;
    let declaration;
    let fakeClock;
    let interval;
    let pollerDestroytub;
    let pollerStartStub;
    let pollerStopStub;
    let pollerStruct;
    let requestSpies;
    let service;

    function createPoller(onePassOnly = false) {
        const proxy = makeManagerProxy();
        const poller = new SystemPoller(proxy.proxy, proxy.proxy.reportCallback, {
            onePassOnly,
            logger: coreStub.logger.logger.getChild('TestPoller')
        });

        return {
            poller,
            proxy
        };
    }

    function createPollerMock(decl) {
        return new PollerMock(
            {
                connection: {
                    host: decl.system.host,
                    port: decl.system.port,
                    protocol: decl.system.protocol
                },
                credentials: {
                    username: decl.system.username,
                    password: decl.system.passphrase
                        ? decl.system.passphrase.cipherText
                        : undefined
                }
            }
        );
    }

    async function forwardClock(time, cb, repeat = 1, delay = 1) {
        if (!cb) {
            await fakeClock.clockForward(time, { repeat, promisify: true, delay });
            return;
        }

        while (true) {
            await fakeClock.clockForward(time, { repeat, promisify: true, delay });
            try {
                if (await cb()) {
                    break;
                }
            } catch (error) {
                // igonre
            }
        }
    }

    function getTimeStep() {
        let step = 1;
        if (declaration) {
            step = declaration.systemPoller.interval || defaultInteval;
        }
        return step * 100;
    }

    function makeManagerProxy() {
        const proxy = {
            config: {
                config: null,
                decrypted: false
            },
            proxy: {},
            reports: []
        };
        Object.defineProperties(proxy.proxy, {
            cleanupConfig: {
                value: sinon.stub()
            },
            getConfig: {
                value: sinon.stub()
            },
            reportCallback: {
                value: sinon.stub()
            }
        });
        proxy.proxy.cleanupConfig.callsFake(() => {
            proxy.config.config = null;
            proxy.config.decrypted = false;
        });
        proxy.proxy.getConfig.callsFake(async (poller, decrypt = false) => {
            if (proxy.config.config === null) {
                proxy.config.config = (await (new Promise((resolve) => {
                    service.emitAsync('config.getConfig', resolve, {
                        class: 'Telemetry_System_Poller'
                    });
                })))[0];
            }
            if (decrypt && !proxy.config.decrypted) {
                proxy.config.config = (await (new Promise((resolve, reject) => {
                    service.emitAsync('config.decrypt', testUtil.deepCopy(proxy.config.config), (error, decrypted) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(decrypted);
                        }
                    });
                })));
            }
            return testUtil.deepCopy(proxy.config.config);
        });
        proxy.proxy.reportCallback.callsFake((error, poller, report) => {
            proxy.reports.push({ error, poller, report });
        });

        return proxy;
    }

    function processDeclaration(decl) {
        return configWorker.processDeclaration(
            dummies.declaration.base.decrypted(decl)
        );
    }

    function verifyReport(report) {
        if (report.error) {
            // ignore errors, should be verified by the test
            return;
        }
        assert.instanceOf(report.poller, SystemPoller);

        const isCustom = !!declaration.systemPoller.endpointList;

        const metadata = report.report.metadata;
        assert.isNumber(metadata.cycleEnd);
        assert.isAbove(metadata.cycleEnd, 0);
        assert.isNumber(metadata.cycleStart);
        assert.isAbove(metadata.cycleStart, 0);
        assert.isAbove(metadata.cycleEnd, metadata.cycleStart);
        assert.deepStrictEqual(metadata.isCustom, isCustom);
        assert.deepStrictEqual(metadata.pollingInterval, pollerStruct.poller.onePassOnly
            ? 0
            : (declaration.systemPoller.interval || defaultInteval));

        const deviceContext = metadata.deviceContext;
        const expectedStats = helpers.getStatsReport(isCustom, !deviceContext.bashDisabled);

        assert.deepStrictEqual(
            deviceContext, expectedStats.deviceContext
        );
        assert.deepStrictEqual(
            report.report.stats, expectedStats.stats
        );
    }

    function verifyReports() {
        pollerStruct.proxy.reports.map(verifyReport);
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        declaration = null;
        fakeClock = null;
        requestSpies = testUtil.requestSpies();
        service = new SafeEventEmitter();

        pollerDestroytub = sinon.stub(SystemPoller.prototype, 'destroy');
        pollerDestroytub.callThrough();
        pollerStartStub = sinon.stub(SystemPoller.prototype, 'start');
        pollerStartStub.callThrough();
        pollerStopStub = sinon.stub(SystemPoller.prototype, 'stop');
        pollerStopStub.callThrough();

        coreStub = stubs.default.coreStub();
        appEvents = coreStub.appEvents.appEvents;
        configWorker = coreStub.configWorker.configWorker;

        appEvents.register(service, 'test', [
            'config.decrypt',
            'config.getConfig'
        ]);

        await coreStub.startServices();
        await coreStub.configWorker.configWorker.load();

        assert.isEmpty(coreStub.logger.messages.error);
        coreStub.logger.removeAllMessages();
    });

    afterEach(async () => {
        if (fakeClock) {
            fakeClock.stub.restore();
        }
        await coreStub.destroyServices();

        testUtil.nockCleanup();
        sinon.restore();

        if (declaration) {
            helpers.checkBigIpRequests(declaration, requestSpies);
        }
        if (pollerStruct) {
            verifyReports();
        }
    });

    describe('constructor', () => {
        it('invalid args', () => {
            assert.throws(() => new SystemPoller(undefined, null, {}), /manager should be neither null or undefined/);
            assert.throws(() => new SystemPoller({}, null, {}), /callback should be a function/);
            assert.throws(() => new SystemPoller({ test: true }, null, {}), /callback should be a function/);
            assert.throws(() => new SystemPoller({ test: true }, () => {}, {}), /logger should be an instance of Logger/);
            assert.throws(() => new SystemPoller({ test: true }, () => {}, {
                logger: coreStub.logger.logger,
                onePassOnly: null
            }), /onePassOnly should be a boolean/);
        });
    });

    describe('configuration variations', () => {
        const combinations = testUtil.product(
            // type
            [
                {
                    name: 'interval-based',
                    value: false
                },
                {
                    name: 'one-pass-only',
                    value: true
                }
            ],
            // endpoints
            [
                {
                    name: 'default',
                    value: false
                },
                {
                    name: 'custom',
                    value: true
                }
            ],
            // system auth
            testUtil.smokeTests.filter([
                {
                    name: 'system without user',
                    value: undefined
                },
                {
                    name: 'system with user and passphrase',
                    value: { username: true, passphrase: true }
                }
            ]),
            // system connection
            testUtil.smokeTests.filter([
                {
                    name: 'localhost system',
                    value: undefined
                },
                {
                    name: 'remote system with non default config',
                    value: {
                        host: remotehost,
                        allowSelfSignedCert: true,
                        port: 8889,
                        protocol: 'https'
                    }
                }
            ])
        );

        combinations.forEach(([pollConf, endpointsConf, systemAuthConf, systemConf]) => describe(`type = ${pollConf.name}, endpoints = ${endpointsConf.name}, system = ${systemConf.name}, systemAuth = ${systemAuthConf.name}`,
            () => {
                if (systemConf.value && systemConf.value.host === remotehost
                    && !(systemAuthConf.value && systemAuthConf.value.passphrase)
                ) {
                    // password-less users are not supported by remote device
                    return;
                }

                function getDeclaration(enable = true, ival = 60, trace = false) {
                    return helpers.getDeclaration({
                        enable,
                        endpoints: endpointsConf.value,
                        interval: ival,
                        systemAuthConf,
                        systemConf,
                        trace
                    });
                }

                async function applyDeclaration(decl = undefined) {
                    declaration = decl || getDeclaration();
                    await processDeclaration(declaration);

                    interval = configWorker.currentConfig.components
                        .find((c) => c.class === 'Telemetry_System_Poller'
                            && c.name === 'systemPoller'
                            && c.systemName === 'system').interval;

                    coreStub.logger.removeAllMessages();
                }

                beforeEach(applyDeclaration);

                afterEach(async () => {
                    if (fakeClock) {
                        await Promise.all([
                            forwardClock(getTimeStep() * 100, () => pollerStruct.poller.isDestroyed()),
                            pollerStruct.poller.destroy()
                        ]);
                    } else {
                        await pollerStruct.poller.destroy();
                    }
                });

                it('should start and finish polling cycle(s)', async () => {
                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    pollerStruct = createPoller(pollConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    await forwardClock(500, () => {
                        if (pollConf.value) {
                            return proxy.reports.length >= 1;
                        }
                        return proxy.reports.length > 2;
                    });

                    assert.isEmpty(coreStub.logger.messages.error);

                    const info = poller.info();
                    if (pollConf.value) {
                        assert.deepStrictEqual(info.state.history.length, 1);
                        assert.deepStrictEqual(info.state.stats.cycles, 1);
                        assert.deepStrictEqual(info.state.stats.cyclesCompleted, 1);
                        assert.deepStrictEqual(info.state.stats.statsCollected, 1);
                        assert.deepStrictEqual(info.state.stats.statsProcessed, 1);
                    } else {
                        assert.isAtLeast(info.state.history.length, proxy.reports.length);
                        assert.isAtLeast(info.state.stats.cycles, info.state.history.length + 1);
                        assert.isAbove(info.state.stats.cycles, 2);
                        assert.deepStrictEqual(info.state.stats.cyclesCompleted, info.state.stats.cycles - 1);
                        assert.deepStrictEqual(info.state.stats.statsCollected, info.state.stats.cycles - 1);
                        assert.deepStrictEqual(info.state.stats.statsProcessed, info.state.stats.cycles - 1);

                        for (let i = 1; i < info.state.history.length; i += 1) {
                            const h1 = info.state.history[i - 1];
                            const h2 = info.state.history[i];

                            assert.closeTo(
                                h2.end - h1.schedule,
                                interval * 1000,
                                10 * 1000,
                                `delay between dates ${h1.scheduleISO} and ${h2.scheduleISO} should be about ${interval}s.`
                            );
                        }
                    }
                });

                if (systemAuthConf.value) {
                    it('should report the task is failed when unable to decrypt config (and restart service if needed)', async () => {
                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        pollerStruct = createPoller(pollConf.value);

                        coreStub.deviceUtil.decrypt.rejects(new Error('expected decrypt'));

                        const { poller } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await forwardClock(getTimeStep(), () => {
                            assert.includeMatch(coreStub.logger.messages.error, /System Poller cycle failed due task error[\s\S]*expected decrypt/);
                            return true;
                        });

                        if (!pollConf.value) {
                            coreStub.logger.removeAllMessages();
                        }

                        await forwardClock(getTimeStep(), () => {
                            if (pollConf.value) {
                                assert.includeMatch(coreStub.logger.messages.debug, /Terminating system poller/);
                            } else {
                                assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                            }
                            return true;
                        });
                    });
                }

                if (systemAuthConf.value && systemConf.value) {
                    it('should fail task when unable to auth', async () => {
                        const pollerMock = createPollerMock(declaration);
                        pollerMock.bigip.auth.stub.returns([404, 'Not Found']);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        pollerStruct = createPoller(pollConf.value);

                        const { poller } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await forwardClock(getTimeStep(), () => {
                            assert.includeMatch(coreStub.logger.messages.error, /System Poller cycle failed due task error/);
                            return true;
                        });

                        if (!pollConf.value) {
                            coreStub.logger.removeAllMessages();
                        }

                        await forwardClock(getTimeStep(), () => {
                            if (pollConf.value) {
                                return poller.info().state.history.length === 1;
                            }
                            return poller.info().state.history.length >= 2;
                        });

                        if (pollConf.value) {
                            assert.includeMatch(coreStub.logger.messages.debug, /Terminating system poller/);
                        } else {
                            assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                        }

                        const info = poller.info();
                        assert.isAtLeast(info.state.stats.cycles, 1);
                        assert.deepStrictEqual(info.state.history[0].state, 'FAILED');
                        assert.match(info.state.history[0].errorMsg, /Error: Bad status code: 404.*authn\/login/);
                    });

                    it('should log error when callback with error throws error', async () => {
                        const pollerMock = createPollerMock(declaration);
                        pollerMock.bigip.auth.stub.returns([404, 'Not Found']);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        pollerStruct = createPoller(pollConf.value);
                        pollerStruct.proxy.proxy.reportCallback.throws(new Error('report callback error'));

                        const { poller } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await forwardClock(getTimeStep(), () => {
                            assert.includeMatch(coreStub.logger.messages.error, /Uncaught error on attempt to call callback[\s\S]*report callback error/);
                            return true;
                        });

                        if (!pollConf.value) {
                            coreStub.logger.removeAllMessages();
                        }

                        await forwardClock(getTimeStep(), () => {
                            if (pollConf.value) {
                                assert.includeMatch(coreStub.logger.messages.debug, /Terminating system poller/);
                            } else {
                                assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                            }
                            return true;
                        });

                        const info = poller.info();
                        assert.isAtLeast(info.state.stats.cycles, 1);
                        assert.deepStrictEqual(info.state.history[0].state, 'FAILED');
                        assert.match(info.state.history[0].errorMsg, /Error: Bad status code: 404.*authn\/login/);
                    });
                }

                it('should log error when callback with report throws error', async () => {
                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    pollerStruct = createPoller(pollConf.value);
                    pollerStruct.proxy.proxy.reportCallback.throws(new Error('report callback error'));

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(coreStub.logger.messages.error, /System Poller cycle failed due task error[\s\S]*report callback error/);
                        return true;
                    });

                    if (!pollConf.value) {
                        coreStub.logger.removeAllMessages();
                    }

                    await forwardClock(getTimeStep(), () => {
                        if (pollConf.value) {
                            assert.includeMatch(coreStub.logger.messages.debug, /Terminating system poller/);
                        } else {
                            assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                        }
                        return true;
                    });

                    const info = poller.info();
                    assert.isAtLeast(info.state.stats.cycles, 1);
                    assert.deepStrictEqual(info.state.history[0].state, 'FAILED');
                    assert.match(info.state.history[0].errorMsg, /report callback error/);
                });

                if (pollConf.value) {
                    it('should return info', async () => {
                        createPollerMock(declaration);
                        pollerStruct = createPoller(pollConf.value);

                        const { poller } = pollerStruct;
                        assert.deepStrictEqual(poller.info(), {
                            nextFireDate: 'not set',
                            onePassOnly: true,
                            prevFireDate: 'not set',
                            state: null,
                            terminated: false,
                            timeUntilNextExecution: 'not available'
                        });

                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        const startTime = Date.now();
                        await forwardClock(10, () => poller.info().terminated);

                        assert.isBelow(Date.now() - startTime, interval * 1000);

                        let info = poller.info();
                        assert.isTrue(info.onePassOnly);
                        assert.isTrue(info.terminated);
                        assert.notDeepEqual(info.nextFireDate, 'not set');
                        assert.deepStrictEqual(info.prevFireDate, 'not set');
                        assert.isNumber(info.timeUntilNextExecution);
                        assert.isObject(info.state);
                        assert.deepStrictEqual(info.state.state.cycleNo, 1);
                        assert.deepStrictEqual(info.state.state.lastKnownState, 'DONE');
                        assert.deepStrictEqual(info.state.state.isCustom, endpointsConf.value);
                        assert.deepStrictEqual(info.state.state.pollingInterval, 0);
                        assert.isEmpty(info.state.state.errorMsg);
                        assert.lengthOf(info.state.history, 1);
                        assert.deepStrictEqual(info.state.stats, {
                            cycles: 1,
                            cyclesCompleted: 1,
                            statsCollected: 1,
                            statsProcessed: 1
                        });

                        coreStub.logger.removeAllMessages();

                        await forwardClock(getTimeStep(), null, 100);

                        info = poller.info();
                        assert.isTrue(info.onePassOnly);
                        assert.isTrue(info.terminated);
                        assert.isObject(info.state);
                        assert.lengthOf(info.state.history, 1);
                        assert.deepStrictEqual(info.state.stats, {
                            cycles: 1,
                            cyclesCompleted: 1,
                            statsCollected: 1,
                            statsProcessed: 1
                        }, 'should not run more than once');
                        assert.notIncludeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                        assert.lengthOf(pollerStruct.proxy.reports, 1);
                        assert.isTrue(pollerStruct.proxy.reports.every((r) => !r.error));
                    });

                    it('should handle fatal loop error', async () => {
                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        pollerStruct = createPoller(pollConf.value);
                        pollerStruct.proxy.proxy.cleanupConfig.throws(new Error('config cleanup error'));

                        const { poller } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await forwardClock(getTimeStep(), () => {
                            assert.includeMatch(coreStub.logger.messages.error, /Terminating system poller due uncaught error[\s\S]*config cleanup/);
                            return true;
                        });
                    });
                } else {
                    it('should return info', async () => {
                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        pollerStruct = createPoller(pollConf.value);

                        const { poller } = pollerStruct;
                        assert.deepStrictEqual(poller.info(), {
                            nextFireDate: 'not set',
                            onePassOnly: false,
                            prevFireDate: 'not set',
                            state: null,
                            terminated: false,
                            timeUntilNextExecution: 'not available'
                        });

                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await forwardClock(getTimeStep(), () => pollerStruct.proxy.reports.length > 5);

                        const info = poller.info();
                        assert.isFalse(info.onePassOnly);
                        assert.isFalse(info.terminated);
                        assert.isObject(info.state);
                        assert.isAbove(info.state.history.length, 5);
                        assert.isAbove(info.state.stats.cycles, 5);
                        assert.deepStrictEqual(info.state.stats.cyclesCompleted, info.state.stats.cycles - 1);
                        assert.deepStrictEqual(info.state.stats.statsCollected, info.state.stats.cycles - 1);
                        assert.deepStrictEqual(info.state.stats.statsProcessed, info.state.stats.cycles - 1);
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                        assert.isTrue(pollerStruct.proxy.reports.every((r) => !r.error));
                    });

                    it('should keep only 40 records in the history', async () => {
                        const maxRecords = 40;
                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        pollerStruct = createPoller(pollConf.value);

                        const { poller, proxy } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await forwardClock(getTimeStep() * 100, () => proxy.reports.length > maxRecords);

                        let info = poller.info();
                        assert.isAbove(info.state.stats.cycles, maxRecords);
                        assert.lengthOf(info.state.history, maxRecords);

                        const historyCopy = testUtil.deepCopy(info.state.history);
                        const rlen = proxy.reports.length;

                        await forwardClock(getTimeStep() * 100, () => proxy.reports.length > (rlen + 5));

                        info = poller.info();
                        const idx = info.state.history.findIndex((rec) => {
                            try {
                                assert.deepStrictEqual(historyCopy[historyCopy.length - 1], rec);
                                return true;
                            } catch (error) {
                                return false;
                            }
                        });

                        assert.isNumber(idx);
                        assert.isAbove(idx, 0);
                        assert.isBelow(idx, info.state.history.length - 1);

                        await Promise.all([
                            forwardClock(getTimeStep() * 100, () => poller.isDestroyed()),
                            poller.destroy()
                        ]);
                        fakeClock.stub.restore();
                    });

                    it('should be able to schedule long intervals', async () => {
                        declaration = getDeclaration();
                        declaration.systemPoller.interval = 300;
                        await applyDeclaration(declaration);

                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        pollerStruct = createPoller(pollConf.value);
                        const { poller, proxy } = pollerStruct;

                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await forwardClock(1 * 1000, null, 60);

                        assert.deepStrictEqual(proxy.proxy.reportCallback.callCount, 0);
                        assert.deepStrictEqual(proxy.proxy.cleanupConfig.callCount, 1);
                        assert.deepStrictEqual(poller.info().state.stats.cycles, 1);

                        await forwardClock(1 * 1000, null, 400);

                        assert.isAbove(proxy.proxy.reportCallback.callCount, 0);
                        assert.isAbove(proxy.proxy.cleanupConfig.callCount, 1);
                        assert.isAbove(poller.info().state.stats.cycles, 1);
                    });

                    it('should cleanup config on destroy', async () => {
                        declaration = getDeclaration();
                        declaration.systemPoller.interval = 300;
                        await applyDeclaration(declaration);

                        createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        pollerStruct = createPoller(pollConf.value);
                        const { poller, proxy } = pollerStruct;

                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await forwardClock(1 * 1000, null, 30);

                        assert.deepStrictEqual(proxy.proxy.reportCallback.callCount, 0);
                        assert.deepStrictEqual(proxy.proxy.cleanupConfig.callCount, 1);
                        assert.deepStrictEqual(poller.info().state.stats.cycles, 1);

                        await Promise.all([
                            forwardClock(1, () => pollerStruct.poller.isDestroyed()),
                            pollerStruct.poller.destroy()
                        ]);

                        assert.deepStrictEqual(proxy.proxy.cleanupConfig.callCount, 2);
                    });

                    it('should be able to stop poller while it waiting for exec date', async () => {
                        createPollerMock(declaration);
                        pollerStruct = createPoller(pollConf.value);

                        const { poller } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await testUtil.waitTill(() => {
                            assert.includeMatch(
                                coreStub.logger.messages.debug,
                                /Next polling cycle starts on/
                            );
                            return true;
                        }, true);

                        await poller.destroy();

                        assert.includeMatch(
                            coreStub.logger.messages.debug,
                            /Sleep routine interrupted: terminated/
                        );
                        assert.notIncludeMatch(
                            coreStub.logger.messages.debug,
                            /Starting polling cycle/
                        );
                    });

                    it('should schedule next cycle with lower delay when current cycle is slow', async () => {
                        declaration = getDeclaration();
                        declaration.systemPoller.interval = 60;
                        await applyDeclaration(declaration);

                        const pollerMock = createPollerMock(declaration);
                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        pollerStruct = createPoller(pollConf.value);

                        const { poller, proxy } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        (endpointsConf.value
                            ? pollerMock.getCustomVirtualsStub()
                            : pollerMock.getSysReadyStub()
                        ).callsFake(async () => {
                            await testUtil.sleep(40 * 1000);
                            return true;
                        });

                        await forwardClock(500, () => proxy.reports.length >= 2);

                        const info = poller.info();
                        assert.isAtLeast(info.state.history.length, 2);

                        for (let i = 1; i < info.state.history.length; i += 1) {
                            const h1 = info.state.history[i - 1];
                            const h2 = info.state.history[i];

                            assert.closeTo(
                                h2.schedule - h1.end,
                                (interval / 2) * 1000,
                                20 * 1000,
                                `delay between dates ${h1.scheduleISO} and ${h2.endISO} should be about ${interval / 2}s.`
                            );
                            assert.closeTo(
                                h2.schedule - h1.schedule,
                                interval * 1000,
                                5 * 1000,
                                `delay between dates ${h1.scheduleISO} and ${h2.scheduleISO} should be about ${interval}s.`
                            );
                        }
                    });

                    if (endpointsConf.value) {
                        it('should schedule next cycle without delay when current cycle is slow', async () => {
                            declaration = getDeclaration();
                            declaration.systemPoller.interval = 60;
                            await applyDeclaration(declaration);

                            const pollerMock = createPollerMock(declaration);
                            fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                            pollerStruct = createPoller(pollConf.value);

                            const { poller, proxy } = pollerStruct;
                            await poller.start();
                            assert.isTrue(poller.isRunning());

                            (endpointsConf.value
                                ? pollerMock.getCustomVirtualsStub()
                                : pollerMock.getSysReadyStub()
                            ).callsFake(async () => {
                                await testUtil.sleep(120 * 1000);
                                return true;
                            });

                            await forwardClock(500, () => proxy.reports.length >= 2);

                            const info = poller.info();
                            assert.isAtLeast(info.state.history.length, 2);

                            for (let i = 1; i < info.state.history.length; i += 1) {
                                const h1 = info.state.history[i - 1];
                                const h2 = info.state.history[i];

                                assert.closeTo(
                                    h2.start - h1.end,
                                    5 * 1000,
                                    5 * 1000,
                                    `delay between dates ${h1.startISO} and ${h2.endISO} should be aboud 10s.`
                                );
                                assert.closeTo(
                                    h2.schedule - h1.schedule,
                                    interval * 1000,
                                    5 * 1000,
                                    `delay between dates ${h1.scheduleISO} and ${h2.scheduleISO} should be about ${interval}s.`
                                );
                            }
                        });
                    }
                }

                it('should use non-default chunk size', async () => {
                    declaration = getDeclaration();
                    declaration.systemPoller.workers = 1;
                    declaration.systemPoller.chunkSize = 1;
                    declaration.systemPoller.actions[0].locations = { pools: true };
                    if (endpointsConf.value) {
                        declaration.systemPoller.endpointList.items.pools.path = '/pool?%24top=1';
                    }
                    await applyDeclaration(declaration);

                    const pollerMock = createPollerMock(declaration);
                    pollerMock.paginaionSetup();

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    pollerStruct = createPoller(pollConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());
                    await forwardClock(500, () => proxy.reports.length >= 1);

                    const report = proxy.reports[0];
                    proxy.reports = [];
                    assert.isNull(report.error);

                    if (endpointsConf.value) {
                        assert.deepStrictEqual(report.report.stats, {
                            pools: {
                                items: [
                                    {
                                        kind: 'tm:ltm:pool:poolstate',
                                        name: 'test_pool_0',
                                        partition: 'Common',
                                        fullPath: '/Common/test_pool_0',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0',
                                        slowRampTime: 10
                                    },
                                    {
                                        kind: 'tm:ltm:pool:poolstate',
                                        name: 'test_pool_1',
                                        partition: 'Common',
                                        fullPath: '/Common/test_pool_1',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_1?ver=14.1.0',
                                        slowRampTime: 10
                                    }
                                ]
                            }
                        });
                    } else {
                        assert.deepStrictEqual(report.report.stats, {
                            pools: {
                                '/Common/test_pool_0': {
                                    activeMemberCnt: 0,
                                    name: '/Common/test_pool_0'
                                },
                                '/Common/test_pool_1': {
                                    activeMemberCnt: 1,
                                    name: '/Common/test_pool_1'
                                }
                            }
                        });
                    }
                });

                it('should use HTTP agent options', async () => {
                    declaration = getDeclaration();
                    declaration.systemPoller.httpAgentOpts = [
                        { name: 'keepAlive', value: true }
                    ];
                    await applyDeclaration(declaration);

                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    pollerStruct = createPoller(pollConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    await forwardClock(500, () => {
                        if (pollConf.value) {
                            return proxy.reports.length >= 1;
                        }
                        return proxy.reports.length > 2;
                    });

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /Using HTTP aagent with options.*keepAlive.*true/
                    );
                });

                it('should use multiple workers', async () => {
                    declaration = getDeclaration();
                    declaration.systemPoller.workers = 2;
                    declaration.splunk = dummies.declaration.consumer.splunk.minimal.decrypted({ format: 'legacy' });
                    await applyDeclaration(declaration);

                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getBashContextStub().returns(false);

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    pollerStruct = createPoller(pollConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    const requests = [];
                    const fakeFn = async () => {
                        const req = { start: Date.now() };
                        requests.push(req);
                        await testUtil.sleep(300);
                        req.end = Date.now();
                        return true;
                    };
                    let keys;

                    if (endpointsConf.value) {
                        pollerMock.getCustomPoolsStub().callsFake(fakeFn);
                        pollerMock.getCustomVirtualsStub().callsFake(fakeFn);
                        keys = ['pools', 'virtualServers'];
                    } else {
                        pollerMock.getSysReadyStub().callsFake(fakeFn);
                        pollerMock.getTmstatsStub().callsFake(fakeFn);
                        keys = ['system', 'tmstats'];
                    }

                    await forwardClock(500, () => proxy.reports.length >= 1);

                    const report = proxy.reports[0].report.stats;
                    assert.hasAllKeys(report, keys);

                    assert.isBelow(requests[1].start, requests[0].end, 'should start in parallel');
                });

                it('should use single worker', async () => {
                    declaration = getDeclaration();
                    declaration.systemPoller.workers = 1;
                    declaration.splunk = dummies.declaration.consumer.splunk.minimal.decrypted({ format: 'legacy' });
                    await applyDeclaration(declaration);

                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getBashContextStub().returns(false);

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    pollerStruct = createPoller(pollConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    const requests = [];
                    const fakeFn = async () => {
                        const req = { start: Date.now() };
                        requests.push(req);
                        await testUtil.sleep(300);
                        req.end = Date.now();
                        return true;
                    };
                    let keys;

                    if (endpointsConf.value) {
                        pollerMock.getCustomPoolsStub().callsFake(fakeFn);
                        pollerMock.getCustomVirtualsStub().callsFake(fakeFn);
                        keys = ['pools', 'virtualServers'];
                    } else {
                        pollerMock.getSysReadyStub().callsFake(fakeFn);
                        pollerMock.getTmstatsStub().callsFake(fakeFn);
                        keys = ['system', 'tmstats'];
                    }

                    await forwardClock(500, () => proxy.reports.length >= 1);

                    const report = proxy.reports[0].report.stats;
                    assert.hasAllKeys(report, keys);

                    assert.isAtLeast(requests[1].start, requests[0].end, 'should start sequentially');
                });

                if (endpointsConf.value) {
                    if (!pollConf.value) {
                        it('should be able to schedule short intervals', async () => {
                            declaration = getDeclaration();
                            declaration.systemPoller.interval = 10;
                            await applyDeclaration(declaration);

                            createPollerMock(declaration);
                            fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                            pollerStruct = createPoller(pollConf.value);

                            const { poller, proxy } = pollerStruct;
                            await poller.start();
                            assert.isTrue(poller.isRunning());

                            await forwardClock(500, () => proxy.reports.length >= 2);

                            const info = poller.info();
                            assert.isAtLeast(info.state.history.length, 2);

                            for (let i = 1; i < info.state.history.length; i += 1) {
                                const h1 = info.state.history[i - 1];
                                const h2 = info.state.history[i];

                                assert.closeTo(
                                    h2.schedule - h1.schedule,
                                    interval * 1000,
                                    5 * 1000,
                                    `delay between dates ${h1.scheduleISO} and ${h2.scheduleISO} should be about ${interval}s.`
                                );
                            }
                        });
                    }
                } else {
                    it('should fetch TMstats', async () => {
                        declaration = getDeclaration();
                        declaration.splunk = dummies.declaration.consumer.splunk.minimal.decrypted({ format: 'legacy' });
                        await applyDeclaration(declaration);

                        const pollerMock = createPollerMock(declaration);
                        pollerMock.getBashContextStub().returns(false);

                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        pollerStruct = createPoller(pollConf.value);

                        const { poller, proxy } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await forwardClock(500, () => proxy.reports.length >= 1);
                        assert.isDefined(proxy.reports[0].report.stats.tmstats);
                    });

                    it('should skip TMstats when bash disabled', async () => {
                        declaration = getDeclaration();
                        declaration.splunk = dummies.declaration.consumer.splunk.minimal.decrypted({ format: 'legacy' });
                        await applyDeclaration(declaration);

                        const pollerMock = createPollerMock(declaration);
                        pollerMock.getBashContextStub().returns(true);

                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        pollerStruct = createPoller(pollConf.value);

                        const { poller, proxy } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        await forwardClock(500, () => proxy.reports.length >= 1);
                        assert.isUndefined(proxy.reports[0].report.stats.tmstats);
                    });

                    it('should fail task when unable to collect context data', async () => {
                        const pollerMock = createPollerMock(declaration);
                        pollerMock.getBashContextStub().returns(true);

                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        pollerStruct = createPoller(pollConf.value);

                        const { poller, proxy } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        pollerMock.getBashContextStub().callsFake(() => 'error');

                        await forwardClock(500, () => proxy.reports.length >= 1);

                        const error = proxy.reports[0].error;
                        assert.instanceOf(error, Error);
                        assert.match(error, /Poller.collectContext: unable to collect device context data.*Collector.collect unexpected error on attemp to collect stats for "bashDisabled/);
                    });

                    it('should be able to stop poller during context collection process', async () => {
                        const pollerMock = createPollerMock(declaration);

                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        pollerStruct = createPoller(pollConf.value);

                        const { poller, proxy } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        pollerMock.getBashContextStub().callsFake(async () => {
                            poller.destroy();
                            await testUtil.sleep(120 * 1000);
                            return true;
                        });

                        await forwardClock(500, () => poller.isDestroyed());

                        assert.lengthOf(proxy.reports, 1);
                        assert.match(proxy.reports[0].error, /Poller.collectContext: unable to collect device context data: Stats collection routine terminated/);
                    });
                }

                it('should return empty stats when all stats pre-filtered', async () => {
                    declaration = getDeclaration();
                    declaration.systemPoller.actions[0].locations = { test: true };
                    await applyDeclaration(declaration);

                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    pollerStruct = createPoller(pollConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    await forwardClock(500, () => proxy.reports.length >= 1);

                    assert.deepStrictEqual(proxy.reports[0].report.stats, {});
                    proxy.reports = [];
                });

                it('should fail task when unable to fetch stats', async () => {
                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getBashContextStub().returns(true);

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    pollerStruct = createPoller(pollConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    (endpointsConf.value
                        ? pollerMock.getCustomVirtualsStub()
                        : pollerMock.getSysReadyStub()
                    ).returns(false);

                    await forwardClock(500, () => proxy.reports.length >= 1);

                    const error = proxy.reports[0].error;
                    assert.instanceOf(error, Error);
                    assert.match(
                        error,
                        endpointsConf.value
                            ? /Poller.collectStats: unable to collect stats.*Collector.collect unexpected error on attemp to collect stats for "virtualServers/
                            : /Poller.collectStats: unable to collect stats.*Collector.collect unexpected error on attemp to collect stats for.*provisionReady.*Bad status code: 500/
                    );
                });

                it('should be able to stop poller during stats collection process', async () => {
                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getBashContextStub().returns(true);

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    pollerStruct = createPoller(pollConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    (endpointsConf.value
                        ? pollerMock.getCustomVirtualsStub()
                        : pollerMock.getSysReadyStub()
                    ).callsFake(async () => {
                        poller.destroy();
                        await testUtil.sleep(120 * 1000);
                        return true;
                    });

                    await forwardClock(500, () => poller.isDestroyed());

                    assert.lengthOf(proxy.reports, 1);
                    assert.match(proxy.reports[0].error, /Poller.collectStats: unable to collect stats: Stats collection routine terminated/);
                });

                it('should handle fatal loop error', async () => {
                    createPollerMock(declaration);
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    pollerStruct = createPoller(pollConf.value);
                    pollerStruct.proxy.proxy.cleanupConfig.throws(new Error('config cleanup error'));

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    await Promise.all([
                        poller.destroy(),
                        forwardClock(getTimeStep(), () => {
                            assert.includeMatch(coreStub.logger.messages.error, /Terminating system poller due uncaught error[\s\S]*config cleanup/);
                            return poller.isDestroyed();
                        })
                    ]);
                });

                it('should use tags', async () => {
                    declaration = getDeclaration();
                    declaration.systemPoller.chunkSize = 1;
                    declaration.systemPoller.tag = { test: 'test' };
                    declaration.systemPoller.workers = 1;
                    declaration.systemPoller.actions[0].locations = { pools: true };
                    if (endpointsConf.value) {
                        declaration.systemPoller.endpointList.items.pools.path = '/pool?%24top=1';
                    }
                    await applyDeclaration(declaration);

                    const pollerMock = createPollerMock(declaration);
                    pollerMock.paginaionSetup();

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    pollerStruct = createPoller(pollConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());
                    await forwardClock(500, () => proxy.reports.length >= 1);

                    const report = proxy.reports[0];
                    proxy.reports = [];
                    assert.isNull(report.error);

                    if (endpointsConf.value) {
                        assert.deepStrictEqual(report.report.stats, {
                            pools: {
                                items: [
                                    {
                                        kind: 'tm:ltm:pool:poolstate',
                                        name: 'test_pool_0',
                                        partition: 'Common',
                                        fullPath: '/Common/test_pool_0',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_0?ver=14.1.0',
                                        slowRampTime: 10
                                    },
                                    {
                                        kind: 'tm:ltm:pool:poolstate',
                                        name: 'test_pool_1',
                                        partition: 'Common',
                                        fullPath: '/Common/test_pool_1',
                                        selfLink: 'https://localhost/mgmt/tm/ltm/pool/~Common~test_pool_1?ver=14.1.0',
                                        slowRampTime: 10
                                    }
                                ]
                            }
                        });
                    } else {
                        assert.deepStrictEqual(report.report.stats, {
                            pools: {
                                '/Common/test_pool_0': {
                                    activeMemberCnt: 0,
                                    name: '/Common/test_pool_0',
                                    test: 'test'
                                },
                                '/Common/test_pool_1': {
                                    activeMemberCnt: 1,
                                    name: '/Common/test_pool_1',
                                    test: 'test'
                                }
                            }
                        });
                    }
                });
            }));
    });
});
