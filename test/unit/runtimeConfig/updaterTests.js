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
const pathUtil = require('path');
const sinon = require('sinon');

const assert = require('../shared/assert');
const rcUtils = require('./shared');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const updater = sourceCode('src/lib/runtimeConfig/updater');

moduleCache.remember();

describe('Runtime Config / Updater', () => {
    let appCtx;
    let virtualFS;
    let volume;

    before(() => {
        moduleCache.restore();

        volume = new memfs.Volume();
        virtualFS = memfs.createFsFromVolume(volume);
    });

    beforeEach(() => {
        volume.reset();

        volume.mkdirSync(pathUtil.dirname(rcUtils.RESTNODE_SCRIPT_FNAME), { recursive: true });
        volume.mkdirSync(rcUtils.UPDATER_DIR, { recursive: true });

        virtualFS.writeFileSync(
            rcUtils.RESTNODE_SCRIPT_FNAME,
            fs.readFileSync(pathUtil.join(__dirname, 'bigstart_restnode'))
        );

        appCtx = {
            fsUtil: virtualFS,
            logger: {
                debug() {},
                error() {},
                exception() {},
                info() {}
            }
        };

        rcUtils.init({ virtFS: virtualFS });
    });

    afterEach(() => {
        rcUtils.destroy();
        sinon.restore();
    });

    function createTask(data) {
        updater.saveScriptConfigFile(data, appCtx);
    }
    function getLogs() {
        return updater.readLogsFile(appCtx).split('\n');
    }
    function getCurrentConfig() {
        return updater.fetchConfigFromScript(appCtx);
    }

    describe('.enrichScriptConfig()', () => {
        it('should add defaults for missing options', () => {
            assert.deepStrictEqual(
                updater.enrichScriptConfig({}),
                {
                    gcEnabled: rcUtils.GC_DEFAULT,
                    heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT
                }
            );
        });

        it('should not add defaults for existing options', () => {
            assert.deepStrictEqual(
                updater.enrichScriptConfig({
                    gcEnabled: true,
                    heapSize: 2000,
                    httpTimeout: 120000
                }),
                {
                    gcEnabled: true,
                    heapSize: 2000,
                    httpTimeout: 120000
                }
            );
        });
    });

    describe('.fetchConfigFromScript()', () => {
        it('should return null when unable to read config (no file)', () => {
            virtualFS.unlinkSync(rcUtils.RESTNODE_SCRIPT_FNAME);
            assert.isNull(updater.fetchConfigFromScript(appCtx));
        });

        it('should return null when unable to read config (garbage data)', () => {
            virtualFS.writeFileSync(rcUtils.RESTNODE_SCRIPT_FNAME, 'something');
            assert.isNull(updater.fetchConfigFromScript(appCtx));
        });

        it('should read default config from the script', () => {
            virtualFS.writeFileSync(rcUtils.RESTNODE_SCRIPT_FNAME, [
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
                '    # ID:123',
                '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                'fi',
                ''
            ].join('\n'));
            assert.deepStrictEqual(updater.fetchConfigFromScript(appCtx), {
                gcEnabled: rcUtils.GC_DEFAULT,
                heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                id: '123'
            });
        });

        it('should read non-default config from the script', () => {
            virtualFS.writeFileSync(
                rcUtils.RESTNODE_SCRIPT_FNAME,
                'exec /usr/bin/f5-rest-node --expose-gc --max-old-space-size=2048 /usr/share/rest/node/src/restnode.js -k 120000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
            );
            assert.deepStrictEqual(updater.fetchConfigFromScript(appCtx), {
                gcEnabled: true,
                heapSize: 2048,
                httpTimeout: 120000
            });
        });

        it('should read non-default config from the script (example 2)', () => {
            virtualFS.writeFileSync(
                rcUtils.RESTNODE_SCRIPT_FNAME,
                'exec /usr/bin/f5-rest-node --expose-gc --max-old-space-size=2050 /usr/share/rest/node/src/restnode.js -k 120000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
            );
            assert.deepStrictEqual(updater.fetchConfigFromScript(appCtx), {
                gcEnabled: true,
                heapSize: 2050,
                httpTimeout: 120000
            });
        });

        it('should use the furthest match (example 1)', () => {
            virtualFS.writeFileSync(
                rcUtils.RESTNODE_SCRIPT_FNAME,
                'exec /usr/bin/f5-rest-node --expose-gc --max-old-space-size=2050 --max_old_space_size=2040 /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
            );
            assert.deepStrictEqual(updater.fetchConfigFromScript(appCtx), {
                gcEnabled: true,
                heapSize: 2040,
                httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT
            });
        });

        it('should use the furthest match (example 2)', () => {
            virtualFS.writeFileSync(
                rcUtils.RESTNODE_SCRIPT_FNAME,
                'exec /usr/bin/f5-rest-node --expose-gc --max_old_space_size=2060 --max-old-space-size=2030 /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
            );
            assert.deepStrictEqual(updater.fetchConfigFromScript(appCtx), {
                gcEnabled: true,
                heapSize: 2030,
                httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT
            });
        });

        it('should use the furthest match (example 3)', () => {
            virtualFS.writeFileSync(
                rcUtils.RESTNODE_SCRIPT_FNAME,
                'exec /usr/bin/f5-rest-node --expose-gc --max_old_space_size=2060 --max-old-space-size=2030 --max_old_space_size=2760 --max-old-space-size=2090 /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
            );
            assert.deepStrictEqual(updater.fetchConfigFromScript(appCtx), {
                gcEnabled: true,
                heapSize: 2090,
                httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT
            });
        });
    });

    describe('.main()', () => {
        it('should do nothing when no config provided', async () => {
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /No config found, nothing to apply to the script/);
        });

        it('should do nothing when config has no ID', async () => {
            createTask({ gcEnabled: true });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /No config found, nothing to apply to the script/);
        });

        it('should do nothing when unable to read restnode script', async () => {
            virtualFS.unlinkSync(rcUtils.RESTNODE_SCRIPT_FNAME);
            createTask({ gcEnabled: true, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.includeMatch(logs, /Unable to read "restnode" startup script/);
        });

        it('should do nothing when unable to read configuration from the script file', async () => {
            virtualFS.writeFileSync(rcUtils.RESTNODE_SCRIPT_FNAME, 'something useless');
            createTask({ gcEnabled: true, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
            assert.includeMatch(logs, /No configuration read from the script/);
            assert.includeMatch(logs, /The "restnode" startup script not modified!/);
        });

        it('should not fail when unable to write data to file', async () => {
            createTask({ id: '123' });
            sinon.stub(virtualFS, 'writeFileSync').throws(new Error('test'));
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /Done!/);
            assert.includeMatch(logs, /Unable to write data to file/);
        });

        it('should override logs', async () => {
            createTask({ id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /Done!/);
            virtualFS.writeFileSync(rcUtils.UPDATER_LOGS, 'checkpoint', { flags: 'a' });
            assert.includeMatch(getLogs(), /checkpoint/);

            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.notIncludeMatch(getLogs(), /checkpoint/);
        });

        it('should apply empty configuration from the file', async () => {
            createTask({ id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
            assert.notIncludeMatch(logs, /No configuration read from the script/);
            assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
            assert.notIncludeMatch(logs, /Enabling GC config./);
            assert.notIncludeMatch(logs, /Upading heap size./);
            assert.notIncludeMatch(logs, /Upading HTTP timeout./);
            assert.includeMatch(logs, /Adding "notice" block to the script./);
            assert.includeMatch(logs, /Done!/);

            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript()
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: rcUtils.GC_DEFAULT,
                    heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                    id: '123'
                }
            );
        });

        it('should apply configuration from the file (override max_old_space_size and max-old-space-size)', async () => {
            createTask({
                id: '123',
                heapSize: 1500,
                gcEnabled: true,
                httpTimeout: 130000
            });
            virtualFS.writeFileSync(
                rcUtils.RESTNODE_SCRIPT_FNAME,
                'exec /usr/bin/f5-rest-node --expose-gc --max_old_space_size=2060 --max-old-space-size=2030 --max_old_space_size=2080 --max-old-space-size=2090 /usr/share/rest/node/src/restnode.js -k 120000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
            );
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
            assert.notIncludeMatch(logs, /No configuration read from the script/);
            assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
            assert.notIncludeMatch(logs, /Enabling GC config./);
            assert.includeMatch(logs, /Upading heap size./);
            assert.includeMatch(logs, /Upading HTTP timeout./);
            assert.includeMatch(logs, /Adding "notice" block to the script./);
            assert.includeMatch(logs, /Done!/);

            assert.deepStrictEqual(
                rcUtils.getScript(),
                [
                    '# ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '# To restore original behavior, uncomment the next line and remove the block below.',
                    '#',
                    '# exec /usr/bin/f5-rest-node --expose-gc --max_old_space_size=2060 --max-old-space-size=2030 --max_old_space_size=2080 --max-old-space-size=2090 /usr/share/rest/node/src/restnode.js -k 120000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '#',
                    '# The block below should be removed to restore original behavior!',
                    '# ID:123',
                    'exec /usr/bin/f5-rest-node --max-old-space-size=1500 --expose-gc /usr/share/rest/node/src/restnode.js -k 130000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
                ].join('\n')
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: true,
                    heapSize: 1500,
                    httpTimeout: 130000,
                    id: '123'
                }
            );
        });

        it('should apply empty configuration from the file (example 2)', async () => {
            createTask({ id: '123' });
            virtualFS.writeFileSync(
                rcUtils.RESTNODE_SCRIPT_FNAME,
                'exec /usr/bin/f5-rest-node --expose-gc --max_old_space_size=2060 --max-old-space-size=2030 /usr/share/rest/node/src/restnode.js -k 120000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
            );
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
            assert.notIncludeMatch(logs, /No configuration read from the script/);
            assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
            assert.notIncludeMatch(logs, /Enabling GC config./);
            assert.includeMatch(logs, /Upading heap size./);
            assert.includeMatch(logs, /Upading HTTP timeout./);
            assert.includeMatch(logs, /Adding "notice" block to the script./);
            assert.includeMatch(logs, /Done!/);

            assert.deepStrictEqual(
                rcUtils.getScript(),
                [
                    '# ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '# To restore original behavior, uncomment the next line and remove the block below.',
                    '#',
                    '# exec /usr/bin/f5-rest-node --expose-gc --max_old_space_size=2060 --max-old-space-size=2030 /usr/share/rest/node/src/restnode.js -k 120000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '#',
                    '# The block below should be removed to restore original behavior!',
                    '# ID:123',
                    'exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
                ].join('\n')
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: rcUtils.GC_DEFAULT,
                    heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                    id: '123'
                }
            );
        });

        it('should apply configuration from the file (GC only, example 1)', async () => {
            createTask({ gcEnabled: true, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
            assert.notIncludeMatch(logs, /No configuration read from the script/);
            assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
            assert.notIncludeMatch(logs, /Upading heap size./);
            assert.notIncludeMatch(logs, /Upading HTTP timeout./);
            assert.includeMatch(logs, /Enabling GC config./);
            assert.includeMatch(logs, /Adding "notice" block to the script./);
            assert.includeMatch(logs, /Done!/);

            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript('exec /usr/bin/f5-rest-node --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: true,
                    heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                    id: '123'
                }
            );
        });

        it('should apply configuration from the file (GC only, example 2)', async () => {
            createTask({ gcEnabled: false, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
            assert.notIncludeMatch(logs, /No configuration read from the script/);
            assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
            assert.notIncludeMatch(logs, /Enabling GC config./);
            assert.notIncludeMatch(logs, /Upading heap size./);
            assert.notIncludeMatch(logs, /Upading HTTP timeout./);
            assert.includeMatch(logs, /Adding "notice" block to the script./);
            assert.includeMatch(logs, /Done!/);

            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript()
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: rcUtils.GC_DEFAULT,
                    heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                    id: '123'
                }
            );
        });

        it('should apply configuration from the file (heapSize only, example 1)', async () => {
            createTask({ heapSize: 2000, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
            assert.notIncludeMatch(logs, /No configuration read from the script/);
            assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
            assert.notIncludeMatch(logs, /Enabling GC config./);
            assert.notIncludeMatch(logs, /Upading HTTP timeout./);
            assert.includeMatch(logs, /Upading heap size./);
            assert.includeMatch(logs, /Adding "notice" block to the script./);
            assert.includeMatch(logs, /Done!/);

            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=2000 /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: rcUtils.GC_DEFAULT,
                    heapSize: 2000,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                    id: '123'
                }
            );
        });

        it('should apply configuration from the file (heapSize only, example 2)', async () => {
            createTask({ heapSize: 1400, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
            assert.notIncludeMatch(logs, /No configuration read from the script/);
            assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
            assert.notIncludeMatch(logs, /Enabling GC config./);
            assert.notIncludeMatch(logs, /Upading heap size./);
            assert.notIncludeMatch(logs, /Upading HTTP timeout./);
            assert.includeMatch(logs, /Adding "notice" block to the script./);
            assert.includeMatch(logs, /Done!/);

            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript()
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: rcUtils.GC_DEFAULT,
                    heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                    id: '123'
                }
            );
        });

        it('should apply configuration from the file (heapSize only, example 3)', async () => {
            createTask({ heapSize: 500, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
            assert.notIncludeMatch(logs, /No configuration read from the script/);
            assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
            assert.notIncludeMatch(logs, /Enabling GC config./);
            assert.notIncludeMatch(logs, /Upading HTTP timeout./);
            assert.includeMatch(logs, /Upading heap size./);
            assert.includeMatch(logs, /Adding "notice" block to the script./);
            assert.includeMatch(logs, /Done!/);

            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript()
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: rcUtils.GC_DEFAULT,
                    // that's ok, default size of V8 heap, can't see to 500 without affecting other apps
                    heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                    id: '123'
                }
            );
        });

        it('should set HTTP timeout to default value', async () => {
            createTask({ id: '123', httpTimeout: 30000 });
            virtualFS.writeFileSync(
                rcUtils.RESTNODE_SCRIPT_FNAME,
                'exec /usr/bin/f5-rest-node --expose-gc --max_old_space_size=2060 --max-old-space-size=2030 /usr/share/rest/node/src/restnode.js -k 120000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
            );
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            const logs = getLogs();
            assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
            assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
            assert.notIncludeMatch(logs, /No configuration read from the script/);
            assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
            assert.notIncludeMatch(logs, /Enabling GC config./);
            assert.includeMatch(logs, /Upading heap size./);
            assert.includeMatch(logs, /Upading HTTP timeout./);
            assert.includeMatch(logs, /Setting HTTP timeout to default value/);
            assert.includeMatch(logs, /Adding "notice" block to the script./);
            assert.includeMatch(logs, /Done!/);

            assert.deepStrictEqual(
                rcUtils.getScript(),
                [
                    '# ATTENTION. The block below modified by F5 BIG-IP Telemetry Streaming!',
                    '# To restore original behavior, uncomment the next line and remove the block below.',
                    '#',
                    '# exec /usr/bin/f5-rest-node --expose-gc --max_old_space_size=2060 --max-old-space-size=2030 /usr/share/rest/node/src/restnode.js -k 120000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                    '#',
                    '# The block below should be removed to restore original behavior!',
                    '# ID:123',
                    'exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1'
                ].join('\n')
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: rcUtils.GC_DEFAULT,
                    heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                    id: '123'
                }
            );
        });

        it('should apply configuration', async () => {
            createTask({ id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /Done!/);
            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript()
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: rcUtils.GC_DEFAULT,
                    heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                    id: '123'
                }
            );
            createTask({ id: '456' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /Done!/);
            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript()
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: rcUtils.GC_DEFAULT,
                    heapSize: rcUtils.HEAP_SIZE_DEFAULT,
                    httpTimeout: rcUtils.HTTP_TIMEOUT_DEFAULT,
                    id: '456'
                }
            );
            createTask({
                id: '456',
                gcEnabled: true,
                heapSize: 1500,
                httpTimeout: 130000
            });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /Done!/);
            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=1500 --expose-gc /usr/share/rest/node/src/restnode.js -k 130000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: true,
                    heapSize: 1500,
                    httpTimeout: 130000,
                    id: '456'
                }
            );
            createTask({
                id: '456',
                gcEnabled: true,
                heapSize: 1500,
                httpTimeout: 130000
            });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.notIncludeMatch(getLogs(), /Done!/);
            assert.includeMatch(getLogs(), /The "restnode" startup script not modified!/);
            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=1500 --expose-gc /usr/share/rest/node/src/restnode.js -k 130000 -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: true,
                    heapSize: 1500,
                    httpTimeout: 130000,
                    id: '456'
                }
            );
            createTask({
                id: '456',
                gcEnabled: false,
                heapSize: 1600,
                httpTimeout: 60000
            });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /Done!/);
            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript('exec /usr/bin/f5-rest-node --max-old-space-size=1600 /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: false,
                    heapSize: 1600,
                    httpTimeout: 60000,
                    id: '456'
                }
            );
            createTask({
                id: '765',
                gcEnabled: true,
                heapSize: 500
            });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /Done!/);
            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript('exec /usr/bin/f5-rest-node --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1')
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: true,
                    heapSize: 1400,
                    httpTimeout: 60000,
                    id: '765'
                }
            );
            createTask({
                id: '765'
            });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /Done!/);
            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript()
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: false,
                    heapSize: 1400,
                    httpTimeout: 60000,
                    id: '765'
                }
            );
            createTask({
                id: '765'
            });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /The "restnode" startup script not modified/);
            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript()
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: false,
                    heapSize: 1400,
                    httpTimeout: 60000,
                    id: '765'
                }
            );
            createTask({
                id: '345'
            });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            await testUtil.sleep(10);

            assert.includeMatch(getLogs(), /Done!/);
            assert.deepStrictEqual(
                rcUtils.getScript(),
                rcUtils.makeScript()
            );
            assert.deepStrictEqual(
                getCurrentConfig(),
                {
                    gcEnabled: false,
                    heapSize: 1400,
                    httpTimeout: 60000,
                    id: '345'
                }
            );
        });
    });
});
