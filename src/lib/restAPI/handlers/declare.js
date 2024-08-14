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

const configWorker = require('../../config');
const deepCopy = require('../../utils/misc').deepCopy;
const errors = require('../errors');
const CT_APP_JSON = require('../contentTypes').APP_JSON;

/**
 * @module restapi/handlers/declare
 *
 * @typedef {import('../../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../request').Request} Request
 * @typedef {import('../index').RequestHandler} RequestHandler
 * @typedef {import('../response').Response} Response
 */

/**
 * @implements {RequestHandler}
 */
class DeclareHandler {
    constructor() {
        this.hasDeclarationInProcess = false;
    }

    /** @inheritdoc */
    get name() {
        return 'Declare';
    }

    /** @inheritdoc */
    destroy() {
        this.hasDeclarationInProcess = false;
    }

    /** @inheritdoc */
    handle(req, res) {
        if (req.getMethod() === 'GET') {
            return getCurrentDeclaration.call(this, req, res);
        }

        if (this.hasDeclarationInProcess) {
            throw new errors.ServiceUnavailableError('Can\'t process new declaration while previous one is still in progress');
        }

        return applyNewDeclaration.call(this, req, res);
    }
}

/**
 * @param {Request} req
 *
 * @returns {DeclareMetadata}
 */
function makeMetadata(req) {
    const metadata = {
        message: 'Incoming declaration via REST API',
        originDeclaration: req.getBody(),
        sourceIP: req.getHeaders()['X-Forwarded-For'] || 'unknown'
    };
    const uriParams = req.getUriParams();
    if (uriParams.namespace) {
        metadata.namespace = uriParams.namespace;
    }
    return metadata;
}

/**
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise} resolved once configuration applied/saved
 */
async function applyNewDeclaration(req, res) {
    this.hasDeclarationInProcess = true;
    const metadata = makeMetadata(req);

    try {
        sendResponse(res, await (typeof metadata.namespace === 'undefined'
            ? configWorker.processDeclaration(deepCopy(metadata.originDeclaration), { metadata })
            : configWorker.processNamespaceDeclaration(
                deepCopy(metadata.originDeclaration),
                metadata.namespace,
                { metadata }
            )));
    } finally {
        this.hasDeclarationInProcess = false;
    }
}

/**
 * @param {Request} req
 * @param {Response} res
 *
 * @returns {Promise} resolved once current configuration written to the response object
 */
async function getCurrentDeclaration(req, res) {
    const declaration = await configWorker.getDeclaration(req.getUriParams().namespace);
    sendResponse(res, declaration);
}

/**
 * @param {Response} res
 * @param {object} declaration
 */
function sendResponse(res, declaration) {
    res.body = {
        message: 'success',
        declaration
    };
    res.code = 200;
    res.contentType = CT_APP_JSON;
}

module.exports = {
    /** @param {ApplicationEvents} appEvents - application events */
    initialize(appEvents) {
        appEvents.on('restapi.register', (register) => {
            const handler = new DeclareHandler();
            register('GET', '/declare', handler);
            register('POST', '/declare', handler);
            register('GET', '/namespace/:namespace/declare', handler);
            register('POST', '/namespace/:namespace/declare', handler);
        });
    }
};

/**
 * @typedef DeclareMetadata
 * @type {object}
 * @property {string} message
 * @property {string | undefined} namespace
 * @property {object} originDeclaration
 * @property {string} sourceIP
 */
