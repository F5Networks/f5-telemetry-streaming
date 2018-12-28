/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

const assert = require('assert');
const fs = require('fs');

const constants = require('../src/nodejs/constants.js');

/* eslint-disable global-require */

// purpose: validate different declarations against validator
describe('Declarations', () => {
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

    // first let's validate all example declarations
    const baseDir = `${__dirname}/../examples/declarations`;
    const files = fs.readdirSync(baseDir);
    files.forEach((file) => {
        it(`should validate example: ${file}`, () => {
            const data = JSON.parse(fs.readFileSync(`${baseDir}/${file}`));
            return config.validate(data);
        });
    });

    it('should fail cipherText with wrong device type', () => {
        util.getDeviceType = () => Promise.resolve(constants.CONTAINER_DEVICE_TYPE);

        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                passphrase: {
                    cipherText: 'mycipher'
                }
            }
        };

        return config.validate(data)
            .then(() => {
                assert.fail('Should throw an error');
            })
            .catch((err) => {
                if (err.code === 'ERR_ASSERTION') return Promise.reject(err);
                return Promise.resolve(); // resolve, expected an error
            });
    });

    it('should not reencrypt', () => {
        const cipher = '$M$foo';
        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                passphrase: {
                    cipherText: cipher,
                    protected: 'SecureVault'
                }
            }
        };

        return config.validate(data)
            .then(() => {
                assert.strictEqual(data.My_Poller.passphrase.cipherText, cipher);
            })
            .catch(err => Promise.reject(err));
    });

    it('should base64 decode cipherText', () => {
        util.encryptSecret = secret => Promise.resolve(secret);

        const cipher = 'ZjVzZWNyZXQ='; // f5secret
        const data = {
            class: 'Telemetry',
            My_Poller: {
                class: 'Telemetry_System_Poller',
                passphrase: {
                    cipherText: cipher,
                    protected: 'plainBase64'
                }
            }
        };

        return config.validate(data)
            .then(() => {
                assert.strictEqual(data.My_Poller.passphrase.cipherText, 'f5secret');
            })
            .catch(err => Promise.reject(err));
    });
});
