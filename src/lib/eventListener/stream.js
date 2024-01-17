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

/* eslint-disable no-cond-assign, no-unused-expressions, no-use-before-define */
/* eslint-disable no-multi-assign, no-plusplus, no-var, one-var, one-var-declaration-per-line */

const assignDefaults = require('../utils/misc').assignDefaults;
const CircularLinkedList = require('../utils/structures').CircularLinkedList;
const constants = require('../constants').EVENT_LISTENER;
const hrtimestamp = require('../utils/datetime').hrtimestamp;

/** @module eventListener/stream */

// keeping a buffer that comes from V8 C/C++ layer for a long time
// is too expensive because it cause memory fragmentation.
// As result RSS will grow and unlikely to shrink over the time.
// Do toString() convertion to move buffer data to V8 Heap
// because V8 GC is pretty active and once Heap reduced
// there is higher chance RSS will be reduced too.

/**
 * Stream Class
 *
 * @property {integer} maxPendingBytes - max number of pending bytes to feed to the parser
 * @property {'drop' | 'ring'} strategy - data strategy to use on high memory pressure
 *
 * Strategies:
 * - 'ring' - use ring buffer, old data will be overriden by a new one when 'ring' enabled
 * - 'drop' - simply drop data
 */
class Stream {
    /**
     * @param {Parser} parser - Parser instance to parse data
     * @param {object} [options] - options
     * @param {integer} [options.maxPendingBytes = STREAM_MAX_PENDING_BYTES] -
     *      max number of pending bytes to feed to the parser
     * @param {'drop' | 'ring'} [options.strategy = 'ring'] - data strategy to use on high memory pressure
     */
    constructor(parser, options) {
        options = assignDefaults(options, {
            maxPendingBytes: constants.STREAM_MAX_PENDING_BYTES,
            strategy: constants.STREAM_STRATEGY
        });

        Object.defineProperties(this, {
            maxPendingBytes: {
                value: options.maxPendingBytes
            },
            mode: {
                value: parser.mode
            },
            strategy: {
                value: options.strategy
            }
        });

        this._bytes = 0;
        this._closed = false;
        this._parser = parser;
        this._lastProcessTimestamp = hrtimestamp();
        this._lastPushTimestamp = hrtimestamp();
        this._length = 0;
        this._ringBuffer = new CircularLinkedList();

        this._transform = this._parser.mode === 'string'
            ? (buffer) => buffer.toString()
            : (buffer) => buffer;

        // eslint-disable-next-line
        this._strategy = Strategy.create(
            this,
            this.strategy === 'ring' ? ringBufferStrategy : dataDropStrategy
        );
    }

    /** @return {integer} total number of buffers held by stream and parser */
    get buffers() {
        return this._ringBuffer.length + this._parser.buffers;
    }

    /** @return {integer} total number of bytes held by stream and parser */
    get bytes() {
        return this._bytes + this._parser.bytes;
    }

    /** @returns {boolean} true if no more input data expected */
    get closed() {
        return this._closed;
    }

    /** @return {integer} total number of bytes/chars held by stream and parser */
    get length() {
        return this._length + this._parser.length;
    }

    /** Closes stream, all new data ignored */
    close() {
        this._closed = true;
    }

    /** Reject ingress dat */
    disableIngress() {
        this._strategy.applyLimits();
    }

    enableIngress() {
        this._strategy.cancelLimits();
    }

    erase() {
        this._parser.erase();
        this._ringBuffer.erase();
        this._bytes = this._length = 0;
    }

    /** @returns {integer} number of ns. since last .process() call */
    lastProcessTimeDelta() {
        return hrtimestamp() - this._lastProcessTimestamp;
    }

    /** @returns {integer} number of ns. since last .push() call */
    lastPushTimeDelta() {
        return hrtimestamp() - this._lastPushTimestamp;
    }

    /**
     * Process pending data
     *
     * @param {integer} [timeLimit = Number.POSITIVE_INFINITY] - max time to spend on data processing (in nanoseconds)
     * @param {boolean} [flush = false] - flush incomplete data
     *
     * @returns {[boolean, integer, integer]} tuple with 3 elemetns:
     *  - first item set to true if there is still pending data to process - some data left or incomplete message found
     *  - second item is amount of time in ns. spent to parse data
     *  - third item is amount of time in ns. spent to parse data and do cleanup
     */
    process(timeLimit, flush) {
        return this._strategy.process(timeLimit, flush);
    }

    /** @param {Buffer} data to push */
    push(buffer) {
        !this._closed && buffer.length && this._strategy.push(buffer);
    }

    /** @returns {boolean} true if stream has enough data to start/continue processing it */
    isReady() {
        return this._ringBuffer.length > 0 || this._parser.isReady();
    }
}

/**
 * Strategy class
 */
class Strategy {
    /**
     * @param {Parser} delegate
     * @param {function} onInit - on strategy init
     * @param {function} onLimits - apply resource limits
     * @param {function} offLimits - cancel resource limits
     * @param {function(Buffer)} onData - on data
     * @param {function(integer, boolean)} onProcess - process data
     */
    constructor(delegate, onInit, onLimits, offLimits, onData, onProcess) {
        this.delegate = delegate;
        this.offLimits = offLimits.bind(this);
        this.onData = onData.bind(this);
        this.onLimits = onLimits.bind(this);
        this.onProcess = onProcess.bind(this);
        onInit.call(this);
    }

    /** Apply resource limits */
    applyLimits() {
        this.onLimits();
    }

