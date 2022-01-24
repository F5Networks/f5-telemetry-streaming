/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const configUtil = require('./utils/config');
const configWorker = require('./config');
const constants = require('./constants');
const dataPipeline = require('./dataPipeline');
const errors = require('./errors');
const iHealthPoller = require('./ihealthPoller');
const logger = require('./logger').getChild('ihealth');
const normalize = require('./normalize');
const promiseUtil = require('./utils/promise');
const properties = require('./properties.json').ihealth;
const tracer = require('./utils/tracer');
const util = require('./utils/misc');

/** @module ihealth */

/**
 * @this ReportCtx
 * @param {QkviewReport} report
 *
 * @returns {Promise} resolved once F5 iHealth Service Qkview report processed
 */
function reportCallback(report) {
    const normalized = normalize.ihealth(report.report, {
        filterByKeys: properties.filterKeys,
        renameKeys: properties.renameKeys
    });
    normalized.system.ihealthLink = report.additionalInfo.ihealthLink;
    normalized.system.qkviewNumber = report.additionalInfo.qkviewNumber;
    normalized.telemetryServiceInfo = {
        cycleStart: new Date(report.additionalInfo.cycleStart).toISOString(),
        cycleEnd: new Date(report.additionalInfo.cycleEnd).toISOString()
    };
    normalized.telemetryEventCategory = constants.EVENT_TYPES.IHEALTH_POLLER;
    const dataCtx = {
        data: normalized,
        type: constants.EVENT_TYPES.IHEALTH_POLLER,
        sourceId: this.pollerID,
        destinationIds: this.destinationIDs
    };
    return dataPipeline.process(dataCtx, {
        noConsumers: this.demoMode,
        tracer: this.tracer
    });
}

/**
 * @this function
 * @returns {Promise} resolved once finished data processing
 */
function safeProcess() {
    try {
        // eslint-disable-next-line
        return Promise.resolve(this.apply(null, arguments))
            .catch((err) => {
                logger.exception('iHealthPoller:safeProcess unhandled exception in promise-chain', err);
            });
    } catch (err) {
        logger.exception('iHealthPoller:safeProcess unhandled exception', err);
        return Promise.resolve();
    }
}

/**
 * @param {IHealthPoller} poller - poller
 * @param {object} pollerConfig  - iHealth Poller config
 * @param {object} globalConfig - entire configuration
 *
 * @returns {Function<Promise>} callback for IHealthPoller#report event
 */
function createReportCallback(poller, pollerConfig, globalConfig) {
    const ctx = {
        destinationIDs: configUtil.getReceivers(globalConfig, pollerConfig).map((r) => r.id),
        pollerID: pollerConfig.id,
        demoMode: poller.isDemoModeEnabled(),
        tracer: tracer.fromConfig(pollerConfig.trace)
    };
    return safeProcess.bind(reportCallback.bind(ctx));
}

/**
 * @param {String} [namespaceName] - Telemetry Namespace name
 *
 * @returns {Array<iHealthPollerInfo>} array of iHealth Pollers statuses
 */
function getCurrentState(namespaceName) {
    let instances = iHealthPoller.getAll({ includeDemo: true });

    if (instances.length > 0 && namespaceName) {
        const ids = configUtil.getTelemetryIHealthPollers(configWorker.currentConfig, namespaceName
            || constants.DEFAULT_UNNAMED_NAMESPACE)
            .map((pc) => pc.traceName);
        instances = instances.filter((poller) => ids.indexOf(poller.id) !== -1);
    }
    return instances.map((poller) => poller.info());
}

/**
 * Process client's request via REST API
 *
 * @property {String} systemName - Telemetry_System name
 * @property {String} [namespaceName] - Telemetry_Namespace name
 *
 * @returns {Promise<Object>} resolved with poller's info once started
 */
