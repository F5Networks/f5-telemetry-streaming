/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses

'use strict';

const fs = require('fs');

const constants = require('./shared/constants');
const util = require('./shared/util');

// string -> object (consumer module)
let pullConsumersMap = {};

function loadPullConsumers() {
    // env var to run only specific pull consumer type(s) (e.g. 'default')
    const pullConsumerFilter = process.env[constants.ENV_VARS.PULL_CONSUMER_HARNESS.TYPE_REGEX];
    const pullConsumerDir = constants.PULL_CONSUMERS_DIR;
    let pullConsumers = fs.readdirSync(pullConsumerDir);

    // filter consumers by module name if needed
    if (pullConsumerFilter) {
        util.logger.info(`Using filter '${pullConsumerFilter}' to filter modules from '${pullConsumerDir}'`);
        pullConsumers = pullConsumers.filter((fName) => fName.match(new RegExp(pullConsumerFilter, 'i')) !== null);
    }

    const mapping = {};
    pullConsumers.forEach((pullConsumer) => {
        const cpath = `${pullConsumerDir}/${pullConsumer}`;
        mapping[pullConsumer] = require(cpath); //eslint-disable-line
        util.logger.info(`Pull Consumer Tests from '${cpath}' loaded`);
    });
    return mapping;
}

function setup() {
    describe('Load modules with tests for consumers', () => {
        // should be loaded at the beginning of process
        pullConsumersMap = loadPullConsumers();
    });
}

function test() {
    const methodsToCall = ['test'];

    describe('Pull Consumer Tests', () => {
        // consumers tests should be loaded already
        Object.keys(pullConsumersMap).forEach((consumer) => {
            describe(consumer, () => {
                const consumerModule = pullConsumersMap[consumer];

                methodsToCall.forEach((method) => {
                    if (consumerModule[method]) {
                        consumerModule[method].apply(consumerModule);
                    } else {
                        util.logger.console.warn(`WARN: Pull Consumer Test "${consumer}" has no '${method}' method to call`);
                    }
                });
            });
        });
    });
}

module.exports = {
    setup,
    test
};
