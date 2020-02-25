/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const net = require('net');
const dgram = require('dgram');

const logger = require('./logger.js');
const constants = require('./constants.js');
const normalize = require('./normalize.js');
const dataPipeline = require('./dataPipeline.js');
const configWorker = require('./config.js');
const properties = require('./properties.json');

const tracers = require('./util.js').tracer;
const stringify = require('./util.js').stringify;
const isObjectEmpty = require('./util.js').isObjectEmpty;

const global = properties.global;
const events = properties.events;
const definitions = properties.definitions;

const DEFAULT_PORT = constants.DEFAULT_EVENT_LISTENER_PORT;
const CLASS_NAME = constants.CONFIG_CLASSES.EVENT_LISTENER_CLASS_NAME;

const MAX_BUFFER_SIZE = 16 * 1024; // 16k chars
const MAX_BUFFER_TIMEOUTS = 5;
const MAX_BUFFER_TIMEOUT = 1 * 1000; // 1 sec

const listeners = {};
const protocols = ['tcp', 'udp'];

// LTM request log (example)
// eslint-disable-next-line max-len
// [telemetry] Client: ::ffff:10.0.2.4 sent data: EVENT_SOURCE="request_logging",BIGIP_HOSTNAME="hostname.test.com",CLIENT_IP="x.x.x.x",SERVER_IP="",HTTP_METHOD="GET",HTTP_URI="/",VIRTUAL_NAME="/Common/app.app/app_vs"

/**
 * Event Listener class
 *
 * @param {String} name                      - listener's name
 * @param {String} port                      - port to listen on
 * @param {Object} opts                      - additional configuration options
 * @param {Object} [opts.tags]               - tags to add to the event data
 * @param {String} [opts.protocol]           - protocol to listen on: tcp or udp
 * @param {module:util~Tracer} [opts.tracer] - tracer
 * @param {Array}  [opts.actions]            - list of actions to apply to the event data
 * @param {Function} [opts.filterFunc]       - function to filter events
 *
 * @returns {Object} Returns EventListener object
 */
function EventListener(name, port, opts) {
    this.name = name;
    this.port = port;
    this.protocol = opts.protocol || 'tcp';
    this.logger = logger.getChild(`${this.name}:${this.port}:${this.protocol}`);
    this.updateConfig(opts);

    this._server = null;
    this._clientConnMap = {};
    this._lastConnKey = 0;
    this._connDataBuffers = {};
}

/**
 * Update listener's configuration - tracer, tags, actions and etc.
 *
 * @param {Array}    [opts.actions]          - list of actions to apply to the event data
 * @param {Object}   [opts.tags]             - tags to add to the event data
 * @param {Function} [opts.filterFunc]       - function to filter events
 * @param {module:util~Tracer} [opts.tracer] - tracer
 *
 * @returns {void}
 */
EventListener.prototype.updateConfig = function (config) {
    this.tracer = config.tracer;
    this.tags = config.tags || {};
    this.filterFunc = config.filterFunc;
    this.actions = config.actions || [];
};

/**
 * Server options to start listening
 *
 * @returns {Object} listening options
 */
EventListener.prototype.getServerOptions = function () {
    if (this.protocol === 'tcp') {
        return {
            port: this.port
        };
    }
    return {};
};

/**
 * Start Event listener
 */
EventListener.prototype.start = function () {
    this.logger.debug('Starting event listener');
    try {
        this._start();
    } catch (err) {
        this.logger.exception(`Unable to start: ${err}`, err);
    }
};

/**
 * Start listening
 */
EventListener.prototype._listen = function () {
    if (this.protocol === 'tcp') {
        this._server.listen(this.getServerOptions());
    } else if (this.protocol === 'udp') {
        this._server.bind(this.port);
    }
};

/**
 * Start event listener - internals
 *
 * @private
 */
