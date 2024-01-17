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

const assignDefaults = require('lodash/defaults');
const fs = require('fs');

const DockerConnector = require('./connectors/dockerConnector').DockerConnector;
const DUT_VARS = require('./constants').ENV_VARS.TEST_CONTROLS.DUT;
const HARNESS_VARS = require('./constants').ENV_VARS.TEST_CONTROLS.HARNESS;
const logger = require('./utils/logger').getChild('harness');
const miscUtils = require('./utils/misc');
const promiseUtils = require('./utils/promise');
const remoteHost = require('./remoteHost');
const TelemetryStreamingConnector = require('./connectors/telemetryConnector').TelemetryStreamingConnector;

/**
 * @module test/functional/shared/harness
 *
 * @typedef {import("./remoteHost/appLXConnector").AppLXConnector} AppLXConnector
 * @typedef {import("./connectors/dockerConnector").DockerCommandOptions} DockerCommandOptions
 * @typedef {import("./utils/promise").PromiseRetryOptions} PromiseRetryOptions
 * @typedef {import("./remoteHost/httpConnector").HTTPConnector} HTTPConnector
 * @typedef {import("./remoteHost/httpConnector").HTTPConnectorManager} HTTPConnectorManager
 * @typedef {import("./remoteHost/icontrolAPI.js").IControlAPI} IControlAPI
 * @typedef {import("./remoteHost/icontrolConnector").IControlConnector} IControlConnector
 * @typedef {import("./remoteHost/sshConnector").SSHConnector} SSHConnector
 * @typedef {import("./remoteHost/sshConnector").SSHExecResponse} SSHExecResponse
 */

const DEFAULTS = Object.freeze({
    ICONTROL: Object.freeze({
        allowSelfSignedCert: false,
        port: 443
    }),
    SSH: Object.freeze({
        port: 22
    })
});

let DEFAULT_HARNESS;

/**
 * F5 BIG-IP Device
 *
 * @property {AppLXConnector} appLX.default - default App LX Connector
 * @property {HTTPConnector} http.icontrol - iControl HTTP Connector
 * @property {IControlAPI} icAPI.default - default iControl API Connector
 * @property {IControlConnector} icontrol.default - default iControl Connector
 * @property {SSHConnector} ssh.default - default SSH Connector
 * @property {TelemetryStreamingConnector} telemetry - Telemetry Streaming Connector
 */
class BigIp extends remoteHost.F5BigDevice {
    /**
     * Constructor
     *
     * @param {string} name - name
     * @param {string} host - remote host
     * @param {Object} options - connection options
     * @param {IControlConfig} options.icontrol - iControl connection options
     * @param {string} options.hostname - hostname
     * @param {SSHConfig} options.ssh - SSH connection options
     */
    constructor(name, host, options) {
        super(host);

        Object.defineProperties(this, {
            logger: {
                value: this.host.logger.getChild('f5bigip').getChild(name)
            },
            hostname: {
                value: options.hostname
            },
            name: {
                value: name
            }
        });

        const icOpts = assignDefaults(
            Object.assign({}, options.icontrol),
            DEFAULTS.ICONTROL
        );
        const sshOpts = assignDefaults(
            Object.assign({}, options.ssh || {}),
            DEFAULTS.SSH
        );

        this.initHTTPStack()
            .createAndSave('icontrol', {
                allowSelfSignedCert: icOpts.allowSelfSignedCert,
                port: icOpts.port
            });

        this.initIControlStack()
            .createAndSave('default', {
                passphrase: icOpts.passphrase,
                transport: this.http.icontrol,
                username: icOpts.username
            });

        this.initAppLXStack()
            .createAndSave('default', {
                icontrol: this.icontrol.default
            });

        this.initIControlAPIStack()
            .createAndSave('default', {
                icontrol: this.icontrol.default
            });

        this.initSSHStack()
            .createAndSave('default', {
                encoding: 'utf8',
                password: sshOpts.passphrase,
                port: sshOpts.port,
                privateKey: sshOpts.privateKey,
                username: sshOpts.username
            });

        this.initTCPStack({
            unref: true
        });
        this.initUDPStack();

        Object.defineProperties(this, {
            telemetry: {
                value: new TelemetryStreamingConnector(
                    this.icontrol.default,
                    {
                        logger: this.logger
                    }
                )
            }
        });
    }

