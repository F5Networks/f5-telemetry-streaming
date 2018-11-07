/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const systemStats = require('./systemStatsHandler.js');

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
        .then((data) => {
            const ret = data;

            // TODO: translator would go here

            if (noForward === true) {
                // skipping forward, primarily for statsInfo worker
            } else {
                // TODO: forwarder would go here
            }
            logger.debug('stats.process() success');
            return ret;
        })
        .catch((e) => {
            throw e;
        });
}

module.exports = {
    process
};
