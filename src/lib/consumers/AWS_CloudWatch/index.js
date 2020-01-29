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
    const logGroup = context.config.logGroup;
    const logStream = context.config.logStream;
    const date = new Date();
    const epochDate = date.getTime();

    const awsConfig = { region };
    if (context.config.username && context.config.passphrase) {
        awsConfig.credentials = new AWS.Credentials({
            accessKeyId: context.config.username,
            secretAccessKey: context.config.passphrase
        });
    }
    AWS.config.update(awsConfig);

    const cloudWatchLogs = new AWS.CloudWatchLogs({ apiVersion: '2014-03-28' });

    const params = {
        logGroupName: logGroup,
        logStreamName: logStream,
        logEvents: [
            {
                message: JSON.stringify(context.event.data),
                timestamp: epochDate
            }
        ],
        sequenceToken: undefined
    };
    const describeParams = {
        logGroupName: logGroup,
        limit: 1,
        logStreamNamePrefix: logStream,
        orderBy: 'LogStreamName'
    };

    if (context.tracer) {
        context.tracer.write(JSON.stringify(params, null, 4));
    }

    // have to get a sequence token first
    cloudWatchLogs.describeLogStreams(describeParams).promise()
        .then((data) => {
            const logStreamData = data.logStreams[0]; // there should only be one item
            const token = logStreamData ? logStreamData.uploadSequenceToken : null;
            // if token exists update putLogEvents params, otherwise leave as undefined
            if (token) params.sequenceToken = token;
            return cloudWatchLogs.putLogEvents(params).promise();
        })
        .then(() => {
            context.logger.debug('success');
        })
        .catch((error) => {
            context.logger.error(`error: ${error.message ? error.message : error}`);
        });
};
