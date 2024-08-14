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

const os = require('os');
const sinon = require('sinon');

const assert = require('../shared/assert');
const dummies = require('../shared/dummies');
const helpers = require('./helpers');
const PollerMock = require('./pollerMock');
const qkviewDiag = require('./api/qkviewDiagnostics.json');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const IHealthPoller = sourceCode('src/lib/ihealth/poller');
const SafeEventEmitter = sourceCode('src/lib/utils/eventEmitter');

moduleCache.remember();

describe('iHealth / Poller ', () => {
    const downloadFolder = os.tmpdir();
    const remotehost = 'remotehost.remotedonmain';
    let appEvents;
    let configWorker;
    let coreStub;
    let declaration;
    let fakeClock;
    let pollerDestroytub;
    let pollerStartStub;
    let pollerStopStub;
    let reports;
    let requestSpies;
    let service;

    function createPoller(demo = false) {
        const proxy = makeManagerProxy();
        const poller = new IHealthPoller(proxy.proxy, {
            demo,
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
                credentials: {
                    username: decl.ihealthPoller.username,
                    password: decl.ihealthPoller.passphrase.cipherText
                },
                downloadFolder: decl.ihealthPoller.downloadFolder
            },
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
            if (declaration.ihealthPoller.interval.frequency === 'monthly') {
                step = 48;
            }
            if (declaration.ihealthPoller.interval.frequency === 'weekly') {
                step = 24;
            }
        }
        return step * 60 * 60 * 1000;
    }

    function makeManagerProxy() {
        const proxy = {
            config: {
                config: null,
                decrypted: false
            },
            proxy: {},
            reports: [],
            storage: null
        };
        Object.defineProperties(proxy.proxy, {
            cleanupConfig: {
                value: sinon.stub()
            },
            getConfig: {
                value: sinon.stub()
            },
            getStorage: {
                value: sinon.stub()
            },
            qkviewReport: {
                value: sinon.stub()
            },
            saveStorage: {
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
                        class: 'Telemetry_iHealth_Poller'
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
        proxy.proxy.getStorage.callsFake(() => proxy.storage);
        proxy.proxy.qkviewReport.callsFake((poller, report) => {
            proxy.reports.push(report);
            reports.push(report);
        });
        proxy.proxy.saveStorage.callsFake((poller, data) => {
            proxy.storage = data;
        });

        return proxy;
    }

    function processDeclaration(decl) {
        return configWorker.processDeclaration(
            dummies.declaration.base.decrypted(decl)
        );
    }

    function verifyReport(report) {
        assert.deepStrictEqual(report.diagnostics, qkviewDiag, 'should match expected diagnostics');
        assert.isTrue(report.status.done);
        assert.isFalse(report.status.error);
    }

    function verifyReports() {
        reports.map(verifyReport);
    }

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        declaration = null;
        fakeClock = null;
        reports = [];
        requestSpies = testUtil.requestSpies();
        service = new SafeEventEmitter();

        pollerDestroytub = sinon.stub(IHealthPoller.prototype, 'destroy');
        pollerDestroytub.callThrough();
        pollerStartStub = sinon.stub(IHealthPoller.prototype, 'start');
        pollerStartStub.callThrough();
        pollerStopStub = sinon.stub(IHealthPoller.prototype, 'stop');
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
        await coreStub.utilMisc.fs.promise.mkdir(downloadFolder);

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

        verifyReports();

        if (declaration) {
            helpers.checkBigIpRequests(declaration, requestSpies);
            helpers.checkIHealthRequests(declaration, requestSpies);
        }
    });

    describe('constructor', () => {
        it('invalid args', () => {
            assert.throws(() => new IHealthPoller(undefined, {}), /manager should be neither null or undefined/);
            assert.throws(() => new IHealthPoller({}, {}), /logger should be an instance of Logger/);
            assert.throws(() => new IHealthPoller({ test: true }, {}), /logger should be an instance of Logger/);
            assert.throws(() => new IHealthPoller({ test: true }, {
                logger: coreStub.logger.logger,
                demo: null
            }), /demo should be a boolean/);
        });
    });

    describe('configuration variations', () => {
        const combinations = testUtil.product(
            [
                {
                    name: 'regular',
                    value: false
                },
                {
                    name: 'demo',
                    value: true
                }
            ],
            // interval
            testUtil.smokeTests.filter([
                {
                    name: 'daily',
                    value: { frequency: 'daily' }
                },
                {
                    name: 'weekly (day number)',
                    value: { frequency: 'weekly', dayNo: true }
                },
                {
                    name: 'weekly (day name)',
                    value: { frequency: 'weekly', dayStr: true }
                },
                {
                    name: 'monthly',
                    value: { frequency: 'monthly' }
                }
            ]),
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

        combinations.forEach(([demoConf, intervalConf, systemAuthConf, systemConf]) => describe(`type = ${demoConf.name}, interval = ${intervalConf.name}, system = ${systemConf.name}, systemAuth = ${systemAuthConf.name}`,
            () => {
                if (systemConf.value && systemConf.value.host === remotehost
                    && !(systemAuthConf.value && systemAuthConf.value.passphrase)
                ) {
                    return;
                }

                let pollerStruct;

                function getDeclaration(enable = true, trace = false) {
                    return helpers.getDeclaration({
                        downloadFolder,
                        enable,
                        intervalConf,
                        systemAuthConf,
                        systemConf,
                        trace
                    });
                }

                beforeEach(async () => {
                    declaration = getDeclaration();
                    await processDeclaration(declaration);

                    coreStub.logger.removeAllMessages();
                });

                afterEach(async () => {
                    await pollerStruct.poller.destroy();
                });

                if (demoConf.value) {
                    it('should return info', async () => {
                        createPollerMock(declaration);
                        pollerStruct = createPoller(demoConf.value);

                        const { poller } = pollerStruct;
                        assert.deepStrictEqual(poller.info(), {
                            demoMode: true,
                            nextFireDate: 'not set',
                            prevFireDate: 'not set',
                            state: null,
                            terminated: false,
                            timeUntilNextExecution: 'not available'
                        });

                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                        // should start polling sycle right now, forward clock for 6 minues
                        await forwardClock(6 * 1000, () => {
                            assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                            return true;
                        });

                        let info = poller.info();
                        assert.isTrue(info.demoMode);
                        assert.isTrue(info.terminated);
                        assert.notDeepEqual(info.nextFireDate, 'not set');
                        assert.deepStrictEqual(info.prevFireDate, 'not set');
                        assert.isNumber(info.timeUntilNextExecution);
                        assert.isObject(info.state);
                        assert.lengthOf(info.state.history, 1);
                        assert.deepStrictEqual(info.state.stats, {
                            cycles: 1,
                            cyclesCompleted: 1,
                            qkviewCollectRetries: 0,
                            qkviewUploadRetries: 0,
                            qkviewsCollected: 1,
                            qkviewsUploaded: 1,
                            reportCollectRetries: 0,
                            reportsCollected: 1
                        });

                        coreStub.logger.removeAllMessages();

                        await forwardClock(getTimeStep(), null, 100);

                        info = poller.info();
                        assert.isTrue(info.demoMode);
                        assert.isTrue(info.terminated);
                        assert.isObject(info.state);
                        assert.lengthOf(info.state.history, 1);
                        assert.deepStrictEqual(info.state.stats.cycles, 1, 'should run DEMO poller only once');
                        assert.notIncludeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                    });
                } else {
                    it('should return info', async () => {
                        createPollerMock(declaration);
                        pollerStruct = createPoller(demoConf.value);

                        const { poller } = pollerStruct;
                        assert.deepStrictEqual(poller.info(), {
                            demoMode: false,
                            nextFireDate: 'not set',
                            prevFireDate: 'not set',
                            state: null,
                            terminated: false,
                            timeUntilNextExecution: 'not available'
                        });

                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        await forwardClock(getTimeStep(), () => reports.length > 5);

                        const info = poller.info();
                        assert.isFalse(info.demoMode);
                        assert.isFalse(info.terminated);
                        assert.notDeepEqual(info.nextFireDate, 'not set');
                        assert.notDeepEqual(info.prevFireDate, 'not set');
                        assert.isNumber(info.timeUntilNextExecution);
                        assert.isObject(info.state);
                    });

                    it('should keep only 20 records in the history', async () => {
                        createPollerMock(declaration);
                        pollerStruct = createPoller(demoConf.value);

                        const { poller, proxy } = pollerStruct;
                        await poller.start();
                        assert.isTrue(poller.isRunning());

                        fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                        await forwardClock(getTimeStep(), () => reports.length > 30);

                        assert.isAbove(proxy.storage.stats.cycles, 30);
                        assert.lengthOf(proxy.storage.history, 20);

                        const historyCopy = testUtil.deepCopy(proxy.storage.history);
                        const rlen = reports.length;

                        await forwardClock(getTimeStep(), () => reports.length > (rlen + 5));

                        const idx = proxy.storage.history.findIndex((rec) => {
                            try {
                                assert.deepStrictEqual(historyCopy[historyCopy.length - 1], rec);
                                return true;
                            } catch (error) {
                                return false;
                            }
                        });

                        assert.isNumber(idx);
                        assert.isAbove(idx, 0);
                        assert.isBelow(idx, proxy.storage.history.length - 1);
                    });
                }

                it('should start and finish polling cycle(s)', async () => {
                    createPollerMock(declaration);
                    pollerStruct = createPoller(demoConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    const decryptCC = coreStub.deviceUtil.decrypt.callCount;
                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await forwardClock(getTimeStep(), () => {
                        if (demoConf.value) {
                            return reports.length >= 1;
                        }
                        return reports.length > 2;
                    });

                    assert.isEmpty(coreStub.logger.messages.error);
                    // also it should decrypt config multiple times
                    assert.isAbove(
                        coreStub.deviceUtil.decrypt.callCount,
                        decryptCC,
                        'should decrypt config multiple times'
                    );
                    assert.deepStrictEqual(proxy.storage.version, '3.0');

                    if (demoConf.value) {
                        assert.deepStrictEqual(proxy.storage.history.length, 1);
                        assert.deepStrictEqual(proxy.storage.stats.cycles, 1);
                        assert.deepStrictEqual(proxy.storage.stats.cyclesCompleted, 1);
                        assert.deepStrictEqual(proxy.storage.stats.qkviewsCollected, 1);
                        assert.deepStrictEqual(proxy.storage.stats.qkviewsUploaded, 1);
                        assert.deepStrictEqual(proxy.storage.stats.reportsCollected, 1);
                        assert.deepStrictEqual(proxy.storage.stats.qkviewCollectRetries, 0);
                        assert.deepStrictEqual(proxy.storage.stats.qkviewUploadRetries, 0);
                        assert.deepStrictEqual(proxy.storage.stats.reportCollectRetries, 0);
                    } else {
                        assert.isAtLeast(proxy.storage.history.length, reports.length);
                        assert.isAtLeast(proxy.storage.stats.cycles, proxy.storage.history.length + 1);
                        assert.isAtLeast(proxy.storage.stats.cyclesCompleted, proxy.storage.history.length);
                        assert.isAtLeast(proxy.storage.stats.qkviewsCollected, proxy.storage.history.length);
                        assert.isAtLeast(proxy.storage.stats.qkviewsUploaded, proxy.storage.history.length);
                        assert.isAtLeast(proxy.storage.stats.reportsCollected, proxy.storage.history.length);
                        assert.isAtLeast(proxy.storage.stats.qkviewCollectRetries, 0);
                        assert.isAtLeast(proxy.storage.stats.qkviewUploadRetries, 0);
                        assert.isAtLeast(proxy.storage.stats.reportCollectRetries, 0);

                        // for daily by default, in days
                        let min = 0;
                        let max = 3;
                        if (declaration.ihealthPoller.interval.frequency === 'weekly') {
                            min = 5;
                            max = 13;
                        } else if (declaration.ihealthPoller.interval.frequency === 'monthly') {
                            min = 20;
                            max = 35;
                        }

                        for (let i = 1; i < proxy.storage.history.length; i += 1) {
                            const h1 = proxy.storage.history[i - 1];
                            const h2 = proxy.storage.history[i];

                            const diff = h2.schedule - h1.schedule;
                            assert.isAtLeast(diff, min * 24 * 60 * 60 * 1000, `delay between dates ${h1.scheduleISO} and ${h2.scheduleISO} should be at least ${min}`);
                            assert.isAtMost(diff, max * 24 * 60 * 60 * 1000, `delay between dates ${h1.scheduleISO} and ${h2.scheduleISO} should be at most ${max}`);
                        }
                    }
                });

                it('should restore state', async () => {
                    createPollerMock(declaration);
                    pollerStruct = createPoller(demoConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    await testUtil.waitTill(() => {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                        return true;
                    }, true);

                    const storageCopy = testUtil.deepCopy(proxy.storage);
                    // scheduled, the storage updated
                    await poller.destroy();

                    coreStub.logger.removeAllMessages();
                    proxy.storage = storageCopy;
                    await poller.start();

                    await testUtil.waitTill(() => {
                        assert.includeMatch(coreStub.logger.messages.debug, new RegExp(`Restoring poller to the state "${storageCopy.state.lastKnownState}". Cycle #1`));
                        return true;
                    }, true);
                });

                it('should restore state when exec date is past due', async () => {
                    createPollerMock(declaration);
                    pollerStruct = createPoller(demoConf.value);

                    let { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    await testUtil.waitTill(() => {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                        return true;
                    }, true);

                    // scheduled, the storage updated
                    const storageCopy = testUtil.deepCopy(proxy.storage);
                    await poller.destroy();

                    pollerStruct = createPoller(demoConf.value);
                    poller = pollerStruct.poller;
                    proxy = pollerStruct.proxy;

                    // adjust clock for 100d back
                    storageCopy.state.execDate -= 100 * 24 * 60 * 60 * 1000;
                    proxy.storage = storageCopy;
                    proxy.storage.state.lastKnownState = 'WAITING';

                    coreStub.logger.removeAllMessages();
                    await poller.start();

                    await testUtil.waitTill(() => {
                        assert.includeMatch(coreStub.logger.messages.debug, /Restoring poller to the state "PAST_DUE". Cycle #1/);
                        return true;
                    }, true);

                    await testUtil.waitTill(() => {
                        if (demoConf.value) {
                            assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                        } else {
                            assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                        }
                        return true;
                    }, true);

                    assert.includeMatch(coreStub.logger.messages.debug, /Next execution is past due/);
                    assert.includeMatch(
                        coreStub.logger.messages.error,
                        /iHealth Poller cycle failed due task error[\s\S]*Polling execution date expired/gm
                    );
                });

                it('should report the task is failed when unable to decrypt config', async () => {
                    createPollerMock(declaration);
                    pollerStruct = createPoller(demoConf.value);

                    coreStub.deviceUtil.decrypt.rejects(new Error('expected decrypt'));

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(coreStub.logger.messages.error, /iHealth Poller cycle failed due task error[\s\S]*expected decrypt/);
                        return true;
                    });

                    if (demoConf.value) {
                        assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                    } else {
                        coreStub.logger.removeAllMessages();
                        await forwardClock(getTimeStep(), () => {
                            assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                            return true;
                        });
                    }
                });

                it('should restart poller when main loop error caught', async () => {
                    createPollerMock(declaration);
                    pollerStruct = createPoller(demoConf.value);

                    const { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    proxy.proxy.saveStorage.throws(new Error('expected save storage error'));

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });
                    await forwardClock(getTimeStep(), () => {
                        if (demoConf.value) {
                            assert.includeMatch(coreStub.logger.messages.error, /Terminating DEMO poller/);
                        } else {
                            assert.includeMatch(coreStub.logger.messages.error, /restart requested due erro[\s\S]*expected save storage error/);
                        }
                        return true;
                    });

                    if (!demoConf.value) {
                        coreStub.logger.removeAllMessages();
                        await forwardClock(getTimeStep(), () => {
                            assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                            return true;
                        });
                    }
                });

                it('should ignore old version of storage struct', async () => {
                    createPollerMock(declaration);
                    pollerStruct = createPoller(demoConf.value);

                    let { poller, proxy } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    await testUtil.waitTill(() => {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                        return true;
                    }, true);

                    // scheduled, the storage updated
                    const storageCopy = testUtil.deepCopy(proxy.storage);
                    await poller.destroy();

                    pollerStruct = createPoller(demoConf.value);
                    poller = pollerStruct.poller;
                    proxy = pollerStruct.proxy;

                    // adjust clock for 100d back
                    storageCopy.state.execDate -= 100 * 24 * 60 * 60 * 1000;
                    proxy.storage = storageCopy;
                    proxy.storage.state.lastKnownState = 'waiting';
                    proxy.storage.version = 'something';

                    coreStub.logger.removeAllMessages();
                    await poller.start();

                    await testUtil.waitTill(() => {
                        assert.includeMatch(coreStub.logger.messages.debug, /Creating a new storage struct/);
                        return true;
                    }, true);

                    await testUtil.waitTill(() => {
                        if (demoConf.value) {
                            assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                        } else {
                            assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                        }
                        return true;
                    }, true);
                });

                it('should ignore qkview removal errors', async () => {
                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getRemoveLocalFileStub().returns(false);

                    pollerStruct = createPoller(demoConf.value);

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(coreStub.logger.messages.debug, /Transitioning from step "SEND_REPORT" to "DONE"/);
                        return true;
                    });

                    assert.includeMatch(coreStub.logger.messages.debug, /localhost.*Unable to remove.*qkview[\s\S]*Bad status code: 500/);
                    if (demoConf.value) {
                        assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                    } else {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                    }
                });

                it('should fail task when exceeded number of attempts to upload qkview', async () => {
                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getQkviewUploadStub().returns(false);

                    pollerStruct = createPoller(demoConf.value);

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(coreStub.logger.messages.error, /iHealth Poller cycle failed due task error/);
                        return true;
                    });
                    await forwardClock(getTimeStep(), () => {
                        if (demoConf.value) {
                            return poller.info().state.history.length === 1;
                        }
                        return poller.info().state.history.length >= 2;
                    });

                    if (demoConf.value) {
                        assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                    } else {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                    }

                    const info = poller.info();
                    assert.isAtLeast(info.state.stats.cycles, 1);
                    assert.isAtLeast(info.state.stats.qkviewsCollected, 1);
                    assert.isAtLeast(info.state.stats.qkviewUploadRetries, 5);
                    assert.deepStrictEqual(info.state.history[0].state, 'FAILED');
                    assert.deepStrictEqual(info.state.history[0].errorMsg, 'Error: Step "QKVIEW_UPLOAD" failed! Re-try allowed = false. Re-try attemps left 0 / 5.');
                });

                it('should re-try task when unable to upload qkview', async () => {
                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getQkviewUploadStub()
                        .onFirstCall()
                        .returns(false)
                        .callThrough();

                    pollerStruct = createPoller(demoConf.value);

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(coreStub.logger.messages.debug, /Transitioning from step "SEND_REPORT" to "DONE"/);
                        return true;
                    });
                    await forwardClock(getTimeStep(), () => {
                        if (demoConf.value) {
                            return poller.info().state.history.length === 1;
                        }
                        return poller.info().state.history.length >= 2;
                    });

                    if (demoConf.value) {
                        assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                    } else {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                    }

                    const info = poller.info();
                    assert.isAtLeast(info.state.stats.cycles, 1);
                    assert.isAtLeast(info.state.stats.qkviewsCollected, 1);
                    assert.deepStrictEqual(info.state.stats.qkviewUploadRetries, 1);
                    assert.deepStrictEqual(info.state.history[0].state, 'DONE');
                });

                it('should fail task when exceeded number of attempts to get qkview diagnostics', async () => {
                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getQkviewDiagStub().returns(false);

                    pollerStruct = createPoller(demoConf.value);

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(coreStub.logger.messages.error, /iHealth Poller cycle failed due task error/);
                        return true;
                    });
                    await forwardClock(getTimeStep(), () => {
                        if (demoConf.value) {
                            return poller.info().state.history.length === 1;
                        }
                        return poller.info().state.history.length >= 2;
                    });

                    if (demoConf.value) {
                        assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                    } else {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                    }

                    const info = poller.info();
                    assert.isAtLeast(info.state.stats.cycles, 1);
                    assert.isAtLeast(info.state.stats.qkviewsCollected, 1);
                    assert.isAtLeast(info.state.stats.qkviewsUploaded, 1);
                    assert.isAtLeast(info.state.stats.reportCollectRetries, 30);
                    assert.deepStrictEqual(info.state.history[0].state, 'FAILED');
                    assert.deepStrictEqual(info.state.history[0].errorMsg, 'Error: Step "QKVIEW_REPORT" failed! Re-try allowed = false. Re-try attemps left 0 / 30.');
                });

                it('should re-try task when unable to get qkview diagnostics', async () => {
                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getQkviewDiagStub()
                        .onFirstCall()
                        .returns(false)
                        .callThrough();

                    pollerStruct = createPoller(demoConf.value);

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(coreStub.logger.messages.debug, /Transitioning from step "SEND_REPORT" to "DONE"/);
                        return true;
                    });
                    await forwardClock(getTimeStep(), () => {
                        if (demoConf.value) {
                            return poller.info().state.history.length === 1;
                        }
                        return poller.info().state.history.length >= 2;
                    });

                    if (demoConf.value) {
                        assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                    } else {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                    }

                    const info = poller.info();
                    assert.isAtLeast(info.state.stats.cycles, 1);
                    assert.isAtLeast(info.state.stats.qkviewsCollected, 1);
                    assert.isAtLeast(info.state.stats.qkviewsUploaded, 1);
                    assert.deepStrictEqual(info.state.stats.reportCollectRetries, 1);
                    assert.deepStrictEqual(info.state.history[0].state, 'DONE');
                });

                it('should fail task when iHealth API returns error for qkview processing', async () => {
                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getQkviewReportStub().returns(false);

                    pollerStruct = createPoller(demoConf.value);

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(coreStub.logger.messages.error, /iHealth Poller cycle failed due task error[\s\S]*F5 iHealth Service Error: qkview processing error/);
                        return true;
                    });
                    await forwardClock(getTimeStep(), () => {
                        if (demoConf.value) {
                            return poller.info().state.history.length === 1;
                        }
                        return poller.info().state.history.length >= 2;
                    });

                    if (demoConf.value) {
                        assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                    } else {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                    }

                    const info = poller.info();
                    assert.isAtLeast(info.state.stats.cycles, 1);
                    assert.isAtLeast(info.state.stats.qkviewsCollected, 1);
                    assert.isAtLeast(info.state.stats.qkviewsUploaded, 1);
                    assert.deepStrictEqual(info.state.stats.reportCollectRetries, 0);
                    assert.deepStrictEqual(info.state.history[0].state, 'FAILED');
                    assert.deepStrictEqual(info.state.history[0].errorMsg, 'Error: F5 iHealth Service Error: qkview processing error');
                });

                it('should fail task when exceeded number of attempts to generate qkview', async () => {
                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getQkviewGenStub().returns(false);

                    pollerStruct = createPoller(demoConf.value);

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(coreStub.logger.messages.error, /iHealth Poller cycle failed due task error/);
                        return true;
                    });
                    await forwardClock(getTimeStep(), () => {
                        if (demoConf.value) {
                            return poller.info().state.history.length === 1;
                        }
                        return poller.info().state.history.length >= 2;
                    });

                    if (demoConf.value) {
                        assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                    } else {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                    }

                    const info = poller.info();
                    assert.isAtLeast(info.state.stats.cycles, 1);
                    assert.isAtLeast(info.state.stats.qkviewsCollected, 0);
                    assert.isAtLeast(info.state.stats.qkviewCollectRetries, 5);
                    assert.deepStrictEqual(info.state.history[0].state, 'FAILED');
                    assert.deepStrictEqual(info.state.history[0].errorMsg, 'Error: Step "QKVIEW_GEN" failed! Re-try allowed = false. Re-try attemps left 0 / 5.');
                });

                it('should re-try task when unable to generate qkview', async () => {
                    const pollerMock = createPollerMock(declaration);
                    pollerMock.getQkviewGenStub()
                        .onFirstCall()
                        .returns(false)
                        .callThrough();

                    pollerStruct = createPoller(demoConf.value);

                    const { poller } = pollerStruct;
                    await poller.start();
                    assert.isTrue(poller.isRunning());

                    fakeClock = stubs.clock({ fakeTimersOpts: Date.now() });

                    await forwardClock(getTimeStep(), () => {
                        assert.includeMatch(coreStub.logger.messages.debug, /Transitioning from step "SEND_REPORT" to "DONE"/);
                        return true;
                    });
                    await forwardClock(getTimeStep(), () => {
                        if (demoConf.value) {
                            return poller.info().state.history.length === 1;
                        }
                        return poller.info().state.history.length >= 2;
                    });

                    if (demoConf.value) {
                        assert.includeMatch(coreStub.logger.messages.debug, /Terminating DEMO poller/);
                    } else {
                        assert.includeMatch(coreStub.logger.messages.debug, /Next polling cycle starts on/);
                    }

                    const info = poller.info();
                    assert.isAtLeast(info.state.stats.cycles, 1);
                    assert.isAtLeast(info.state.stats.qkviewsCollected, 0);
                    assert.isAtLeast(info.state.stats.qkviewCollectRetries, 1);
                    assert.deepStrictEqual(info.state.history[0].state, 'DONE');
                });
            }));
    });
});
