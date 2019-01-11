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
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const config = context.config;

    const clientOptions = {
        kafkaHost: `${config.host}:${config.port || 9092}`, // format: 'kafka-host1:9092'
        connectTimeout: 3 * 1000, // shorten timeout
        requestTimeout: 5 * 1000 // shorten timeout
    };
    const client = new kafka.KafkaClient(clientOptions);
    const producer = new kafka.Producer(client);
    const payload = [
        {
            topic: config.topic,
            messages: JSON.stringify(context.event.data)
        }
    ];

    if (context.tracer) context.tracer.write(JSON.stringify(payload, null, 4));

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
