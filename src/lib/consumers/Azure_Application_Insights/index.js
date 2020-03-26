/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const appInsights = require('applicationinsights');
const azureUtil = require('./../shared/azureUtil');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    if (context.event.type !== EVENT_TYPES.SYSTEM_POLLER) {
        context.logger.debug('Skipping non-systemPoller data.');
        return;
    }

    const metrics = azureUtil.getMetrics(context.event.data);
    if (metrics.length === 0) {
        context.logger.debug('No metrics found.');
        return;
    }

    try {
        // lib only supports console out for non-error level logs
        // by default these will go to /var/tmp/restnoded.out
        const enableRestNodedOut = context.logger.getLevelName() === 'debug';
        appInsights.setup(context.config.instrumentationKey)
            .setAutoDependencyCorrelation(false)
            .setAutoCollectRequests(false)
            .setAutoCollectPerformance(false)
            .setAutoCollectExceptions(false)
            .setAutoCollectDependencies(false)
            .setAutoCollectConsole(false)
            .setUseDiskRetryCaching(false)
            .setInternalLogging(enableRestNodedOut, enableRestNodedOut)
            .start();

        // Sample customOpts (See https://www.npmjs.com/package/applicationinsights#advanced-configuration-options)
        const client = new appInsights.TelemetryClient(context.config.instrumentationKey);
        const clientOpts = context.config.customOpts;
        if (clientOpts) {
            clientOpts.forEach((opt) => {
                client.config[opt.name] = opt.value;
            });
        }
        client.config.maxBatchIntervalMs = context.config.maxBatchIntervalMs;
        client.config.maxBatchSize = context.config.maxBatchSize;

        metrics.forEach((metric) => {
            client.trackMetric(metric);
        });

        context.logger.debug(`Finished sending total of ${metrics.length} metrics to Azure App Insights`);
    } catch (error) {
        context.logger.exception('Unable to forward to Azure App Insights consumer.', error);
    }
};