    /** Cancel limits */
    cancelLimits() {
        this.offLimits();
    }

    /** @param {Buffer} data - data to push */
    push(data) {
        this.onData(data);
    }

    /**
     * @param {integer} timeLimit - time limit
     * @param {boolean} flush - flush incomplete messages
     *
     * @returns {[boolean, integer, integer]}
     */
    process(timeLimit, flush) {
        return this.onProcess(timeLimit, flush);
    }
}

/**
 * Create Strategy instance
 *
 * @param {Stream} stream
 * @param {IStrategy} strategy - strategy implementation
 *
 * @returns {Strategy}
 */
Strategy.create = (stream, strategy) => new Strategy(
    stream,
    strategy.onInit,
    strategy.onLimits,
    strategy.offLimits,
    strategy.onData,
    strategy.onProcess
);

/**
 * Process pending data
 *
 * @param {integer} [timeLimit = Number.POSITIVE_INFINITY] - max time to spend on data processing (in nanoseconds)
 * @param {boolean} [flush = false] - flush incomplete data
 *
 * @returns {[boolean, integer, integer]} tuple with 3 elemetns:
 *  - first item set to true if there is still pending data to process - some data left or incomplete message found
 *  - second item is amount of time in ns. spent to parse data
 *  - third item is amount of time in ns. spent to parse data and do cleanup
 */
function processData(timeLimit, flush) {
    var atLeastOne;
    var delegate = this.delegate;
    var emptyData = this.emptyData;
    var parser = this.delegate._parser;
    var freeBuffers = parser.freeBuffers;
    var payload;
    var result;
    var ringBuffer = this.delegate._ringBuffer;

    if (this.finishBuffered) {
        // data flow interupted, matter if parser waiting for more data,
        // it should flush all data, before proceeding with new data
        result = parser.process(timeLimit, true);
        if (result[0]) {
            // data left to process
            delegate._lastProcessTimestamp = hrtimestamp();
            return result;
        }

        timeLimit -= result[2];
        this.finishBuffered = false;
    }

    if (freeBuffers) {
        // don't want to override pending data
        freeBuffers = Math.min(freeBuffers, ringBuffer.length);
        atLeastOne = !parser.isReady();

        while (freeBuffers-- && (atLeastOne || parser.bytes < delegate.maxPendingBytes)) {
            atLeastOne = false;
            payload = ringBuffer.pop();
            if (payload === emptyData) {
                this.finishBuffered = true;
                break;
            }
            delegate._bytes -= payload[1];
            delegate._length -= payload[0].length;
            parser.push(payload);
        }
    } else {
        // force flush if no space left
        flush = true;
    }

    result = parser.process(timeLimit, delegate._closed || flush);
    result[0] = result[0] || ringBuffer.length > 0;

    delegate._lastProcessTimestamp = hrtimestamp();
    return result;
}

/**
 * Buffer Ring stategy funcs
 *
 * @implements {IStrategy}
 */
const ringBufferStrategy = {
    onProcess: processData,
    onData(data) {
        var delegate = this.delegate;
        var discarded;
        var payload = [delegate._transform(data), data.length];
        var ringBuffer = delegate._ringBuffer;
        var ringLength = ringBuffer.length;

        discarded = ringBuffer.push(payload);
        delegate._bytes += payload[1];
        delegate._length += payload[0].length;
        delegate._lastPushTimestamp = hrtimestamp();

        if (discarded) {
            delegate._bytes -= discarded[1];
            delegate._length -= discarded[0].length;
        }
        if (discarded || (ringBuffer.ring && delegate._bytes > this.maxBytes)) {
            // to be on par with memory pressure
            // need to release same amount of data as pushed.
            // Parser should flush all data it has at the moment.
            this.finishBuffered = true;
            while (--ringLength && delegate._bytes > this.maxBytes && (discarded = ringBuffer.pop())) {
                delegate._bytes -= discarded[1];
                delegate._length -= discarded[0].length;
            }
        }
    },
    onInit() {
        this.finishBuffered = false;
    },
    onLimits() {
        this.maxBytes = this.delegate.bytes;
        this.delegate._ringBuffer.enableRing(this.delegate._ringBuffer.length || 1);
    },
    offLimits() {
        this.delegate._ringBuffer.disableRing(true);
    }
};

/**
 * Data Drop stategy funcs
 *
 * @implements {IStrategy}
 */
const dataDropStrategy = {
    onProcess: processData,
    onData(data) {
        var delegate, payload;
        if (this.acceptData) {
            delegate = this.delegate;
            payload = [delegate._transform(data), data.length];
            delegate._bytes += payload[1];
            delegate._length += payload[0].length;
            delegate._ringBuffer.push(payload);
            delegate._lastPushTimestamp = hrtimestamp();
        }
    },
    onInit() {
        this.acceptData = true;
        this.finishBuffered = false;
        this.emptyData = [this.delegate._transform(''), 0];
    },
    onLimits() {
        var ringBuffer = this.delegate._ringBuffer;
        this.acceptData = false;
        if (ringBuffer.length && ringBuffer.fpeak() !== this.emptyData) {
            ringBuffer.push(this.emptyData);
        }
    },
    offLimits() {
        this.acceptData = true;
    }
};

module.exports = Stream;

/**
 * @typedef IStrategy
 * @type {object}
 * @property {function} onInit - on strategy init
 * @property {function} onLimits - apply resource limits
 * @property {function} offLimits - cancel resource limits
 * @property {function(Buffer)} onData - on data
 * @property {function(integer, boolean)} onProcess - process data
 */
