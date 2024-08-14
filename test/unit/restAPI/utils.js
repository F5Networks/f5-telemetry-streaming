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

const querystring = require('querystring');

const testUtil = require('../shared/util');

const CONTENT_TYPE = Object.freeze({
    JSON: 'application/json'
});

const HTTP_CODES = Object.freeze({
    ACCEPTED: 202,
    CREATED: 201,
    INTERNAL_SERVER_ERROR: 500,
    OK: 200,
    METHOD_NOT_ALLOWED: 405,
    NOT_FOUND: 404,
    SERVICE_UNAVAILABLE: 503,
    UNPROCESSABLE_ENTITY: 422,
    UNSUPPORTED_MEDIA_TYPE: 415
});

const HTTP_METHODS = Object.freeze({
    DELETE: 'DELETE',
    GET: 'GET',
    POST: 'POST'
});

const TELEMETRY_URI_PREFIX = '/mgmt/shared/telemetry/';
const TELEMETRY_URI = `http://localhost:8100${TELEMETRY_URI_PREFIX}`;

function buildRequest({
    body = '',
    contentType = CONTENT_TYPE.JSON,
    headers = null,
    method = HTTP_METHODS.GET,
    params = {},
    path = '/',
    rootURI = TELEMETRY_URI
}) {
    const query = querystring.stringify(params);
    if (query) {
        path = `${path}?${query}`;
    }

    if (path.startsWith('/') && rootURI.endsWith('/')) {
        path = path.slice(1);
    }

    path = `${rootURI}${path}`;

    const op = new testUtil.MockRestOperation();
    op.method = method.toUpperCase();
    op.headers = headers;
    op.parseAndSetURI(path);

    if (body) {
        op.body = body;
        op.contentType = contentType;
    }

    return op;
}

function processDeclaration(configWorker, appEvents, decl, waitFor = true) {
    return Promise.all([
        configWorker.processDeclaration(decl),
        waitFor ? appEvents.waitFor('restapi.config.applied') : Promise.resolve()
    ]);
}

function sendRequest(restWorker, request) {
    if (request.method === HTTP_METHODS.DELETE) {
        return restWorker.onDelete(request);
    }
    if (request.method === HTTP_METHODS.GET) {
        return restWorker.onGet(request);
    }
    if (request.method === HTTP_METHODS.POST) {
        return restWorker.onPost(request);
    }
    throw new Error(`Unsupported HTTP method '${request.method}'`);
}

function waitRequestComplete(restWorker, request) {
    request.startTs = Date.now();
    setImmediate(() => sendRequest(restWorker, request));
    return new Promise((resolve) => {
        request.complete.callsFake(() => {
            request.endTs = Date.now();
            request.elapsed = request.endTs - request.startTs;
            resolve();
        });
    })
        .then(() => request);
}

module.exports = {
    CONTENT_TYPE,
    HTTP_CODES,
    HTTP_METHODS,
    TELEMETRY_URI,
    TELEMETRY_URI_PREFIX,

    buildRequest,
    processDeclaration,
    sendRequest,
    waitRequestComplete
};
