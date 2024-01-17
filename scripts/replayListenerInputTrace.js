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

const dgram = require('dgram');
const fs = require('fs');
const net = require('net');

/* eslint-disable no-console */

let programDisabled = false;
onAppExit(() => {
    programDisabled = true;
});

if (require.main === module) {
    Promise.resolve()
        .then(() => main())
        .catch((error) => {
            console.error('Uncaught error', error);
            return 1;
        })
        .then((rc) => process.exit(rc || 0));
}

/**
 * Register callback to call when app exists
 *
 * @param {function} cb - callback to register
 *
 * @returns {void} once callback registered
 */
function onAppExit(cb) {
    ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'].forEach((signal) => {
        process.on(signal, cb);
    });
}

/**
 * Check if program was disabled
 *
 * @returns {void}
 * @throws {Error} when program disabled
 */
function checkIfProgramDisabled() {
    if (programDisabled) {
        throw new Error('Program terminated!');
    }
}

/**
 * Sleep for N ms.
 *
 * @param {number} ms - ms. to sleep
 *
 * @returns {Promise} resolved once N .ms passed or rejected if canceled via .cancel()
*/
function sleep(sleepTime) {
    /**
     * According to http://www.ecma-international.org/ecma-262/6.0/#sec-promise-executor
     * executor will be called immediately (synchronously) on attempt to create Promise
     */
    let cancelCb;
    const promise = new Promise((resolve, reject) => {
        const timeoutID = setTimeout(() => {
            cancelCb = null;
            resolve();
        }, sleepTime);
        cancelCb = (reason) => {
            cancelCb = null;
            clearTimeout(timeoutID);
            reject(reason || new Error('canceled'));
        };
    });
    /**
    * @param {Error} [reason] - cancellation reason
    *
    * @returns {Boolean} 'true' if cancelCb called else 'false'
    */
    promise.cancel = (reason) => {
        if (cancelCb) {
            cancelCb(reason);
            return true;
        }
        return false;
    };
    return promise;
}

class NotImplementedError extends Error {}

/**
 * Connection Object Interface
 *
 * @interface
 */
class ConnectionInterface {
    /**
     * @returns {Promise} resolved once connected
     */
    connect() {
        throw new NotImplementedError();
    }

    /**
     * @returns {Promise} resolved once destroyed
     */
    destroy() {
        throw new NotImplementedError();
    }

    /**
     * @param {Buffer} data - data to send
     *
     * @returns {Promise} resolved once data sent
     */
    sendData() {
        throw new NotImplementedError();
    }
}

/**
 * Base class for TCP and UDP socket wrapper
 *
 * @property {number} port - port to connect to
 * @property {string} host - host to connect to
 */
class TcpUdpSocketWrapper extends ConnectionInterface {
    /**
     * Constructor
     *
     * @param {number} port - port to connect to
     * @param {object} options - options
     * @param {string} [options.host = 'localhost'] - host to connect to
     */
    constructor(port, options) {
        super();
        options = options || {};
        Object.defineProperty(this, 'port', {
            value: port
        });
        Object.defineProperty(this, 'host', {
            value: options.host || 'localhost'
        });
    }
}

/**
 * TCP socket wrapper
 *
 * @implements {ConnectionInterface}
 */
class TcpSocketWrapper extends TcpUdpSocketWrapper {
    /**
     * @returns {Promise} resolved once connected
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection(this.port, this.host, () => {
                this.socket.removeListener('error', reject);
                this.socket.removeListener('timeout', reject);
                resolve();
            });
            this.socket.on('error', reject);
            this.socket.on('timeout', () => reject(new Error('timeout')));
        });
    }

    /**
     * @returns {Promise} resolved once destroyed
     */
    destroy() {
        if (this.socket) {
            const socket = this.socket;
            this.socket = null;
            return new Promise((resolve) => {
                socket.end();
                resolve();
            });
        }
        return Promise.resolve();
    }

