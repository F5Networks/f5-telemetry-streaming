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
const constants = require('./constants.js');
const normalize = require('./normalize.js');
const dataPipeline = require('./dataPipeline.js');
const configWorker = require('./config.js');
const properties = require('./config/properties.json');

const tracers = require('./util.js').tracer;
const stringify = require('./util.js').stringify;

const global = properties.global;
const events = properties.events;
const definitions = properties.definitions;

const DEFAULT_PORT = constants.DEFAULT_EVENT_LISTENER_PORT;
const CLASS_NAME = constants.EVENT_LISTENER_CLASS_NAME;
const listeners = {};

// LTM request log (example)
// eslint-disable-next-line max-len
// [telemetry] Client: ::ffff:10.0.2.4 sent data: EVENT_SOURCE="request_logging",BIGIP_HOSTNAME="hostname.test.com",CLIENT_IP="x.x.x.x",SERVER_IP="",HTTP_METHOD="GET",HTTP_URI="/",VIRTUAL_NAME="/Common/app.app/app_vs"

/**
 * Event Listener class
 *
 * @param {String} name                 - listener's name
 * @param {String} port                 - port to listen on
 * @param {Object} opts                 - additional configuration options
 * @param {Object} [opts.tags]          - tags to add to the event data
 * @param {Function} [opts.tracer]      - tracer
 * @param {Function} [opts.filterFunc]  - function to filter events
 *
 * @returns {Object} Returns EventListener object
 */
function EventListener(name, port, opts) {
    this.name = name;
    this.port = port;
    this.tracer = opts.tracer;
    this.tags = opts.tags || {};
    this.filterFunc = opts.filterFunc;
    this.logger = logger.getChild(`${this.name}:${this.port}`);

    this._server = null;
    this._clientConnMap = {};
    this._lastConnKey = 0;
}

/**
 * Server options to start listening
 *
 * @returns {Object} listening options
 */
EventListener.prototype.getServerOptions = function () {
    return {
        port: this.port
    };
};

/**
 * Start Event listener
 */
EventListener.prototype.start = function () {
    this.logger.debug(`Configuring server to listen on port ${this.port}`);
    try {
        this._start();
    } catch (err) {
        this.logger.exception(`Unable to start: ${err}`, err);
    }
};

/**
 * Start event listener - internals
 *
 * @private
 */
EventListener.prototype._start = function () {
    // TODO: investigate constraining listener when running on local BIG-IP
    // For now cannot until a valid address is found - loopback address not allowed for LTM objects
    this._server = net.createServer((conn) => {
        const connKey = this._lastConnKey;
        this._lastConnKey += 1;
        this._clientConnMap[connKey] = conn;

        // event on client data
        conn.on('data', (data) => {
            // normalize and send to data pipeline
            // note: addKeysByTag uses regex for default tags parsing (tenant/app)
            const nOptions = {
                renameKeysByPattern: global.renameKeys,
                addKeysByTag: {
                    tags: this.tags,
                    definitions,
                    opts: {
                        classifyByKeys: events.classifyByKeys
                    }
                }
            };
            data = String(data).trim();
            // note: data may contain multiple events seperated by newline
            // however newline chars may also show up inside a given event
            // so split only on newline with preceeding double quote
            data = data.split('"\n');
            data.forEach((i) => {
                const normalizedData = normalize.event(i, nOptions);
                if (this.tracer) {
                    this.tracer.write(JSON.stringify(normalizedData, null, 4));
                }
                // keep filtering as part of event listener for now
                if (!this.filterFunc || this.filterFunc(normalizedData)) {
                    dataPipeline.process(normalizedData, constants.EVENT_TYPES.EVENT_LISTENER);
                }
            });
        });
        // event on client connection close
        conn.on('end', () => {
            // this.logger.debug(`Client disconnected: ${c.remoteAddress}`);
            delete this._clientConnMap[connKey];
        });
    });

    // catch any errors
    this._server.on('error', (err) => {
        this.logger.error(`Unexpected error: ${err}`);
        this.restart();
    });

    this._server.on('listening', () => {
        this.logger.debug(`Started listening on port ${this.port}`);
    });

    this._server.on('close', (err) => {
        if (err) {
            this.logger.exception(`Unexpected error on attempt to stop: ${err}`, err);
        } else {
            this.logger.debug('Event listener was stopped');
        }
    });
    // start listening on configured port
    this._server.listen(this.getServerOptions());
};

