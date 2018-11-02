/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const http = require('http');
// const logger = require('../../logger.js'); // eslint-disable-line no-unused-vars


async function translateData(data, consumer) {
    console.log('Splunk translator', data, consumer);
    return data;
}


module.exports = translateData;
