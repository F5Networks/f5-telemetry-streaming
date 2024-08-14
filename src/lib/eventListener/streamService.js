/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* eslint-disable consistent-return, no-multi-assign, no-plusplus */

const hrtimestamp = require('../utils/datetime').hrtimestamp;
const netService = require('./networkService');
const Parser = require('./parser');
const promiseUtil = require('../utils/promise');
const Service = require('../utils/service');
const Stream = require('./stream');

/**
 * @private
 *
 * @module eventListener/streamService
 */

class StreamServiceError extends Error {}

const PROTOCOL_RECEIVER = {
    tcp: netService.TCPService,
    udp: netService.DualUDPService
};

class StreamService extends Service {
    /**
     * Constructor
     *
     * @param {integer} port - port to listen on
     * @param {object} [options = {}] - additional options
     * @param {string} [options.address] - address to listen on
     * @param {'buffer' | 'string'} [options.bufferingStrategy] - data buffering strategy
     * @param {logger.Logger} [options.logger] - logger to use instead of default one
     * @param {'buffer' | 'string'} [options.parsingMode] - data parsing mode
     * @param {string[]} [options.protocols = ['tcp', 'udp']] - protocols to use
     * @param {boolean} [options.rawDataForwarding = false] - enable raw data forwarding
     */
    constructor(port, options) {
        options = options || {};
        super(options.logger);

        this.address = options.address;
        this.port = port;
        this.protocols = options.protocols || ['tcp', 'udp'];

        this._bufferingStrategy = options.bufferingStrategy || 'ring';
        this._parsingMode = options.parsingMode || 'buffer';

        this.logger.debug(`parsing mode "${this._parsingMode}", buffering strategy "${this._bufferingStrategy}"`);

        this._dataProcessFunc = processData.bind(this);
        this._onMessageCb = onMessageParsed.bind(this);

        if (options.mode === 'string') {
            this._transform = (chunks) => (chunks.length === 1
                ? chunks[0]
                : chunks.reduce((a, v) => a + v, ''));
        } else {
            this._transform = (chunks) => (chunks.length === 1
                ? chunks[0].toString()
                : chunks.reduce((a, v) => a + v.toString(), ''));
        }
    }

    /**
     * Start Stream service
     *
     * @async
     * @param {function(Error)} onFatalError - callback to call on unexpected errors
     *
     * @returns {Promise} resolved once service started
     */
    _onStart(onFatalError) {
        return new Promise((resolve, reject) => {
            this._onFatalError = onFatalError;
            this._dataFlowEnabled = true;
            this._messageQueue = [];
            this._streams = [];
            this._streamID = 0;

            const streamCb = () => {
                const parser = new Parser(this._onMessageCb, {
                    features: Parser.FEAT_NONE,
                    mode: this._parsingMode
                });
                const stream = new Stream(parser, { strategy: this._bufferingStrategy });
                if (!this._dataFlowEnabled) {
                    stream.disableIngress();
                }
                this._streams.push(stream);
                return stream;
            };
            this._receivers = this.protocols.map((originProtocol) => {
                const protocol = originProtocol.toLowerCase();
                if (!PROTOCOL_RECEIVER[protocol]) {
                    throw new StreamServiceError(`Unknown protocol '${originProtocol}'`);
                }
                return new PROTOCOL_RECEIVER[protocol](
                    streamCb,
                    this.port,
                    {
                        address: this.address,
                        logger: this.logger.getChild(protocol)
                    }
                );
            });

            this._procID = setImmediate(this._dataProcessFunc);

            promiseUtil.allSettled(this._receivers.map((rec) => rec.restart({
                attempts: 10,
                delay: 10 * 1000
            })))
                .then((result) => {
                    promiseUtil.getValues(result);
                    resolve();
                })
                .catch(reject);
        });
    }

