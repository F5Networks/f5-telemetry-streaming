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

const declare = require('./declare');
const eventListenerHandler = require('./eventListener');
const infoHandler = require('./info');

// TODO: handlers should reside in designated folders/modules and Services should listen for events to register handlers
// as result the process will be automated instead of manual import like now

/**
 * @module restapi/handlers
 *
 * @typedef {import('../../appEvents').ApplicationEvents} ApplicationEvents
 */

/** @param {ApplicationEvents} appEvents - application events */
module.exports = function initialize(appEvents) {
    declare.initialize(appEvents);
    eventListenerHandler.initialize(appEvents);
    infoHandler.initialize(appEvents);
};
