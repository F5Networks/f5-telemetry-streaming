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

const awsUtil = require('../shared/awsUtil');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    return awsUtil.initializeConfig(context)
        .then(() => {
            if (context.config.dataType !== 'metrics') {
                return awsUtil.sendLogs(context);
            }

            if (context.event.type !== EVENT_TYPES.SYSTEM_POLLER) {
                context.logger.verbose('Skipping non-systemPoller data.');
                return Promise.resolve();
            }

            const defDims = awsUtil.getDefaultDimensions(context.event.data);
            const metrics = awsUtil.getMetrics(context.event.data, defDims);
            return awsUtil.sendMetrics(context, metrics);
        })
        .then((optMessage) => {
            // logs are taken care of at sendLogs level
            if (context.config.dataType !== 'logs') {
                context.logger.verbose(`success${optMessage}`);
            }
        })
        .catch((error) => {
            context.logger.exception('Unable to forward to AWS CloudWatch consumer', error);
        });
};