    /**
     * Stop Stream service
     *
     * @async
     * @returns {Promise} resolved once service stopped
     */
    _onStop() {
        return new Promise((resolve, reject) => {
            if (!this._receivers) {
                resolve();
            } else {
                this.ee.removeAllListeners('messages');
                if (this._procID) {
                    clearImmediate(this._procID);
                }
                if (this._intervalID) {
                    clearInterval(this._intervalID);
                }
                this._intervalID = this._onFatalError = this._procID = undefined;

                this._streams.forEach((stream) => {
                    stream.close();
                    stream.erase();
                });
                promiseUtil.allSettled(this._receivers.map((rec) => rec.destroy()))
                    .then(promiseUtil.getValues)
                    .then(() => {
                        this._messageQueue = [];
                        this._streams = [];
                        return resolve();
                    })
                    .catch(reject);
            }
        });
    }

    /** Disable data flow */
    disableDataFlow() {
        this.logger.debug('Disabling data flow from receivers');
        this._dataFlowEnabled = false;
        this._streams.forEach((stream) => stream.disableIngress());
    }

    /** Enable data flow */
    enableDataFlow() {
        this.logger.debug('Enabling data flow from receivers');
        this._dataFlowEnabled = true;
        this._streams.forEach((stream) => stream.enableIngress());
    }

    disableRawDataForwarding() {}

    enableRawDataForwarding() {}
}

/**
 * Process all data held by streams
 */
function processData() {
    this._procID = undefined;
    let scheduleInterval = true;

    try {
        if (this._streams.length) {
            const maxTime = 2 * 1e6;
            const bufferMaxTime = maxTime / this._streams.length;
            let activeLen = this._streams.length;
            let streamID = this._streamID;

            const starttime = hrtimestamp() + maxTime;
            while (hrtimestamp() < starttime && activeLen > 0) {
                const stream = this._streams[streamID];
                const flush = stream.closed || stream.lastPushTimeDelta() >= 10 * 1e9;
                let swap = true;

                if (stream.isReady() || (flush && stream.buffers > 0)) {
                    swap = !stream.process(bufferMaxTime, flush)[0];
                }
                if (swap) {
                    if (--activeLen && streamID !== activeLen) {
                        this._streams[streamID] = this._streams[activeLen];
                        this._streams[activeLen] = stream;
                    }
                } else {
                    // simple round-robin
                    streamID = ++streamID % activeLen;
                }
            }

            scheduleInterval = activeLen === 0;

            let streamsLen = this._streams.length;
            for (let i = activeLen; i < streamsLen;) {
                const stream = this._streams[i];
                if (stream.closed && stream.buffers === 0) {
                    stream.erase();
                    this._streams[i] = this._streams[--streamsLen];
                } else {
                    i++;
                }
            }

            if (this._streams.length !== streamsLen) {
                this._streams.length = streamsLen;
            }
        }
    } catch (err) {
        return this._onFatalError(err);
    }

    if (scheduleInterval) {
        this._intervalID = setInterval(() => {
            try {
                if (this._streams.some((stream) => (
                    stream.bytes && (
                        stream.isReady()
                        || stream.closed
                        || stream.lastPushTimeDelta() >= 10 * 1e9
                    )
                ))) {
                    this._procID = setImmediate(this._dataProcessFunc);
                    clearInterval(this._intervalID);
                    this._intervalID = undefined;
                }
            } catch (err) {
                clearInterval(this._intervalID);
                this._onFatalError(err);
            }
        }, 100);
    } else {
        this._procID = setImmediate(this._dataProcessFunc);
    }
}

/** Message parsed
 *
 * @fires messages
 * @param {Buffer[] | string[]} chunks
 */
function onMessageParsed(chunks) {
    this._messageQueue.push(this._transform(chunks));
    if (!this._sendMessageID) {
        this._sendMessageID = setImmediate(() => {
            this.ee.emit('messages', this._messageQueue);
            this._messageQueue = [];
            // clearImmediate(this._sendMessageID);
            delete this._sendMessageID;
        });
    }
}

module.exports = StreamService;
