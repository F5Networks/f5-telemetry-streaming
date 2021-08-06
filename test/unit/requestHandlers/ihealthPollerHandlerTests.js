/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const configWorker = require('../../../src/lib/config');
const deviceUtil = require('../../../src/lib/utils/device');
const dummies = require('../shared/dummies');
const ihealth = require('../../../src/lib/ihealth');
const IHealthPoller = require('../../../src/lib/ihealthPoller');
// eslint-disable-next-line no-unused-vars
const IHealthPollerHandler = require('../../../src/lib/requestHandlers/ihealthPollerHandler');
const ihealthUtil = require('../../../src/lib/utils/ihealth');
const logger = require('../../../src/lib/logger');
const persistentStorage = require('../../../src/lib/persistentStorage');
const router = require('../../../src/lib/requestHandlers/router');
const stubs = require('../shared/stubs');
const teemReporter = require('../../../src/lib/teemReporter');
const testUtil = require('../shared/util');
const tracer = require('../../../src/lib/utils/tracer');
const utilMisc = require('../../../src/lib/utils/misc');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('IHealthPollerHandler', () => {
    let restOpMock;

    beforeEach(() => {
        const coreStub = stubs.coreStub({
            configWorker,
            deviceUtil,
            logger,
            persistentStorage,
            teemReporter,
            tracer,
            utilMisc
        });
        coreStub.utilMisc.generateUuid.numbersOnly = false;

        const ihealthStub = stubs.iHealthPoller({
            ihealthUtil
        });
        // slow down polling process
        ihealthStub.ihealthUtil.QkviewManager.process.rejects(new Error('expected error'));

        const declaration = dummies.declaration.base.decrypted();
        declaration.controls = dummies.declaration.controls.full.decrypted();
        declaration.System = dummies.declaration.system.full.decrypted({
            host: '192.168.0.1',
            username: 'test_user_1',
            passphrase: { cipherText: 'test_passphrase_1' }
        });
        declaration.System.iHealthPoller = dummies.declaration.ihealthPoller.inlineFull.decrypted({
            username: 'test_user_2',
            passphrase: { cipherText: 'test_passphrase_2' },
            proxy: {
                host: '192.168.100.1',
                username: 'test_user_3',
                passphrase: { cipherText: 'test_passphrase_3' }
            }
        });
        declaration.Namespace = dummies.declaration.namespace.base.decrypted();
        declaration.Namespace.System = dummies.declaration.system.full.decrypted({
            host: '192.168.0.3',
            username: 'test_user_7',
            passphrase: { cipherText: 'test_passphrase_7' }
        });
        declaration.Namespace.System.iHealthPoller = dummies.declaration.ihealthPoller.inlineFull.decrypted({
            username: 'test_user_8',
            passphrase: { cipherText: 'test_passphrase_8' },
            proxy: {
                host: '192.168.100.3',
                username: 'test_user_9',
                passphrase: { cipherText: 'test_passphrase_9' }
            }
        });
        restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
        restOpMock.parseAndSetURI('http://localhost:8100/ihealthpoller/System');

        return configWorker.processDeclaration(declaration)
            .then(() => {
                assert.lengthOf(IHealthPoller.getAll({ includeDemo: true }), 2, 'should have 2 running pollers');
            });
    });

    afterEach(() => configWorker.processDeclaration({ class: 'Telemetry' })
        .then(() => {
            sinon.restore();
            assert.isEmpty(IHealthPoller.getAll({ includeDemo: true }), 'should have 0 running pollers');
        }));

    describe('/ihealthpoller', () => {
        it('should return 200 on GET request to retrieve current state (all pollers)', () => {
            restOpMock.parseAndSetURI('http://localhost:8100/ihealthpoller');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 200, 'should return expected code');
                    assert.strictEqual(restOpMock.getBody().code, 200, 'should return expected code');
                    assert.sameDeepMembers(
                        restOpMock.getBody().message.map(s => s.name),
                        [
                            'f5telemetry_default::System::iHealthPoller_1',
                            'Namespace::System::iHealthPoller_1'
                        ],
                        'should return expected body'
                    );
                });
        });

        it('should return 500 on GET request to retrieve current state and unexpected error thrown', () => {
            sinon.stub(ihealth, 'getCurrentState').throws(new Error('expected error'));
            restOpMock.parseAndSetURI('http://localhost:8100/ihealthpoller');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 500, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody(), {
                        code: 500,
                        message: 'Internal Server Error'
                    }, 'should return expected body');
                });
        });

        it('should return 404 when unable to make config lookup', () => {
            restOpMock.parseAndSetURI('http://localhost:8100/ihealthpoller/NonExistingSystem');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 404, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody(), {
                        code: 404,
                        message: 'System or iHealth Poller declaration not found'
                    }, 'should return expected body');
                });
        });

        it('should return 500 on GET request to start poller and unexpected error thrown', () => {
            sinon.stub(ihealth, 'startPoller').rejects(new Error('expectedError'));
            restOpMock.parseAndSetURI('http://localhost:8100/ihealthpoller/System');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 500, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody(), {
                        code: 500,
                        message: 'Internal Server Error'
                    }, 'should return expected body');
                });
        });

        it('should return 201 on GET request to start demo poller', () => {
            restOpMock.parseAndSetURI('http://localhost:8100/ihealthpoller/System');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 201, 'should return expected code');
                    assert.strictEqual(restOpMock.getBody().code, 201, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody().state.name, 'f5telemetry_default::System::iHealthPoller_1 (DEMO)', 'should return expected body');
                });
        });

        it('should return 202 on GET request to start demo poller that running already', () => {
            restOpMock.parseAndSetURI('http://localhost:8100/ihealthpoller/System');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 201, 'should return expected code');
                    assert.strictEqual(restOpMock.getBody().code, 201, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody().state.name, 'f5telemetry_default::System::iHealthPoller_1 (DEMO)', 'should return expected body');

                    restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
                    restOpMock.parseAndSetURI('http://localhost:8100/ihealthpoller/System');
                    return router.processRestOperation(restOpMock);
                })
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 202, 'should return expected code');
                    assert.strictEqual(restOpMock.getBody().code, 202, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody().state.name, 'f5telemetry_default::System::iHealthPoller_1 (DEMO)', 'should return expected body');
                });
        });
    });

    describe('/namespace/:namespace/ihealthpoller', () => {
        it('should return 200 on GET request to retrieve current state', () => {
            restOpMock.parseAndSetURI('http://localhost:8100/namespace/Namespace/ihealthpoller');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 200, 'should return expected code');
                    assert.strictEqual(restOpMock.getBody().code, 200, 'should return expected code');
                    assert.sameDeepMembers(
                        restOpMock.getBody().message.map(s => s.name),
                        [
                            'Namespace::System::iHealthPoller_1'
                        ],
                        'should return expected body'
                    );
                });
        });

        it('should return 200 on GET request to retrieve current state (non-existing namespace)', () => {
            restOpMock.parseAndSetURI('http://localhost:8100/namespace/NonExistingNamespace/ihealthpoller');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 200, 'should return expected code');
                    assert.strictEqual(restOpMock.getBody().code, 200, 'should return expected code');
                    assert.isEmpty(restOpMock.getBody().message.map(s => s.name), 'should return expected body');
                });
        });

        it('should return 404 when unable to make config lookup (non-existing namespace)', () => {
            restOpMock.parseAndSetURI('http://localhost:8100/namespace/NonExistingNamespace/ihealthpoller/NonExistingSystem');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 404, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody(), {
                        code: 404,
                        message: 'System or iHealth Poller declaration not found'
                    }, 'should return expected body');
                });
        });

        it('should return 404 when unable to make config lookup (non-existing system in namespace)', () => {
            restOpMock.parseAndSetURI('http://localhost:8100/namespace/Namespace/ihealthpoller/NonExistingSystem');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 404, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody(), {
                        code: 404,
                        message: 'System or iHealth Poller declaration not found'
                    }, 'should return expected body');
                });
        });

        it('should return 201 on GET request to start demo poller', () => {
            restOpMock.parseAndSetURI('http://localhost:8100/namespace/Namespace/ihealthpoller/System');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 201, 'should return expected code');
                    assert.strictEqual(restOpMock.getBody().code, 201, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody().state.name, 'Namespace::System::iHealthPoller_1 (DEMO)', 'should return expected body');
                });
        });

        it('should return 202 on GET request to start demo poller that running already', () => {
            restOpMock.parseAndSetURI('http://localhost:8100/namespace/Namespace/ihealthpoller/System');
            return router.processRestOperation(restOpMock)
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 201, 'should return expected code');
                    assert.strictEqual(restOpMock.getBody().code, 201, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody().state.name, 'Namespace::System::iHealthPoller_1 (DEMO)', 'should return expected body');

                    restOpMock = new testUtil.MockRestOperation({ method: 'GET' });
                    restOpMock.parseAndSetURI('http://localhost:8100/namespace/Namespace/ihealthpoller/System');
                    return router.processRestOperation(restOpMock);
                })
                .then(() => {
                    assert.strictEqual(restOpMock.getStatusCode(), 202, 'should return expected code');
                    assert.strictEqual(restOpMock.getBody().code, 202, 'should return expected code');
                    assert.deepStrictEqual(restOpMock.getBody().state.name, 'Namespace::System::iHealthPoller_1 (DEMO)', 'should return expected body');
                });
        });
    });
});
