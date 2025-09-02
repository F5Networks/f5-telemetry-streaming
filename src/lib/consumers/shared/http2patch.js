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

const miscUtil = require('../../utils/misc');
const logger = require('../../logger').getChild('http2patch');

/**
 * NOTE: HTTP2 + grpc is broken on node 8.11.1 again
 */

// returns same Symbol every time
const kPatched = Symbol.for('tsPatchedHttp2');

/**
 * Patch built-in (internal) http2 library to be on par with node 8.13+
 * Actually, everything @grpc/grpc-js needs is working fine even on node 8.11.2+
 */
function patchHttp2Lib() {
    // eslint-disable-next-line global-require
    const http2 = require('http2');

    /**
     * Symbol to access 'state' property of Htt2Session
     */
    let Http2SessionStateSymbol;

    /**
     * Symbol to access 'state' property of Htt2Stream
     */
    let Http2StreamStateSymbol;

    /**
     * Symbol to access 'handle' property of Htt2Stream
     */
    let Http2StreamHandleSymbol;

    /**
     * Fetch hidden classes from 'http2' lib
     *
     * @returns {Object} with hidden classes
     */
    function getHttp2Classes() {
        const client = http2.connect('http://localhost');
        client.on('error', () => {});
        client.on('socketError', () => {});

        const req = client.request({ ':path': '/' });
        req.on('error', () => {});

        return {
            // eslint-disable-next-line no-proto
            Http2Session: Object.getPrototypeOf(client.__proto__),
            // eslint-disable-next-line no-proto
            Http2Stream: Object.getPrototypeOf(req.__proto__)
        };
    }

    /**
     * Get Http2Session private state
     *
     * @returns {object} Htt2Session private state
     */
    function getPrivateStateForHttp2Session(session) {
        if (!Http2SessionStateSymbol) {
            if (!Object.getOwnPropertySymbols(session).some((symb) => {
                const prop = session[symb];
                if (typeof prop === 'object' && prop && typeof prop.streams !== 'undefined' && typeof prop.pendingAck !== 'undefined') {
                    Http2SessionStateSymbol = symb;
                    return true;
                }
                return false;
            })) {
                logger.warning('Unable to find "state" symbol for http2session');
            }
        }
        return session[Http2SessionStateSymbol];
    }

    /**
     * Get Htt2Stream private state
     *
     * @returns {object} Htt2Stream private state
     */
    function getPrivateStateForHttp2Stream(stream) {
        if (!Http2StreamStateSymbol) {
            if (!Object.getOwnPropertySymbols(stream).some((symb) => {
                const prop = stream[symb];
                if (typeof prop === 'object' && prop && typeof prop.rstCode !== 'undefined' && typeof prop.writeQueueSize !== 'undefined') {
                    Http2StreamStateSymbol = symb;
                    return true;
                }
                return false;
            })) {
                logger.warning('Unable to find "state" symbol for http2stream');
            }
        }
        return stream[Http2StreamStateSymbol];
    }

    /**
     * Get Htt2Stream private handle
     *
     * @returns {object} Htt2Stream private handle
     */
    function getPrivateHandleForHttp2Stream(stream) {
        if (!Http2StreamHandleSymbol) {
            if (!Object.getOwnPropertySymbols(stream).some((symb) => {
                const prop = stream[symb];
                if (typeof prop === 'object' && prop && typeof prop.ontrailers === 'function'
                    && typeof prop.onstreamclose === 'function'
                    && typeof prop.onread === 'function'
                ) {
                    Http2StreamHandleSymbol = symb;
                    return true;
                }
                return false;
            })) {
                logger.warning('Unable to find "handle" symbol for http2stream');
            }
        }
        return stream[Http2StreamHandleSymbol];
    }

    function streamOnResume(listener) {
        if (getPrivateHandleForHttp2Stream(this)) {
            listener.call(this);
        } else {
            logger.verbose('Http2Stream is not resumed - destroyed already!');
            this.close();
        }
    }

    if (!http2[kPatched]) {
        const sessionLogger = logger.getChild('Http2Session');
        const streamLogger = logger.getChild('Http2Stream');

        /**
         * Connect to HTTP2 server listening on localhost:port
         *
         * @param {number} port
         *
         * @returns {Promise} resolved once done
         */

        const classes = getHttp2Classes();

        if (typeof classes.Http2Session.close === 'undefined') {
            sessionLogger.warning('Adding "closed" getter');

            /**
             * @returns {boolean} set to true if the Http2Session instance has been closed.
             */
            // eslint-disable-next-line no-restricted-properties
            classes.Http2Session.__defineGetter__('closed', function () {
                const state = getPrivateStateForHttp2Session(this);
                return state.destroyed || state.shutdown;
            });

            sessionLogger.warning('Adding "close" method');
            /**
             * Gracefully closes the Http2Session, allowing any existing streams to complete
             * on their own and preventing new
             * Http2Stream instances from being created. Once closed, http2session.destroy() might be called if
             * there are no open Http2Stream instances.
             *
             * @param {function} [callback]
             *
             * @returns {void}
             */
            classes.Http2Session.close = function (callback) {
                const state = getPrivateStateForHttp2Session(this);
                if (state.destroyed || state.shutdown || state.shuttingDown) {
                    return;
                }
                if (typeof callback === 'function') {
                    this.once('close', callback);
                }
                this.shutdown({ graceful: true }, () => {
                    this.emit('close');
                });
                this.destroy();
            };
        } else {
            sessionLogger.warning('"closed" getter - exist!');
            sessionLogger.warning('"close" method - exist!');
        }

        if (typeof classes.Http2Session.encrypted === 'undefined') {
            sessionLogger.warning('Adding "encrypted" getter');

            // eslint-disable-next-line no-restricted-properties
            classes.Http2Session.__defineGetter__('encrypted', function () {
                return !!(this.socket && this.socket.encrypted);
            });
        } else {
            sessionLogger.warning('"encrypted" getter - exist!');
        }

        if (typeof classes.Http2Session.ref === 'undefined') {
            sessionLogger.warning('Adding "ref" method');

            /**
             * Calls ref() on this Http2Session instance's underlying net.Socket
             *
             * @returns {void}
             */
            classes.Http2Session.ref = function () {
                if (this.socket) {
                    this.socket.ref();
                }
            };
        } else {
            sessionLogger.warning('"ref" method - exist!');
        }

        if (typeof classes.Http2Session.unref === 'undefined') {
            sessionLogger.warning('Adding "unref" method');

            /**
             * Calls unref() on this Http2Session instance's underlying net.Socket
             *
             * @returns {void}
             */
            classes.Http2Session.unref = function () {
                if (this.socket) {
                    this.socket.unref();
                }
            };
        } else {
            sessionLogger.warning('"unref" method - exist!');
        }

        if (typeof classes.Http2Stream.close === 'undefined') {
            streamLogger.warning('Adding "closed" getter');

            /**
             * @returns {boolean} set to true if the Http2Stream instance has been closed.
             */
            // eslint-disable-next-line no-restricted-properties
            classes.Http2Stream.__defineGetter__('closed', function () {
                const state = getPrivateStateForHttp2Stream(this);
                return !!state.closed;
            });

            streamLogger.warning('Adding "close" methid');

            /**
             * Closes the Http2Stream instance by sending an RST_STREAM frame to the connected HTTP/2 peer.
             *
             * @param {number} code - unsigned 32-bit integer identifying the error code.
             *  Default: http2.constants.NGHTTP2_NO_ERROR (0x00)
             * @param {function} callback - an optional function registered to listen for the 'close' event.
             *
             * @returns {void}
             */
            classes.Http2Stream.close = function (code, callback) {
                const state = getPrivateStateForHttp2Stream(this);

                this.removeAllListeners('timeout');

                // Close the writable
                if (!state.aborted
                    && !(this._writableState.ended || this._writableState.ending)) {
                    this.emit('aborted');
                    state.aborted = true;
                }
                this.end();

                if (this.closed) {
                    return;
                }

                state.closed = true;

                if (typeof callback === 'function') {
                    this.once('close', callback);
                }
                this.once('close', () => {
                    // need to 'read' data to make the stream to emit 'end' event
                    if (this._readableState.length === 0) {
                        this.read(0);
                    }
                });
                this.rstStream.apply(this, Array.from(arguments).slice(0, 1));
            };
        } else {
            streamLogger.warning('"closed" getter - exist!');
            streamLogger.warning('"close" method - exist!');
        }

        streamLogger.warning('Patching "resume" handler');

        /**
         * Patch 'resume' handle to avoid restnoded to core due uncaguht exception.
         *
         * Problem: stream was closed/destoryed already and for some reason Client
         * decides to resumse it. 'handle' property of Http2Stream is already
         * null/undefined at this moment and grpc throws exception trying to
         * call method of undefined.
         *
         * Solution: wrap original 'resume' listener to check if 'handle' is still
         * present. If not - skip calling original listener.
         */
        const originOnFn = classes.Http2Stream.on;
        classes.Http2Stream.on = function (event, listener) {
            if (event === 'resume') {
                listener = streamOnResume.bind(this, listener);
            }
            return originOnFn.call(this, event, listener);
        };

        http2[kPatched] = true;
    }
    return http2[kPatched];
}
const nodeVersion = process.version.slice(1);
if (miscUtil.compareVersionStrings(nodeVersion, '>', '8.13')) {
    logger.debug('Don\'t need to patch "http2" module - is up-to-date already!');
} else {
    logger.warning('Patching "http2" module');
    patchHttp2Lib();
    logger.warning('"http2" module successfully patched!');
}
