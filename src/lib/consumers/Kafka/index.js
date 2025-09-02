/**
 * Copyright 2025 F5, Inc.
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

// This uses the original kafka-node library, but is the latest version with breaking changes.
// This is for Kafka deployments running in KRaft mode.
// Zookeeper-based configurations should use the legacy library used in TS versions prior to 1.36.
// Zookeeper has been deprecated as of Kafka 3.5 and will be removed in 4.0

const kafka = require('kafka-node');

const API = require('../api');
const deepFreeze = require('../../utils/misc').deepFreeze;
const DEFAULT_HOSTNAME = require('../../constants').DEFAULT_HOSTNAME;
const EVT_SYSTEM_POLLER = require('../../constants').EVENT_TYPES.SYSTEM_POLLER;

const PARTITIONER_TYPES = ['default', 'random', 'cyclic', 'keyed'];

/**
 * @module consumers/Kafka
 *
 * @typedef {import('../api').ConsumerCallback} ConsumerCallback
 * @typedef {import('../api').ConsumerConfig} ConsumerConfig
 * @typedef {import('../api').ConsumerInterface} ConsumerInterface
 * @typedef {import('../api').ConsumerModuleInterface} ConsumerModuleInterface
 * @typedef {import('../../dataPipeline').DataEventCtxV2} DataCtx
 * @typedef {import('../../logger').Logger} Logger
 */

/**
 * Telemetry Streaming Kafka Push Consumer
 *
 * @implements {ConsumerInterface}
 */
class KafkaConsumer extends API.Consumer {
    /** @inheritdoc */
    get allowsPull() {
        return false;
    }

    /** @inheritdoc */
    get allowsPush() {
        return true;
    }

    /** @inheritdoc */
    onData(dataCtx) {
        this._sendData(dataCtx);
    }

    /** @inheritdoc */
    async onLoad(config) {
        await super.onLoad(config);

        // template for payload to use later
        const payloadBase = {
            topic: this.originConfig.topic,
            messages: [null]
        };

        const isKeyed = this.originConfig.partitionerType === 'keyed';
        if (isKeyed) {
            payloadBase.key = this.originConfig.partitionKey;
        }

        Object.defineProperties(this, {
            connectionOptions: {
                value: deepFreeze(buildKafkaClientOptions.call(this))
            },
            createMessage: {
                value: isKeyed
                    ? (data) => new kafka.KeyedMessage(this.originConfig.partitionKey, data)
                    : (data) => data
            },
            partitionerType: {
                value: PARTITIONER_TYPES.indexOf(this.originConfig.partitionerType)
            },
            payloadBase: {
                get() { return Object.assign({}, payloadBase); }
            },
            realSendKafkaCb: {
                value: realSendKafkaCb.bind(this.logger)
            },
            useDefaultFormat: {
                value: this.originConfig.format === 'default'
            }
        });

        this._producer = null;
        this._promise = Promise.resolve();

        connect.call(this);
    }

    /** @inheritdoc */
    async onUnload() {
        await super.onUnload();
        destroy.call(this);
    }
}

/**
 * Telemetry Streaming Kafka Consumer Module
 *
 * @implements {ConsumerModuleInterface}
 */
class KafkaConsumerModule extends API.ConsumerModule {
    /** @inheritdoc */
    async createConsumer() {
        return new KafkaConsumer();
    }

    /** @inheritdoc */
    async onLoad(config) {
        await super.onLoad(config);

        /**
         * AUTOTOOL-491 workaround to resolve following situation:
         * - connection to broker was removed from pool already - assertion failed
         * - another connection was registered with the same key (addr:port) - assertion failed
         */
        if (typeof kafka.KafkaClient.prototype.deleteDisconnected === 'function'
            && kafka.KafkaClient.prototype.deleteDisconnected.patched !== true
        ) {
            this.logger.debug('Patching Kafka library.');
            const originalMethod = kafka.KafkaClient.prototype.deleteDisconnected;
            kafka.KafkaClient.prototype.deleteDisconnected = function () {
                try {
                    originalMethod.apply(this, arguments);
                } catch (err) {
                    this.emit('f5error', err);
                }
            };

            kafka.KafkaClient.prototype.deleteDisconnected.patched = true;
        }
    }
}

/**
 * Build Kafka client options based on the module configuration.
 *
 * @private
 * @this KafkaConsumer
 *
 * @returns {object} Kafka client options
 */
