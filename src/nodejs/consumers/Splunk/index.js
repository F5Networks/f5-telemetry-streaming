/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars
const forwarder = require('./forwarder.js');
const translator = require('./translator.js');

module.exports = function (context) {
    logger.debug('Received data');
    translator(context.data, context.config)
        .then(translatedData => forwarder(translatedData, context.config))
        .catch((err) => {
            logger.exception('Data processing error.', err);
        });
};
