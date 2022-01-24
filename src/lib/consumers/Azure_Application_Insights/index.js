/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const appInsights = require('applicationinsights');
const azureUtil = require('../shared/azureUtil');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    if (context.event.type !== EVENT_TYPES.SYSTEM_POLLER) {
        context.logger.debug('Skipping non-systemPoller data.');
        return Promise.resolve();
    }

    const metrics = azureUtil.getMetrics(context.event.data);
    if (metrics.length === 0) {
        context.logger.debug('No metrics found.');
        return Promise.resolve();
    }

    const setupDefaultClient = () => {
        if (!appInsights.defaultClient) {
            context.logger.debug('Initializing default client');

            // these set functions configure the global SDK behavior
            // a "defaultClient" needs to be initialized
            appInsights.setup('f5-telemetry-default')
                .setAutoDependencyCorrelation(false)
                .setAutoCollectRequests(false)
                .setAutoCollectPerformance(false)
                .setAutoCollectExceptions(false)
                .setAutoCollectDependencies(false)
                .setAutoCollectConsole(false)
                .setUseDiskRetryCaching(false)
                .start();
        }
        // lib only supports console out for non-error level logs
        // by default these will go to /var/tmp/restnoded.out
        const enableRestNodedOut = context.logger.getLevelName() === 'debug';
        appInsights.Configuration.setInternalLogging(enableRestNodedOut, enableRestNodedOut);
    };

    const createClient = (instrKeyOrConnStr) => {
        const appInsightsClient = new appInsights.TelemetryClient(instrKeyOrConnStr);

        // Sample customOpts (See https://www.npmjs.com/package/applicationinsights#advanced-configuration-options)
        const clientOpts = context.config.customOpts;
        if (clientOpts) {
            clientOpts.forEach((opt) => {
                appInsightsClient.config[opt.name] = opt.value;
            });
        }
        appInsightsClient.config.maxBatchIntervalMs = context.config.maxBatchIntervalMs;
        appInsightsClient.config.maxBatchSize = context.config.maxBatchSize;

        return appInsightsClient;
    };

    return azureUtil.getInstrumentationKeys(context)
        .then((instrKeys) => {
            setupDefaultClient();

            instrKeys.forEach((item) => {
                try {
                    // connString overrides to allow the client to determine which endpoint to connect to
                    // Endpoint Suffix is included in connString
                    const appInsightsClient = createClient(item.connString || item.instrKey);
                    metrics.forEach((metric) => {
                        appInsightsClient.trackMetric(metric);
                    });
                } catch (err) {
                    context.logger.exception(`Unable to forward to Azure App Insights consumer. ${item.name || item.instrKey}`, err);
                }
                context.logger.debug(`Finished sending total of ${metrics.length} metrics to Azure App Insights ${item.name || item.instrKey}`);
            });
            return Promise.resolve();
        })
        .catch((error) => {
            context.logger.exception('Error encountered while processing for Azure App Insights', error);
        });
};
