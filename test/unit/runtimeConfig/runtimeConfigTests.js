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

/* eslint-disable import/order, no-template-curly-in-string, prefer-regex-literals */
const moduleCache = require('../shared/restoreCache')();

const nodeFS = require('fs');
const pathUtil = require('path');
const sinon = require('sinon');

const assert = require('../shared/assert');
const rcUtils = require('./shared');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const RuntimeConfig = sourceCode('src/lib/runtimeConfig');
const updater = sourceCode('src/lib/runtimeConfig/updater');
const utilMisc = sourceCode('src/lib/utils/misc');

moduleCache.remember();

describe('Runtime Config / Runtime Config', () => {
    let clock;
    let configWorker;
    let coreStub;
    let failUpdaterCmd;
    let failRestartCmd;
    let dacliMock;
    let isBashEnabled;
    let processExitStub;
    let remoteCmds;
    let restApiSysDB;
    let runtimeConfig;
    let updaterHook;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        clock = stubs.clock();

        failUpdaterCmd = false;
        failRestartCmd = false;

        coreStub = stubs.default.coreStub();
        const shellStatusMock = coreStub.localhostBigIp.mockIsShellEnabled(
            true, { optionally: true, replyTimes: Infinity }
        );

        isBashEnabled = true;
        restApiSysDB = () => ({ value: `${!isBashEnabled}` });
        shellStatusMock.stub.callsFake(() => [200, restApiSysDB()]);

        remoteCmds = [];
        dacliMock = coreStub.localhostBigIp.mockDACLI(/restnoded|updater/, { optionally: true, replyTimes: Infinity });

        let updaterTaskID;
        let restartTaskID;
        updaterHook = sinon.stub();
        dacliMock.createTask.stub.callsFake((_taskId, reqBody) => {
            remoteCmds.push(reqBody.utilCmdArgs);
            if (reqBody.utilCmdArgs.includes('updater')) {
                updaterTaskID = _taskId;
            }
            if (reqBody.utilCmdArgs.includes('restnoded')) {
                restartTaskID = _taskId;
            }
            return [200, { _taskId }];
        });
        dacliMock.pollTaskResult.stub.callsFake(async (taskID) => {
            let state = 'COMPLETED';
            if (taskID === updaterTaskID) {
                await updaterHook();
            }
            if ((taskID === updaterTaskID && failUpdaterCmd) || (taskID === restartTaskID && failRestartCmd)) {
                state = 'FAILED';
            }
            if (taskID === updaterTaskID && !failUpdaterCmd) {
                updater.main(utilMisc.fs);
            }
            return [200, { _taskState: state }];
        });

        processExitStub = sinon.stub(process, 'exit');
        processExitStub.callsFake(() => {});

        await utilMisc.fs.mkdir(pathUtil.dirname(rcUtils.RESTNODE_SCRIPT_FNAME));
        await utilMisc.fs.mkdir(rcUtils.UPDATER_DIR, { recursive: true });
        await utilMisc.fs.writeFile(
            rcUtils.RESTNODE_SCRIPT_FNAME,
            nodeFS.readFileSync(pathUtil.join(__dirname, 'bigstart_restnode'))
        );

        configWorker = coreStub.configWorker.configWorker;

        runtimeConfig = new RuntimeConfig();
        runtimeConfig.initialize(coreStub.appEvents.appEvents);

        rcUtils.init({ virtFS: utilMisc.fs });

        await coreStub.startServices();
        await configWorker.cleanup();
    });

    afterEach(async () => {
        if (clock) {
            clock.stub.restore();
        }

        await runtimeConfig.destroy();
        await coreStub.destroyServices();

        rcUtils.destroy();
        testUtil.nockCleanup();
        sinon.restore();
    });

    function processDeclaration(decl, sleepOpts) {
        return Promise.all([
            configWorker.processDeclaration({
                class: 'Telemetry',
                controls: {
                    class: 'Controls',
                    runtime: decl
                }
            }),
            sleepOpts !== false
                ? clock.clockForward(
                    (sleepOpts || {}).time || 3000,
                    Object.assign({ promisify: true, delay: 1, repeat: 100 }, sleepOpts || {})
                )
                : Promise.resolve(),
            coreStub.appEvents.appEvents.waitFor('runtimecfg.config.applied')
        ]);
    }

    it('should process default runtime configuration', async () => {
        await runtimeConfig.start();

        coreStub.logger.removeAllMessages();
        await processDeclaration();

        assert.includeMatch(
            coreStub.logger.messages.all,
            /No changes found between running configuration and the new one/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );
        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeShortScript()
        );
        assert.isEmpty(remoteCmds);
        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(remoteCmds);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should process runtime configuration with default values', async () => {
        await runtimeConfig.start();

        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: rcUtils.GC_DEFAULT,
            maxHeapSize: rcUtils.HEAP_SIZE_DEFAULT,
            httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT_SEC
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /No changes found between running configuration and the new one/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );
        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeShortScript()
        );
        assert.isEmpty(remoteCmds);
        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(remoteCmds);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should do nothing when unable to read configuration from the script', async () => {
        await runtimeConfig.start();

        rcUtils.deleteScript();
        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: rcUtils.GC_DEFAULT,
            maxHeapSize: rcUtils.HEAP_SIZE_DEFAULT,
            httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT_SEC
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Unable to read configuration from the startup script/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );
        assert.throws(() => rcUtils.getScript());
        assert.isEmpty(remoteCmds);
        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(remoteCmds);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should do nothing when bash disabled', async () => {
        await runtimeConfig.start();

        isBashEnabled = false;
        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Shell not available, unable to proceed with task execution/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );
        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeShortScript()
        );
        assert.isEmpty(remoteCmds);
        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(remoteCmds);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should fail when unable to run updater command', async () => {
        await runtimeConfig.start();

        failUpdaterCmd = true;
        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /no logs available/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Attempt to update the runtime configuration failed! See logs for more details/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task failed/
        );
        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeShortScript()
        );
        assert.lengthOf(remoteCmds, 2);
        assert.includeMatch(remoteCmds, /updater/);

        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.lengthOf(remoteCmds, 2);
        assert.includeMatch(remoteCmds, /updater/);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should fail when changes were not applied to the startup script', async () => {
        await runtimeConfig.start();

        sinon.stub(updater, 'main').callsFake(() => {});
        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Configuration was not applied to the script/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task failed/
        );
        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeShortScript()
        );
        assert.includeMatch(remoteCmds, `${process.argv[0]} ${rcUtils.UPDATER_DIR}/updater.js`);
        remoteCmds = [];
        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(remoteCmds);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should finish task once restart scheduled', async () => {
        await runtimeConfig.start();

        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /New configuration was successfully applied to the startup script! Scheduling service restart in 1 min/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Restarting service to apply new changes for the runtime configuraiton/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -k 90000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
        assert.includeMatch(remoteCmds, `${process.argv[0]} ${rcUtils.UPDATER_DIR}/updater.js`);
        assert.includeMatch(remoteCmds, 'bigstart restart restnoded');
        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should force restart when unable to schedule restart via remote cmd', async () => {
        await runtimeConfig.start();

        failRestartCmd = true;
        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /New configuration was successfully applied to the startup script! Scheduling service restart in 1 min/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Restarting service to apply new changes for the runtime configuraiton/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Unable to restart service via bigstart/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Unable to restart service gracefully/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -k 90000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
        assert.deepStrictEqual(processExitStub.callCount, 1);

        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should report that bash disabled when unable check its status', async () => {
        await runtimeConfig.start();

        restApiSysDB = () => [
            404,
            'Not Found'
        ];
        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Shell not available, unable to proceed with task execution/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );
        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeShortScript()
        );
        assert.isEmpty(remoteCmds);
        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(remoteCmds);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should not fail when unable to read script configuration once remote cmd executed', async () => {
        await runtimeConfig.start();

        updaterHook.callsFake(() => utilMisc.fs.writeFileSync(rcUtils.RESTNODE_SCRIPT_FNAME, 'something'));
        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Trying to execute "updater" script/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Unable to read configuration from the startup script/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );
        assert.deepStrictEqual(
            rcUtils.getScript(),
            'something'
        );
        remoteCmds = [];
        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(remoteCmds);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should stop task once service stopped', async () => {
        await runtimeConfig.start();

        coreStub.logger.removeAllMessages();
        await Promise.all([
            processDeclaration({
                enableGC: true,
                maxHeapSize: 2400,
                httpTimeout: 90
            }, { time: 5, delay: 1, repeat: 50 }),
            testUtil.waitTill(() => {
                try {
                    assert.includeMatch(
                        coreStub.logger.messages.all,
                        /New configuration was successfully applied to the startup script! Scheduling service restart/
                    );
                    return true;
                } catch (err) {
                    return false;
                }
            }, 1)
        ]);

        await Promise.all([
            runtimeConfig.stop(),
            clock.clockForward(3000, { promisify: true, delay: 1, repeat: 50 })
        ]);

        assert.includeMatch(
            coreStub.logger.messages.all,
            /New configuration was successfully applied to the startup script! Scheduling service restart/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task stopped/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task emitted event "stopped"/
        );

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -k 90000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
        assert.includeMatch(remoteCmds, `${process.argv[0]} ${rcUtils.UPDATER_DIR}/updater.js`);
        remoteCmds = [];
        coreStub.logger.removeAllMessages();

        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(remoteCmds);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should retry task if possible', async () => {
        await runtimeConfig.start();

        updaterHook
            .onFirstCall()
            .callsFake(() => {
                failUpdaterCmd = true;
            })
            .onSecondCall()
            .callsFake(() => {
                failUpdaterCmd = false;
            });

        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Configuration was not applied to the script/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task failed/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Retrying attempt to update the startup script/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /New configuration was successfully applied to the startup script! Scheduling service restart/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -k 90000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
        assert.includeMatch(remoteCmds, `${process.argv[0]} ${rcUtils.UPDATER_DIR}/updater.js`);
        remoteCmds = [];
        coreStub.logger.removeAllMessages();

        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.isEmpty(remoteCmds);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should not retry task more than once', async () => {
        await runtimeConfig.start();

        failUpdaterCmd = true;
        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Retrying attempt to update the startup script/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task failed/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /No retries left for the failed task/
        );

        assert.lengthOf(remoteCmds, 2);
        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeShortScript()
        );
        coreStub.logger.removeAllMessages();
        await clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });

        assert.lengthOf(remoteCmds, 2);
        assert.isEmpty(coreStub.logger.messages.all);
    });

    it('should remove log files before task execution', async () => {
        await runtimeConfig.start();

        utilMisc.fs.writeFileSync(rcUtils.UPDATER_LOGS, 'existing-data');
        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        });

        assert.notIncludeMatch(coreStub.logger.messages.all, /existing-data/);
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -k 90000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );

        let logs = '';
        try {
            logs = utilMisc.fs.readFileSync(rcUtils.UPDATER_LOGS).toString();
        } catch (err) {
            // do nothing
        }
        assert.notIncludeMatch(logs, /existing-data/);
    });

    it('should schedule next task and cancel the current one', async () => {
        await runtimeConfig.start();

        updaterHook.onFirstCall().callsFake(async () => {
            await processDeclaration({
                enableGC: false,
                maxHeapSize: 2500
            }, false);
            await testUtil.sleep(5000);
        });

        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 80
        }, { time: 6000 });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task emitted event "stopped"/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task stopped/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2500 /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
    });

    it('should schedule next task and cancel the current one and existing "next" task too', async () => {
        await runtimeConfig.start();

        updaterHook.onFirstCall().callsFake(async () => {
            await processDeclaration({
                enableGC: false,
                maxHeapSize: 2500
            }, false);
            await processDeclaration({
                enableGC: true,
                maxHeapSize: 2600
            }, false);
            await testUtil.sleep(5000);
        });

        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 80
        }, { time: 6000 });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task emitted event "stopped"/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task stopped/
        );
        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2600 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
    });

    it('should not schedule next task when service restart requested', async () => {
        await runtimeConfig.start();

        coreStub.logger.removeAllMessages();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        }, { time: 3000 });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Task done/
        );

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -k 90000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
        coreStub.logger.removeAllMessages();
        await processDeclaration({}, { time: 3000 });

        assert.includeMatch(
            coreStub.logger.messages.all,
            /Unable to schedule next task: the service restart requested already/
        );
        assert.notIncludeMatch(
            coreStub.logger.messages.all,
            /Task (done|failed|stopped)/
        );
        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -k 90000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
    });

    it('should apply configuration', async () => {
        await runtimeConfig.start();
        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        }, { time: 3000 });

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -k 90000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
        // should not apply a new one due restart request
        await processDeclaration(undefined, { time: 3000 });

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -k 90000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
        await Promise.all([
            runtimeConfig.restart(),
            clock.clockForward(6000, { promisify: true, delay: 1, repeat: 10 })
        ]);

        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2400,
            httpTimeout: 90
        }, { time: 3000 });

        let script = rcUtils.getScript();
        assert.deepStrictEqual(
            script,
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -k 90000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );

        script = script.replace('--max-old-space-size', '--max_old_space_size');
        utilMisc.fs.writeFileSync(rcUtils.RESTNODE_SCRIPT_FNAME, script);

        await processDeclaration({
            enableGC: true,
            maxHeapSize: 2405,
            httpTimeout: 95
        }, { time: 6000 });

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2405 --expose-gc /usr/share/rest/node/src/restnode.js -k 95000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );

        await Promise.all([
            runtimeConfig.restart(),
            clock.clockForward(6000, { promisify: true, delay: 1, repeat: 10 })
        ]);

        utilMisc.fs.writeFileSync(
            rcUtils.RESTNODE_SCRIPT_FNAME,
            rcUtils.getScript().replace('--max-old-space-size', '--max_old_space_size=2060 --max-old-space-size')
        );

        await Promise.all([
            processDeclaration({
                enableGC: true,
                maxHeapSize: 2405,
                httpTimeout: 70
            }),
            clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
        ]);

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max_old_space_size=2060 --max-old-space-size=2405 --expose-gc /usr/share/rest/node/src/restnode.js -k 70000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );

        // should not apply due restart request
        await Promise.all([
            processDeclaration({
                enableGC: true,
                maxHeapSize: 2060,
                httpTimeout: 80
            }),
            clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
        ]);

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript('exec /usr/bin/f5-rest-node --max_old_space_size=2060 --max-old-space-size=2405 --expose-gc /usr/share/rest/node/src/restnode.js -k 70000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
        );
        await Promise.all([
            runtimeConfig.restart(),
            clock.clockForward(6000, { promisify: true, delay: 1, repeat: 10 })
        ]);

        await Promise.all([
            processDeclaration({}),
            clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
        ]);

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript()
        );
        // should not apply due restart request
        await processDeclaration({
            enableGC: true
        }, { time: 3000 });

        assert.deepStrictEqual(
            rcUtils.getScript(),
            rcUtils.makeScript()
        );
    });
});