/**
 * Restart listener
 */
EventListener.prototype.restart = function () {
    if (this._server) {
        // probably need to increase restart timeout
        this.logger.debug('Restarting in 5 sec.');
        setTimeout(() => {
            if (this._server) {
                this._server.close();
                this._server.listen(this.getServerOptions());
            }
        }, 5000);
    }
};

/**
 * Close all opened client connections
 *
 * @private
 */
EventListener.prototype._closeAllConnections = function () {
    Object.keys(this._clientConnMap).forEach(connKey => this._clientConnMap[connKey].destroy());
};

/**
 * Stop Event listener
 */
EventListener.prototype.stop = function () {
    this.logger.debug('Stopping event listener');
    this._closeAllConnections();
    this._server.close();
    this._server = null;
};

/**
 * Create function to filter events by pattern defined in config
 *
 * @param {Object} config       - listener's config
 * @param {String} config.match - pattern to filter data
 *
 * @returns {Function(Object)} function to filter data, returns boolean value if data matches
 */
function buildFilterFunc(config) {
    if (!config.match || !events.classifyByKeys) {
        return null;
    }
    const pattern = new RegExp(config.match, 'i');
    const props = events.classifyByKeys;
    logger.debug(`Building events filter function with following params: pattern=${pattern} properties=${stringify(props)}`);

    return function (data) {
        for (let i = 0; i < props.length; i += 1) {
            const val = data[props[i]];
            if (val && pattern.test(val)) {
                return true;
            }
        }
        return false;
    };
}

// config worker change event
configWorker.on('change', (config) => {
    logger.debug('configWorker change event in eventListener'); // helpful debug

    let eventListeners;
    if (config.parsed && config.parsed[CLASS_NAME]) {
        eventListeners = config.parsed[CLASS_NAME];
    }
    // in case when no listeners were declared
    eventListeners = eventListeners || {};
    // gather all keys together to iterate over them
    const keys = new Set(Object.keys(eventListeners));
    Object.keys(listeners).forEach(key => keys.add(key));

    // timestamp to filed out-dated tracers
    const tracersTimestamp = new Date().getTime();

    keys.forEach((lKey) => {
        const lConfig = eventListeners[lKey];
        let listener = listeners[lKey];
        // no listener's config or it was disabled - remove it
        if (!lConfig || lConfig.enable === false) {
            if (listener) {
                listener.stop();
                delete listeners[lKey];
            }
            return;
        }
        // pre-create all variables
        const port = lConfig.port || DEFAULT_PORT;
        const tags = lConfig.tag;
        const tracer = tracers.createFromConfig(CLASS_NAME, lKey, lConfig);
        const filterFunc = buildFilterFunc(lConfig);
        // when port is the same - no sense to restart listener and drop connections
        if (listener && listener.port === port) {
            logger.debug(`Updating event listener '${lKey}'`);
            listener.tags = tags;
            listener.tracer = tracer;
            listener.filterFunc = filterFunc;
        } else {
            // stop existing listener to free the port
            if (listener) {
                listener.stop();
            }
            listener = new EventListener(lKey, port, { tags, tracer, filterFunc });
            listener.start();
            listeners[lKey] = listener;
        }
    });

    logger.debug(`${Object.keys(listeners).length} event listener(s) listening`);
    tracers.remove(null, tracer => tracer.name.startsWith(CLASS_NAME)
                                   && tracer.lastGetTouch < tracersTimestamp);
});
