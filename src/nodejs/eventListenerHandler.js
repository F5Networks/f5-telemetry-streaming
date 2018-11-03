/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const net = require('net');
const logger = require('./logger.js');
const normalize = require('./normalize.js');

// LTM request log (example)
// eslint-disable-next-line max-len
// [telemetry] Client: ::ffff:10.0.2.4 sent data: EVENT_SOURCE="request_logging",BIGIP_HOSTNAME="hostname.test.com",CLIENT_IP="x.x.x.x",SERVER_IP="",HTTP_METHOD="GET",HTTP_URI="/",VIRTUAL_NAME="/Common/app.app/app_vs"

/**
 * Create listener (TCP)
 *
 * @param {String} port - port to listen on
 *
 * @returns {Object}
 */
function start(port) {
    // TODO: need to limit listener by adding host: localhost (or similar), however
    // for now cannot do so until valid on box host is determined - loopback not allowed for LTM objects
    const options = {
        port
    };

    const server = net.createServer((c) => {
        // event on client data
        c.on('data', (data) => {
            // logger.debug(`Client: ${c.remoteAddress} sent data: ${data}`);

            // TODO: send to async function which handles normalize/translate/forward, etc.
            normalize.event(String(data)); // force string
        });
        // event on client connection close
        c.on('end', () => {
            // logger.debug(`Client disconnected: ${c.remoteAddress}`);
        });
    });
    // listen
    server.listen(options, () => {
        logger.info(`Listener started on port ${port}`);
    });
    // catch any errors
    server.on('error', (err) => {
        throw err;
    });
}

module.exports = {
    start
};
