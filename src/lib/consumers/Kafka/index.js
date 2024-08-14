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

// This uses the original kafka-node library, but is the latest version with breaking changes.
// This is for Kafka deployments running in KRaft mode.
// Zookeeper-based configurations should use the legacy library used in TS versions prior to 1.36.
// Zookeeper has been deprecated as of Kafka 3.5 and will be removed in 4.0

const kafka = require('kafka-node');
const constants = require('../../constants');

const PARTITIONER_TYPES = ['default', 'random', 'cyclic', 'keyed'];
/**
 * AUTOTOOL-491 workaround to resolve following situation:
 * - connection to broker was removed from pool already - assertion failed
 * - another connection was registered with the same key (addr:port) - assertion failed
 *
 */
if (typeof kafka.KafkaClient.prototype.deleteDisconnected !== 'undefined') {
    const originalMethod = kafka.KafkaClient.prototype.deleteDisconnected;
    kafka.KafkaClient.prototype.deleteDisconnected = function () {
        try {
            originalMethod.apply(this, arguments);
        } catch (err) {
            this.emit('f5error', err);
        }
    };
}

/**
 * Construct Kafka client options from Consumer config
 *
 * @param {String} kafkaHost    Connection string to Kafka host(s)
 * @param {Object} config       Consumer configuration object
 *
 * @returns {Object} Kafka Client options object
 */
function buildKafkaClientOptions(kafkaHost, config) {
    // adding sslOptions to client options at all is the signal to invoke TLS
    let tlsOptions = null;
    if (config.protocol === 'binaryTcpTls') {
        tlsOptions = {
            rejectUnauthorized: !config.allowSelfSignedCert
        };
    }

    let saslOptions = null;
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
        connectRetryOptions: defaulRetryOpts
    };

    // allow additional opts or overrides to pass to client lib so we don't have to expose all via schema
    if (config.customOpts && config.customOpts.length) {
        let allowedKeys = [
            'connectTimeout',
            'requestTimeout',
            'idleConnection',
            'maxAsyncRequests'
        ];

        allowedKeys = allowedKeys.concat(Object.keys(defaulRetryOpts).map((k) => `connectRetryOptions.${k}`));

        config.customOpts.forEach((opt) => {
            if (allowedKeys.indexOf(opt.name) > -1) {
                if (opt.name.startsWith('connectRetryOptions')) {
                    const prop = opt.name.substring(opt.name.indexOf('.') + 1);
                    clientOpts.connectRetryOptions[prop] = opt.value;
                } else {
                    clientOpts[opt.name] = opt.value;
                }
            }
        });
    }
    return clientOpts;
}

/**
 * Generate string containing kafka host(s) to connect to
 *
 * @param {Object} config   Consumer config
 *
 * @returns {String}        Host(s) to pass to KafkaClient in format ${host}:${port}
 *                          Comma is used as delimiter for multiple hosts
 */
function buildKafkaHostString(config) {
    if (typeof config.host === 'string') {
        return `${config.host}:${config.port || 9092}`;
    }

    let hostStr = '';
    config.host.forEach((item, idx) => {
        const delimiter = idx === 0 ? '' : ',';
        hostStr += `${delimiter}${item}:${config.port || 9092}`;
    });

    return hostStr;
}

/**
 * Parses the event data to send to Kafka broker
 * Option to split up sytem poller data into multiple messages to decrease individual message size
 *
 * @param {Object} context  Consumer context containing config and data
 *
 * @returns {Array<string>|Array<kafka.KeyedMessage>} List of strings containing data to send.
 *                          If using keyed partition, a KeyedMessage is created.
 *                          If 'split' format is specified, the messages are formatted like below:
 *  Sample data input:
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
 *  Expected output:
 *      [
 *        '{ "system": {"hostname":"somehost","version":"15.1.0","tmmTraffic":{"clientSideTraffic.bitsIn":100}}}',
 *        '{ "system": {"hostname":"somehost"},
 *           "virtualServers": {"virtual1":{"serverside.bitsIn": 111,enabledState: 'enabled'}}
 *         }',
 *        '{ "system": {"hostname":"somehost"},
 *           "virtualServers": {"virtual2":{"serverside.bitsIn": 222,enabledState: 'enabled'}}
 *         }'
 *      ]
 */
