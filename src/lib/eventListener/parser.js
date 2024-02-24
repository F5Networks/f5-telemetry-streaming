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

/* eslint-disable no-continue, no-multi-assign, no-plusplus, no-unused-expressions */
/* eslint-disable no-use-before-define, no-var, vars-on-top, no-bitwise */
/* eslint-disable no-nested-ternary, no-cond-assign, no-return-assign */

const assignDefaults = require('../utils/misc').assignDefaults;
const constants = require('../constants').EVENT_LISTENER;
const hrtimestamp = require('../utils/datetime').hrtimestamp;
const CircularArray = require('../utils/structures').CircularArray;

/** @module eventListener/parser */

/**
 * TODO: perf tests
 * - Linked List vs Array
 * - Slow Buffer vs Buffer
 */

/**
 * DEV NOTES:
 *
 * THIS IS THE CORE OF EVENT LISTNER MODULE. BE CAREFUL WITH CHANGING/UPDATING IT
 * EVEN A SMALL CHANGE MAY RESULT IN SIGNIFICANT SLOWDOWN DUE V8 NATURE
 *
 * - original naive implementation takes about 4+ seconds to parse 145MB
 *
 * - buffer is more performant than string (Apple M1 Pro)
 *   - buffer may result in external memory grow/fragmentation if held for too long
 *   - Parser's perf stats:
 *     - v4.8.0 - 1.5sec, - 100 MByte/s
 *     - v8.11.1 - 14.x - 600, - 245 MByte/s
 *     - v16 - 21.x - 441ms - 334 MByte/s
 * - string is slower (x1.5-2 times) but no external memory grow/fragmentation (Apple M1 Pro)
 *   - Parser's perf stats:
 *     - v4.8.0 - 1.5sec, - 96 MByte/s
 *     - v8.11.1 - 1.1sec, - 132 MByte/s
 *     - v12.x - 14.x -  173 MByte/s
 *     - v16 - 21.x - 441ms - 334 MByte/s
 * - V8 optimizations:
 *   - monomorphic structures
 *   - instances re-use
 *   - functions opt/deopt logs from V8
 *   - pre-compute if possible
 *   - less `this` (??)
 *
 * `=,` search and `$F5` check adds +0.2-0.3 sec. but it saves more time
 * down the pipeline
 *
 * Update this file/code only in case of bug or beter solution/optiimzation found.
 * Run benchmark(s) and see opt/deopt logs by using following node.js flags:
 * --turbo_profiling --print_deopt_stress --code_comments --trace_opt --trace_deopt
 *
 * Even small function may help to gain perf - try to move code to funcs:
 * smaller funcs are easier to optimize
 */

// Character codes
var CC_BS = '\\'.charCodeAt(0);
var CC_CM = ','.charCodeAt(0);
var CC_CR = '\r'.charCodeAt(0);
var CC_DQ = '"'.charCodeAt(0);
var CC_EM = '\0'.charCodeAt(0);
var CC_EQ = '='.charCodeAt(0);
var CC_NL = '\n'.charCodeAt(0);
var CC_SQ = '\''.charCodeAt(0);

// ASCII len === UTF-8 len
var F5_FCAT_LEN = Buffer.from('$F5TelemetryEventCategory').length; // pre-compute for `if` statement down below
var F5_SCAT_DS = '$'.charCodeAt(0);
var F5_SCAT_LF = 'F'.charCodeAt(0);
var F5_SCAT_NOT_FOUND = 0b001; // 1 - nothing found yet
var F5_SCAT_FOUND = 0b000; // 0 - $F found
var F5_ECAT_DEFAULT_STATE_IDX = 2;
var F5_ECAT_STATE_IDX = 0;
var F5_ECAT_OFFSET_IDX = 1;

// KV Pairs states and variables
var KV_DISABLED = 0b0000; //    0b0000 - 0 - feature disabled
var KV_FULL = 0b0001; //        0b0001 - 1 - number of pairs exceeded the limit
var KV_NOT_FOUND = 0b0100; //   0b0100 - 4 - next pair not found
var KV_FOUND = 0b0110; //       0b0110 - 6 - `=` found
var KV_INVALID_SEQ = 0b1000; // 0b1000 - 8 - invalid sequence

var KV_DEFAULT_STATE_IDX = 0; // item at index stores default state
var KV_STATE_IDX = 1; // item at index stores current state
var KV_OFFSET_IDX = 2; // item at index stores current offset
var KV_MAX_OFFSET_IDX = 8; // item at index stores max allowed offset
var KV_RESERVED_IDX = 3; // item at index stores number of revserved elems

