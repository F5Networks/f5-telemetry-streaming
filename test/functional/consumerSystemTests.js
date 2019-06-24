/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses

'use strict';

const fs = require('fs');

const constants = require('./shared/constants.js');
const util = require('./shared/util.js');

const consumerHost = util.getHosts('CONSUMER')[0]; // only expect one
const checkDockerCmd = 'if [[ -e $(which docker) ]]; then echo exists; fi';

// string -> object (consumer module)
let consumersMap = {};
// string -> array of any
let consumerRequirements = {};
// string -> boolean
const systemRequirements = {};

/**
 * Execute command over SSH on CS
 *
 * @param {String} cmd - command to execute on CS
 *
 * @returns Promise resolved when command was executed on CS
 */
function runRemoteCmdOnCS(cmd) {
    return util.performRemoteCmd(consumerHost.ip, consumerHost.username, cmd, { password: consumerHost.password });
}

/**
 * Load Consumers Tests modules
 *
 * @returns mapping consumer name -> consumer module
 */
function loadConsumers() {
    // env var to run only specific consumer type(s) (e.g. 'elast')
    const consumerFilter = process.env[constants.ENV_VARS.CONSUMER_HARNESS.TYPE_REGEX];
    const consumerDir = constants.CONSUMERS_DIR;
    let consumers = fs.readdirSync(consumerDir);
    // filter consumers by module name if needed
    if (consumerFilter) {
        util.logger.info(`Using filter '${consumerFilter}' to filter modules from '${consumerDir}'`);
        consumers = consumers.filter(fName => fName.match(new RegExp(consumerFilter, 'i')) !== null);
    }

    const mapping = {};
    consumers.forEach((consumer) => {
        const cpath = `${consumerDir}/${consumer}`;
        mapping[consumer] = require(cpath); //eslint-disable-line
        util.logger.info(`Consumer Tests from '${cpath}' loaded`);
    });
    return mapping;
}

/**
 * Load Consumers Tests requirements
 *
 * @returns mapping consumer requirement name -> array
 */
function loadConsumersRequirements() {
    const requirements = {};
    Object.keys(consumersMap).forEach((key) => {
        const consumer = consumersMap[key];
        if (consumer.MODULE_REQUIREMENTS) {
            const moduleReq = consumer.MODULE_REQUIREMENTS;
            Object.keys(moduleReq).forEach((req) => {
                if (requirements[req] === undefined) {
                    requirements[req] = [];
                }
                requirements[req].push(moduleReq[req]);
            });
        }
    });
    return requirements;
}

/**
 * Check if CS meets Consumer's requirements
 *
 * @param {Object} consumer - consumer module
 *
 * @returns true when CS meets Consumer's requirements
 */
function hasMeetRequirements(consumer) {
    let meet = true;
    if (consumer.MODULE_REQUIREMENTS) {
        Object.keys(consumer.MODULE_REQUIREMENTS).forEach((key) => {
            meet = meet && (systemRequirements[key] === undefined ? false : systemRequirements[key]);
        });
    }
    return meet;
}


function setup() {
    describe('Load modules with tests for consumers', () => {
        // should be loaded at the beginning of process
        consumersMap = loadConsumers();
        consumerRequirements = loadConsumersRequirements();
    });

    // purpose: consumer tests
    describe(`Consumer System setup - ${consumerHost.ip}`, () => {
        describe('Docker installation', () => {
            before(function () {
                const needDocker = consumerRequirements.DOCKER && consumerRequirements.DOCKER.indexOf(true) !== -1;
                if (!needDocker) {
                    util.logger.info('Docker is not required for testing. Skip CS setup...');
                    this.skip();
                }
            });

            it('should install docker', () => {
                // install docker - assume it does not exist
                const installCmd = 'curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh';
                return runRemoteCmdOnCS(checkDockerCmd)
                    .then((response) => {
                        if (response.includes('exists')) {
                            return Promise.resolve(); // exists, continue
                        }
                        return runRemoteCmdOnCS(installCmd);
                    })
                    .then(() => {
                        systemRequirements.DOCKER = true;
                    })
                    .catch((err) => {
                        util.logger.error(`Unable to install 'docker': ${err}`);
                        return Promise.reject(err);
                    });
            });

            it('should remove all docker "container"', () => runRemoteCmdOnCS('docker ps -a -q')
                .then((response) => {
                    if (response) {
                        return runRemoteCmdOnCS(`docker rm -f ${response}`);
                    }
                    return Promise.resolve();
                }));

            it('should remove all docker "image"', () => runRemoteCmdOnCS('docker images -q')
                .then((response) => {
                    if (response) {
                        return runRemoteCmdOnCS(`docker rmi -f ${response}`);
                    }
                    return Promise.resolve();
                }));

            it('should prune all docker "system"', () => runRemoteCmdOnCS('docker system prune -f'));

            it('should prune all docker "volume"', () => runRemoteCmdOnCS('docker volume prune -f'));
        });
    });
}

function test() {
    const methodsToCall = ['setup', 'test', 'teardown'];

    describe('Consumer Tests', () => {
        // consumers tests should be loaded already
        Object.keys(consumersMap).forEach((consumer) => {
            describe(consumer, () => {
                const consumerModule = consumersMap[consumer];
                let skipTests = false;

                before(() => {
                    skipTests = !hasMeetRequirements(consumerModule);
                    if (skipTests) {
                        util.logger.warn(`CS for Consumer Tests '${consumer}' doesn't meet requirements - skip all tests`);
                    }
                });
                beforeEach(function () {
                    // skip each test if needed. 'before all' hook doesn't work well for nested describe/it
                    if (skipTests) {
                        this.skip();
                    }
                });

                methodsToCall.forEach((method) => {
                    if (consumerModule[method]) {
                        consumerModule[method].apply(consumerModule);
                    } else {
                        util.logger.console.warn(`WARN: ConsumerTest "${consumer}" has no '${method}' method to call`);
                    }
                });
            });
        });
    });
}

function teardown() {
    // purpose: consumer tests
    describe(`Consumer host teardown - ${consumerHost.ip}`, () => {
        describe('Docker containers and images cleanup', () => {
            before(function () {
                // skip docker cleanup if docker was not installed
                if (!systemRequirements.DOCKER) {
                    util.logger.info('Docker is not required for testing. Skip CS teardown...');
                    this.skip();
                }
            });

            it('should remove all docker "container"', () => runRemoteCmdOnCS('docker ps -a -q')
                .then((response) => {
                    if (response) {
                        return runRemoteCmdOnCS(`docker rm -f ${response}`);
                    }
                    return Promise.resolve();
                }));

            it('should remove all docker "image"', () => runRemoteCmdOnCS('docker images -q')
                .then((response) => {
                    if (response) {
                        return runRemoteCmdOnCS(`docker rmi -f ${response}`);
                    }
                    return Promise.resolve();
                }));

            it('should prune all docker "system"', () => runRemoteCmdOnCS('docker system prune -f'));

            it('should prune all docker "volume"', () => runRemoteCmdOnCS('docker volume prune -f'));
        });
    });
}

module.exports = {
    setup,
    test,
    teardown
};
