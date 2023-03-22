/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const sinon = require('sinon');

const assert = require('./shared/assert');
const dummies = require('./shared/dummies');
const sourceCode = require('./shared/sourceCode');
const stubs = require('./shared/stubs');

const ActivityRecorder = sourceCode('src/lib/activityRecorder');
const configWorker = sourceCode('src/lib/config');
const persistentStorage = sourceCode('src/lib/persistentStorage');

moduleCache.remember();

describe('Activity Recorder', () => {
    let coreStub;
    let recorder;

    const declarationTracerFile = '/var/log/restnoded/telemetryDeclarationHistory';

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub();
        coreStub.persistentStorage.loadData = { config: { } };
        coreStub.utilMisc.generateUuid.numbersOnly = false;

        recorder = new ActivityRecorder();
        return configWorker.cleanup()
            .then(() => persistentStorage.persistentStorage.load());
    });

    afterEach(() => recorder.stop()
        .then(() => sinon.restore()));

    describe('.recordDeclarationActivity()', () => {
        beforeEach(() => {
            recorder.recordDeclarationActivity(configWorker);
        });

        it('should record declaration activity', () => {
            coreStub.persistentStorage.loadData = { config: { raw: { class: 'Telemetry_Test' } } };
            return persistentStorage.persistentStorage.load()
                .then(() => configWorker.load())
                .then(() => coreStub.tracer.waitForData())
                .then(() => {
                    const data = coreStub.tracer.data[declarationTracerFile];
                    assert.lengthOf(data, 4, 'should write 4 events');
                    assert.sameDeepMembers(
                        data.map((d) => d.data.event),
                        ['received', 'received', 'validationSucceed', 'validationFailed']
                    );
                    assert.sameDeepMembers(
                        data.map((d) => d.data.data.declaration.class),
                        ['Telemetry_Test', 'Telemetry_Test', 'Telemetry', 'Telemetry']
                    );
                });
        });

        it('should mask secrets', () => persistentStorage.persistentStorage.load()
            .then(() => configWorker.processDeclaration(dummies.declaration.base.decrypted({
                consumer: dummies.declaration.consumer.splunk.minimal.decrypted()
            })))
            .then(() => coreStub.tracer.waitForData())
            .then(() => {
                const data = coreStub.tracer.data[declarationTracerFile];
                assert.sameDeepMembers(
                    data.map((d) => d.data.data.declaration.consumer.passphrase),
                    ['*********', '*********']
                );
            }));
    });

    describe('.stop()', () => {
        it('should stop', () => recorder.stop()
            .then(() => {
                assert.includeMatch(
                    coreStub.logger.messages.debug,
                    /Terminating\.\.\./
                );
                assert.includeMatch(
                    coreStub.logger.messages.debug,
                    /Stopped!/
                );
            }));

        it('should stop declaration tracer', () => {
            recorder.recordDeclarationActivity(configWorker);
            coreStub.persistentStorage.loadData = { config: { raw: { class: 'Telemetry_Test' } } };
            return persistentStorage.persistentStorage.load()
                .then(() => configWorker.load())
                .then(() => coreStub.tracer.waitForData())
                .then(() => {
                    const data = coreStub.tracer.data[declarationTracerFile];
                    assert.lengthOf(data, 4, 'should write 4 events');
                    return recorder.stop();
                })
                .then(() => configWorker.processDeclaration(dummies.declaration.base.decrypted()))
                .then(() => coreStub.tracer.waitForData())
                .then(() => {
                    const data = coreStub.tracer.data[declarationTracerFile];
                    assert.lengthOf(data, 4, 'should not write new events once stopped');

                    assert.includeMatch(
                        coreStub.logger.messages.debug,
                        /Terminating declaration tracer/
                    );
                });
        });
    });
});
