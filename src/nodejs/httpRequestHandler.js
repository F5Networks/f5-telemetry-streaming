/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const http = require('http');
const log = require('./logger.js'); // eslint-disable-line no-unused-vars

const get = function (uri) {
    const options = {
        host: 'localhost',
        port: 8100,
        path: uri,
        headers: {
            Authorization: `Basic ${new Buffer('admin:').toString('base64')}`
        }
    };
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        }).on('error', (e) => {
            reject(e);
        });
        req.end();
    });
};

module.exports = {
    get: get // eslint-disable-line object-shorthand
};
