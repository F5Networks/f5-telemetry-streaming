/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const net = require('net');

const DEFAULT_PORT = require('../constants.js').DEFAULT_LISTENER_PORT;
const logger = require('../logger.js');
const event = require('../event.js');
const configHandler = require('./configHandler');

let listener = null;


// LTM request log (example)
// eslint-disable-next-line max-len
// [telemetry] Client: ::ffff:10.0.2.4 sent data: EVENT_SOURCE="request_logging",BIGIP_HOSTNAME="hostname.test.com",CLIENT_IP="x.x.x.x",SERVER_IP="",HTTP_METHOD="GET",HTTP_URI="/",VIRTUAL_NAME="/Common/app.app/app_vs"

/**
 * Create listener (TCP)
 *
 * @param {String} port - port to listen on
 *
 * @returns {Object} server object
 */
function start(port) {
    // TODO: investigate constraining listener if running on BIG-IP with host: localhost (or similar),
    // however for now cannot do so until valid address found - loopback address not allowed for LTM objects
    const options = {
        port
    };

    const server = net.createServer((c) => {
        // event on client data
        c.on('data', (data) => {
            // logger.debug(`Client: ${c.remoteAddress} sent data: ${data}`);

            // send to function which handles normalize/translate/forward, etc.
            event.process(String(data)); // force string
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
    // catch any errors to avoid NodeJS crashing
    server.on('error', (err) => {
        throw err;
    });
    return server;
}


configHandler.on('change', () => {
    if (!listener) {
        logger.info(`Starting listener on port ${DEFAULT_PORT}`);
        try {
            listener = start(DEFAULT_PORT);
        } catch (err) {
            logger.exception('Unhandled exception on listener start', err);
        }
    }
});


module.exports = {
    start
};