function buildKafkaClientOptions() {
    // TODO: do we want to allow customers to specify `clientId`?
    const config = this.originConfig;
    let kafkaHost = '';
    let tlsOptions = null;
    let saslOptions = null;

    if (typeof config.host === 'string') {
        kafkaHost = `${config.host}:${config.port}`;
    } else {
        kafkaHost = config.host
            .map((item) => `${item}:${config.port}`)
            .join(',');
    }

    if (config.protocol === 'binaryTcpTls') {
        tlsOptions = {
            rejectUnauthorized: !config.allowSelfSignedCert
        };
    }
    if (config.authenticationProtocol === 'SASL-PLAIN') {
        saslOptions = {
            mechanism: 'plain',
            username: config.username,
            password: config.passphrase
        };
    } else if (config.authenticationProtocol === 'TLS') {
        Object.assign(tlsOptions, {
            key: config.privateKey,
            cert: config.clientCertificate,
            ca: config.rootCertificate || null
        });
    }

    const defaulRetryOpts = {
        retries: 5,
        factor: 2,
        minTimeout: 1 * 1000,
        maxTimeout: 60 * 1000,
        randomize: true
    };

    const clientOpts = {
        kafkaHost,
        connectTimeout: 3 * 1000, // shorten timeout
        requestTimeout: 5 * 1000, // shorten timeout
        sslOptions: tlsOptions,
        sasl: saslOptions,
        connectRetryOptions: defaulRetryOpts,
        autoConnect: true
    };

    // allow additional opts or overrides to pass to client lib so we don't have to expose all via schema
    if (config.customOpts && config.customOpts.length) {
        // keys were validated by the schema already
        config.customOpts.forEach((opt) => {
            if (opt.name.startsWith('connectRetryOptions')) {
                const prop = opt.name.substring(opt.name.indexOf('.') + 1);
                clientOpts.connectRetryOptions[prop] = opt.value;
            } else {
                clientOpts[opt.name] = opt.value;
            }
        });
    }
    return clientOpts;
}

/**
 * Connect to the Kafka broker.
 *
 * @private
 * @this KafkaConsumer
 *
 * @returns {void} once connection routine scheduled
 */
function connect() {
    let producer = null;
    disableDataTransfer.call(this);

    this._promise = this._promise.then(() => new Promise((resolve, reject) => {
        if (this._destroy) {
            this.logger.debug('Kafka client is being destroyed, skipping connect.');
            resolve();
            return;
        }

        const client = new kafka.KafkaClient(Object.assign({}, this.connectionOptions));
        client.on('f5error', (err) => {
            this.logger.exception('KafkaClient unexpected error:', err);
        });

        this._producer = new kafka.Producer(
            client,
            { partitionerType: this.partitionerType }
        );

        producer = this._producer;
        producer.on('ready', () => {
            if (resolve === null) {
                this.logger.verbose('Previously used KafkaClient successfully connected - ignoring.');
            } else {
                this.logger.verbose(`KafkaClient successfully connected to ${this.connectionOptions.kafkaHost}.`);
                resolve();
                resolve = null;
                reject = null;
                enableDataTransfer.call(this);
            }
        });

        producer.on('error', (error) => {
            // no need to explicitly disable data transfer here
            // - it is not enabled yet if reject !== null
            // - connect() will take care of it in the next call (same event loop cycle)
            // - destroy() took care of it already

            resolve = null;

            if (this._producer !== producer) {
                this.logger.exception('KafkaClient error (previously used instance of Producer):', error);
                // destroying/reconnecting already, ignoring error
                return;
            }

            // set to null to ignore consecutive errors
            this._producer = null;

            if (reject !== null) {
                // not connected yet, rejecting
                reject(error);
                return;
            }

            // at that point the promise was fullfilled already, connection was
            // established successfully. The only way to deal with the error
            // is to log it and reconnect.

            if (!this._destroy) {
                this.logger.exception('KafkaClient error:', error);
                this.logger.verbose('Reconnecting...');
                connect.call(this);
            }

            safeClose(producer);
        });
    }))
        .catch((error) => {
            // no need to explicitly disable data transfer here
            // - connect() will take care of it in the next call (same event loop cycle)
            // - destroy() took care of it already

            this.logger.exception('KafkaClient error:', error);

            safeClose(producer);
            this._producer = null;

            if (!this._destroy) {
                this.logger.verbose('Reconnecting...');
                connect.call(this);
            }
        });
}

/**
 * Destroy the Kafka client connection.
 *
 * @private
 * @this KafkaConsumer
 *
 * @returns {void} once closing routine scheduled
 */
function destroy() {
    // define read-only/final property to avoid overrides
    Object.defineProperty(this, '_destroy', { value: true });
    disableDataTransfer.call(this);

    this._promise = this._promise.then(() => {
        if (this._producer) {
            this.logger.debug('Closing Kafka producer...');

            safeClose.call(this, this._producer, () => {
                this.logger.debug('Kafka producer closed.');
            });
            this._producer = null;
        }
    });
}

