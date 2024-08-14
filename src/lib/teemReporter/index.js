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

const Service = require('../utils/service');
const TeemReporter = require('./teemReporter');

/**
 * @module teemReporter
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 */

const EE_NAMESPACE = 'teem';

/**
 * Teem Reporter Service Class
 *
 * @fires reported
 */
class TeemReporterService extends Service {
    /** Configure and start the service */
    _onStart() {
        this._reporter = new TeemReporter();
    }

    /** Stop the service */
    _onStop() {
        this._reporter = null;
    }

    /** @returns {Promise<boolean>} resolved with true when service destroyed or if it was destroyed already */
    destroy() {
        this._offConfigUpdates
            && this._offConfigUpdates.off()
            && (this._offConfigUpdates = null);

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
        this._offConfigUpdates = appEvents.on('config.prevalidated', onConfigEvent.bind(this), { objectify: true });
        this.logger.debug('Subscribed to Configuration updates.');

        this._offMyEvents = appEvents.register(this.ee, EE_NAMESPACE, [
            { reported: 'reported' }
        ]);
    }
}

/**
 * @this TeemReporterService
 *
 * @param {object} data
 * @param {object} data.declaration
 * @param {object} data.metadata
 * @param {object} data.transactionID
 */
function onConfigEvent(data) {
    Promise.resolve()
        .then(() => this._reporter.process(data.declaration))
        .catch((err) => this.logger.debugException('Unable to send analytics data', err))
        .then(() => this.ee.safeEmitAsync('reported'));
}

module.exports = TeemReporterService;
