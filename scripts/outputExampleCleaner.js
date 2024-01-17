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

const fs = require('fs');

/** Intent: Provide a script that automates the cleaning of example output for
 *    consumption by public docs
 *  Dependency: Assume a standard BIG-IP config exists so output is well defined,
 *    essentially meaning this script is paring back and never adding content
 *  Expectations:
 *    - All integers should be set to a standard value
 *    - All timestamps should be set to a standard value
 *    - ?
 */

class Logger {
    log(msg) {
        console.log(msg); // eslint-disable-line no-console
    }

    info(msg) {
        this.log(msg);
    }
}

// these defaults could be placed in a separate file as they will change over time
const DEFAULT_INTEGER = 0;
const DEFAULT_TIMESTAMP = '2019-01-01T01:01:01Z'; // different formats?
const TIMESTAMP_KEYS = ['systemTimestamp', 'expirationString', 'cycleStart', 'cycleEnd'];

/**
 * Output Class - used to clean example(s)
 *
 */
class Output {
    /**
     * Constructor
     *
     * @param {Logger} logger - logger
     * @param {string} inputFile - path to input file
     */
    constructor(logger, inputFile) {
        this.inputFile = inputFile;
        this.logger = logger;
        this.inputData = {};
    }

    /**
     * Opens file and returns contents
     *
     * @param {string} file - file location
     */
    openFile(file) {
        let contents = fs.readFileSync(file);
        try {
            contents = JSON.parse(contents);
        } catch (error) {
            // continue
        }
        return contents;
    }

    /**
     * Print output to stdout
     */
    printOutput() {
        let data;
        try {
            data = JSON.stringify(this.inputData, null, 4);
        } catch (error) {
            // well, we tried
        }
        process.stdout.write(data);
        process.stdout.write('\n');
    }

    /**
     * Reset integers
     *
     * @param {Object} data - data
     */
    resetIntegers(data) {
        if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach((k) => {
                if (Number.isInteger(data[k])) {
                    data[k] = DEFAULT_INTEGER;
                } else {
                    data[k] = this.resetIntegers(data[k]);
                }
            });
        }
        return data;
    }

    /**
     * Reset timestamps
     *
     * @param {Object} data - data
     */
    resetTimestamps(data) {
        if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach((k) => {
                if (TIMESTAMP_KEYS.indexOf(k) !== -1 && Date.parse(data[k])) {
                    data[k] = DEFAULT_TIMESTAMP;
                } else {
                    data[k] = this.resetTimestamps(data[k]);
                }
            });
        }
        return data;
    }

    /**
     * Main function to perform cleaning
     */
    clean() {
        this.logger.info(`Opening input file: ${this.inputFile}`);
        this.inputData = this.openFile(this.inputFile);

        this.logger.info('Cleaning data');
        this.resetIntegers(this.inputData);
        this.resetTimestamps(this.inputData);

        this.logger.info(`Saving output file: ${this.outputFile}`);
        this.printOutput();
    }
}

if (require.main === module) {
    // run as script

    /**
     * Grab command line arguments
     */
    if (process.argv.length < 3) {
        throw new Error(`${__filename} inputFile`);
    }
    new Output(new Logger(), process.argv[2]).clean();
}

module.exports = {
    Output
};
