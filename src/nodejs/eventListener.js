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
const tracers = require('./util.js').tracer;
const constants = require('./constants.js');
const normalize = require('./normalize.js');
const dataPipeline = require('./dataPipeline.js');
const configWorker = require('./config.js');

const DEFAULT_PORT = constants.DEFAULT_EVENT_LISTENER_PORT;
const CLASS_NAME = constants.EVENT_LISTENER_CLASS_NAME;
const listeners = {};

// LTM request log (example)
// eslint-disable-next-line max-len
// [telemetry] Client: ::ffff:10.0.2.4 sent data: EVENT_SOURCE="request_logging",BIGIP_HOSTNAME="hostname.test.com",CLIENT_IP="x.x.x.x",SERVER_IP="",HTTP_METHOD="GET",HTTP_URI="/",VIRTUAL_NAME="/Common/app.app/app_vs"

/**
 * Start listener
 *
 * @param {String} port - port to listen on
 *
 * @returns {Object} Returns server object
 */
function start(port, tracer) {
    // TODO: investigate constraining listener if running on BIG-IP with host: localhost (or similar),
    // however for now cannot do so until valid address found - loopback address not allowed for LTM objects
    let server;
    const options = {
        port
    };

    // place in try/catch to avoid bombing on things such as port conflicts
    try {
        server = net.createServer((c) => {
            // event on client data
            c.on('data', (data) => {
                // normalize and send to data pipeline
                const normalizedData = normalize.event(String(data)); // force string
                if (tracer) {
                    tracer.write(JSON.stringify(normalizedData, null, 4));
                }
                dataPipeline.process(normalizedData, 'event');
            });
            // event on client connection close
            c.on('end', () => {
                // logger.debug(`Client disconnected: ${c.remoteAddress}`);
            });
        });
        // listen
        server.listen(options, () => {
            logger.debug(`Listener started on port ${port}`);
        });
        // catch any errors
        server.on('error', (err) => {
            throw err;
        });
    } catch (e) {
        logger.exception(`Unable to start event listener: ${e}`, e);
    }
    return server;
}

/**
 * Stop listener
 *
 * @param {Object} server - server to stop
 *
 * @returns {Void}
 */
function stop(server) {
    // place in try/catch
    try {
        server.close();
        server.on('close', (err) => {
            if (err) { throw err; }
        });
    } catch (e) {
        logger.exception(`Unable to stop event listener: ${e}`, e);
    }
}

// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in eventListener'); // helpful debug
    let eventListeners;
    if (config.parsed && config.parsed[CLASS_NAME]) {
        eventListeners = config.parsed[CLASS_NAME];
    }
    // timestamp to filed out-dated tracers
    const tracersTimestamp = new Date().getTime();

    if (!eventListeners) {
        if (listeners) {
            logger.info('Stopping listener(s)');
            Object.keys(listeners).forEach((k) => {
                stop(listeners[k]);
                delete listeners[k];
            });
        }
    } else {
        Object.keys(eventListeners).forEach((k) => {
            const lConfig = eventListeners[k];
            const port = lConfig.port ? lConfig.port : DEFAULT_PORT;

            // check for enabled=false first
            const baseMsg = `listener ${k} on port: ${port}`;
            if (lConfig.enabled === false) {
                if (listeners[k]) {
                    logger.info(`Disabling ${baseMsg}`);
                    stop(listeners[k]);
                    delete listeners[k];
                }
            } else if (listeners[k]) {
                logger.info(`Updating ${baseMsg}`);
                // TODO: only need to stop/start if port is different
                stop(listeners[k]);
                listeners[k] = start(port, tracers.createFromConfig(CLASS_NAME, k, lConfig));
            } else {
                logger.info(`Starting ${baseMsg}`);
                listeners[k] = start(port, tracers.createFromConfig(CLASS_NAME, k, lConfig));
            }
        });
    }
    tracers.remove(null, tracer => tracer.name.startsWith(CLASS_NAME)
                                   && tracer.lastGetTouch < tracersTimestamp);
});

module.exports = {
    start,
    stop
};
