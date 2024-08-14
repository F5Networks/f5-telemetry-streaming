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

/* eslint-disable no-unused-expressions */

const Recorder = require('./recorder');
const Service = require('../utils/service');

/**
 * @module declarationHistory
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 */

const EE_NAMESPACE = 'dechistory';

/**
 * Declaration History Class
 *
 * @fires reported
 */
class DeclarationHistory extends Service {
    /** Configure and start the service */
    _onStart() {
        this._recorder = new Recorder();
    }

    /** Stop the service */
    _onStop() {
        return Promise.resolve()
            .then(() => this._recorder.destroy());
    }

    /** @returns {Promise<boolean>} resolved with true when service destroyed or if it was destroyed already */
    destroy() {
        this._configUpdateListeners.forEach((listener) => listener.off());
        this._configUpdateListeners = [];

        return super.destroy()
            .then((ret) => {
                this._offMyEvents
                    && this._offMyEvents.off()
                    && (this._offMyEvents = null);

                return ret;
            });
    }

    /** @param {ApplicationEvents} appEvents - application events */
    initialize(appEvents) {
        this._configUpdateListeners = [
            'config.prevalidationSucceed', // simple pre-validation
            'config.received', // raw declaration received
            'config.validationFailed', // validation failed
            'config.validationSucceed' // full validation succeed
        ]
            .map((event) => appEvents.on(event, onConfigEvent.bind(this, event), { objectify: true }));

        this.logger.debug('Subscribed to Configuration updates.');

        this._offMyEvents = appEvents.register(this.ee, EE_NAMESPACE, [
            { recorded: 'recorded' }
        ]);
    }
}

/**
 * @this DeclarationHistory
 *
 * @param {string} event
 * @param {object} data
 * @param {object} data.declaration
 * @param {object} data.metadata
 * @param {object} data.transactionID
 */
function onConfigEvent(event, data) {
    Promise.resolve()
        .then(() => this._recorder.record(event, data))
        .catch((err) => this.logger.debugException('Unable to wirte a new declaration history entry', err))
        .then(() => this.ee.safeEmitAsync('recorded'));
}

module.exports = DeclarationHistory;
