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
 * Implementation for consumer - AWS S3
 *
 * @param {Object} context                                      - context of execution
 * @param {Object} context.config                               - consumer's config
 * @param {Object} context.logger                               - logger instance
 * @param {function(string):void} context.logger.info           - log info message
 * @param {function(string):void} context.logger.error          - log error message
 * @param {function(string):void} context.logger.debug          - log debug message
 * @param {function(string, err):void} context.logger.exception - log error message with error's traceback
 * @param {Object} context.event                                - event to process
 * @param {Object} context.event.data                           - actual data to process
 * @param {string} context.event.type                           - type of data to process
 * @param {Object|undefined} context.tracer                     - tracer object
 * @param {function(string):void} context.tracer.write          - write data to tracer
 *
 * @returns {void}
 */
module.exports = function (context) {
    const region = context.config.region;
    const bucket = context.config.host; // host should contain bucket name
    const httpBody = JSON.stringify(context.event.data);

    // place file in folder(s) by date
    const date = new Date();
    const dateString = date.toISOString();
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDay();
    const file = `${year}/${month}/${day}/${dateString}.log`; // TODO: reconsider this

    AWS.config.update({
        region,
        credentials: new AWS.Credentials({
            accessKeyId: context.config.username,
            secretAccessKey: context.config.passphrase.text
        })
    });
    const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

    const params = {
        Body: httpBody,
        Bucket: bucket,
        Key: file,
        ContentType: 'application/json',
        Metadata: {
            f5telemetry: 'true'
        }
    };

    if (context.tracer) {
        context.tracer.write(JSON.stringify({ Key: file, Bucket: bucket, Body: JSON.parse(httpBody) }, null, 4));
    }

    // eslint-disable-next-line no-unused-vars
    s3.putObject(params, (error, body) => {
        if (error) {
            context.logger.error(`AWS_S3: error ${error.message ? error.message : error}`);
        } else {
            context.logger.debug('AWS_S3: success');
        }
    });
};
