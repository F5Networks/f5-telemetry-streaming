/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const fs = require('fs');

const constants = require('../src/nodejs/constants.js');

/* eslint-disable global-require */

// purpose: validate all example declarations against validator
describe('Example Declarations', () => {
    let util;
    let config;

    before(() => {
        util = require('../src/nodejs/util.js');
        config = require('../src/nodejs/config.js');
    });
    beforeEach(() => {
        // mocks required for ajv custom keywords, among others
        util.getDeviceType = () => Promise.resolve(constants.BIG_IP_DEVICE_TYPE);
        util.encryptSecret = () => Promise.resolve('foo');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    const baseDir = `${__dirname}/../examples/declarations`;
    const files = fs.readdirSync(baseDir);
    files.forEach((file) => {
        it(`should validate ${file}`, () => {
            const data = JSON.parse(fs.readFileSync(`${baseDir}/${file}`));
            return config.validate(data);
        });
    });
});
