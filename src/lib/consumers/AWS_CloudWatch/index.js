/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const awsUtil = require('./awsUtil');
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
                context.logger.debug('Skipping non-systemPoller data.');
                return Promise.resolve();
            }

            const defDims = awsUtil.getDefaultDimensions(context.event.data);
            const metrics = awsUtil.getMetrics(context.event.data, defDims);
            return awsUtil.sendMetrics(context, metrics);
        })
        .then((optMessage) => {
            context.logger.debug(`success${optMessage}`);
        })
        .catch((error) => {
            context.logger.exception('Unable to forward to AWS CloudWatch consumer', error);
        });
};
