/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const fs = require('fs');

const constants = require('../src/nodejs/constants.js');
const config = require('../src/nodejs/config.js');

const utilMock = require('../src/nodejs/util.js');

// Purpose: validate all example declarations against validator
describe('Example Declarations', () => {
    beforeEach(() => {
    });
    afterEach(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    // mocks required for ajv custom keywords, among others
    utilMock.getDeviceType = () => Promise.resolve(constants.BIG_IP_DEVICE_TYPE);
    utilMock.encryptSecret = () => Promise.resolve('foo');

    const baseDir = `${__dirname}/../examples/declarations`;
    const files = fs.readdirSync(baseDir);
    files.forEach((file) => {
        it(`should validate ${file}`, () => {
            const data = JSON.parse(fs.readFileSync(`${baseDir}/${file}`));
            return config.validate(data);
        });
    });
});
