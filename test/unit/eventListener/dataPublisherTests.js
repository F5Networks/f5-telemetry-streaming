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

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');
const net = require('net');
const nodeUtil = require('util');
const EventEmitter = require('events');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');

const dataPublisher = sourceCode('src/lib/eventListener/dataPublisher');

moduleCache.remember();

describe('Data Publisher', () => {
    let configWorker;
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = stubs.default.coreStub();
        configWorker = coreStub.configWorker.configWorker;

        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        sinon.restore();
    });

    describe('.sendDataToListener', () => {
        let netConnectionPort;
        let netClientWriteFunction;
        let sentData;

        const getDefaultDeclaration = () => ({
            class: 'Telemetry',
            Controls: {
                class: 'Controls',
                debug: true
            },
            MyListener: {
                class: 'Telemetry_Listener',
                port: 6514,
                enable: true,
                trace: false
            }
        });

        function MockNetConnection(opts) {
            EventEmitter.call(this);
            netConnectionPort = opts.port;

            this.write = (data, cb) => netClientWriteFunction.call(this, data, cb);
            this.end = () => this.emit('end');
            this.destroy = sinon.stub();

            // Delay emitting 'connect' event, to allow time for code to register .on('connect') listener
            setTimeout(() => {
                this.emit('connect');
            }, 5);
        }
        nodeUtil.inherits(MockNetConnection, EventEmitter);

        beforeEach(() => {
            netConnectionPort = undefined;
            sentData = undefined;
            netClientWriteFunction = (data, cb) => {
                sentData = data;
                cb();
            };
            sinon.stub(net, 'createConnection').callsFake((opts) => new MockNetConnection(opts));
            return configWorker.processDeclaration(getDefaultDeclaration());
        });

        it('should send data to Event Listener (JSON object)', () => dataPublisher.sendDataToListener({ data: 'testDataToSend' }, 'MyListener')
            .then(() => {
                assert.strictEqual(netConnectionPort, 6514);
                assert.strictEqual(sentData, '{"data":"testDataToSend"}');
            }));

        it('should send data to Event Listener in namespace', () => {
            const declaration = getDefaultDeclaration();
            declaration.MyNamespace = {
                class: 'Telemetry_Namespace',
                MyListener: {
                    class: 'Telemetry_Listener',
                    port: 6515,
                    enable: true,
                    trace: false
                }
            };
            return configWorker.processDeclaration(declaration)
                .then(() => dataPublisher.sendDataToListener({ data: 'someStringToNamespaceListener' }, 'MyListener', { namespace: 'MyNamespace' }))
                .then(() => {
                    assert.strictEqual(netConnectionPort, 6515);
                    assert.strictEqual(sentData, '{"data":"someStringToNamespaceListener"}');
                });
        });

        it('should reject if requested listener is disabled', () => {
            const declaration = getDefaultDeclaration();
            declaration.MyListener.enable = false;
            return assert.isRejected(
                configWorker.processDeclaration(declaration)
                    .then(() => dataPublisher.sendDataToListener({ data: 'testDataToSend' }, 'MyListener')),
                /Unable to send debugging message to EventListener: MyListener. Event Listener is disabled/
            );
        });

        it('should reject if requested listener does not exist (no namespace)', () => assert.isRejected(
            dataPublisher.sendDataToListener('someString', 'MyNonExistentListener'),
            /Unable to send debugging message to EventListener: MyNonExistentListener. Event Listener is not found/
        ));

        it('should reject if requested listener does not exist (in namespace)', () => assert.isRejected(
            dataPublisher.sendDataToListener('someString', 'MyNonExistentListener', { namespace: 'My_Namespace' }),
            /Unable to send debugging message to EventListener: MyNonExistentListener in Namespace: My_Namespace. Event Listener is not found/
        ));

        it('should reject if client.write() throws an error', () => {
            netClientWriteFunction = () => {
                throw new Error('throwing from client.write()');
            };
            return assert.isRejected(
                dataPublisher.sendDataToListener('someString', 'MyListener'),
                /throwing from client.write()/
            );
        });

        it('should reject if client.write() emits an error', () => {
            netClientWriteFunction = function () {
                this.emit('error', 'emitting error from client.write()');
            };
            return assert.isRejected(
                dataPublisher.sendDataToListener('someString', 'MyListener'),
                /emitting error from client.write()/
            );
        });
    });
});
