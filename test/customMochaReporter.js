/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-console */

const mocha = require('mocha');
const fileLogger = require('./winstonLogger').logger; // logs to file directly (nothing will be printed to stdout/stderr)

const Base = mocha.reporters.Base;
const color = Base.color;

module.exports = CustomMochaReporter;

// based on mocha.reporters.Spec code
function CustomMochaReporter(runner, options) {
    Base.call(this, runner, options);

    const self = this;
    let indents = 0;
    let failedTests = 0;
    /**
     * Structure to store info about test execution.
     * Properties:
     *  - title - test title
     *  - attempts - number of attempts
     *  - startTime - time when test started
     *  - endTime - time when test finished (after all retries)
     */
    let currentTest = {};

    function indent() {
        return Array(indents).join('  ');
    }

    runner.on('start', () => {
        console.info();
    });

    runner.on('suite', (suite) => {
        indents += 1;
        console.info(color('suite', '%s%s'), indent(), suite.title);
    });

    runner.on('suite end', () => {
        indents -= 1;
        if (indents === 1) {
            console.info();
        }
    });
    // test pending
    runner.on('pending', (test) => {
        const fmt = indent() + color('pending', '  - %s');
        console.info(fmt, test.title);
    });
    // test start
    runner.on('test', (test) => {
        if (test.title !== currentTest.title) {
            currentTest = {
                title: test.title,
                attempts: 0,
                startTime: Date.now()
            };
        }
        fileLogger.info(`${currentTest.attempts ? 'Retrying' : 'Starting'} test - ${currentTest.title}`);
        currentTest.attempts += 1;
    });

    runner.on('pass', (test) => {
        let fmt = indent() + color('checkmark', `  ${Base.symbols.ok}`) + color('pass', ' %s');
        const fmtArgs = [test.title];
        currentTest.endTime = Date.now();

        if (test.speed !== 'fast') {
            fmt += color(test.speed, ' (%dms)');
            fmtArgs.push(test.duration);
        }
        if (currentTest.attempts > 1) {
            fmt += color('fail', ' (attempts=%d duration=%dms)');
            fmtArgs.push(currentTest.attempts, currentTest.endTime - currentTest.startTime);
        }
        currentTest = {};
        fmtArgs.unshift(fmt);
        console.info.apply(console, fmtArgs);
        fileLogger.info(`PASSED: ${test.title}`);
    });

    runner.on('retry', (test, err) => {
        fileLogger.error(`RETRY-ERROR: ${test.title}\n${err.message || err}\n${err.stack}`);
    });

    runner.on('fail', (test) => {
        failedTests += 1;
        currentTest.endTime = Date.now();

        let fmt = indent() + color('fail', '  %d) %s');
        const fmtArgs = [failedTests, test.title];

        if (currentTest.attempts > 1) {
            fmt += color('fail', ' (attempts=%d duration=%dms)');
            fmtArgs.push(currentTest.attempts, currentTest.endTime - currentTest.startTime);
        }
        currentTest = {};
        fmtArgs.unshift(fmt);
        console.error.apply(console, fmtArgs);
        fileLogger.info(`FAILED: ${test.title}`);
    });

    runner.once('end', self.epilogue.bind(self));
}

mocha.utils.inherits(CustomMochaReporter, Base);