EventListener.prototype._start = function () {
    // TODO: investigate constraining listener when running on local BIG-IP, however
    // for now cannot until a valid address is found - loopback address not allowed for LTM objects

    if (protocols.indexOf(this.protocol) === -1) throw new Error(`Procotol unexpected: ${this.protocol}`);

    if (this.protocol === 'tcp') {
        this._server = net.createServer((conn) => {
            const connKey = this._lastConnKey;
            this._lastConnKey += 1;
            this._clientConnMap[connKey] = conn;

            // event on client data
            conn.on('data', (data) => {
                this.processRawData(String(data), {
                    address: conn.remoteAddress,
                    port: conn.remotePort
                });
            });
            // event on client connection error
            conn.on('error', () => {
                conn.destroy();
            });
            // event on client connection close
            conn.on('close', () => {
                delete this._clientConnMap[connKey];
            });
            // the other end of the socket sends a FIN packet
            conn.on('end', () => {
                // allowHalfOpen is false by default
                // so, don't need to call 'end' explicitly
            });
        });
    } else if (this.protocol === 'udp') {
        this._server = dgram.createSocket({ type: 'udp6', ipv6Only: false });

        // eslint-disable-next-line no-unused-vars
        this._server.on('message', (data, remoteInfo) => {
            this.processRawData(String(data), remoteInfo);
        });
    }

    // catch any errors
    this._server.on('error', (err) => {
        this.logger.error(`Unexpected error: ${err}`);
        this.restart();
    });

    // message on listening event
    this._server.on('listening', () => {
        this.logger.debug('Event listener started');
    });

    // message on close event
    this._server.on('close', (err) => {
        if (err) {
            this.logger.exception(`Unexpected error on attempt to stop: ${err}`, err);
        } else {
            this.logger.debug('Event listener stopped');
        }
    });

    // start listening on port/protocol
    this._listen();
};

/**
 * Process raw data
 *
 * @param {String}  data             - raw data
 * @param {Object}  connInfo         - remote info
 * @param {String}  connInfo.address - remote address
 * @param {Integer} connInfo.port    - remote port
 */
EventListener.prototype.processRawData = function (data, connInfo) {
    const key = `${connInfo.address}-${connInfo.port}`;
    let bufferInfo = this._connDataBuffers[key];
    let incompleteData;

    if (bufferInfo) {
        data = bufferInfo.data + data;
        // cleanup timeout to avoid dups
        if (bufferInfo.timeoutID) {
            clearTimeout(bufferInfo.timeoutID);
        }
    }
    // TS assumes message to have trailing '\n'.
    if (!data.endsWith('\n')) {
        const idx = data.lastIndexOf('\n');
        incompleteData = data;

        /**
         * String.slice / String.substring keeps reference to original string,
         * it means GC is unable to remove original string until all references
         * to it will be removed.
         * So, let's use some strategy like if valid data takes less then 70%
         * of string then keep it as incompleted and wait for more data.
         * In any case max lifetime is about 5-7 sec.
         */
        if (idx === -1 || idx / data.length < 0.7) {
            data = null;
        } else {
            // string deep copy to release origin string after processing
            incompleteData = data.slice(idx + 1).split('').join('');
            data = data.slice(0, idx + 1);
        }
    }
    // in case if all data is like incomplete message
    if (!data && ((!isObjectEmpty(bufferInfo) && bufferInfo.timeoutNo >= MAX_BUFFER_TIMEOUTS)
        || (incompleteData && incompleteData.length >= MAX_BUFFER_SIZE))) {
        // if limits exceeded - flush all data
        data = incompleteData;
        incompleteData = null;
    }

    if (data) {
        if (bufferInfo) {
            // reset counter due we have valid data to process now
            bufferInfo.timeoutNo = 0;
        }
        this.processEvent(data);
    }
    // if we have incomplete data to buffer
    if (incompleteData) {
        if (!bufferInfo) {
            bufferInfo = { timeoutNo: 0 };
            this._connDataBuffers[key] = bufferInfo;
        }
        bufferInfo.data = incompleteData;
        bufferInfo.timeoutNo += 1;
        bufferInfo.timeoutID = setTimeout(() => {
            delete this._connDataBuffers[key];
            this.processEvent(bufferInfo.data);
        }, MAX_BUFFER_TIMEOUT);
    } else {
        delete this._connDataBuffers[key];
    }
};

/**
 * Restart listener
 */
