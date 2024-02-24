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

const fs = require('fs');
const memfs = require('memfs');
const nock = require('nock');
const pathUtil = require('path');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const configWorker = sourceCode('src/lib/config');
const deviceUtil = sourceCode('src/lib/utils/device');
const persistentStorage = sourceCode('src/lib/persistentStorage');
const RuntimeConfig = sourceCode('src/lib/runtimeConfig');
const updater = sourceCode('src/lib/runtimeConfig/updater');

moduleCache.remember();

describe('Resource Monitor / Resource Monitor', () => {
    const RESTNODE_SCRIPT_FNAME = '/etc/bigstart/scripts/restnoded';
    const UPDATER_DIR = pathUtil.join(__dirname, '../../../src/lib/runtimeConfig');
    const UPDATER_LOGS = pathUtil.join(UPDATER_DIR, 'logs.txt');

    let clock;
    let coreStub;
    let isBashEnabled;
    let processExitStub;
    let remoteCmds;
    let remoteCmbStub;
    let restApiSysDB;
    let runtimeConfig;
    let virtualFS;
    let volume;

    before(() => {
        moduleCache.restore();

        volume = new memfs.Volume();
        virtualFS = memfs.createFsFromVolume(volume);
    });

    beforeEach(() => {
        clock = stubs.clock();

        remoteCmds = [];

        remoteCmbStub = sinon.stub(deviceUtil.DeviceAsyncCLI.prototype, 'execute');
        remoteCmbStub.callsFake((cmd) => {
            remoteCmds.push(cmd);
            if (cmd.indexOf('updater') !== -1) {
                updater.main(virtualFS);
            }
            return Promise.resolve();
        });

        processExitStub = sinon.stub(process, 'exit');
        processExitStub.callsFake(() => {});

        volume.reset();

        volume.mkdirSync(pathUtil.dirname(RESTNODE_SCRIPT_FNAME), { recursive: true });
        volume.mkdirSync(UPDATER_DIR, { recursive: true });

        virtualFS.writeFileSync(
            RESTNODE_SCRIPT_FNAME,
            fs.readFileSync(pathUtil.join(__dirname, 'bigstart_restnode'))
        );

        coreStub = stubs.default.coreStub({}, { logger: { ignoreLevelChange: false } });
        coreStub.persistentStorage.loadData = { config: { } };

        runtimeConfig = new RuntimeConfig(virtualFS);

        isBashEnabled = true;
        restApiSysDB = () => [200, { value: isBashEnabled }];
        testUtil.mockEndpoints([{
            endpoint: '/mgmt/tm/sys/db/systemauth.disablebash',
            method: 'get',
            response: () => restApiSysDB(),
            options: {
                times: 100
            }
        }]);

        return configWorker.cleanup()
            .then(() => persistentStorage.persistentStorage.load())
            .then(() => runtimeConfig.initialize({ configMgr: configWorker }));
    });

    afterEach(() => runtimeConfig.destroy()
        .then(() => {
            nock.cleanAll();
            sinon.restore();
        }));

    function deleteScript() {
        return virtualFS.unlinkSync(RESTNODE_SCRIPT_FNAME);
    }

    function getScript() {
        return virtualFS.readFileSync(RESTNODE_SCRIPT_FNAME).toString();
    }

    function getTaskID() {
        return JSON.parse(virtualFS.readFileSync(pathUtil.join(UPDATER_DIR, 'config.json'))).id;
    }

    function processDeclaration(decl) {
        return configWorker.processDeclaration({
            class: 'Telemetry',
            controls: {
                class: 'Controls',
                runtime: decl
            }
        });
    }

    describe('.initialize()', () => {
        it('should log message when unable to subscribe to config updates', () => {
            const rc = new RuntimeConfig();
            rc.initialize({});

            assert.includeMatch(
                coreStub.logger.messages.all,
                /Unable to subscribe to configuration updates/
            );
        });
    });

    it('should process default runtime configuration', () => runtimeConfig.start()
        .then(() => {
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration(),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.includeMatch(
                coreStub.logger.messages.all,
                /No changes found between running configuration and the new one/
            );
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Task done/
            );
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            assert.isEmpty(remoteCmds);
            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should process runtime configuration with default values', () => runtimeConfig.start()
        .then(() => {
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: false,
                    maxHeapSize: 1400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.includeMatch(
                coreStub.logger.messages.all,
                /No changes found between running configuration and the new one/
            );
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Task done/
            );
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            assert.isEmpty(remoteCmds);
            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should do nothing when unable to read configuration from the script', () => runtimeConfig.start()
        .then(() => {
            deleteScript();
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: false,
                    maxHeapSize: 1400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Unable to read configuration from the startup script/
            );
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Task done/
            );
            assert.throws(() => getScript());
            assert.isEmpty(remoteCmds);
            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should do nothing when bash disabled', () => runtimeConfig.start()
        .then(() => {
            isBashEnabled = false;
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Shell not available, unable to proceed with task execution/
            );
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Task done/
            );
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            assert.isEmpty(remoteCmds);
            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should fail when unable to run remote command', () => runtimeConfig.start()
        .then(() => {
            remoteCmbStub.rejects(new Error('expected error'));
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
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
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            assert.isEmpty(remoteCmds);
            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should fail when changes were not applied to the startup script', () => runtimeConfig.start()
        .then(() => {
            sinon.stub(updater, 'main').callsFake(() => {});
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Configuration was not applied to the script/
            );
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Task failed/
            );
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            assert.includeMatch(remoteCmds, `${process.argv[0]} ${UPDATER_DIR}/updater.js`);
            remoteCmds = [];
            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should finish task once restart scheduled', () => runtimeConfig.start()
        .then(() => {
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
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
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            assert.includeMatch(remoteCmds, `${process.argv[0]} ${UPDATER_DIR}/updater.js`);
            assert.includeMatch(remoteCmds, 'bigstart restart restnoded');
            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should force restart when unable to schedule restart via remote cmd', () => runtimeConfig.start()
        .then(() => {
            remoteCmbStub.onSecondCall().rejects(new Error('expected error'));
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
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
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            assert.deepStrictEqual(processExitStub.callCount, 1);

            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should report that bash disabled when unable check its status', () => runtimeConfig.start()
        .then(() => {
            restApiSysDB = () => [
                404,
                'Not Found'
            ];
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Shell not available, unable to proceed with task execution/
            );
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Task done/
            );
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            assert.isEmpty(remoteCmds);
            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should not fail when unable to read script configuration once remote cmd executed', () => runtimeConfig.start()
        .then(() => {
            remoteCmbStub.onFirstCall().callsFake(() => {
                virtualFS.writeFileSync(RESTNODE_SCRIPT_FNAME, 'something');
                return Promise.resolve();
            });
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
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
                getScript(),
                'something'
            );
            remoteCmds = [];
            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should stop task once service stopped', () => runtimeConfig.start()
        .then(() => {
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(5, { promisify: true, delay: 1, repeat: 50 }),
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
        })
        .then(() => Promise.all([
            runtimeConfig.stop(),
            clock.clockForward(3000, { promisify: true, delay: 1, repeat: 50 })
        ]))
        .then(() => {
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
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            assert.includeMatch(remoteCmds, `${process.argv[0]} ${UPDATER_DIR}/updater.js`);
            remoteCmds = [];
            coreStub.logger.removeAllMessages();

            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should retry task if possible', () => runtimeConfig.start()
        .then(() => {
            remoteCmbStub.onFirstCall().callsFake(() => Promise.resolve());
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
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
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            assert.includeMatch(remoteCmds, `${process.argv[0]} ${UPDATER_DIR}/updater.js`);
            remoteCmds = [];
            coreStub.logger.removeAllMessages();

            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should not retry task more than once', () => runtimeConfig.start()
        .then(() => {
            remoteCmbStub.callsFake(() => Promise.resolve());
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
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

            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            coreStub.logger.removeAllMessages();
            return clock.clockForward(3000, { promisify: true, delay: 10, repeat: 10 });
        })
        .then(() => {
            assert.isEmpty(remoteCmds);
            assert.isEmpty(coreStub.logger.messages.all);
        }));

    it('should remove log files before task execution', () => runtimeConfig.start()
        .then(() => {
            virtualFS.writeFileSync(UPDATER_LOGS, 'existing-data');
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(3000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.notIncludeMatch(coreStub.logger.messages.all, /existing-data/);
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Task done/
            );

            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );

            let logs = '';
            try {
                logs = virtualFS.readFileSync(UPDATER_LOGS).toString();
            } catch (err) {
                // do nothing
            }
            assert.notIncludeMatch(logs, /existing-data/);
        }));

    it('should schedule next task and cancel the current one', () => runtimeConfig.start()
        .then(() => {
            remoteCmbStub.onSecondCall().callsFake(() => processDeclaration({
                enableGC: false,
                maxHeapSize: 2500
            })
                .then(() => testUtil.sleep(5000))
                .then(() => Promise.reject(new Error('expected error'))));

            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
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
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2500 /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
        }));

    it('should schedule next task and cancel the current one and existing "next" task too', () => runtimeConfig.start()
        .then(() => {
            remoteCmbStub.onSecondCall().callsFake(() => processDeclaration({
                enableGC: false,
                maxHeapSize: 2500
            })
                .then(() => processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2600
                }))
                .then(() => testUtil.sleep(5000))
                .then(() => Promise.reject(new Error('expected error'))));
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
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
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2600 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
        }));

    it('should not schedule next task when service restart requested', () => runtimeConfig.start()
        .then(() => {
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({
                    enableGC: true,
                    maxHeapSize: 2400
                }),
                clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Task done/
            );

            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            coreStub.logger.removeAllMessages();
            return Promise.all([
                processDeclaration({}),
                clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.includeMatch(
                coreStub.logger.messages.all,
                /Unable to schedule next task: the service restart requested already/
            );
            assert.notIncludeMatch(
                coreStub.logger.messages.all,
                /Task (done|failed|stopped)/
            );
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
        }));

    it('should apply configuration', () => runtimeConfig.start()
        .then(() => Promise.all([
            processDeclaration({
                enableGC: true,
                maxHeapSize: 2400
            }),
            clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
        ]))
        .then(() => {
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            // should not apply a new one due restart request
            return Promise.all([
                processDeclaration(),
                clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            return Promise.all([
                runtimeConfig.restart(),
                clock.clockForward(6000, { promisify: true, delay: 1, repeat: 10 })
            ]);
        })
        .then(() => Promise.all([
            processDeclaration({
                enableGC: true,
                maxHeapSize: 2400
            }),
            clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
        ]))
        .then(() => {
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node --max_old_space_size=2400 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            return Promise.all([
                processDeclaration({}),
                clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
            // should not apply due restart request
            return Promise.all([
                processDeclaration({
                    enableGC: true
                }),
                clock.clockForward(6000, { promisify: true, delay: 1, repeat: 100 })
            ]);
        })
        .then(() => {
            assert.deepStrictEqual(
                getScript(),
                [
                    '#!/bin/sh',
                    '',
                    'if [ -f /service/${service}/debug ]; then',
                    '    exec /usr/bin/f5-rest-node --debug /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'else',
                    '    # ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '    # To restore original behavior, uncomment the next line and remove the block below.',
                    '    #',
                    '    # exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '    #',
                    '    # The block below should be removed to restore original behavior!',
                    `    # ID:${getTaskID()}`,
                    '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    'fi',
                    ''
                ].join('\n')
            );
        }));

    // TODO:
    // - test that sumbits multiple declarations (one by one)
    // - update RestWorker tests if needed (add new stub)
});