    /**
     * Teardown all connectors
     *
     * @returns {Promise} resolved once all connectors closed
     */
    teardown() {
        return promiseUtils.allSettled([
            this.ssh.default.terminate()
        ]);
    }
}

/**
 * Remote Server
 *
 * @property {SSHConnector} ssh.default - default SSH Connector
 * @property {DockerConnector} docker - Docker Connector
 */
class RemoteServer extends remoteHost.RemoteDevice {
    /**
     * Constructor
     *
     * @param {string} name - name
     * @param {string} host - remote host
     * @param {Object} options - connection options
     * @param {SSHConfig} options.ssh - SSH connection options
     */
    constructor(name, host, options) {
        super(host);

        Object.defineProperties(this, {
            logger: {
                value: this.host.logger.getChild('server').getChild(name)
            },
            name: {
                value: name
            }
        });

        const sshOpts = assignDefaults(
            Object.assign({}, options.ssh || {}),
            {
                port: DEFAULTS.SSH_PORT
            }
        );

        this.initHTTPStack();
        this.initSSHStack()
            .createAndSave('default', {
                encoding: 'utf8',
                password: sshOpts.passphrase,
                port: sshOpts.port,
                privateKey: sshOpts.privateKey,
                username: sshOpts.username
            });

        Object.defineProperties(this, {
            docker: {
                value: new DockerConnector(
                    this.ssh.default,
                    {
                        logger: this.logger
                    }
                )
            }
        });
    }

    /**
     * Teardown all connectors
     *
     * @returns {Promise} resolved once all connectors closed
     */
    teardown() {
        return promiseUtils.allSettled([
            this.ssh.default.terminate()
        ]);
    }
}

/**
 * Get default harness
 *
 * @returns {Harness} harness
 */
function getDefaultHarness() {
    return DEFAULT_HARNESS;
}

/**
 * Initialize harness using info from env vars
 *
 * @returns {Harness} harness
 */
function initializeFromEnv() {
    logger.info('Initializing harness using ENV variables');

    const harnessFilePath = miscUtils.getEnvArg(HARNESS_VARS.FILE);
    logger.info('Trying to read data from file', {
        envVar: HARNESS_VARS.FILE,
        path: harnessFilePath
    });

    if (fs.existsSync(harnessFilePath)) {
        let data = fs.readFileSync(harnessFilePath);
        data = JSON.parse(data);

        logger.info(`Harness parsed from file! ${data.length} objects in it`);
        return initializeFromJSON(data);
    }
    throw new Error('Unable to initialize harness from env vars: not enough data');
}

/**
 * Initialize harness from harness file
 *
 * @param {Array} harness - harness data
 *
 * @returns {Harness} harness
 */
function initializeFromJSON(harness) {
    logger.info('Parsing harness JSON data');

    const dutIgnorePattern = miscUtils.getEnvArg(DUT_VARS.EXCLUDE, { defaultValue: '' });
    const dutIncludePattern = miscUtils.getEnvArg(DUT_VARS.INCLUDE, { defaultValue: '' });

    let bigipFilter;
    if (dutIgnorePattern || dutIncludePattern) {
        logger.info('Filtering BIG-IP by hostname using following patterns', {
            ignore: dutIgnorePattern,
            include: dutIncludePattern
        });

        let ignoreFilter = () => true; // accept by default
        if (dutIgnorePattern) {
            const regex = new RegExp(dutIgnorePattern, 'i');
            ignoreFilter = (hostname) => !hostname.match(regex);
        }
        let includeFilter = () => true; // accept by default
        if (dutIncludePattern) {
            const regex = new RegExp(dutIncludePattern, 'i');
            includeFilter = (hostname) => hostname.match(regex);
        }
        bigipFilter = (hostname) => includeFilter(hostname) && ignoreFilter(hostname);
    }

    const ret = {
        bigip: [],
        other: []
    };
    harness.forEach((item, idx) => {
        if (item.is_f5_device) {
            if (bigipFilter && !bigipFilter(item.f5_hostname)) {
                logger.warning('Ignoring F5 Device with hostname', { hostname: item.f5_hostname });
            } else {
                ret.bigip.push(new BigIp(
                    (item.f5_hostname && item.f5_hostname.indexOf('bigip') < item.f5_hostname.indexOf('.'))
                        ? item.f5_hostname.substring(item.f5_hostname.indexOf('bigip'), item.f5_hostname.indexOf('.'))
                        : `bigip_${idx}`,
                    item.admin_ip,
                    {
                        icontrol: {
                            allowSelfSignedCert: item.f5_validate_certs === false,
                            username: item.f5_rest_user.username,
                            passphrase: item.f5_rest_user.password,
                            port: item.f5_rest_api_port
                        },
                        hostname: item.f5_hostname,
                        ssh: {
                            username: item.ssh_user.username,
                            passphrase: item.ssh_user.password,
                            port: item.ssh_port
                        }
                    }
                ));
            }
        } else {
            ret.other.push(new RemoteServer(
                item.hostname,
                item.admin_ip,
                {
                    ssh: {
                        username: item.ssh_user.username,
                        passphrase: item.ssh_user.password,
                        port: item.ssh_port
                    }
                }
            ));
        }
    });

    logger.info('Harness parsed!', {
        bigip: ret.bigip.length,
        other: ret.other.length
    });

    return ret;
}