// max unsiged 16 bit int
var MAX_UINT16 = 64 * 1024;

// parser flag features
var FEAT_NONE = 0b000; // 0 - no features
var FEAT_F5_EVT_CAT = 0b001; // 1 - $F scan
var FEAT_KV_PAIRS = 0b010; // 2 - key-value pairs scan
var FEAT_ALL = FEAT_NONE
    | FEAT_F5_EVT_CAT
    | FEAT_KV_PAIRS;

// NOTE: everything above is ASCII -> no issues with UTF-8

/**
 * Parser Class
 *
 * Parses messages separated by new line chars.
 * Also does non-strict matching for $F5TelemetryEventCategory keyword.
 * Also does colloecting info about `=` and `,` symbols outside of quotes.
 *
 * NOTE:
 * Parser uses only ASCII chars to search for data, so any encoding
 * with first 127-ASCII chars should work.
 * ASCII strings (1-bytes) are faster than UTF-8 strings (2+ bytes)
 *
 * NOTE:
 * due the way how node.js encode/decode UTF-8 I was not able to
 * find a reliable way to calculate number of UxFFFD substitutions
 * for invalid bytes. As result offsets for `=` and etc. in UTF-8
 * strings may be incorrect.
 * - use `buffer` mode or `ascii` or `binary` encoding for strings
 * - update Pointer class with appropriate logic for UxFFFD calculations
 *
 * there is no sense to collect any info about offsets, because it may change
 * after conversion from buffer to string (requires to calculate
 * all UTF-8 bytes and check for errors)
 *
 * NOTE:
 * data may contain multiple events separated by newline
 * however newline chars may also show up inside a given event
 * so split only on newline with preceding double quote.
 * Expected behavior is that every channel (TCP connection)
 * has only particular type of events and not mix of different types.
 * If OneConnect profile will be used for pool then there might be an issue
 * with different event types in single channel but not sure.'
 *
 * @property {'buffer' | 'string'} mode - processing mode
 * @property {integer} maxSize - max message size (bytes (buffer) or chars (string))
 */
class Parser {
    /**
     * @param {OnLineFoundCb} callback - callback
     * @param {object} [options] - options
     * @param {integer} [options.bufferPrealloc = PARSER_PREALLOC] - number of buffer's items to preallocate
     * @param {integer} [options.bufferSize = PARSER_MAX_MSG_SIZE + 1] - number of max buffer's items
     * @param {integer} [options.features = FEAT_ALL] - processing features, by default all enabled
     * @param {integer} [options.maxKVPairs = PARSER_MAX_KV_PAIRS] - max number of key=value pairs per message
     * @param {integer} [options.maxSize = PARSER_MAX_MSG_SIZE] - max message size (bytes (buffer) or chars (string))
     * @param {'buffer' | 'string'} [options.mode = 'buffer'] - processing mode
     */
    constructor(callback, options) {
        options = assignDefaults(options, {
            bufferPrealloc: constants.PARSER_PREALLOC,
            /**
             * Buffer max size is the same as MAX_MSG_SIZE + 1
             * in case when input Buffers has 1 char/byte only
             */
            bufferSize: constants.PARSER_MAX_MSG_SIZE + 1,
            features: FEAT_ALL,
            maxKVPairs: constants.PARSER_MAX_KV_PAIRS,
            maxSize: constants.PARSER_MAX_MSG_SIZE,
            mode: constants.PARSER_MODE
        });

        const pointerCls = options.mode === 'string' ? StringPointer : BufferPointer;

        /** read-only static properties */
        Object.defineProperties(this, {
            features: {
                value: options.features
            },
            maxKVPairs: {
                value: options.maxKVPairs
            },
            maxSize: {
                value: options.maxSize
            },
            mode: {
                value: options.mode
            }
        });

        this._bytes = this._length = 0;
        this._buffers = new CircularArray({
            fill: pointerCls.BUFFER_FILLER,
            prealloc: options.bufferPrealloc,
            size: options.bufferSize
        });
        this._cb = callback;
        this._state = new State(pointerCls, this);
    }

    /** @returns {integer} number of pending buffers */
    get buffers() {
        return this._buffers.length;
    }

    /** @returns {integer} size of pending data in bytes */
    get bytes() {
        return this._bytes;
    }

    /** @returns {boolean} true if $F scan enabled */
    get featF5EvtCategory() {
        return !!(this.features & FEAT_F5_EVT_CAT);
    }

