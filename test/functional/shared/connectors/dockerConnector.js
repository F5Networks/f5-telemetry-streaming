/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const getArgByType = require('../utils/misc').getArgByType;

/**
 * @module test/functional/shared/connectors/dockerConnector
 *
 * @typedef {import("../utils/promise").PromiseRetryOptions} PromiseRetryOptions
 * @typedef {import("../remoteHost/sshConnector").SSHConnector} SSHConnector
 * @typedef {import("../remoteHost/sshConnector").SSHExecResponse} SSHExecResponse
 */

const DOCKER_SHORT_ID_LEN = 12;

const RUN_OPTS_MAP = {
    // boolean
    detach: (val) => (val ? '-d' : ''),
    // object
    env: (envVars) => Object.keys(envVars)
        .map((varName) => {
            const varVal = envVars[varName];
            return varVal === null
                ? `--env ${varName}`
                : `--env ${varName}=${varVal}`;
        })
        .join(' '),
    // string
    name: (val) => `--name=${val}`,
    // object
    publish: (ports) => Object.keys(ports)
        .map((hostPort) => `-p ${hostPort}:${ports[hostPort]}`)
        .join(' '),
    // string
    restart: (val) => `--restart=${val}`,
    // object
    volume: (volumes) => Object.keys(volumes)
        .map((hostVol) => `-v ${hostVol}:${volumes[hostVol]}`)
        .join(' ')
};

/**
 * Truncate container ID to N chars
 *
 * @param {string} containerID - container ID
 *
 * @returns {string} truncated container ID
 */
function truncateID(containerID, numOfChars) {
    return containerID.slice(0, arguments.length > 1 ? numOfChars : DOCKER_SHORT_ID_LEN);
}

/**
 * Docker connector
 */
class DockerConnector {
    /**
     * Constructor
     *
     * @param {SSHConnector} ssh - SSH Connector
     * @param {Object} [options] - options
     * @param {Logger} [options.logger] - logger
     */
    constructor(ssh, options) {
        Object.defineProperties(this, {
            ssh: {
                value: ssh
            }
        });

        options = options || {};
        this.logger = (options.logger || this.ssh.logger).getChild('docker');
    }

    /**
     * Build command for 'docker run'
     *
     * @param {DockerCommandOptions} command - command options
     *
     * @returns {string} command
     */
    buildRunCmd(command) {
        const parts = [];
        Object.keys(command).forEach((opt) => {
            if (typeof RUN_OPTS_MAP[opt] !== 'undefined') {
                parts.push(RUN_OPTS_MAP[opt](command[opt]));
            }
        });
        return parts.join(' ');
    }

    /**
     * List running containers
     *
     * @param {boolean} all - list all containers
     *
     * @returns {Promise<Array<{id: string, name: string}>>} resolved with list of container info
     */
    containers(all) {
        this.logger.info('Request to list containers', { all });
        all = all ? ' -a' : '';
        return this.exec(`container list --format "{{json .}}" -q${all}`)
            .then((ret) => (ret.stdout
                ? ret.stdout
                    .split('\n')
                    .filter((id) => id.trim())
                    .map(JSON.parse)
                    .map((containerInfo) => ({
                        id: containerInfo.ID,
                        name: containerInfo.Names
                    }))
                : []));
    }

    /**
     * Get log for container
     *
     * @param {string} container - container ID or name
     *
     * @returns {Promise<string>} resolved with logs
     */
    containerLogs(container) {
        this.logger.info('Request to get container logs', { container });
        return this.exec(`container logs ${container}`);
    }

    /**
     * Execute docker command
     *
     * @param {string} command - command to execute
     * @param {PromiseRetryOptions} [retryOptions] - retry options
     * @param {boolean} [rejectOnError = true] - reject on non-zero RC
     *
     * @returns {Promise<SSHExecResponse>} execution results
     */
    exec(command, retryOptions, rejectOnError) {
        rejectOnError = true;
        if (arguments.length > 1) {
            rejectOnError = getArgByType(arguments, 'boolean', { fromIndex: 1, defaultValue: rejectOnError }).value;
            retryOptions = getArgByType(arguments, 'object', { fromIndex: 1 }).value;
        }
        return this.ssh.exec(`docker ${command}`, null, retryOptions)
            .then((ret) => {
                if (ret.code !== 0) {
                    this.logger.info('Non-zero return code', ret);
                    if (rejectOnError) {
                        const execErr = new Error('Docker command execution error: non-zero return code!');
                        execErr.ret = ret;
                        return Promise.reject(execErr);
                    }
                }
                return Promise.resolve(ret);
            });
    }

    /**
     * List images
     *
     * @param {boolean} all - list all images
     *
     * @returns {Promise<Array<{id: string, repo: string, tag: string}>>} resolved with list of image info
     */
    images(all) {
        this.logger.info('Request to list images', { all });
        all = all ? ' -a' : '';
        return this.exec(`images --format "{{json .}}" -q${all}`)
            .then((ret) => (ret.stdout
                ? ret.stdout
                    .split('\n')
                    .filter((id) => id.trim())
                    .map(JSON.parse)
                    .map((imageInfo) => ({
                        id: imageInfo.ID,
                        repo: imageInfo.Repository,
                        tag: imageInfo.Tag
                    }))
                : []));
    }

