/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const logger = require('./logger.js'); // eslint-disable-line no-unused-vars

/**
 * LX rest operation responder
 *
 * @param {Object} restOperation - restOperation to complete
 * @param {Sting} status         - HTTP status
 * @param {Sting} body           - HTTP body
 *
 * @returns {void}
 */
function restOperationResponder(restOperation, status, body) {
    restOperation.setStatusCode(status);
    restOperation.setBody(body);
    restOperation.complete();
}

module.exports = {
    restOperationResponder: restOperationResponder // eslint-disable-line object-shorthand
};
