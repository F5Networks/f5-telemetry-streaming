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
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const updater = sourceCode('src/lib/runtimeConfig/updater');

moduleCache.remember();

describe('Runtime Config / Updater', () => {
    const RESTNODE_SCRIPT_FNAME = '/etc/bigstart/scripts/restnoded';
    const UPDATER_DIR = pathUtil.join(__dirname, '../../../src/lib/runtimeConfig');
    const UPDATER_LOGS = pathUtil.join(UPDATER_DIR, 'logs.txt');

    let appCtx;
    let virtualFS;
    let volume;

    before(() => {
        moduleCache.restore();

        volume = new memfs.Volume();
        virtualFS = memfs.createFsFromVolume(volume);
    });

    afterEach(() => {
        sinon.restore();
    });

    beforeEach(() => {
        volume.reset();

        volume.mkdirSync(pathUtil.dirname(RESTNODE_SCRIPT_FNAME), { recursive: true });
        volume.mkdirSync(UPDATER_DIR, { recursive: true });

        virtualFS.writeFileSync(
            RESTNODE_SCRIPT_FNAME,
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
    });

    function createTask(data) {
        updater.saveScriptConfigFile(data, appCtx);
    }
    function getLogs() {
        return updater.readLogsFile(appCtx).split('\n');
    }
    function getScript() {
        return virtualFS.readFileSync(RESTNODE_SCRIPT_FNAME).toString();
    }
    function getCurrentConfig() {
        return updater.fetchConfigFromScript(appCtx);
    }

    describe('.enrichScriptConfig()', () => {
        it('should add defaults for missing options', () => {
            assert.deepStrictEqual(
                updater.enrichScriptConfig({}),
                {
                    gcEnabled: false,
                    heapSize: 1400
                }
            );
        });

        it('should not add defaults for existing options', () => {
            assert.deepStrictEqual(
                updater.enrichScriptConfig({
                    gcEnabled: true,
                    heapSize: 2000
                }),
                {
                    gcEnabled: true,
                    heapSize: 2000
                }
            );
        });
    });

    describe('.fetchConfigFromScript()', () => {
        it('should return null when unable to read config (no file)', () => {
            virtualFS.unlinkSync(RESTNODE_SCRIPT_FNAME);
            assert.isNull(updater.fetchConfigFromScript(appCtx));
        });

        it('should return null when unable to read config (garbage data)', () => {
            virtualFS.writeFileSync(RESTNODE_SCRIPT_FNAME, 'something');
            assert.isNull(updater.fetchConfigFromScript(appCtx));
        });
    });

    describe('.main()', () => {
        it('should do nothing when no config provided', () => {
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    assert.includeMatch(getLogs(), /No config found, nothing to apply to the script/);
                });
        });

        it('should do nothing when config has no ID', () => {
            createTask({ gcEnabled: true });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    assert.includeMatch(getLogs(), /No config found, nothing to apply to the script/);
                });
        });

        it('should do nothing when unable to read restnode script', () => {
            virtualFS.unlinkSync(RESTNODE_SCRIPT_FNAME);
            createTask({ gcEnabled: true, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    const logs = getLogs();
                    assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
                    assert.includeMatch(logs, /Unable to read "restnode" startup script/);
                });
        });

        it('should do nothing when unable to read configuration from the script file', () => {
            virtualFS.writeFileSync(RESTNODE_SCRIPT_FNAME, 'something useless');
            createTask({ gcEnabled: true, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    const logs = getLogs();
                    assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
                    assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
                    assert.includeMatch(logs, /No configuration read from the script/);
                    assert.includeMatch(logs, /The "restnode" startup script not modified!/);
                });
        });

        it('should not fail when unable to write data to file', () => {
            createTask({ id: '123' });
            sinon.stub(virtualFS, 'writeFileSync').throws(new Error('test'));
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    const logs = getLogs();
                    assert.notIncludeMatch(logs, /Done!/);
                    assert.includeMatch(logs, /Unable to write data to file/);
                });
        });

        it('should override logs', () => {
            createTask({ id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    assert.includeMatch(getLogs(), /Done!/);
                    virtualFS.writeFileSync(UPDATER_LOGS, 'checkpoint', { flags: 'a' });
                    assert.includeMatch(getLogs(), /checkpoint/);

                    updater.main(virtualFS);
                    // sleep to let data be flushed to FS
                    return testUtil.sleep(10);
                })
                .then(() => {
                    assert.notIncludeMatch(getLogs(), /checkpoint/);
                });
        });

        it('should apply empty configuration from the file', () => {
            createTask({ id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    const logs = getLogs();
                    assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
                    assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
                    assert.notIncludeMatch(logs, /No configuration read from the script/);
                    assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
                    assert.notIncludeMatch(logs, /Enabling GC config./);
                    assert.notIncludeMatch(logs, /Upading heap size./);
                    assert.notIncludeMatch(logs, /Upading memory allocator config/);
                    assert.includeMatch(logs, /Adding "notice" block to the script./);
                    assert.includeMatch(logs, /Done!/);

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
                            '    # ID:123',
                            '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            heapSize: 1400,
                            id: '123'
                        }
                    );
                });
        });

        it('should apply configuration from the file (GC only, example 1)', () => {
            createTask({ gcEnabled: true, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    const logs = getLogs();
                    assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
                    assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
                    assert.notIncludeMatch(logs, /No configuration read from the script/);
                    assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
                    assert.notIncludeMatch(logs, /Upading heap size./);
                    assert.notIncludeMatch(logs, /Upading memory allocator config/);
                    assert.includeMatch(logs, /Enabling GC config./);
                    assert.includeMatch(logs, /Adding "notice" block to the script./);
                    assert.includeMatch(logs, /Done!/);

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
                            '    # ID:123',
                            '    exec /usr/bin/f5-rest-node --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: true,
                            heapSize: 1400,
                            id: '123'
                        }
                    );
                });
        });

        it('should apply configuration from the file (GC only, example 2)', () => {
            createTask({ gcEnabled: false, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    const logs = getLogs();
                    assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
                    assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
                    assert.notIncludeMatch(logs, /No configuration read from the script/);
                    assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
                    assert.notIncludeMatch(logs, /Enabling GC config./);
                    assert.notIncludeMatch(logs, /Upading heap size./);
                    assert.notIncludeMatch(logs, /Upading memory allocator config/);
                    assert.includeMatch(logs, /Adding "notice" block to the script./);
                    assert.includeMatch(logs, /Done!/);

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
                            '    # ID:123',
                            '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            heapSize: 1400,
                            id: '123'
                        }
                    );
                });
        });

        it('should apply configuration from the file (heapSize only, example 1)', () => {
            createTask({ heapSize: 2000, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    const logs = getLogs();
                    assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
                    assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
                    assert.notIncludeMatch(logs, /No configuration read from the script/);
                    assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
                    assert.notIncludeMatch(logs, /Enabling GC config./);
                    assert.includeMatch(logs, /Upading heap size./);
                    assert.notIncludeMatch(logs, /Upading memory allocator config/);
                    assert.includeMatch(logs, /Adding "notice" block to the script./);
                    assert.includeMatch(logs, /Done!/);

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
                            '    # ID:123',
                            '    exec /usr/bin/f5-rest-node --max_old_space_size=2000 /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            heapSize: 2000,
                            id: '123'
                        }
                    );
                });
        });

        it('should apply configuration from the file (heapSize only, example 2)', () => {
            createTask({ heapSize: 1400, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    const logs = getLogs();
                    assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
                    assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
                    assert.notIncludeMatch(logs, /No configuration read from the script/);
                    assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
                    assert.notIncludeMatch(logs, /Enabling GC config./);
                    assert.notIncludeMatch(logs, /Upading heap size./);
                    assert.notIncludeMatch(logs, /Upading memory allocator config/);
                    assert.includeMatch(logs, /Adding "notice" block to the script./);
                    assert.includeMatch(logs, /Done!/);

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
                            '    # ID:123',
                            '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            heapSize: 1400,
                            id: '123'
                        }
                    );
                });
        });

        it('should apply configuration from the file (heapSize only, example 3)', () => {
            createTask({ heapSize: 500, id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    const logs = getLogs();
                    assert.notIncludeMatch(logs, /No config found, nothing to apply to the script/);
                    assert.notIncludeMatch(logs, /Unable to read "restnode" startup script/);
                    assert.notIncludeMatch(logs, /No configuration read from the script/);
                    assert.notIncludeMatch(logs, /The "restnode" startup script not modified!/);
                    assert.notIncludeMatch(logs, /Enabling GC config./);
                    assert.includeMatch(logs, /Upading heap size./);
                    assert.notIncludeMatch(logs, /Upading memory allocator config/);
                    assert.includeMatch(logs, /Adding "notice" block to the script./);
                    assert.includeMatch(logs, /Done!/);

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
                            '    # ID:123',
                            '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            // that's ok, default size of V8 heap, can't see to 500 without affecting other apps
                            heapSize: 1400,
                            id: '123'
                        }
                    );
                });
        });

        it('should apply configuration', () => {
            createTask({ id: '123' });
            updater.main(virtualFS);
            // sleep to let data be flushed to FS
            return testUtil.sleep(10)
                .then(() => {
                    assert.includeMatch(getLogs(), /Done!/);
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
                            '    # ID:123',
                            '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            heapSize: 1400,
                            id: '123'
                        }
                    );
                    createTask({ id: '456' });
                    updater.main(virtualFS);
                    // sleep to let data be flushed to FS
                    return testUtil.sleep(10);
                })
                .then(() => {
                    assert.includeMatch(getLogs(), /Done!/);
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
                            '    # ID:456',
                            '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            heapSize: 1400,
                            id: '456'
                        }
                    );
                    createTask({
                        id: '456',
                        gcEnabled: true,
                        heapSize: 1500
                    });
                    updater.main(virtualFS);
                    // sleep to let data be flushed to FS
                    return testUtil.sleep(10);
                })
                .then(() => {
                    assert.includeMatch(getLogs(), /Done!/);
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
                            '    # ID:456',
                            '    exec /usr/bin/f5-rest-node --max_old_space_size=1500 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: true,
                            heapSize: 1500,
                            id: '456'
                        }
                    );
                    createTask({
                        id: '456',
                        gcEnabled: true,
                        heapSize: 1500
                    });
                    updater.main(virtualFS);
                    // sleep to let data be flushed to FS
                    return testUtil.sleep(10);
                })
                .then(() => {
                    assert.notIncludeMatch(getLogs(), /Done!/);
                    assert.includeMatch(getLogs(), /The "restnode" startup script not modified!/);
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
                            '    # ID:456',
                            '    exec /usr/bin/f5-rest-node --max_old_space_size=1500 --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: true,
                            heapSize: 1500,
                            id: '456'
                        }
                    );
                    createTask({
                        id: '456',
                        gcEnabled: false,
                        heapSize: 1600
                    });
                    updater.main(virtualFS);
                    // sleep to let data be flushed to FS
                    return testUtil.sleep(10);
                })
                .then(() => {
                    assert.includeMatch(getLogs(), /Done!/);
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
                            '    # ID:456',
                            '    exec /usr/bin/f5-rest-node --max_old_space_size=1600 /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            heapSize: 1600,
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
                    return testUtil.sleep(10);
                })
                .then(() => {
                    assert.includeMatch(getLogs(), /Done!/);
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
                            '    # ID:765',
                            '    exec /usr/bin/f5-rest-node --expose-gc /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: true,
                            heapSize: 1400,
                            id: '765'
                        }
                    );
                    createTask({
                        id: '765'
                    });
                    updater.main(virtualFS);
                    // sleep to let data be flushed to FS
                    return testUtil.sleep(10);
                })
                .then(() => {
                    assert.includeMatch(getLogs(), /Done!/);
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
                            '    # ID:765',
                            '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            heapSize: 1400,
                            id: '765'
                        }
                    );
                    createTask({
                        id: '765'
                    });
                    updater.main(virtualFS);
                    // sleep to let data be flushed to FS
                    return testUtil.sleep(10);
                })
                .then(() => {
                    assert.includeMatch(getLogs(), /The "restnode" startup script not modified/);
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
                            '    # ID:765',
                            '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            heapSize: 1400,
                            id: '765'
                        }
                    );
                    createTask({
                        id: '345'
                    });
                    updater.main(virtualFS);
                    // sleep to let data be flushed to FS
                    return testUtil.sleep(10);
                })
                .then(() => {
                    assert.includeMatch(getLogs(), /Done!/);
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
                            '    # ID:345',
                            '    exec /usr/bin/f5-rest-node /usr/share/rest/node/src/restnode.js -p 8105 --logLevel finest -i ${LOG_FILE} -s none ${RCWFeature} >> /var/tmp/${service}.out 2>&1',
                            'fi',
                            ''
                        ].join('\n')
                    );
                    assert.deepStrictEqual(
                        getCurrentConfig(),
                        {
                            gcEnabled: false,
                            heapSize: 1400,
                            id: '345'
                        }
                    );
                });
        });
    });
});
