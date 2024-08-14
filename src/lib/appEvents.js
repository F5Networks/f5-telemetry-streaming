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
/* eslint-disable no-plusplus */

'use strict';

const assert = require('./utils/assert');
const logger = require('./logger').getChild('applicationEvents');
const SafeEventEmitter = require('./utils/eventEmitter');

/**
 * Listener Class for proxied events
 *
 * @private
 *
 * @property {ApplicationEvents} emitter
 * @property {SafeEventEmitter} target
 * @property {Object<string, string>} events
 */
class Listener {
    constructor(emitter, target, events) {
        this.emitter = emitter;
        this.events = events;
        this.target = target;
    }

    off() {
        const idx = this.emitter._listeners.indexOf(this);
        if (idx > -1) {
            Object.keys(this.events).forEach((oevt) => {
                this.emitter._ee.stopListeningTo(this.target, oevt);
                this.emitter.logger.debug(`Unregistered event "${this.events[oevt]}"`);

                const tevt = this.events[oevt];
                assert.exist(this.emitter._eventsMap[tevt], `target event "${tevt}"`);

                if (this.emitter._eventsMap[tevt] <= 1) {
                    delete this.emitter._eventsMap[tevt];
                } else {
                    this.emitter._eventsMap[tevt] -= 1;
                }
            });
            this.emitter._listeners.splice(idx, 1);
        }
        return this;
    }
}

/**
 * Class application events
 */
class ApplicationEvents {
    constructor() {
        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            logger: {
                value: logger
            }
        });

        this._ee = new SafeEventEmitter({ wildcard: true });
        this._ee.logger = this.logger;
        this._listeners = [];
        this._eventsMap = {};
    }

    /** @returns {string[]} list of registered events */
    get registeredEvents() {
        return Object.keys(this._eventsMap);
    }

    /**
     * Adds a listener to the end of the listeners array for the specified event
     *
     * @see eventEmitter2.prototype.on() for params and return info
     */
    on(...rest) {
        return this._ee.on(...rest);
    }

    /**
     * Register external emitter
     *
     * @param {SafeEventEmitter} target
     * @param {string} namespace
     * @param {string[] | Object<string, string>[]} events
     *
     * @returns {function} callback to call to stop events proxying
     */
    register(target, namespace, events) {
        assert.string(namespace, 'namespace');
        assert.array(events, 'events');
        assert.not.empty(events, 'events');

        const map = {};
        events.forEach((evt) => {
            let oevt;
            let tevt;

            if (typeof evt === 'object') {
                [oevt, tevt] = Object.entries(evt)[0];
            } else {
                oevt = evt;
                tevt = evt;
            }

            assert.string(oevt, 'origin event');
            assert.string(tevt, 'target event');

            tevt = `${namespace}.${tevt}`;
            map[oevt] = tevt;

            this._eventsMap[tevt] = (this._eventsMap[tevt] || 0) + 1;
        });

        Object.values(map)
            .forEach((event) => this.logger.debug(`Registered event "${event}"`));

        this._ee.listenTo(target, map, {
            reducers: (event) => {
                this.logger.debug(`Emitting event "${event.name}" (${event.original})`);
            }
        });

        return this._listeners[this._listeners.push(new Listener(this, target, map)) - 1];
    }

    /**
     * Stop listening and proxying all events
     */
    stop() {
        this._ee.removeAllListeners();
        this._listeners.forEach((listener) => listener.off());
        this._listeners = [];
    }

    /**
     * Returns a thenable object (promise interface) that resolves when a specific event occurs
     *
     * @see eventEmitter2.prototype.waitFor() for params and return info
     */
    waitFor(...rest) {
        return this._ee.waitFor(...rest);
    }
}

module.exports = ApplicationEvents;