/**
 * Disables data transfer
 *
 * @private
 * @this KafkaConsumer
 *
 * @returns {void} once disabled
 */
function disableDataTransfer() {
    this._sendData = dummySend;
}

/**
 * Stub function in case when transport is not ready
 *
 * @private
 * @this KafkaConsumer
 *
 * @returns {void} once dummy discarded
 */
function dummySend() {
    // do nothing with data
    this.logger.verbose('Not ready to send data...');
    // TODO: cache data to send it later (if instance not disabled)
    // - e.g. disconnected
    // - not connected yet
    // should be optional and configurable by the user
}

/**
 * Enables data transfer
 *
 * @private
 * @this KafkaConsumer
 *
 * @returns {void} once enabled
 */
function enableDataTransfer() {
    this._sendData = realSend;
}

/**
 * Parses the event data to send to Kafka broker
 * Option to split up sytem poller data into multiple messages to decrease individual message size
 *
 * Sample data input:
 *        {
 *          system: { hostname: 'somehost', version: '15.1.0', tmmTraffic: { 'clientSideTraffic.bitsIn' : 100 } },
 *          virtualServers: {
 *               'virtual1': {
 *                  'serverside.bitsIn': 111,
 *                   enabledState: 'enabled'
 *               },
 *              virtual2: {
 *                   'serverside.bitsIn': 222,
 *                   'enabledState': 'enabled'
 *               }
 *           }
 *        }
 * Expected output:
 *      [
 *        '{ "system": {"hostname":"somehost","version":"15.1.0","tmmTraffic":{"clientSideTraffic.bitsIn":100}}}',
 *        '{ "system": {"hostname":"somehost"},
 *           "virtualServers": {"virtual1":{"serverside.bitsIn": 111,enabledState: 'enabled'}}
 *         }',
 *        '{ "system": {"hostname":"somehost"},
 *           "virtualServers": {"virtual2":{"serverside.bitsIn": 222,enabledState: 'enabled'}}
 *         }'
 *
 * @private
 * @this KafkaConsumer
 *
 * @param {DataCtx} dataCtx
 *
 * @returns {void} once data scheduled to be sent
 */
function realSend(dataCtx) {
    const payload = this.payloadBase;
    const data = dataCtx.data;

    if (typeof data === 'string') {
        // // for RAW_EVENTS / pre-formatted
        payload.messages = [this.createMessage(data)];
    } else if (this.useDefaultFormat || dataCtx.type !== EVT_SYSTEM_POLLER) {
        payload.messages = [this.createMessage(JSON.stringify(data))];
    } else {
        let hostname = DEFAULT_HOSTNAME;
        if (data.system && typeof data.system === 'object') {
            if (data.system.hostname) {
                hostname = data.system.hostname;
            } else {
                data.system.hostname = DEFAULT_HOSTNAME;
            }
        }

        const messageList = [];

        // Additional processing for System Poller Info
        // Split other properties into separate messages

        Object.entries(data).forEach(([key, value]) => {
            if (key === 'system') {
                // TODO: should we inject hostname if missing?
                messageList.push(this.createMessage(JSON.stringify({ system: value })));
            } else {
                Object.entries(value).forEach(([propKey, propValue]) => {
                    const message = {
                        system: { hostname },
                        [key]: {
                            [propKey]: propValue
                        }
                    };
                    messageList.push(this.createMessage(JSON.stringify(message)));
                });
            }
        });

        payload.messages = messageList;
    }

    this.writeTraceData(payload);
    this._producer.send([payload], this.realSendKafkaCb);
}

/**
 * Callback for Kafka send operation
 *
 * @private
 * @this {Logger}
 *
 * @param {Object} error - error on attempt to send data
 *
 * @returns {void}
 */
function realSendKafkaCb(error) {
    if (error) {
        this.error(`error: ${error.message ? error.message : error}`);
    } else {
        this.verbose('success');
    }
}

/**
 * Safely closes Kafka Producer
 *
 * @private
 * @this KafkaConsumer
 *
 * @param {kafka.Producer} producer
 * @param {function} [callback]
 *
 * @returns {void} once closed
 */
function safeClose(producer, callback) {
    try {
        producer.close(callback);
    } catch (_) {
        // suppress errors, not interested in the producer any more
    }
}

/**
 * Load Telemetry Streaming Kafka Consumer module
 *
 * Note: called once only if not in memory yet
 *
 * @param {API.ModuleConfig} moduleConfig - module's config
 *
 * @return {API.ConsumerModuleInterface} module instance
 */
module.exports = {
    async load() {
        return new KafkaConsumerModule();
    }
};
