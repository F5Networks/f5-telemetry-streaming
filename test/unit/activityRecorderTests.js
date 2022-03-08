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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const ActivityRecorder = require('../../src/lib/activityRecorder');
const configWorker = require('../../src/lib/config');
const deviceUtil = require('../../src/lib/utils/device');
const dummies = require('./shared/dummies');
const logger = require('../../src/lib/logger');
const persistentStorage = require('../../src/lib/persistentStorage');
const stubs = require('./shared/stubs');
const teemReporter = require('../../src/lib/teemReporter');
const testAssert = require('./shared/assert');
const tracer = require('../../src/lib/utils/tracer');
const utilMisc = require('../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Activity Recorder', () => {
    let coreStub;
    let recorder;

    const declarationTracerFile = '/shared/tmp/telemetry/declarationHistory';

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.coreStub({
            configWorker,
            deviceUtil,
            logger,
            persistentStorage,
            teemReporter,
            tracer,
            utilMisc
        });
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
                testAssert.includeMatch(
                    coreStub.logger.messages.debug,
                    /Terminating\.\.\./
                );
                testAssert.includeMatch(
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

                    testAssert.includeMatch(
                        coreStub.logger.messages.debug,
                        /Terminating declaration tracer/
                    );
                });
        });
    });
});
