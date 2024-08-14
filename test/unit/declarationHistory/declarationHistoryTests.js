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

/* eslint-disable import/order, no-use-before-define */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const dummies = require('../shared/dummies');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');
const testUtil = require('../shared/util');

const DeclarationHistory = sourceCode('src/lib/declarationHistory');

moduleCache.remember();

describe('Declaration History / Declaration History Service', () => {
    const declarationTracerFile = '/var/log/restnoded/telemetryDeclarationHistory';

    let appEvents;
    let configWorker;
    let coreStub;
    let dhService;

    function processDeclaration(decl) {
        return Promise.all([
            configWorker.processDeclaration(decl),
            appEvents.waitFor('dechistory.recorded')
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

        dhService = new DeclarationHistory();
        dhService.initialize(appEvents);

        await coreStub.startServices();
        await configWorker.cleanup();
        await dhService.start();

        assert.isTrue(dhService.isRunning());
    });

    afterEach(async () => {
        await dhService.destroy();
        await coreStub.destroyServices();

        appEvents.stop();
        sinon.restore();
    });

    it('should record declaration events', () => processDeclaration(dummies.declaration.base.decrypted({}))
        .then(() => {
            const data = coreStub.tracer.data[declarationTracerFile];
            assert.lengthOf(data, 2, 'should write 2 events');
            assert.sameDeepMembers(
                data.map((d) => d.data.event),
                ['config.received', 'config.validationSucceed']
            );
            assert.sameDeepMembers(
                data.map((d) => d.data.data.declaration.class),
                ['Telemetry', 'Telemetry']
            );
        }));

    it('should record declaration events on application start', async () => {
        coreStub.storage.restWorker.loadData = { config: { raw: { class: 'Telemetry_Test' } } };

        await coreStub.storage.service.restart();
        await Promise.all([
            configWorker.load(),
            appEvents.waitFor('dechistory.recorded')
        ]);

        const data = coreStub.tracer.data[declarationTracerFile];
        assert.lengthOf(data, 4, 'should write 2 events');
        assert.sameDeepMembers(
            data.map((d) => d.data.event),
            ['config.received', 'config.validationFailed', 'config.received', 'config.validationSucceed']
        );
        assert.sameDeepMembers(
            data.map((d) => d.data.data.declaration.class),
            ['Telemetry_Test', 'Telemetry_Test', 'Telemetry', 'Telemetry']
        );
    });

    it('should mask secrets', () => processDeclaration(dummies.declaration.base.decrypted({
        consumer: dummies.declaration.consumer.splunk.minimal.decrypted()
    }))
        .then(() => testUtil.sleep(50))
        .then(() => {
            const data = coreStub.tracer.data[declarationTracerFile];
            assert.sameDeepMembers(
                data.map((d) => d.data.data.declaration.consumer.passphrase),
                ['*********', '*********']
            );
        }));

    it('should stop recording data', () => processDeclaration(dummies.declaration.base.decrypted({}))
        .then(() => {
            const data = coreStub.tracer.data[declarationTracerFile];
            assert.lengthOf(data, 2, 'should have events written to tracer');
            return dhService.stop();
        })
        .then(() => processDeclaration(dummies.declaration.base.decrypted({})))
        .then(() => {
            const data = coreStub.tracer.data[declarationTracerFile];
            assert.lengthOf(data, 2, 'should not write new events once stopped');
        }));

    it('should log error caught on attempt to write data', () => processDeclaration(dummies.declaration.base.decrypted({}))
        .then(() => {
            assert.lengthOf(coreStub.tracer.data[declarationTracerFile], 2, 'should have events written to tracer');

            coreStub.tracer.write.throws(new Error('expected error'));
            return dhService.restart();
        })
        .then(() => processDeclaration(dummies.declaration.base.decrypted({})))
        .then(() => {
            assert.lengthOf(coreStub.tracer.data[declarationTracerFile], 2, 'should have now events written to tracer');
            assert.includeMatch(
                coreStub.logger.messages.debug,
                /Unable to wirte a new declaration history entry/
            );
        }));
});
