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

const CT_APP_JSON = require('../contentTypes').APP_JSON;
const dataPublisher = require('../../eventListener/dataPublisher');

// TODO: consider move the module next to eventListener folder/module

/**
 * @module restapi/handlers/eventListener
 *
 * @typedef {import('../../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../index').RequestHandler} RequestHandler
 */

/**
 * @implements {RequestHandler}
 */
const handler = Object.freeze({
    /** @inheritdoc */
    async handle(req, res) {
        const data = req.getBody();
        const uriParams = req.getUriParams();

        await dataPublisher.sendDataToListener(
            data,
            uriParams.eventListener,
            { namespace: uriParams.namespace }
        );

        res.body = {
            data,
            message: 'success'
        };
        res.code = 200;
        res.contentType = CT_APP_JSON;
    },
    name: 'Event Listener'
});

module.exports = {
    /** @param {ApplicationEvents} appEvents - application events */
    initialize(appEvents) {
        appEvents.on('restapi.register', (register, config) => {
            if (config.debug) {
                register('POST', '/eventListener/:eventListener', handler);
                register('POST', '/namespace/:namespace/eventListener/:eventListener', handler);
            }
        });
    }
};