    /**
     * Install docker
     *
     * @returns {Promise} resolved once installed
     */
    install() {
        this.logger.info('Request to install docker');
        return this.ssh.exec('curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh')
            .then((ret) => (ret.code === 0
                ? Promise.resolve()
                : Promise.reject(new Error('Unable to install docker'))));
    }

    /**
     * Check if docker installed
     *
     * @returns {Promise<boolean>} true when installed
     */
    installed() {
        return this.exec('docker --version', false)
            .then((ret) => ret.code === 0);
    }

    /**
     * Prune all systems
     *
     * @returns {Promise<SSHExecResponse>} resolved once all systems pruned
     */
    pruneSystems() {
        this.logger.info('Request to prune all systems');
        return this.exec('system prune -f');
    }

    /**
     * Prune all volumes
     *
     * @returns {Promise<SSHExecResponse>} resolved once all volumes pruned
     */
    pruneVolumes() {
        this.logger.info('Request to prune all volumes');
        return this.exec('volume prune -f');
    }

    /**
     * Pull image
     *
     * @param {string} image - image
     *
     * @returns {Promise<SSHExecResponse>} resolve once image pulled
     */
    pull(image) {
        this.logger.info('Request to pull an image');
        return this.exec(`pull ${image}`);
    }

    /**
     * Remove all systems, volumes, containers, images
     *
     * @returns {Promise<SSHExecResponse>} resolved once all actions done
     */
    removeAll() {
        this.logger.info('Request to cleanup all components of docker');
        return this.removeAllContainers()
            .then(() => this.removeAllImages())
            .then(() => this.pruneSystems())
            .then(() => this.pruneVolumes());
    }

    /**
     * Remove all containers
     *
     * @returns {Promise<SSHExecResponse | null>} resolved once all containers removed
     */
    removeAllContainers() {
        this.logger.info('Request to remove all containers');
        return this.containers(true)
            .then((containers) => (containers.length
                ? this.exec(`rm -f ${containers.map((c) => c.id).join(' ')}`)
                : Promise.resolve(null)));
    }

    /**
     * Remove all images
     *
     * @returns {Promise<SSHExecResponse | null>} resolved once all images removed
     */
    removeAllImages() {
        this.logger.info('Request to remove all images');
        return this.images(true)
            .then((images) => (images.length
                ? this.exec(`rmi -f ${images.map((im) => im.id).join(' ')}`)
                : Promise.resolve(null)));
    }

    /**
     * Remove container(s)
     *
     * @param {Array<string> | string} containers - containers to remove
     *
     * @returns {Promise<SSHExecResponse>} resolved once container(s) removed
     */
    removeContainer(containers) {
        this.logger.info('Request to remove container(s)', { containers });
        containers = Array.isArray(containers)
            ? containers
            : [containers];

        return this.exec(`container rm -v -f ${containers.join(' ')}`);
    }

    /**
     * Run a container
     *
     * @param {DockerCommandOptions} command - command options
     * @param {string} command.image - image name
     * @param {string} [command.command] - command to run
     * @param {Array<string>} [command.args] - args to pass to command
     * @param {boolean} [rejectOnError = true] - reject on non-zero RC
     *
     * @returns {Promise<SSHExecResponse | string>} resolved once operation completed. Returns a container ID
     *  when container was run in detached mode.
     */
    run(command, rejectOnError) {
        rejectOnError = true;
        if (arguments.length > 1) {
            rejectOnError = getArgByType(arguments, 'boolean', { fromIndex: 1, defaultValue: rejectOnError }).value;
        }

        this.logger.info('Request to run a container');
        const cmd = [
            this.buildRunCmd(command),
            command.image,
            command.command
        ]
            .filter((c) => c)
            .concat(command.args || [])
            .join(' ');

        return this.exec(`run ${cmd}`, rejectOnError)
            .then((ret) => {
                if (command.detach && ret.code === 0) {
                    return Promise.resolve(truncateID(ret.stdout.split('\n')[0]));
                }
                return Promise.resolve(ret);
            });
    }

    /**
     * Stop container(s)
     *
     * @param {Array<string> | string} containers - containers to stop
     *
     * @returns {Promise<SSHExecResponse>} resolved once container(s) stopped
     */
    stopContainer(containers) {
        this.logger.info('Request to stop container(s)', { containers });
        containers = Array.isArray(containers)
            ? containers
            : [containers];

        return this.exec(`container stop ${containers.join(' ')}`);
    }

    /**
     * Get docker version
     *
     * @returns {Promise<string>} resolved with version info
     */
    version() {
        this.logger.info('Request to get version info');
        return this.exec('docker --version')
            .then((ret) => ret.stdout);
    }
}

module.exports = {
    DockerConnector
};

/**
 * @typedef DockerCommandOptions
 * @type {Object}
 * @property {boolean} [detach] - run container in background and print container ID
 * @property {Object<string, string | null>} [env] - set environment variables
 * @property {string} [name] - assign a name to the container
 * @property {Object<string, string} [publish] - publish a container's port(s) to the host
 * @property {string} [restart] - restart policy to apply when a container exits
 * @property {Object<string, string>} [volume] - bind mount a volume
 */
