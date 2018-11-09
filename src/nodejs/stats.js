/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const scheduler = require('./scheduler.js');
const configHandler = require('./handlers/configHandler.js');
const systemStats = require('./handlers/systemStatsHandler.js');
const translator = require('./translator.js');
const forwarder = require('./forwarder.js');

let pollerID = null;


/**
 * Process stats
 *
 * @param {Object} args - args, such as { config: {}, noForward: true }
 *
 * @returns {Promise} Promise which is resolved with data sent
 */
function process(args) {
    const config = args.config;
    const noForward = args.noForward;

    // assume only one target host, for now
    const targetHost = config.targetHosts[0];
    if (!targetHost.host) { throw new Error('Host is required'); }

    return systemStats.collect(targetHost.host, targetHost.username, targetHost.password)
        .then(data => translator(data, args))
        .then((data) => {
            let ret = null;
            if (noForward === true) {
                ret = Promise.resolve(data);
            } else {
                ret = forwarder(data, args);
            }
            logger.debug('stats.process() success');
            return ret;
        })
        .catch((e) => {
            throw e;
        });
}


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


configHandler.on('change', (config) => {
    // just in case we will need to have ability to disable it
    if (!config.interval) {
        if (pollerID) {
            logger.info(`Stop collecting stats due interval == ${config.interval}`);
            scheduler.stop(pollerID);
            pollerID = null;
        }
    } else {
        const args = { config };
        if (pollerID) {
            logger.info(`Update collecting stats interval == ${config.interval} sec.`);
            pollerID = scheduler.update(pollerID, safeProcess, args, config.interval);
        } else {
            logger.info(`Start collecting stats with interval == ${config.interval} sec.`);
            pollerID = scheduler.start(safeProcess, args, config.interval);
        }
    }
});


module.exports = {
    process
};
