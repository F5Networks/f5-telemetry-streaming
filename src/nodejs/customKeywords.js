/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const Ajv = require('ajv');
const constants = require('./constants.js');
const util = require('./util.js');

const textNamedKey = 'plainText';
const base64NamedKey = 'plainBase64';
const secureVaultNamedKey = 'SecureVault';

const keywords = {
    f5secret: {
        type: 'object',
        errors: true,
        modifying: true,
        async: true,
        metaSchema: {
            type: 'boolean'
        },
        // eslint-disable-next-line no-unused-vars
        compile(schema, parentSchema) {
            // eslint-disable-next-line no-unused-vars
            return function (data, dataPath, parentData, propertyName, rootData) {
                const ajvErrors = [];

                // we handle a number of passphrase object in this function, the following describes each of them
                // 'cipherText': this means we plan to store a plain text secret locally, which requires we encrypt
                // it first. This also assumes that we are running on a BIG-IP where we have the means to do so
                // 'environmentVar': undefined

                // handle 'environmentVar' passphrase object
                if (data[constants.PASSPHRASE_ENVIRONMENT_VAR] !== undefined) {
                    return Promise.resolve(true);
                }

                // handle 'cipherText' passphrase object
                // if data is already encrypted just return
                if (data.protected === secureVaultNamedKey) {
                    return Promise.resolve(true);
                }

                // base64 decode before encrypting - if needed
                if (data.protected === base64NamedKey) {
                    data[constants.PASSPHRASE_CIPHER_TEXT] = util.base64('decode', data[constants.PASSPHRASE_CIPHER_TEXT]);
                    data.protected = textNamedKey;
                }

                return util.getDeviceType()
                    .then((deviceType) => {
                        // check if on a BIG-IP and fail validation if not
                        if (deviceType !== constants.BIG_IP_DEVICE_TYPE) {
                            throw new Error(`Specifying '${constants.PASSPHRASE_CIPHER_TEXT}' requires running on ${constants.BIG_IP_DEVICE_TYPE}`);
                        }
                        // encrypt secret
                        return util.encryptSecret(data[constants.PASSPHRASE_CIPHER_TEXT]);
                    })
                    .then((secret) => {
                        // update text field with secret - should we base64 encode?
                        data[constants.PASSPHRASE_CIPHER_TEXT] = secret;
                        // set protected key - in case we return validated schema to requestor
                        data.protected = secureVaultNamedKey;

                        // notify success
                        return true;
                    })
                    .catch((e) => {
                        ajvErrors.push({ keyword: 'f5secret', message: e.message, params: {} });
                        throw new Ajv.ValidationError(ajvErrors);
                    });
            };
        }
    }
};

module.exports = keywords;
