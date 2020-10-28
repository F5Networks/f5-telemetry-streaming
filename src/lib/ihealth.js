/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const errors = require('./errors');
const logger = require('./logger');
const constants = require('./constants');
const util = require('./util');
const configWorker = require('./config');
const iHealthPoller = require('./ihealthPoller');
const dataPipeline = require('./dataPipeline');
const normalize = require('./normalize');
const properties = require('./properties.json').ihealth;

const SYSTEM_CLASS_NAME = constants.CONFIG_CLASSES.SYSTEM_CLASS_NAME;
const IHEALTH_POLLER_CLASS_NAME = constants.CONFIG_CLASSES.IHEALTH_POLLER_CLASS_NAME;

/** @module ihealth */

/**
 * Process the iHealth data
 *
 * @param {module:iHealthPoller:IHealthPoller} poller - poller
 * @param {Object} data  - data to process
 * @param {Object} other - additional info
 */
function process(poller, data, other) {
    const props = {
        filterByKeys: properties.filterKeys,
        renameKeys: properties.renameKeys
    };

    const normalized = normalize.ihealth(data, props);
    normalized.system.ihealthLink = other.ihealthLink;
    normalized.system.qkviewNumber = other.qkviewNumber;

    // inject service data
    const telemetryServiceInfo = {
        cycleStart: other.cycleStart,
        cycleEnd: other.cycleEnd
    };
    normalized.telemetryServiceInfo = telemetryServiceInfo;
    normalized.telemetryEventCategory = constants.EVENT_TYPES.IHEALTH_POLLER;
    // end inject service data

    const tracer = poller.getTracer();
    if (tracer) {
        tracer.write(JSON.stringify(normalized, null, 4));
    }
    if (!poller.isTestOnly()) {
        // call out to pipeline
        return dataPipeline.process(normalized, constants.EVENT_TYPES.IHEALTH_POLLER);
    }
    return Promise.resolve();
}

/**
 * Safely process the iHealth data
 *
 * @param {module:iHealthPoller:IHealthPoller} poller - poller
 * @param {Object} data  - data to process
 * @param {Object} other - additional info
 */
function safeProcess() {
    try {
        // eslint-disable-next-line
        return process.apply(null, arguments)
            .catch((err) => {
                logger.exception('iHealthPoller:safeProcess unhandled exception in promise-chain', err);
            });
    } catch (err) {
        logger.exception('iHealthPoller:safeProcess unhandled exception', err);
        return Promise.reject(new Error(`iHealthPoller:safeProcess unhandled exception: ${err}`));
    }
}

/**
 * Get current state of running pollers
 */
function getCurrentState() {
    const retData = [];
    Object.keys(iHealthPoller.instances).forEach((key) => {
        const instance = iHealthPoller.instances[key];
        const fireDate = instance.getNextFireDate();
        retData.push({
            systemDeclName: instance.sysName,
            iHealthDeclName: instance.ihName || undefined,
            state: instance.getState(),
            testOnly: instance.isTestOnly() ? true : undefined,
            nextFireDate: fireDate ? fireDate.toISOString() : undefined,
            timeBeforeNextFire: fireDate ? instance.timeBeforeFire() : undefined
        });
    });
    return retData;
}

/**
 * Process client's request via REST API
 */
function startPoller(systemName, pollerName) {
    return configWorker.getConfig()
        .then((config) => {
            config = config.parsed || {};
            const searchRet = iHealthPoller.getConfig(config, systemName, pollerName);
            const system = searchRet[0];
            const ihPoller = searchRet[1];

            if (!(system && ihPoller)) {
                throw new errors.ObjectNotFoundInConfigError('iHealth Poller declaration not found.');
            }

            const state = {};
            let ihInstance = iHealthPoller.get(systemName, pollerName, true);

            if (ihInstance) {
                state.runningAlready = true;
                state.message = 'iHealth Poller instance is running already';
            } else {
                state.created = true;
                state.message = 'iHealth poller created. See logs for current progress.';

                ihInstance = iHealthPoller.create(systemName, pollerName, true);
                ihInstance.dataCallback = safeProcess;
                ihInstance.process()
                    .catch((err) => {
                        logger.exception('processClientRequest: iHealthPoller.process error', err);
                        return ihInstance.removeAllData();
                    });
            }

            state.systemDeclName = systemName;
            state.iHealthDeclName = pollerName || undefined;
            return state;
        });
}

// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in iHealthPoller'); // helpful debug

    // timestamp to filed out-dated tracers
    const pollers = {};

    // timestamp to find out-dated tracers
    const tracersTimestamp = new Date().getTime();

    config = config || {};
    const systems = config[SYSTEM_CLASS_NAME] || {};

    Object.keys(systems).forEach((sysKey) => {
        const searchRet = iHealthPoller.getConfig(config, sysKey);
        const sysConf = searchRet[0];
        const ihConf = searchRet[1];

        if (util.isObjectEmpty(ihConf)) {
            return;
        }
        const pollerConf = iHealthPoller.mergeConfigs(sysConf, ihConf);
        if (!pollerConf.enable) {
            return;
        }

        let baseMsg = `iHealth Poller for System "${sysKey}"`;
        let ihInstance = iHealthPoller.get(sysKey);

        if (ihInstance) {
            baseMsg = `Updating ${baseMsg}`;
            // disable it, to avoid conflicts
            ihInstance.logger.prefix = `${ihInstance.logger.prefix}.DISABLED`;
            ihInstance.disable();
        } else {
            baseMsg = `Starting ${baseMsg}`;
        }

        logger.info(baseMsg);

        ihInstance = iHealthPoller.create(sysKey);
        ihInstance.config = pollerConf;
        ihInstance.dataCallback = safeProcess;
        ihInstance.getTracer();
        pollers[ihInstance.getKey()] = ihInstance;
    });

    iHealthPoller.updateStorage({});
    // start pollers
    Object.keys(pollers).forEach(key => pollers[key].process());

    // all testOnly instances will be removed due possible config changes!
    Object.keys(iHealthPoller.instances).forEach((key) => {
        const poller = iHealthPoller.instances[key];
        key = poller.getKey();

        if (!pollers[key]) {
            key = poller.isTestOnly() ? poller.getKey() : poller.sysName;
            logger.info(`Disabling iHealth Poller for System "${key}"`);

            poller.disable();
            iHealthPoller.remove(poller);
        }
    });

    util.tracer.remove(tracer => tracer.name.startsWith(IHEALTH_POLLER_CLASS_NAME)
        && tracer.lastGetTouch < tracersTimestamp);

    logger.debug(`${Object.keys(pollers).length} iHealth poller(s) running`);
});


module.exports = {
    getCurrentState,
    startPoller
};