    /** @returns {boolean} true if key=value scan enabled */
    get featKVPairs() {
        return !!((this.features & FEAT_KV_PAIRS) && this.maxKVPairs);
    }

    /** @returns {number} number of free buffers */
    get freeBuffers() {
        return this._buffers.size - this._buffers.length;
    }

    /**
     * @returns {integer} total length of pending data in chars (string) or bytes (buffer)
     */
    get length() {
        return this._length;
    }

    /** Erase all data, can not be used after that anymore */
    erase() {
        this._buffers.erase({ size: 1 });
        this._state.erase();
        this._bytes = this._length = 0;
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
    process() {
        var timeLimit = Number.POSITIVE_INFINITY;
        var flush = false;

        if (arguments.length > 0) {
            if (typeof arguments[0] === 'boolean') {
                flush = arguments[0];
            } else if (typeof arguments[0] === 'number'
                && Number.isSafeInteger(arguments[0])
                && arguments[0] > 0
            ) {
                timeLimit = arguments[0];
            }
            if (arguments.length > 1) {
                flush = !!arguments[1];
            }
        }
        return (this.isReady() || (flush && this.buffers > 0))
            ? splitLines.call(this, timeLimit, flush)
            : [this.buffers > 0, 0, 0];
    }

    /**
     * Add data to the parser
     *
     * NOTE: method does not check data length
     *
     * @param {[Buffer | string, integer]} payload
     */
    push(payload) {
        this._bytes += payload[1];
        this._length += payload[0].length;
        this._buffers.push(payload);
    }

    /**
     * @returns {boolean} true if parser is ready to process pending chunks of data or
     *  false when no pending data or found incomplete message and waiting for more data
     */
    isReady() {
        this._state.refresh();
        return this.buffers > 0 && !this._state.pRight.endOfData();
    }
}

/**
 * State Class
 *
 * Stores parser's curent state
 */
class State {
    /** @param {Object} PointerCls - class to use to create pointers */
    constructor(PointerCls, parser) {
        this.backSlash = false;

        // Uint16Array allows to store indexes up to 65535
        // Uint32Array allows to store indexes for long lines

        this.eventCategory = new (
            parser.maxSize <= MAX_UINT16 ? Uint16Array : Uint32Array
        )(3);
        this.eventCategory[F5_ECAT_OFFSET_IDX] = 0;
        this.eventCategory[F5_ECAT_DEFAULT_STATE_IDX] = parser.featF5EvtCategory ? F5_SCAT_NOT_FOUND : F5_SCAT_FOUND;
        this.eventCategory[F5_ECAT_STATE_IDX] = this.eventCategory[F5_ECAT_DEFAULT_STATE_IDX];

        // - buffer to store positions of special symbols that
        //   speed up data processing later down the pipeline
        // - uint16 for small buffers
        // - uint32 for large buffers to be able to store values 2^16 ++
        // - mult. by 2 because `=` and `,` need to be stored for each pair
        var maxKVSize = (parser.featKVPairs ? (parser.maxKVPairs * 2) : 0) + 9;
        this.kvSymbols = new this.eventCategory.constructor(maxKVSize);
        this.kvSymbols[KV_RESERVED_IDX] = this.kvSymbols[KV_OFFSET_IDX] = 8; // number reserved cells and start index
        this.kvSymbols[KV_DEFAULT_STATE_IDX] = parser.featKVPairs ? KV_NOT_FOUND : KV_DISABLED;
        this.kvSymbols[KV_STATE_IDX] = this.kvSymbols[KV_DEFAULT_STATE_IDX]; // current state
        this.kvSymbols[KV_MAX_OFFSET_IDX] = maxKVSize - 1;
        this.kvSymbols[KV_NOT_FOUND] = CC_EQ; // 4 - searcing for `=`
        this.kvSymbols[KV_NOT_FOUND + 1] = KV_FOUND; // 5 - `=` found - next state 6
        this.kvSymbols[KV_FOUND] = CC_CM; // 6 - searching for `,`
        this.kvSymbols[KV_FOUND + 1] = KV_NOT_FOUND; // 7 - `=` found - next state 4

        this.pointerCls = PointerCls;
        this.prevChar = CC_EM;

        /** Create all pointers with stub buffer obj - helps V8 to optimize */
        this.pLeft = new PointerCls(PointerCls.BUFFER_STUB, 0);
        this.pNewLine = new PointerCls(PointerCls.BUFFER_STUB, 0);
        this.pQuote = new PointerCls(PointerCls.BUFFER_STUB, 0);
        this.pRight = new PointerCls(PointerCls.BUFFER_STUB, 0);
        this.pValidNewLine = new PointerCls(PointerCls.BUFFER_STUB, 0);
    }

