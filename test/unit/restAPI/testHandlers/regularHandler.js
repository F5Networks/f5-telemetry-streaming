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

const CONTENT_TYPE = require('../utils').CONTENT_TYPE;
const sleep = require('../../shared/util').sleep;

const handler = Object.freeze({
    handle(req, res) {
        if (!req.getQueryParams().nocode) {
            res.code = req.getQueryParams().code ? parseInt(req.getQueryParams().code, 10) : 200;
        }
        res.contentType = CONTENT_TYPE.JSON;
        res.body = {
            method: req.getMethod()
        };
        if (req.getQueryParams().headers) {
            res.body.headers = req.getHeaders();
        }
        if (req.getBody()) {
            res.body.body = req.getBody();
        }
        if (req.getQueryParams().async) {
            return Promise.resolve();
        }
        if (req.getQueryParams().sleep) {
            return sleep(parseInt(req.getQueryParams().sleep, 10));
        }
        return undefined;
    },
    destroy(method, uri) {
        if (method === 'DELETE') {
            throw new Error('expected sync destroy error');
        }
        if (method === 'GET' && uri.includes('noleadingslash')) {
            return Promise.reject(new Error('expected async destroy error'));
        }
        return Promise.resolve();
    },
    name: 'Regular'
});

const debugHandler = Object.freeze({
    handle(req, res) {
        res.code = req.getQueryParams().code ? parseInt(req.getQueryParams().code, 10) : 200;
        res.body = {
            debug: true,
            method: req.getMethod()
        };
        if (req.getQueryParams().async) {
            return Promise.resolve();
        }
        return undefined;
    },
    name: 'RegularDebug'
});

const uriParamsHandler = Object.freeze({
    handle(req, res) {
        res.code = 200;
        res.contentType = CONTENT_TYPE.JSON;
        res.body = {
            params: req.getUriParams()
        };
    }
});

module.exports = {
    initialize(routerEE) {
        routerEE.on('restapi.register', (register, config) => {
            register(['GET', 'DELETE'], '/regular', handler);
            register('POST', '/regular', handler);
            register('GET', 'noleadingslash', handler);
            register('GET', '/regular/another', handler);
            // eslint-disable-next-line no-unused-expressions
            config.debug && register('POST', '/regular/debug', debugHandler);
            register('GET', '/regular/debug', debugHandler);
            register('GET', '/regular/:required1/subpath/:required2/:optional?', uriParamsHandler);
        });
    }
};