/**
 * Set harness as default
 *
 * @param {Harness} harness - harness
 */
function setDefaultHarness(harness) {
    DEFAULT_HARNESS = harness;
}

module.exports = {
    BigIp,
    RemoteServer,

    getDefaultHarness,
    initializeFromEnv,
    initializeFromJSON,
    setDefaultHarness,

    /**
     * Docker Helpers
     */
    docker: {
        /**
         * Start new container
         *
         * @param {DockerConnector} docker - Docker Connector instance
         * @param {DockerCommandOptions} options - Docker `run` options
         * @param {boolean} options.detach - should be set to 'true'
         * @param {string} options.name - container name
         *
         * @returns {Promise} resolved once container started
         */
        startNewContainer(docker, options) {
            docker.logger.info('Starting new container', { options });
            return docker.run(options)
                .then((containerID) => promiseUtils.retry(() => {
                    docker.logger.info('Container started!', { containerID });
                    return docker.containers()
                        .then((running) => {
                            if (running.find((ci) => ci.id === containerID)) {
                                docker.logger.info('Container running!', { containerID });
                                return Promise.resolve();
                            }
                            return Promise.reject(new Error(`Unable to find container "${containerID}" in running containers list!`));
                        });
                }, {
                    maxTrues: 10,
                    delay: 100
                }));
        },

        /**
         * Remove container(s) and verify it stopped
         *
         * @param {DockerConnector} docker - Docker Connector instance
         * @param {Array<string> | string} cidOrName - container ID(s) and/or name(s)
         *
         * @returns {Promise} resolved once container(s) stopped and removed
         */
        stopAndRemoveContainer(docker, cidOrName) {
            docker.logger.info('Stopping and removing FluentD container', { cidOrName });
            cidOrName = Array.isArray(cidOrName)
                ? cidOrName
                : [cidOrName];
            return promiseUtils.loopUntil(
                (breakCb) => docker.containers(true)
                    .then((containers) => containers
                        .filter((ci) => cidOrName.indexOf(ci.name) !== -1 || cidOrName.indexOf(ci.id) !== -1))
                    .then((toStopAndRemove) => {
                        if (toStopAndRemove.length === 0) {
                            return breakCb();
                        }
                        return docker.removeContainer(toStopAndRemove.map((ci) => ci.id))
                            .catch(() => {
                                docker.logger.info('Got error on attempt to stop and remove container(s). Going to re-try after 500ms.', { toStopAndRemove });
                                return promiseUtils.sleep(500);
                            });
                    })
            );
        }
    }
};

/**
 * @typedef IControlConfig
 * @type {Object}
 * @property {boolean} [allowSelfSignedCert = false] - allow self-signed certs
 * @property {string} username - iControl username
 * @property {string} passphrase - iControl passphrase
 * @property {number} [port = 443] - iControl port
 */
/**
 * @typedef SSHConfig
 * @type {Object}
 * @property {string} [username] - SSH username
 * @property {string} [passphrase] - SSH passphrase
 * @property {number} [port = 22] - SSH port
 * @property {string} [privateKey] - private key for either key-based or hostbased user authentication
 */
/**
 * @typedef Harness
 * @type {Object}
 * @property {Array<BigIp>} bigip - BIG-IP devices
 * @property {Array<RemoteServer>} other - other devices
 */