    /** @param {Parser} parser */
    erase() {
        this.backSlash = false;
        this.eventCategory[F5_ECAT_STATE_IDX] = this.eventCategory[F5_ECAT_DEFAULT_STATE_IDX];
        this.eventCategory[F5_ECAT_OFFSET_IDX] = 0;
        this.kvSymbols[KV_OFFSET_IDX] = this.kvSymbols[KV_RESERVED_IDX];
        this.kvSymbols[KV_STATE_IDX] = this.kvSymbols[KV_DEFAULT_STATE_IDX];
        this.prevChar = CC_EM;
        /**
         * - create all pointers with stub buffer obj - helps V8 to optimize
         * - reuse all pointers - helps V8 to optimize
         * - using X_STUB helps to trick .isReady():
         *   once new data added then parser.buffers > 0 and pointer with stub
         *   always points to the begining of data - ready to process
         */
        this.pLeft.init(this.pointerCls.BUFFER_STUB, 0);
        this.pNewLine.init(this.pointerCls.BUFFER_STUB, 0);
        this.pQuote.init(this.pointerCls.BUFFER_STUB, 0);
        this.pRight.init(this.pointerCls.BUFFER_STUB, 0);
        this.pValidNewLine.init(this.pointerCls.BUFFER_STUB, 0);
    }

    refresh() {
        this.pLeft.refresh();
        this.pNewLine.refresh();
        this.pQuote.refresh();
        this.pRight.refresh();
        this.pValidNewLine.refresh();
    }
}

/**
 * Pointer Class
 *
 * @property {Buffer | string} buffer - data to read
 * @property {integer} bufferLen - buffer's length
 * @property {integer} bufferOffset - pointer's position relative to the current buffer, starts from 1
 * @property {integer} bufferNo - buffer's index relative to the start buffer
 * @property {CircularArray} cArr - array of buffers/string
 * @property {integer} cArrIdx - item's index in array of buffers/string
 * @property {integer} endIdx - `cArr` end index
 * @property {boolean} isFree - true if pointer is freed and allowed to be reused
 * @property {integer} msgOffset - pointer's position relative to the current message, starts from 1
 * @property {integer} startIdx - `cArr` start index
 */
class Pointer {
    /**
     * @param {CircularArray} cArr - array with buffers/strings
     * @param {integer} cArrIdx - item's index in array of buffers/string
     */
    constructor(cArr, cArrIdx) {
        this.init(cArr, cArrIdx);
    }

    /** @param {Pointer} dst - copy the pointer to destination `dst` */
    copy(dst) {
        dst.buffer = this.buffer;
        dst.bufferLen = this.bufferLen;
        dst.bufferOffset = this.bufferOffset;
        dst.bufferNo = this.bufferNo;
        dst.cArr = this.cArr;
        dst.cArrIdx = this.cArrIdx;
        dst.endIdx = this.endIdx;
        dst.isFree = this.isFree;
        dst.msgOffset = this.msgOffset;
        dst.startIdx = this.startIdx;
    }

    /** @returns {boolean} true if the pointer moved 1 step back or false if points to start of data already */
    dec() {
        if (this.bufferOffset === 1) {
            if (this.cArrIdx === this.startIdx) {
                return false;
            }
            this.bufferNo--;
            this.cArrIdx = this.cArr.prevIdx(this.cArrIdx);
            this.buffer = this.cArr.peak(this.cArrIdx)[0];
            this.bufferLen = this.buffer.length;
            this.bufferOffset = this.bufferLen + 1;
        }
        this.bufferOffset--;
        this.msgOffset--;
        return true;
    }

    /** @returns {boolean} true if end of data reached */
    endOfData() {
        return this.cArr.endIdx === this.cArrIdx && this.bufferLen === this.bufferOffset;
    }

    /** @returns {boolean} true if the pointer moved 1 step forward or false if points to end of data already */
    inc() {
        if (this.bufferLen === this.bufferOffset) {
            if (this.endIdx === this.cArrIdx) {
                return false;
            }
            this.bufferNo++;
            this.cArrIdx = this.cArr.nextIdx(this.cArrIdx);
            this.buffer = this.cArr.peak(this.cArrIdx)[0];
            this.bufferLen = this.buffer.length;
            this.bufferOffset = 0;
        }
        this.bufferOffset++;
        this.msgOffset++;
        return true;
    }

