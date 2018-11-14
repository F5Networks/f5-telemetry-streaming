/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const constants = require('./constants.js');
const util = require('./util.js');
const configWorker = require('./config.js');
const systemStats = require('./systemStats.js');
const dataPipeline = require('./dataPipeline.js');

const CLASS_NAME = constants.SYSTEM_POLLER_CLASS_NAME;
const pollerIDs = {};

/**
 * Process system(s) stats
 *
 * @param {Object} args - args, such as { config: {}, process: false }
 *
 * @returns {Promise} Promise which is resolved with data sent
 */
function process(args) {
    const config = args.config;

    return systemStats.collect(config.host, config.username, config.password)
        .then((data) => {
            let ret = null;
            if (args.process === false) {
                ret = Promise.resolve(data);
            } else {
                // call out to pipeline
                dataPipeline.process(data, 'stats');
            }
            logger.debug('systemPoller.process() success');
            return ret;
        })
        .catch((e) => {
            throw e;
        });
}

/**
 * Safe process - start process safely
 *
 * @returns {Promise} Promise which is resolved with data sent
 */
function safeProcess() {
    try {
        // eslint-disable-next-line
        process.apply(null, arguments)
            .then()
            .catch((err) => {
                logger.exception('safeProcess unhandled exception in promise-chain', err);
            });
    } catch (err) {
        logger.exception('safeProcess unhandled exception', err);
    }
}

// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in systemPoller'); // helpful debug
    let systemPollers;
    if (config.parsed && config.parsed[CLASS_NAME]) {
        systemPollers = config.parsed[CLASS_NAME];
    }

    // now check for system pollers and start/stop/update accordingly
    if (!systemPollers) {
        if (pollerIDs) {
            logger.info('Stop collecting stats');
            Object.keys(pollerIDs).forEach((k) => {
                util.stop(pollerIDs[k]);
                delete pollerIDs[k]; // remove reference
            });
        }
    } else {
        // we have pollers to process, now determine if we are starting or updating
        Object.keys(systemPollers).forEach((k) => {
            const args = { config: systemPollers[k] };
            if (pollerIDs[k]) {
                logger.info(`Update system poller interval: ${args.config.interval} secs`);
                pollerIDs[k] = util.update(pollerIDs[k], safeProcess, args, args.config.interval);
            } else {
                logger.info(`Start system poller with interval: ${args.config.interval} sec`);
                pollerIDs[k] = util.start(safeProcess, args, args.config.interval);
            }
        });
    }
});


module.exports = {
    process
};