function buildMessages(context) {
    const data = context.event.data;
    const eventType = context.event.type;
    const partitionKey = context.config.partitionKey;
    const isKeyed = context.config.partitionerType === 'keyed' && partitionKey;

    // for RAW_EVENTS / pre-formatted
    if (typeof data === 'string') {
        const message = isKeyed ? new kafka.KeyedMessage(partitionKey, data) : data;
        return [message];
    }

    if (context.config.format === 'default' || eventType !== constants.EVENT_TYPES.SYSTEM_POLLER) {
        const message = JSON.stringify(data);
        return isKeyed ? [new kafka.KeyedMessage(partitionKey, message)] : [message];
    }

    // Additional processing for System Poller Info
    // Split other properties into separate messages
    const hostname = data.system.hostname || constants.DEFAULT_HOSTNAME;
    context.logger.verbose(`Building messages for ${hostname} using "split" format.`);
    const messageList = [];

    Object.keys(data).forEach((key) => {
        if (key === 'system') {
            messageList.push(JSON.stringify({ system: data.system }));
        } else {
            const nonSystemProp = data[key];
            Object.keys(nonSystemProp).forEach((propKey) => {
                const message = {
                    system: { hostname },
                    [key]: {}
                };
                message[key][propKey] = nonSystemProp[propKey];
                messageList.push(JSON.stringify(message));
            });
        }
    });

    if (context.config.partitionKey) {
        return messageList.map((msg) => new kafka.KeyedMessage(context.config.partitionKey, msg));
    }
    return messageList;
}

/**
 * Caching class for Kafka connections
 *
 * @property {Object} connectionCache   Object containing cached Kafka connections
 */
class ConnectionCache {
    constructor() {
        this.connectionCache = {};
    }

    /**
     * Creates and returns an object containing a Kafka Client and Producer.
     * If a cached connection exists, the cached connection is returned.
     *
     * @param {Object} context   Consumer context
     *
     * @returns {Object}    Object containing the Kafka Client and Producer
     */
    makeConnection(context) {
        const config = context.config;
        const kafkaHost = buildKafkaHostString(config);

        const cacheEntry = this.connectionCache[kafkaHost];
        if (typeof cacheEntry !== 'undefined') {
            return Promise.resolve(cacheEntry);
        }

        this.connectionCache[kafkaHost] = new Promise((resolve, reject) => {
            const clientOptions = buildKafkaClientOptions(kafkaHost, config);
            const client = new kafka.KafkaClient(clientOptions);
            client.on('f5error', (err) => {
                context.logger.exception('Unexpected error in KafkaClient', err);
            });

            const producer = new kafka.Producer(
                client,
                { partitionerType: PARTITIONER_TYPES.indexOf(context.config.partitionerType) }
            );
            producer.on('ready', () => {
                context.logger.verbose(`KafkaClient successfully connected to ${kafkaHost}.`);
                const connection = {
                    client,
                    producer
                };
                this.connectionCache[kafkaHost] = connection;
                resolve(connection);
            });

            producer.on('error', (error) => {
                this.connectionCache[kafkaHost] = undefined;
                reject(error);
            });
        });

        return Promise.resolve(this.connectionCache[kafkaHost]);
    }
}

const connectionCache = new ConnectionCache();

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    return Promise.resolve()
        .then(() => connectionCache.makeConnection(context))
        .then((connection) => {
            const payload = {
                topic: context.config.topic,
                messages: buildMessages(context)
            };

            // only pass key if exists, will only exist if schema validated that partitionerType = keyed
            if (context.config.partitionKey) {
                payload.key = context.config.partitionKey;
            }

            if (context.tracer) {
                context.tracer.write(payload);
            }

            connection.producer.send([payload], (error) => {
                if (error) {
                    context.logger.error(`error: ${error.message ? error.message : error}`);
                } else {
                    context.logger.verbose('success');
                }
            });
        })
        .catch((error) => {
            context.logger.error(`error: ${error.message ? error.message : error}`);
        });
};
