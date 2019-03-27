/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const fs = require('fs');
const options = require('commander');

/** Intent: Provide a script that automates the cleaning of example output for
 *    consumption by public docs
 *  Dependency: Assume a standard BIG-IP config exists so output is well defined,
 *    essentially meaning this script is paring back and never adding content
 *  Expectations:
 *    - All integers should be set to a standard value
 *    - All timestamps should be set to a standard value
 *    - ?
 */


// TODO: placeholder - should use winston
class Logger {
    log(msg) {
        console.log(msg); // eslint-disable-line no-console
    }

    info(msg) {
        this.log(msg);
    }
}

// these defaults could be placed in a seperate file as they will change over time
const DEFAULT_INTEGER = 0;
const DEFAULT_TIMESTAMP = '2019-01-01T01:01:01Z'; // different formats?
const TIMESTAMP_KEYS = ['systemTimestamp', 'expirationString', 'cycleStart', 'cycleEnd'];

/**
 * Output Class - used to clean example(s)
 *
 */
class Output {
    constructor(logger, inputFile, outputFile) {
        this.inputFile = inputFile;
        this.outputFile = outputFile;
        this.logger = logger;
        this.inputData = {};
    }

    /**
     * Opens file and returns contents
     *
     * @param {String} file - file location
     *
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
     * Saves file to disk
     *
     * @param {String} file - file location
     *
     */
    saveFile(file) {
        let data;
        try {
            data = JSON.stringify(this.inputData, null, 4);
        } catch (error) {
            // well, we tried
        }
        return fs.writeFileSync(file, data);
    }

    /**
     * Reset integers
     *
     * @param {Object} data - data
     *
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
     *
     */
    resetTimestamps(data) {
        if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach((k) => {
                if (TIMESTAMP_KEYS.includes(k) && Date.parse(data[k])) {
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
     *
     */
    clean() {
        this.logger.info(`Opening input file: ${this.inputFile}`);
        this.inputData = this.openFile(this.inputFile);

        this.logger.info('Cleaning data');
        this.resetIntegers(this.inputData);
        this.resetTimestamps(this.inputData);

        this.logger.info(`Saving output file: ${this.outputFile}`);
        this.saveFile(this.outputFile);
    }
}

if (require.main === module) {
    // run as script

    /**
     * Grab command line arguments
     */
    options
        .version('1.0.0', '-v, --version')
        .option('--log-level [value]', 'Specify the log level', 'info')
        .option('--input-file [value]', 'Specify the input file', '../examples/output/system_poller/output.json')
        .option('--output-file [value]', 'Specify the output file', '../examples/output/system_poller/output.json')
        .parse(process.argv);

    const inputFile = `${__dirname}/${options.inputFile}`;
    const outputFile = `${__dirname}/${options.outputFile}`;

    const logger = new Logger();
    const output = new Output(logger, inputFile, outputFile);
    output.clean();
} else {
    module.exports = {
        Output
    };
}
