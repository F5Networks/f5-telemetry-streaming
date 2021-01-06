/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const AWS = require('aws-sdk');
const util = require('../../utils/misc');
/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    let s3;

    const getFileName = () => {
        // place file in folder(s) by date
        const date = new Date();
        const dateString = date.toISOString();
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDay();
        return `${year}/${month}/${day}/${dateString}.log`;
    };

    const setupPromise = new Promise((resolve, reject) => {
        try {
            const awsConfig = { region: context.config.region };
            if (context.config.username && context.config.passphrase) {
                awsConfig.credentials = new AWS.Credentials({
                    accessKeyId: context.config.username,
                    secretAccessKey: context.config.passphrase
                });
            }
            AWS.config.update(awsConfig);
            s3 = new AWS.S3({ apiVersion: '2006-03-01' });
            resolve();
        } catch (err) {
            reject(err);
        }
    });

    return setupPromise
        .then(() => {
            const params = {
                // fallback to host if no bucket
                Bucket: context.config.bucket || context.config.host,
                Key: getFileName(),
                Body: context.event.data,
                ContentType: 'application/json',
                Metadata: {
                    f5telemetry: 'true'
                }
            };

            if (context.tracer) {
                context.tracer.write(util.stringify(params, true));
            }

            return new Promise((resolve, reject) => {
                params.Body = util.stringify(params.Body);
                s3.putObject(params, (error, data) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(data);
                    }
                });
            });
        })
        .then(() => {
            context.logger.debug('success');
        })
        .catch((err) => {
            context.logger.exception('Error encountered while processing for AWS S3', err);
        });
};
