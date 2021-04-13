
/* * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const baseDataReceiver = require('./baseDataReceiver');
const logger = require('../logger');
const promiseUtil = require('../utils/promise');
const tcpUdpReceiver = require('./tcpUdpDataReceiver');

/** @module MessageStream */

class MessageStreamError extends baseDataReceiver.BaseDataReceiverError {}

/**
 * Data Receiver for messages separated by a new line
 *
 * Note: data may contain multiple events separated by newline
 * however newline chars may also show up inside a given event
 * so split only on newline with preceding double quote.
 * Expected behavior is that every channel (TCP connection)
 * has only particular type of events and not mix of different types.
 * If OneConnect profile will be used for pool then there might be an issue
 * with different event types in single channel but not sure.'
 *
 * @see module:BaseDataReceiverError.BaseDataReceiver
 *
 * @property {String} address - address to listen on
 * @property {Logger} logger - logger instance
 * @property {Number} port - port to listen on
 * @property {Array<String>} protocols - protocols to use
 *
 * @fires MessageStream#messages
 */
class MessageStream extends baseDataReceiver.BaseDataReceiver {
    /**
     * Constructor
     *
     * @param {Number} port - port to listen on
     * @param {Object} [options={}] - additional options
     * @param {String} [options.address] - address to listen on
     * @param {Logger} [options.logger] - logger to use instead of default one
     * @param {Array<String>} [options.protocols=['tcp', 'udp']] - protocols to use
     */
    constructor(port, options) {
        super();
        options = options || {};
        this.address = options.address;
        this.logger = (options.logger || logger).getChild('messageStream');
        this.port = port;
        this.protocols = options.protocols || ['tcp', 'udp'];
    }

    /**
     * Create internal receivers
     */
    createReceivers() {
        this._receivers = this.protocols.map((originProtocol) => {
            const protocol = originProtocol.toLowerCase();
            if (!this.constructor.PROTOCOL_RECEIVER[protocol]) {
                throw new MessageStreamError(`Unknown protocol '${originProtocol}'`);
            }
            const receiver = new this.constructor.PROTOCOL_RECEIVER[protocol](
                this.port,
                {
                    address: this.address,
                    logger: this.logger.getChild(protocol)
                }
            );
            receiver.on('data', (data, connKey) => dataHandler.call(this, protocol, data, connKey));
            return receiver;
        });
        this._dataBuffers = {};
    }

    /**
     * Check if has any internal receivers
     *
     * @returns {Boolean}
     */
    hasReceivers() {
        return this._receivers && this._receivers.length > 0;
    }

    /**
     * Start receiver
     *
     * @async
     * @returns {Promise} resolved once receiver started
     */
    startHandler() {
        if (!this.hasState(this.constructor.STATE.STARTING)) {
            return Promise.reject(this.getStateTransitionError(this.constructor.STATE.STARTING));
        }
        this.createReceivers();
        return promiseUtil.allSettled(this._receivers.map(receiver => receiver.start()))
            .then(promiseUtil.getValues);
    }

    /**
     * Stop receiver
     *
     * @async
     * @returns {Promise} resolved once receiver stopped
     */
    stopHandler() {
        if (!this.hasReceivers()) {
            return Promise.resolve();
        }
        return promiseUtil.allSettled(this._receivers.map(receiver => receiver.destroy()))
            .then((statuses) => {
                this._dataBuffers = null;
                this._receivers = null;
                return promiseUtil.getValues(statuses);
            });
    }
}

/**
 * Length of buffer for each connection. When amount of data stored in buffer
 * is higher than threshold then even incomplete data will be flushed
 *
 * @type {Integer}
 */
MessageStream.MAX_BUFFER_SIZE = 16 * 1024; // 16k chars

/**
 * Number of time a timeout for particular buffer can be reset before
 * flushing all data
 *
 * @type {Integer}
 */
MessageStream.MAX_BUFFER_NUM_TIMEOUTS = 5;

/**
 * Buffer timeout
 *
 * @type {Integer}
 */
MessageStream.MAX_BUFFER_TIMEOUT = 10 * 1000; // 10 sec.

/**
 * Max percent of unparsed data that still allows to reset buffer timeout
 */
MessageStream.MAX_UNPARSED_DATA_CAP = 0.7;

/**
 * Number of chars that string with open quote can contain before it will be
 * treated as malformed message. In other words this parameter declares how
 * many chars single field can contain.
 *
 * @type {Integer}
 */
MessageStream.MAX_OPEN_QUOTE_SIZE = 512;

/**
 * Map protocol to its implementation
 */
MessageStream.PROTOCOL_RECEIVER = {
    tcp: tcpUdpReceiver.TCPDataReceiver,
    udp: tcpUdpReceiver.DualUDPDataReceiver
};

/**
 * PRIVATE METHODS
 */
/**
 * Data handler
 *
 * @this MessageStream
 * @param {String} proto - protocol
 * @param {Buffer} data - data to process
 * @param {String} senderKey - sender's unique key
 */