EventListener.prototype.restart = function () {
    if (this._server) {
        // probably need to increase restart timeout
        this.logger.debug('Restarting in 5 seconds');
        setTimeout(() => {
            this._server.close();
            this._listen();
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
    if (this.protocol === 'tcp') {
        this._closeAllConnections();
    }
    this._server.close();
    this._server = null;
};

/**
 * Process event
 *
 * @param {String} data - data
 *
 * @returns {Void}
 */
EventListener.prototype.processEvent = function (data) {
    try {
        this._processEvent(data);
    } catch (err) {
        this.logger.exception('EventListener:processEvent unexpected error', err);
    }
};

/**
 * Process event
 *
 * @private
 * @param {String} data - data
 *
 * @returns {Void}
 */
EventListener.prototype._processEvent = function (data) {
    // normalize and send to data pipeline
    // note: addKeysByTag uses regex for default tags parsing (tenant/app)
    const options = {
        renameKeysByPattern: global.renameKeys,
        addKeysByTag: {
            tags: this.tags,
            definitions,
            opts: {
                classifyByKeys: events.classifyByKeys
            }
        },
        formatTimestamps: global.formatTimestamps.keys,
        classifyEventByKeys: events.classifyCategoryByKeys
    };
    data = String(data).trim();

    // note: data may contain multiple events seperated by newline
    // however newline chars may also show up inside a given event
    // so split only on newline with preceeding double quote
    data.split(/"\n|\r\n/).forEach((line) => {
        // lets normalize the data
        const normalizedData = normalize.event(line, options);

        // keep filtering as part of event listener for now
        if (!this.filterFunc || this.filterFunc(normalizedData)) {
            const dataCtx = {
                data: normalizedData,
                type: normalizedData.telemetryEventCategory || constants.EVENT_TYPES.EVENT_LISTENER
            };
            dataPipeline.process(dataCtx, { tracer: this.tracer, actions: this.actions })
                .catch(err => this.logger.exception('EventListener:_processEvent unexpected error from dataPipeline:process', err));
        }
    });
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
    if (config && config[CLASS_NAME]) {
        eventListeners = config[CLASS_NAME];
    }
    // in case when no listeners were declared
    eventListeners = eventListeners || {};
    // gather all keys together to iterate over them
    const keys = new Set(Object.keys(eventListeners));
    Object.keys(listeners).forEach(key => keys.add(key));

    // timestamp to find out-dated tracers
    const tracersTimestamp = new Date().getTime();

    keys.forEach((lKey) => {
        const lConfig = eventListeners[lKey];
        const listener = listeners[lKey];
        // no listener's config or it was disabled - remove it
        if (!lConfig || lConfig.enable === false) {
            if (listener) {
                protocols.forEach((protocol) => {
                    const protocolListener = listener[protocol];
                    if (protocolListener) {
                        protocolListener.stop();
                    }
                });
                delete listeners[lKey];
            }
            return;
        }
        // pre-create all variables
        const port = lConfig.port || DEFAULT_PORT;
        const tags = lConfig.tag || {};
        const actions = lConfig.actions || [];
        const tracer = tracers.createFromConfig(CLASS_NAME, lKey, lConfig);
        const filterFunc = buildFilterFunc(lConfig);

        protocols.forEach((protocol) => {
            let protocolListener = listener ? listener[protocol] : undefined;
            const opts = {
                protocol,
                tags,
                actions,
                tracer,
                filterFunc
            };

            // when port is the same - no sense to restart listener and drop connections
            if (protocolListener && protocolListener.port === port) {
                logger.debug(`Updating event listener '${lKey}' protocol '${protocol}'`);
                protocolListener.updateConfig(opts);
            } else {
                // stop existing listener to free the port
                if (protocolListener) {
                    protocolListener.stop();
                }
                protocolListener = new EventListener(lKey, port, opts);
                protocolListener.start();
                listeners[lKey] = listeners[lKey] || {};
                listeners[lKey][protocol] = protocolListener;
            }
        });
    });

    logger.debug(`${Object.keys(listeners).length} event listener(s) listening`);
    tracers.remove(null, tracer => tracer.name.startsWith(CLASS_NAME)
                                   && tracer.lastGetTouch < tracersTimestamp);
});
