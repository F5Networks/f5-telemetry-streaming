/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const kafka = require('kafka-node');

/**
 * AUTOTOOL-491 workaround to resolve following situation:
 * - connection to broker was removed from pool already - assertion failed
 * - another connection was registered with the same key (addr:port) - assertion failed
 *
 * source: kafka-node v2.6.1, kafkaClient.js, line 669
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
 * @param {String} kafkaHost    Connection string to Kafka host in 'kafka-host1:9092' format
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
    // Auth options
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

    return {
        kafkaHost,
        connectTimeout: 3 * 1000, // shorten timeout
        requestTimeout: 5 * 1000, // shorten timeout
        sslOptions: tlsOptions,
        sasl: saslOptions
    };
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
     * @param {Object} config   Consumer configuration object
     *
     * @returns {Object}    Object containing the Kafka Client and Producer
     */
    makeConnection(config) {
        const kafkaHost = `${config.host}:${config.port || 9092}`; // format: 'kafka-host1:9092'

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

            const producer = new kafka.Producer(client);
            producer.on('ready', () => {
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
    const config = context.config;
    return Promise.resolve()
        .then(() => connectionCache.makeConnection(config))
        .then((connection) => {
            const payload = [
                {
                    topic: config.topic,
                    messages: JSON.stringify(context.event.data)
                }
            ];

            if (context.tracer) {
                context.tracer.write(payload);
            }

            connection.producer.send(payload, (error) => {
                if (error) {
                    context.logger.error(`error: ${error.message ? error.message : error}`);
                } else {
                    context.logger.debug('success');
                }
            });
        })
        .catch((error) => {
            context.logger.error(`error: ${error.message ? error.message : error}`);
        });
};