function dataHandler(proto, data, senderKey) {
    data = data.toString();
    senderKey = `${proto}-${senderKey}`;
    let bufferInfo = this._dataBuffers[senderKey];

    if (bufferInfo) {
        data = bufferInfo.data + data;
        // cleanup timeout to avoid dups
        if (bufferInfo.timeoutID) {
            clearTimeout(bufferInfo.timeoutID);
        }
    }
    const lengthBefore = data.length;
    data = extractMessages.call(this, data);

    if (data.length >= this.constructor.MAX_BUFFER_SIZE
        || (bufferInfo && bufferInfo.timeoutNo >= this.constructor.MAX_BUFFER_NUM_TIMEOUTS)) {
        data = extractMessages.call(this, data, true);
    }
    // if we have incomplete data to buffer
    if (data) {
        if (!bufferInfo) {
            bufferInfo = { timeoutNo: 1 };
            this._dataBuffers[senderKey] = bufferInfo;
        } else if (data.length / lengthBefore < this.constructor.MAX_UNPARSED_DATA_CAP) {
            bufferInfo.timeoutNo = 1;
        }
        bufferInfo.data = data;
        bufferInfo.timeoutNo += 1;
        bufferInfo.timeoutID = setTimeout(() => {
            delete this._dataBuffers[senderKey];
            extractMessages.call(this, bufferInfo.data, true);
        }, this.constructor.MAX_BUFFER_TIMEOUT);
    } else {
        delete this._dataBuffers[senderKey];
    }
}

/**
 * Split data received by Event Listener into events
 *
 * Valid separators are:
 * - \n
 * - \r\n
 *
 * - If line separator(s) enclosed with quotes then it will be ignored.
 * - If last line has line separator(s) and opened quote but no closing quote then
 *   this line will be splitted into multiple lines
 * - When line has an opening quote and no closing quote and field's size is >= MAX_OPEN_QUOTE_SIZE
 *   then line will be splitted into multiple lines too
 *
 * @this MessageStream
 * @param {String} data - data
 * @param {Boolean} [incomplete = false] - when some data left treat it as complete message
 *
 * @returns {String} incomplete data
 *
 * @fires MessageStream#messages
 */
function extractMessages(data, incomplete) {
    let backSlashed = false;
    let char;
    let forceSplit = false;
    let idx = 0;
    // never be zero because it should be preceded by quote
    // so, we can use 0 as 'false'
    let newlineClosestToOpenQuotePos = 0;
    let openQuotePos;
    let quoted = '';
    let startIdx = 0;
    const lines = [];

    for (;idx < data.length; idx += 1) {
        char = data[idx];
        if (char === '\\') {
            backSlashed = !backSlashed;
            // eslint-disable-next-line no-continue
            continue;
        } else if (char === '"' || char === '\'') {
            if (backSlashed) {
                backSlashed = false;
                // eslint-disable-next-line no-continue
                continue;
            }
            if (!quoted) {
                // reset value, this new line is invalid now (before quote starts)
                newlineClosestToOpenQuotePos = 0;
                quoted = char;
                openQuotePos = idx;
            } else if (quoted === char) {
                // reset value, this new line is invalid now (between quotes)
                newlineClosestToOpenQuotePos = 0;
                quoted = '';
                openQuotePos = null;
            }
        } else if (char === '\n' || (char === '\r' && data[idx + 1] === '\n') || forceSplit) {
            if (!(newlineClosestToOpenQuotePos || forceSplit)) {
                // remember new line pos if not set yet
                newlineClosestToOpenQuotePos = idx;
            }
            if (!quoted || forceSplit) {
                lines.push(data.slice(startIdx, idx));
                if (!forceSplit) {
                    // jump to next char
                    idx = char === '\r' ? (idx + 1) : idx;
                    startIdx = idx + 1;
                } else {
                    startIdx = idx;
                }
                // reset value, this new line is invalid now
                newlineClosestToOpenQuotePos = 0;
            }
            forceSplit = false;
        } else if (quoted && idx - openQuotePos >= this.constructor.MAX_OPEN_QUOTE_SIZE) {
            // let's say a quote was opened and we are far away from the beginning of a chunk
            // and still no closing quote - probably message was malformed. What we can do is
            // (force) split data using position of a newline sequence closest to the open quote
            // or by position of open quote
            if (newlineClosestToOpenQuotePos) {
                idx = newlineClosestToOpenQuotePos - 1;
            } else {
                idx = openQuotePos;
                forceSplit = true;
            }
            quoted = '';
            openQuotePos = null;
        }
        backSlashed = false;
    }
    // idx > startIdx - EOL reached earlier
    // idx <= startIdx - EOL reached and line separator was found
    if (incomplete && startIdx < data.length && idx > startIdx) {
        // looks like EOL reached, so we have to check last line
        const lastLine = data.slice(startIdx);
        if (openQuotePos === null) {
            lines.push(lastLine);
        } else {
            // quote was opened and not closed
            // might worth to check if there are new line separators
            openQuotePos -= startIdx;
            const leftPart = lastLine.slice(0, openQuotePos);
            const rightParts = lastLine.slice(openQuotePos).split(/\n|\r\n/);
            lines.push(leftPart + rightParts[0]);
            rightParts.forEach((elem, elemId) => elem && elemId && lines.push(elem));
        }
        data = '';
    }
    this.safeEmitAsync('messages', lines);
    return data.length ? data.slice(startIdx) : data;
}

module.exports = {
    MessageStream,
    MessageStreamError
};

/**
 * Messages event
 *
 * @event MessageStream#messages
 * @param {Array<String>} messages - array of received messages
 */
