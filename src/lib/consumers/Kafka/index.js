/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
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
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const config = context.config;

    // adding sslOptions to client options at all is the signal to invoke TLS
    let tlsOptions = null;
    if (config.protocol === 'binaryTcpTls') {
        tlsOptions = {
            rejectUnauthorized: !config.allowSelfSignedCert
        };
    }
    // SASL auth options
    let saslOptions = null;
    if (config.authenticationProtocol === 'SASL-PLAIN') {
        saslOptions = {
            mechanism: 'plain',
            username: config.username,
            password: config.passphrase
        };
    }

    const clientOptions = {
        kafkaHost: `${config.host}:${config.port || 9092}`, // format: 'kafka-host1:9092'
        connectTimeout: 3 * 1000, // shorten timeout
        requestTimeout: 5 * 1000, // shorten timeout
        sslOptions: tlsOptions,
        sasl: saslOptions
    };

    const client = new kafka.KafkaClient(clientOptions);
    client.on('f5error', (err) => {
        context.logger.exception('Unexpected error in KafkaClient', err);
    });

    const producer = new kafka.Producer(client);
    const payload = [
        {
            topic: config.topic,
            messages: JSON.stringify(context.event.data)
        }
    ];

    if (context.tracer) {
        context.tracer.write(JSON.stringify(payload, null, 4));
    }

    producer.on('ready', () => {
        // eslint-disable-next-line no-unused-vars
        producer.send(payload, (error, data) => {
            if (error) {
                context.logger.error(`error: ${error.message ? error.message : error}`);
            } else {
                context.logger.debug('success');
            }
        });
    });

    // use this to catch any errors
    producer.on('error', (error) => {
        context.logger.error(`error: ${error.message ? error.message : error}`);
    });
};
