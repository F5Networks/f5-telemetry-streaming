/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const AWS = require('aws-sdk');

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const region = context.config.region;
    const bucket = context.config.bucket || context.config.host; // fallback to host
    const httpBody = JSON.stringify(context.event.data);

    // place file in folder(s) by date
    const date = new Date();
    const dateString = date.toISOString();
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDay();
    const file = `${year}/${month}/${day}/${dateString}.log`;

    AWS.config.update({
        region,
        credentials: new AWS.Credentials({
            accessKeyId: context.config.username,
            secretAccessKey: context.config.passphrase.text
        })
    });
    const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

    const params = {
        Bucket: bucket,
        Key: file,
        Body: httpBody,
        ContentType: 'application/json',
        Metadata: {
            f5telemetry: 'true'
        }
    };

    if (context.tracer) {
        context.tracer.write(JSON.stringify({ Bucket: bucket, Key: file, Body: JSON.parse(httpBody) }, null, 4));
    }

    // eslint-disable-next-line no-unused-vars
    s3.putObject(params, (error, body) => {
        if (error) {
            context.logger.error(`error: ${error.message ? error.message : error}`);
        } else {
            context.logger.debug('success');
        }
    });
};