    /**
     * Initialize pointer
     *
     * @param {CircularArray} cArr - array with buffers/strings
     * @param {integer} cArrIdx - item's index in array of buffers/string
     */
    init(cArr, cArrIdx) {
        this.buffer = cArr.peak(cArrIdx)[0];
        this.bufferLen = this.buffer.length;
        this.bufferOffset = 0;
        this.bufferNo = 0;
        this.cArr = cArr;
        this.cArrIdx = cArrIdx;
        this.isFree = true;
        this.msgOffset = 0;
        this.refresh();
    }

    /** Update cached data */
    refresh() {
        this.endIdx = this.cArr.endIdx;
        this.startIdx = this.cArr.startIdx;
    }
}

/**
 * Buffer Pointer Class
 *
 * NOTE: should be used to parse data stored in Buffer(s)
 */
class BufferPointer extends Pointer {
    /** @returns {integer} value in range between 0x00 and 0xFF (hex) or 0 and 255 (decimal). */
    value() {
        // access by index is really fast
        return this.buffer[this.bufferOffset - 1];
    }
}

/**
 * Buffer 'fill' value. Should 100% mimic shape for 'BUFFER' mode
 */
BufferPointer.BUFFER_FILLER = [Buffer.from('123456'), 6];

/**
 * Buffer stub to use as default value for BufferPointer
 * to force V8 to work with monomophic structure
 *
 * @type {CircularArray}
 */
BufferPointer.BUFFER_STUB = new CircularArray({
    fill: BufferPointer.BUFFER_FILLER,
    prealloc: true,
    size: 10
});

/**
 * String Pointer Class
 *
 * NOTE: should be used to parse data stored in string(s)
 */
class StringPointer extends Pointer {
    /** @returns {integer} value in range between 0x00 and 0xFF (hex) or 0 and 255 (decimal). */
    value() {
        // access by charCodeAt is nuch more faster in compare to access by index (x1.5-2 times)
        return this.buffer.charCodeAt(this.bufferOffset - 1);
    }
}

/**
 * Buffer 'fill' value. Should 100% mimic shape for 'STRING' mode
 */
StringPointer.BUFFER_FILLER = ['123456', 6];

/**
 * Buffer stub to use as default value for StringPointer
 * to force V8 to work with monomophic structure
 *
 * @type {CircularArray}
 */
StringPointer.BUFFER_STUB = new CircularArray({
    fill: StringPointer.BUFFER_FILLER,
    prealloc: true,
    size: 10
});

/**
 * Find \n or \r\n and split into parts
 *
 * Time Complexity: O(n)
 *
 * @this {Parser}
 *
 * @param {integer} timeLimit - max time to spend for data parsing
 */
function splitByLines(timeLimit) {
    // local vars a faster than property access/lookup
    var state = this._state;
    var backSlash = state.backSlash;
    var eventCategory = state.eventCategory;
    var kvSymbols = state.kvSymbols;
    var prevChar = state.prevChar;
    var pNewLine = state.pNewLine;
    var pQuote = state.pQuote;
    var pLeft = state.pLeft;
    var pRight = state.pRight;
    var pValidNewLine = state.pValidNewLine;

    var char = CC_EM;
    var ecState = eventCategory[F5_ECAT_STATE_IDX];
    var forceSplit = false;
    var iterNo = 0;
    var kvState = kvSymbols[KV_STATE_IDX];
    var maxItersBeforeTimeCheck = constants.PARSER_MAX_ITERS_PER_CHECK;
    var maxMsgSize = this.maxSize;
    var qchar = pQuote.isFree ? char : pQuote.value();

    // pre-compute to save CPU cycles (pre-optimization)
    var maxTimeTs = hrtimestamp() + timeLimit;

    if (pLeft.isFree) {
        // reuse existing pointers to avoid new allocations and
        // also it get higher chance to be optimized
        pLeft.init(this._buffers, this._buffers._backIdx);
        pLeft.isFree = false;
        pLeft.copy(pRight);
        pLeft.inc();
    }

    while (!pRight.endOfData()) {
        while (pRight.msgOffset < maxMsgSize && pRight.inc()) {
            iterNo++;
            char = pRight.value();
            if (char === CC_BS) {
                prevChar = char;
                if ((backSlash = !backSlash)) {
                    // - go to next char if leading `\`
                    continue;
                }
            } else if (char === CC_DQ || char === CC_SQ) {
                // igore escaped quotes
                if (!backSlash) {
                    if (pQuote.isFree) {
                        // reset value, this new line is invalid now (before quote starts, from prev message probably)
                        pValidNewLine.isFree = true;
                        // quote opened, reuse pointer
                        pRight.copy(pQuote);
                        qchar = char;
                    } else if (char === qchar) {
                        // reset value, this new line is invalid now (between quotes)
                        // quote closed
                        pQuote.isFree = pValidNewLine.isFree = true;
                    }
                }
            } else if (char === CC_NL) {
                // most recent new line char
                pRight.copy(pNewLine);
                // point to \r if exist
                prevChar === CC_CR && pNewLine.dec();

                if (pValidNewLine.isFree) {
                    // remember position of new line char (it might be closest to the open quote or to the start)
                    pNewLine.copy(pValidNewLine);
                }
                if (pQuote.isFree) {
                    forceSplit = true;
                    break;
                }
            } else if (kvState & KV_NOT_FOUND && pQuote.isFree && prevChar !== CC_CM
                && (char === CC_EQ || char === CC_CM)
            ) {
                kvState = checkKeyValuePair(kvSymbols, char, pRight.msgOffset);
            } else if (ecState & F5_SCAT_NOT_FOUND && prevChar === F5_SCAT_DS && char === F5_SCAT_LF) {
                ecState = eventCategory[F5_ECAT_STATE_IDX] = F5_SCAT_FOUND;
                eventCategory[F5_ECAT_OFFSET_IDX] = pRight.msgOffset - 1;
            }

            backSlash = false;
            prevChar = char;
        }

        if (forceSplit || pRight.msgOffset === maxMsgSize) {
            extractLine.call(this, pLeft, pRight, pQuote, kvSymbols, eventCategory);

            // reset state before next iteration
            backSlash = false;
            ecState = eventCategory[F5_ECAT_STATE_IDX] = eventCategory[F5_ECAT_DEFAULT_STATE_IDX];
            forceSplit = false;
            kvState = kvSymbols[KV_STATE_IDX] = kvSymbols[KV_DEFAULT_STATE_IDX];
            kvSymbols[KV_OFFSET_IDX] = kvSymbols[KV_RESERVED_IDX];
            prevChar = CC_EM;
        }
        // compare SMI (small integers) is faster than '%' operation
        if (iterNo > maxItersBeforeTimeCheck) {
            iterNo = 0;
            if (hrtimestamp() >= maxTimeTs) {
                break;
            }
        }
    }

    // save all state's data
    state.backSlash = backSlash;
    state.prevChar = prevChar;
}

/**
 * Extract line
 *
 * @this {Parser}
 *
 * @param {Pointer} pLeft
 * @param {Pointer} pRight
 * @param {Pointer} pQuote
 * @param {integer} kvOffset
 * @param {integer} kvInvalidOffset
 * @param {integer} evtCatOffset
 */
function extractLine(pLeft, pRight, pQuote, kvSymbols, eventCategory) {
    var pNewLine = this._state.pNewLine;
    var pValidNewLine = this._state.pValidNewLine;

    var forceSplit = true;
    var maxMsgSize = this.maxSize;
    var pRightNewLine = false;

    /**
     * Split reasons:
     * - valid new line found
     * - msg is too long and no new line
     * - opened quote is too long
     */
    if (pQuote.isFree === false) {
        // malformed quote - too long
        // split by new line char closest to quote
        // or split by open quote
        if (pValidNewLine.isFree === false) {
            pRightNewLine = true;
            pValidNewLine.copy(pRight);
        } else if (pNewLine.isFree === false) {
            pRightNewLine = true;
            pNewLine.copy(pRight);
        } else {
            pQuote.copy(pRight);
        }
    } else if (pValidNewLine.isFree === false) {
        // points to \r or \n
        if (pValidNewLine.msgOffset > 1) {
            // msg has atleast 1 char
            pRightNewLine = true;
            pValidNewLine.copy(pRight);
        } else {
            // \n\n or \r\n\r\n or similar
            forceSplit = false;
        }
    } else if (pRight.msgOffset >= maxMsgSize && pNewLine.isFree === false) {
        // - points to \r or \n
        // pNewLine.msgOffset for sure > 1
        pRightNewLine = true;
        pNewLine.copy(pRight);
    } // else message is too long - split by pRight

    if (forceSplit) {
        // ignore new line char \r\n or \n
        pRightNewLine && pRight.dec();
        this._cb(
            slicer(pLeft, pRight),
            getKVPairsOffsets(kvSymbols, pRight.msgOffset),
            getEventCategoryOffset(eventCategory, pRight.msgOffset)
        );
    }

    pRightNewLine && pRight.inc()
        && pRight.value() === CC_CR && pRight.inc();

    pRight.msgOffset = 0;
    pRight.copy(pLeft);
    // move to start of next msg
    pLeft.inc();
    pQuote.isFree = pValidNewLine.isFree = pNewLine.isFree = true;
}

/**
 * Split data buffers into lines
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
 * NOTE:
 *  - last 2 items may degrade performance, there is no optimization made to fix it, sender
 *    expected to send a valid data
 *
 * c
 *
 * @param {number} timeLimit - max time to spend on data processing
 * @param {boolean} [flush] - flush all data, even incomplete one
 *
 * @returns {[boolean, integer, integer]} tuple with 3 elemetns:
 *  - first item set to true if there is still pending data to process - some data left or incomplete message found
 *  - second item is amount of time in ns. spent to parse data
 *  - third item is amount of time in ns. spent to parse data and do cleanup
 */
function splitLines(timeLimit, flush) {
    var parseTime;
    var state = this._state;
    var pLeft = state.pLeft;
    var pRight = state.pRight;

    // do -1 to start time just to show the data was processed (e.g delta will be 1)
    var startTs = hrtimestamp() - 1;

    splitByLines.call(this, timeLimit);

    parseTime = hrtimestamp() - startTs;

    if (pRight.endOfData()) {
        // all data read
        if (pRight.msgOffset === 0) {
            pRight.isFree = true;
        } else if (flush) {
            // flush incomplete message, msgLength > 0 - there is some data
            // ignore \r\n
            pRight.value() === CC_NL && pRight.dec()
                && pRight.value() === CC_CR && pRight.dec();

            // all valid new lines were processed already, no chance there is an empty message
            // no need to check length
            this._cb(
                slicer(pLeft, pRight),
                getKVPairsOffsets(state.kvSymbols, pRight.msgOffset),
                getEventCategoryOffset(state.eventCategory, pRight.msgOffset)
            );
            pRight.isFree = true;
        }
    }

    if (pRight.isFree) {
        // no data left - erase everything, free memory
        pLeft.isFree = true;
        this._bytes = this._length = 0;
        this._buffers.fastErase();
        this._state.erase();
    } else if (pLeft.bufferNo) {
        pRight.bufferNo -= pLeft.bufferNo;
        freeNodes.call(this, pLeft.bufferNo);
        pLeft.bufferNo = 0;
    }

    // do +1 to time delta just to show the data was processed
    return [!pRight.isFree, parseTime, hrtimestamp() - startTs];
}

/**
 * Make a slice
 *
 * @param {Pointer} pleft
 * @param {Pointer} pright
 *
 * @returns {Buffer[] | string[]}
 */
function slicer(pleft, pright) {
    /**
     * General assumption: 1 buffer (string too) may contain a lot of messages, node:buffer.slice()
     * shares memory with parent buffer - less fragmentation. To avoid growing
     * memory pressure it would be better to release parent buffer/string as soon as possible.
     */
    return pleft.cArrIdx === pright.cArrIdx
        ? singleBuffer(pleft, pright)
        : bufferChain(pleft.cArr, pleft, pright);
}

/** @return {Buffer[] | string[]} */
function singleBuffer(pleft, pright) {
    return [pleft.buffer.slice(pleft.bufferOffset - 1, pright.bufferOffset)];
}
/**
 * @param {CircularArray} cArr
 * @param {Pointer} pleft
 * @param {Pointer} pright
 *
 * @returns {Buffer[] | string[]}
 */
function bufferChain(cArr, pleft, pright) {
    var cArrIdx = pleft.cArrIdx + 1;
    var chunks = new Array(pright.bufferNo - pleft.bufferNo + 1);
    // read from left to right or from left to end
    var endIdx = pleft.cArrIdx < pright.cArrIdx ? pright.cArrIdx : cArr.allocated;
    var i = 0;

    chunks[i] = pleft.buffer.slice(pleft.bufferOffset - 1);

    while (cArrIdx < endIdx) {
        chunks[++i] = cArr.peak(cArrIdx++)[0];
    }

    if (pleft.cArrIdx > pright.cArrIdx) {
        // read from start to right
        cArrIdx = 0;
        endIdx = pright.cArrIdx;

        while (cArrIdx < endIdx) {
            chunks[++i] = cArr.peak(cArrIdx++)[0];
        }
    }

    chunks[++i] = pright.buffer.slice(0, pright.bufferOffset);
    return chunks;
}

/**
 * Free processed nodes from the buffer and update counters
 *
 * @this {Parser}
 *
 * @param {integer} nodes - number of nodes to free
 */
function freeNodes(nodes) {
    var bytes = -0;
    var cArr = this._buffers;
    var length = -0;
    var i = 0;
    var payload;

    while (i++ < nodes) {
        payload = cArr.pop();
        bytes += payload[1];
        length += payload[0].length;
    }

    this._bytes -= bytes;
    this._length -= length;
}

/**
 * Filter out symbols that execeeding `maxPos`
 *
 * @param {Uint16Array | Uint32Array} symbols
 * @param {integer} start
 * @param {integer} end
 * @param {integer} maxPos
 *
 * @returns {interger} last index to include to result array
 */
function filterSymbols(symbols, start, end, maxPos) {
    // simple binary search
    var mid = 0;
    while (start <= end) {
        mid = ((start + end) / 2) >> 0;
        if (symbols[mid] < maxPos) {
            start = mid + 1;
        } else if (symbols[mid] > maxPos) {
            end = mid - 1;
        } else {
            return mid;
        }
    }
    return start - 1;
}

/**
 * Process key-value data
 *
 * @param {Uint16Array | Uint32Array} kvSymbols
 * @param {integer} char
 * @param {integer} offset
 *
 * @returns {integer} next state
 */
function checkKeyValuePair(kvSymbols, char, offset) {
    // detects pairs of key=value - scanning for unquoted `=` and `,` in correct order
    // out of order sequences result in KV_DONE
    var kvState = kvSymbols[KV_STATE_IDX];
    var kvIndex = kvSymbols[KV_OFFSET_IDX];

    // compare to target char and do not allow:
    // - `=` be first char in message
    // - `,` be in front of `,` or `=`
    kvState = kvSymbols[kvState] === char && offset !== 1
        ? kvSymbols[kvState + 1] // success - next state
        : KV_INVALID_SEQ; // fail

    // record offset even if invalid
    kvSymbols[(kvSymbols[KV_OFFSET_IDX] = ++kvIndex)] = offset - 1; // store 0-based offsets
    (kvIndex === kvSymbols[KV_MAX_OFFSET_IDX]) && (kvState = KV_FULL);

    return kvSymbols[KV_STATE_IDX] = kvState;
}

/**
 * @param {Uint16Array | Uint32Array} kvSymbols
 * @param {integer} maxOffset
 *
 * @returns {null | Uint16Array | Uint32Array} 0-based offsets if found else null
 */
function getKVPairsOffsets(kvSymbols, maxOffset) {
    if (kvSymbols[KV_STATE_IDX] === KV_DISABLED) {
        return null;
    }

    var kvIndex = kvSymbols[KV_OFFSET_IDX]; // points to last added item
    var kvStart = kvSymbols[KV_RESERVED_IDX];
    var isInvalid = kvSymbols[KV_STATE_IDX] === KV_INVALID_SEQ;

    if (kvIndex !== kvStart && kvSymbols[kvIndex] > maxOffset) {
        kvIndex = filterSymbols(kvSymbols, kvStart + 1, kvIndex, maxOffset);
        isInvalid = false;
    }

    return (kvIndex === kvStart || isInvalid)
        ? null
        : kvSymbols.slice(kvStart + 1, kvIndex + 1);
}

/**
 * @param {Uint16Array | Uint32Array} eventCategory
 * @param {integer} maxOffset
 *
 * @returns {integer} 1-base offset if found else 0
 */
function getEventCategoryOffset(eventCategory, maxOffset) {
    return (eventCategory[F5_ECAT_STATE_IDX] === F5_SCAT_FOUND
        && (eventCategory[F5_ECAT_OFFSET_IDX] + F5_FCAT_LEN) <= maxOffset // $F5TelemetryEventCategory= is ok
    )
        ? eventCategory[F5_ECAT_OFFSET_IDX] // 1-base offset (receiver should do -1 to get actual position)
        : 0; // no match
}

module.exports = Parser;
module.exports.FEAT_ALL = FEAT_ALL;
module.exports.FEAT_F5_EVT_CAT = FEAT_F5_EVT_CAT;
module.exports.FEAT_KV_PAIRS = FEAT_KV_PAIRS;
module.exports.FEAT_NONE = FEAT_NONE;

/**
 * @callback OnLineFoundCb
 * @param {Buffer[] | String[]} chunks - data chunks to build a line
 * @param {null | Uint16Array | Uint32Array} mayHaveKeyVals - 0-based offsets for unquoted `=` and `,`.
 *  Even index for `=`, odd index for `,`.
 * @param {integer} mayHaveEvtCat - 1-base offset if `$F` found else 0
 * (non-strict check done)
 */
