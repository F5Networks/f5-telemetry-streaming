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

const AWS = require('aws-sdk');
const awsUtil = require('../shared/awsUtil');
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
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}/${month}/${day}/${dateString}.log`;
    };

    return awsUtil.initializeConfig(context)
        .then(() => {
            const clientProperties = { apiVersion: '2006-03-01' };
            if (context.config.endpointUrl) {
                clientProperties.endpoint = new AWS.Endpoint(context.config.endpointUrl);
            }
            s3 = new AWS.S3(clientProperties);
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
                context.tracer.write(params);
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
            context.logger.verbose('success');
        })
        .catch((err) => {
            context.logger.exception('Error encountered while processing for AWS S3', err);
        });
};
