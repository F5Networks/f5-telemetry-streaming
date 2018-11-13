/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const util = require('./util.js');
const configWorker = require('./config.js');
const systemStats = require('./systemStats.js');
const dataPipeline = require('./dataPipeline.js');

let pollerID = null;

/**
 * Process system(s) stats
 *
 * @param {Object} args - args, such as { config: {}, process: false }
 *
 * @returns {Promise} Promise which is resolved with data sent
 */
function process(args) {
    const config = args.config;

    // assume only one target host, for now
    const targetHost = config.targetHosts[0];
    if (!targetHost.host) { throw new Error('Host is required'); }

    return systemStats.collect(targetHost.host, targetHost.username, targetHost.password)
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
    // just in case we will need to have ability to disable it
    if (!config.interval) {
        if (pollerID) {
            logger.info('Stop collecting stats');
            util.stop(pollerID);
            pollerID = null;
        }
    } else {
        const args = { config };
        if (pollerID) {
            logger.info(`Update collecting stats interval == ${config.interval} sec`);
            pollerID = util.update(pollerID, safeProcess, args, config.interval);
        } else {
            logger.info(`Start collecting stats with interval == ${config.interval} sec`);
            pollerID = util.start(safeProcess, args, config.interval);
        }
    }
});


module.exports = {
    process
};
