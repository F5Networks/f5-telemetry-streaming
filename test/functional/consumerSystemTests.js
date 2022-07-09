/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');

const constants = require('./shared/constants');
const harnessUtils = require('./shared/harness');
const logger = require('./shared/utils/logger').getChild('cs');
const miscUtils = require('./shared/utils/misc');

/**
 * @module test/functional/consumerSystemTests
 */

// string -> object (consumer module)
let consumersMap = {};
// string -> array of any
let consumerRequirements = {};
// string -> boolean
const systemRequirements = {};

/**
 * Load Consumers Tests modules
 *
 * @returns {bject} mapping consumer name -> consumer module
 */
function loadConsumers() {
    const ignorePattern = miscUtils.getEnvArg(constants.ENV_VARS.TEST_CONTROLS.CONSUMER.EXCLUDE, { defaultValue: '' });
    const includePattern = miscUtils.getEnvArg(constants.ENV_VARS.TEST_CONTROLS.CONSUMER.INCLUDE, { defaultValue: '' });

    let consumerFilter;
    if (ignorePattern || includePattern) {
        logger.info('Filtering Consumers using following patterns', {
            ignore: ignorePattern,
            include: includePattern
        });

        let ignoreFilter = () => true; // accept by default
        if (ignorePattern) {
            const regex = new RegExp(ignorePattern, 'i');
            ignoreFilter = (hostname) => !hostname.match(regex);
        }
        let includeFilter = () => true; // accept by default
        if (includePattern) {
            const regex = new RegExp(includePattern, 'i');
            includeFilter = (hostname) => hostname.match(regex);
        }
        consumerFilter = (consumer) => includeFilter(consumer) && ignoreFilter(consumer);
    }

    const consumerDir = constants.CONSUMERS_DIR;
    const mapping = {};

    fs.readdirSync(consumerDir)
        .forEach((consumer) => {
            if (consumerFilter && !consumerFilter(consumer)) {
                logger.warning('Ignoring Consumer file', { consumer });
            } else {
                const cpath = `${consumerDir}/${consumer}`;
                mapping[consumer] = require(cpath); //eslint-disable-line
                logger.info(`Consumer Tests from '${cpath}' loaded`);
            }
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

/**
 * Setup CS
 */
function setup() {
    describe('Load modules with tests for consumers', () => {
        // should be loaded at the beginning of process
        consumersMap = loadConsumers();
        consumerRequirements = loadConsumersRequirements();
    });

    describe('Consumer System: Setup', () => {
        harnessUtils.getDefaultHarness().other.forEach((cs) => describe(cs.name, () => {
            describe('Docker installation', () => {
                before(function () {
                    const needDocker = consumerRequirements.DOCKER && consumerRequirements.DOCKER.indexOf(true) !== -1;
                    if (!needDocker) {
                        logger.info('Docker is not required for testing. Skip CS setup...');
                        this.skip();
                    }
                });

                it('should install docker', () => cs.docker.installed()
                    .then((isOk) => {
                        if (isOk) {
                            cs.logger.info('Docker installed already!');
                            return Promise.resolve();
                        }
                        return cs.docker.install();
                    })
                    .then(() => {
                        cs.logger.info('Docker installed!');
                        systemRequirements.DOCKER = true;
                    }));

                it('should remove all docker containers, images and etc.', () => cs.docker.removeAll());
            });
        }));
    });
}

/**
 * Run tests
 */
function test() {
    describe('Consumer Tests', () => {
        // consumers tests should be loaded already
        Object.keys(consumersMap).forEach((consumer) => {
            describe(consumer, () => {
                const consumerModule = consumersMap[consumer];
                let skipTests = false;

                before(() => {
                    skipTests = !hasMeetRequirements(consumerModule);
                    if (skipTests) {
                        logger.warning(`CS for Consumer Tests '${consumer}' doesn't meet requirements - skip all tests`);
                    }
                });
                beforeEach(function () {
                    // skip each test if needed. 'before all' hook doesn't work well for nested describe/it
                    if (skipTests) {
                        this.skip();
                    }
                });

                ['setup', 'test', 'teardown'].forEach((method) => {
                    if (consumerModule[method]) {
                        consumerModule[method].apply(consumerModule);
                    } else {
                        // eslint-disable-next-line no-console
                        console.warn(`WARN: ConsumerTest "${consumer}" has no '${method}' method to call`);
                    }
                });
            });
        });
    });
}

/**
 * Teardown CS
 */
function teardown() {
    describe('Consumer System: Teardown', () => {
        harnessUtils.getDefaultHarness().other.forEach((cs) => describe(cs.name, () => {
            describe('Docker containers and images cleanup', () => {
                before(function () {
                    // skip docker cleanup if docker was not installed
                    if (!systemRequirements.DOCKER) {
                        logger.info('Docker is not required for testing. Skip CS teardown...');
                        this.skip();
                    }
                });

                it('should remove all docker containers, images and etc.', () => cs.docker.removeAll());
            });

            describe('Other cleanup', () => {
                it('teardown all connections', () => cs.teardown());
            });
        }));
    });
}

module.exports = {
    setup,
    test,
    teardown
};