function startPoller(systemName, namespaceName) {
    return Promise.resolve()
        .then(() => {
            const config = configWorker.currentConfig;
            const pollerConfig = configUtil.getTelemetryIHealthPollers(config, namespaceName
                || constants.DEFAULT_UNNAMED_NAMESPACE)
                .find((pc) => pc.systemName === systemName);

            if (util.isObjectEmpty(pollerConfig)) {
                throw new errors.ObjectNotFoundInConfigError('System or iHealth Poller declaration not found');
            }

            let response = {
                isRunning: false,
                message: `iHealth Poller for System "${systemName}"${namespaceName ? ` (namespace "${namespaceName}")` : ''} started`
            };
            let retPromise = Promise.resolve();
            let poller = iHealthPoller.get(pollerConfig.traceName).find((p) => p.isDemoModeEnabled());

            if (poller) {
                response.isRunning = true;
                response.message = `${response.message} already`;
                response = Object.assign(poller.info(), response);
            } else {
                poller = iHealthPoller.createDemo(pollerConfig.traceName, {
                    name: pollerConfig.traceName
                });
                poller.on('report', createReportCallback(poller, pollerConfig, config));
                const cleanup = (error) => {
                    poller.logger.debug(error ? `Done but with error = ${error}` : 'Done');
                    // check if poller was disabled already to avoid concurrency with 'config.change' event
                    if (!poller.isDisabled()) {
                        iHealthPoller.disable(poller)
                            .catch((disableError) => poller.logger.debugException('Unexpected error on attempt to disable', disableError));
                    } else {
                        poller.logger.debug('Disabled already!');
                    }
                };
                poller.on('died', cleanup);
                retPromise = retPromise.then(() => poller.start()
                    .then(() => {
                        response = Object.assign(poller.info(), response);
                    })
                    .catch((error) => {
                        response.message = `Unable to start iHealth Poller for System "${systemName}"${namespaceName ? ` (namespace "${namespaceName}")` : ''}: ${error}`;
                        cleanup(error);
                    }));
            }
            return retPromise.then(() => response);
        });
}

// config worker change event
configWorker.on('change', (config) => Promise.resolve()
    .then(() => {
        logger.debug('configWorker change event in iHealthPoller'); // helpful debug
        const configuredPollers = configUtil.getTelemetryIHealthPollers(config);

        /**
         * - if a namespace updated then only pollers that belongs to a namespace will be updated
         * - if entire config updated that all pollers will be updated
         * - if a namespace updated then only IDs that belongs to a namespace will be regenerated
         */
        function cleanupInactive() {
            // - stop all removed pollers - doesn't matter even if namespace only was updated
            return iHealthPoller.getAll({ includeDemo: true })
                .filter((poller) => !configuredPollers.find((conf) => conf.traceName === poller.id))
                .map((poller) => {
                    logger.debug(`Removing iHealth Poller "${poller.name}". Reason - removed from configuration.`);
                    return iHealthPoller.disable(poller);
                });
        }
        /**
         * - do not touch pollers from other namespaces
         * - stop disabled pollers
         * - stop demo pollers
         * - stop active pollers because no info about config changes available
         */
        function cleanupUpdated() {
            const disablePromises = [];
            configuredPollers.forEach((pollerConfig) => {
                if (pollerConfig.skipUpdate) {
                    return;
                }
                iHealthPoller.get(pollerConfig.traceName).forEach((poller) => {
                    if (poller) {
                        if (pollerConfig.enable === false) {
                            logger.debug(`Removing iHealth Poller "${poller.name}". Reason - disabled.`);
                            disablePromises.push(iHealthPoller.disable(poller));
                        } else {
                            logger.debug(`Removing iHealth Poller "${poller.name}". Reason - config update.`);
                            disablePromises.push(iHealthPoller.disable(poller));
                        }
                    }
                });
            });
            return disablePromises;
        }

        const pollersToStart = [];
        // wait for disable only - it is faster rather than wait for complete stop
        return Promise.all([
            promiseUtil.allSettled(cleanupInactive()),
            promiseUtil.allSettled(cleanupUpdated())
        ])
            .then(() => {
                configuredPollers.forEach((pollerConfig) => {
                    if (pollerConfig.skipUpdate || pollerConfig.enable === false) {
                        return;
                    }
                    const poller = iHealthPoller.create(pollerConfig.traceName, { name: pollerConfig.traceName });
                    poller.on('report', createReportCallback(poller, pollerConfig, config));
                    pollersToStart.push(poller);
                });
                return promiseUtil.allSettled(pollersToStart.map((poller) => {
                    logger.info(`Staring iHealth Poller "${poller.name}"`);
                    return poller.start();
                }));
            })
            .then((statuses) => {
                statuses.forEach((status, idx) => {
                    if (status.reason) {
                        pollersToStart[idx].logger.exception('Error ocurred on attempt to start', status.reason);
                    }
                });
            });
    })
    .then(() => logger.info(`${iHealthPoller.getAll().length} iHealth Poller(s) running`))
    .catch((error) => logger.exception('Uncaught exception on attempt to process iHealth Pollers configuration', error))
    .then(() => iHealthPoller.cleanupOrphanedStorageData())
    .catch((error) => logger.debugException('Uncaught exception on attempt to cleanup orphaned data', error)));

module.exports = {
    getCurrentState,
    startPoller
};

/**
 * @typedef ReportCtx
 * @type {Object}
 * @property {Array<String>} destinationIDs - destination IDs
 * @property {String} pollerID - poller's ID from configuration
 * @property {Boolean} demo - in 'demo' mode or not
 * @property {Tracer} [tracer] - tracer instance if configured
 */