    /**
     * @param {Buffer} data - data to send
     *
     * @returns {Promise} resolved once data sent
     */
    sendData(data) {
        return new Promise((resolve, reject) => {
            this.socket.write(data, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}

/**
 * UDP socket wrapper
 *
 * @implements {ConnectionInterface}
 */
class UdpSocketWrapper extends TcpUdpSocketWrapper {
    /**
     * @returns {Promise} resolved once connected
     */
    connect() {
        return Promise.resolve()
            .then(() => {
                this.socket = dgram.createSocket({
                    type: 'udp4'
                });
            });
    }

    /**
     * @returns {Promise} resolved once destroyed
     */
    destroy() {
        if (this.socket) {
            const socket = this.socket;
            this.socket = null;
            return new Promise((resolve) => {
                socket.close(resolve);
            });
        }
        return Promise.resolve();
    }

    /**
     * @param {Buffer} data - data to send
     *
     * @returns {Promise} resolved once data sent
     */
    sendData(data) {
        return new Promise((resolve, reject) => {
            this.socket.send(data, 0, data.length, this.port, this.host, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}

/**
 * Connections Manager
 *
 * @property {number} port - port to connect to
 * @property {string} host - host to connect to
 */
class ConnectionsManager {
    /**
     * Constructor
     *
     * @param {number} port - port to connect to
     * @param {object} options - options
     * @param {string} [options.host = 'localhost'] - host to connect to
     */
    constructor(port, options) {
        options = options || {};
        Object.defineProperty(this, 'port', {
            value: port
        });
        Object.defineProperty(this, 'host', {
            value: options.host || 'localhost'
        });
        this.connections = {};
    }

    /**
     * Fabric to create instance of ConnectionInterface
     *
     * @param {string} protocol - protocol
     * @param {string} senderKey - unique connection key
     *
     * @returns {ConnectionInterface} instance
     */
    createConnection(protocol, senderKey) {
        if (protocol === 'udp') {
            return new UdpSocketWrapper(this.port, { host: this.host });
        }
        if (protocol === 'tcp') {
            return new TcpSocketWrapper(this.port, { host: this.host });
        }
        throw new Error(`Unknown protocol "${protocol}" for "${senderKey}"`);
    }

    /**
     * Destroy all connections
     *
     * @returns {Promise} resolved once all established connections destroyed
     */
    destroyAll() {
        console.log('Destroying all established connections');
        return Promise.all(this.getAllConnections().map((conn) => conn.destroy()));
    }

    /**
     * Establish all connections
     *
     * @returns {Promise} resolved once all connections established
     */
    establishConnections() {
        onAppExit(this.destroyAll.bind(this));
        return Promise.all(this.getAllConnections().map((conn) => conn.connect()));
    }

    /**
     * Get all connections
     *
     * @returns {Array<ConnectionInterface>} connections
     */
    getAllConnections() {
        return Object.keys(this.connections).reduce((acc, proto) => {
            Object.keys(this.connections[proto]).forEach((skey) => {
                acc.push(this.connections[proto][skey]);
            });
            return acc;
        }, []);
    }

    /**
     * Register connection
     *
     * @param {string} protocol - protocol
     * @param {string} connKey - unique connection key
     */
    registerConnection(protocol, connKey) {
        this.connections[protocol] = this.connections[protocol] || {};
        this.connections[protocol][connKey] = this.createConnection(protocol, connKey);
    }

    /**
     * Send data
     *
     * @param {string} protocol - protocol
     * @param {string} connKey - unique connection key
     * @param {Buffer} data - data to send
     *
     * @returns {Promise} resolved once data sent
     */
    sendData(protocol, connKey, data) {
        return this.connections[protocol][connKey].sendData(data);
    }
}

/**
 * Record
 *
 * @property {Buffer} data - data
 * @property {string} protocol - connection protocol
 * @property {string} senderKey - unique connection key
 * @property {number} timestamp - data receiving timestamp
 * @property {Array<number>} hrtime - high resolution data receiving timestamp (result of calling process.hrtime)
 */
class Record {
    /**
     * Constructor
     *
     * @param {JsonDataRecordV1} jsonData - data to parse
     */
    constructor(jsonData) {
        this.data = Buffer.from(jsonData.data, 'hex');
        this.protocol = jsonData.protocol;
        this.senderKey = jsonData.senderKey;
        this.timestamp = jsonData.timestamp;
        this.hrtime = jsonData.hrtime;
    }
}

/**
 * Replay Event Listener input
 *
 * @param {ReplayOptions} options - options
 *
 * @returns {Promise} resolved once all data sent
 */
function replay(options) {
    return Promise.resolve()
        .then(() => {
            console.log(`Reading and parsing records from "${options.file}"`);
            let records = JSON.parse(fs.readFileSync(options.file))
                .map((jsonData) => new Record(jsonData.data));

            console.log(`${records.length} records parsed`);

            if (options.senderKey.length) {
                console.log(`Keeping records with senderKey === ${options.senderKey}`);
                records = records.filter((record) => options.senderKey.indexOf(record.senderKey) !== -1);
                console.log(`${records.length} records left`);
            }
            if (options.protocol.length) {
                console.log(`Keeping records with protocol === ${options.protocol}`);
                records = records.filter((record) => options.protocol.indexOf(record.protocol) !== -1);
                console.log(`${records.length} records left`);
            }

            if (records.length === 0) {
                console.log('No records to process, existing...');
                return Promise.resolve();
            }
            if (options.preserveOrder) {
                console.log('Sorting records according to timestamps');
                records.sort((left, right) => left.timestamp - right.timestamp
                    || left.hrtime[0] - right.hrtime[0]
                    || left.hrtime[1] - right.hrtime[1]);
            } else {
                options.delay = false;
            }
            console.log(`Delays between messages (according to timestamps) - ${options.delay}`);

            return sendData(records, options);
        });
}

function sendData(records, options) {
    let cm;
    return Promise.resolve()
        .then(() => {
            cm = new ConnectionsManager(options.port, {
                host: options.host
            });

            console.log('Creating connection for each data flow');
            Array.from(new Set(records.map((record) => record.protocol)))
                .forEach((protocol) => Array.from(new Set(
                    records.filter((record) => record.protocol === protocol)
                        .map((record) => record.senderKey)
                ))
                    .forEach((senderKey) => {
                        console.log(`Registering connection for "${senderKey}", protocol "${protocol}`);
                        cm.registerConnection(protocol, senderKey);
                    }));
            return cm.establishConnections();
        })
        .then(() => new Promise((resolve, reject) => {
            let sendStartTimestamp;
            let sleepPromise;

            onAppExit(() => {
                if (sleepPromise) {
                    sleepPromise.cancel(new Error('Program terminated!'));
                }
            });

            (function sendRecord(rid, sendDoneTimestamp) {
                sleepPromise = null;
                checkIfProgramDisabled();

                if (rid >= records.length) {
                    resolve();
                }
                if (rid > 0 && options.delay) {
                    const delay = typeof options.customDelay === 'number'
                        ? options.customDelay
                        : ((records[rid].timestamp - records[rid - 1].timestamp)
                            - (sendDoneTimestamp - sendStartTimestamp));

                    if (delay > 0) {
                        console.log(`Sleep for ${delay} ms. before sending record #${rid + 1}`);
                        sleepPromise = sleep(delay);
                    }
                }
                const record = records[rid];
                sendStartTimestamp = Date.now();
                (sleepPromise || Promise.resolve())
                    .then(() => cm.sendData(record.protocol, record.senderKey, record.data))
                    .then(() => { sendRecord(rid + 1, Date.now()); }, reject);
            }(0));
        }));
}

/**
 * Parse CLI args
 *
 * @returns {Promise<ReplayOptions>} resolved replay options
 */
function parseArgs() {
    return Promise.resolve()
        .then(() => {
            // commander@3.0.2 to support node v4 env
            let commander;
            try {
                // eslint-disable-next-line global-require, import/no-extraneous-dependencies
                commander = require('commander');
            } catch (error) {
                console.error('Unable to import "commander" package. Please, try to install it using following command:\n\nnpm install --no-save commander@~3.0.2\n');
                throw error;
            }

            function collect(value, previous) {
                return previous.concat([value]);
            }

            const args = {};
            const program = new commander.Command();
            program
                .version('0.1')
                .option('--custom-delay <custom-delay>', 'delay in ms. before each record being send', parseInt)
                .option('--no-delay', 'do not preserve timestamps and send data immediately', true)
                .option('-p, --protocol <protocol>', 'protocols to use to filter data', collect, [])
                .option('-u, --unordered', 'preserve original order of messages, disables delays', false)
                .option('-s, --sender-key <sender-key>', 'senderKeys to use to filter data', collect, [])
                .arguments('<file> <port> [host]')
                .action((file, port, host, cmdObj) => {
                    args.file = file;
                    args.port = parseInt(port, 10);
                    args.host = host;
                    args.customDelay = cmdObj.customDelay;
                    args.delay = cmdObj.delay;
                    args.preserveOrder = !cmdObj.unordered;
                    args.protocol = cmdObj.protocol;
                    args.senderKey = cmdObj.senderKey;

                    if (!Number.isInteger(args.port)) {
                        throw new Error(`Invalid port number passed: ${port}`);
                    }
                });

            program.parse(process.argv);
            if (!(args.file && args.port)) {
                program.help();
            }
            return args;
        });
}

/**
 * Main function
 *
 * @returns {Promise} resolved once process done
 */
function main() {
    return parseArgs()
        .then(replay);
}

/**
 * @typedef ReplayOptions
 * @type {object}
 * @property {string} file - path to file with records
 * @property {number} port - port to send records to
 * @property {number} [customDelay] - delay before each record being send in ms.
 * @property {boolean} [delay] - do not preserve timestamps and send records immediately when false
 * @property {string} [host] - host to send records to
 * @property {boolean} [preserveOrder] - preserve order according to timestamps
 * @property {Array<string>} [protocol] - protocols to use to filter records
 * @property {Array<string>} [senderKey] - senderKeys to use to filter records
 */
/**
 * @typedef JsonDataRecordV1
 * @type {object}
 * @property {object} data - data object
 * @property {string} data.data - data in HEX encoding
 * @property {string} data.protocol - connection protocol
 * @property {string} data.senderKey - unique connection key
 * @property {number} data.timestamp - data receiving timestamp
 * @property {Array<number>} data.hrtime - high resolution data receiving timestamp (result of calling process.hrtime)
 * @property {string} timestamp - tracing timestamp
 */
