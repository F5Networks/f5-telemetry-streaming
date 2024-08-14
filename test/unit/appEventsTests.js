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

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const sinon = require('sinon');

const assert = require('./shared/assert');
const sourceCode = require('./shared/sourceCode');
const stubs = require('./shared/stubs');
const testUtils = require('./shared/util');

const AppEvents = sourceCode('src/lib/appEvents');
const SafeEventEmitter = sourceCode('src/lib/utils/eventEmitter');

moduleCache.remember();

describe('Application Events', () => {
    let coreStub;
    let events;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({
            logger: true
        }, {
            logger: {
                setToVerbose: true,
                ignoreLevelChange: false
            }
        });

        events = new AppEvents();
    });

    afterEach(() => {
        events.stop();
        sinon.restore();
    });

    it('should emit events (reuse origin name)', () => {
        const t1 = new SafeEventEmitter();
        const spy = sinon.spy();

        assert.deepStrictEqual(events.registeredEvents, []);

        events.register(t1, 'namespace', ['event1']);
        events.on('namespace.event1', () => {
            t1.emit('done');
            spy();
        });

        assert.deepStrictEqual(events.registeredEvents, ['namespace.event1']);

        setTimeout(() => t1.emit('event1'), 10);
        return t1.waitFor('done')
            .then(() => {
                assert.deepStrictEqual(spy.callCount, 1);
                assert.includeMatch(coreStub.logger.messages.debug, /Emitting event "namespace\.event1" \(event1\)/);
            });
    });

    it('should emit events (name mapping)', () => {
        const t1 = new SafeEventEmitter();
        const spy = sinon.spy();

        assert.deepStrictEqual(events.registeredEvents, []);
        events.register(t1, 'namespace', ['event1', { origin: 'proxied' }]);
        events.on('namespace.proxied', () => {
            t1.emit('done');
            spy();
        });

        assert.deepStrictEqual(events.registeredEvents, [
            'namespace.event1',
            'namespace.proxied'
        ]);

        setTimeout(() => t1.emit('origin'), 10);
        return t1.waitFor('done')
            .then(() => {
                assert.deepStrictEqual(spy.callCount, 1);
                assert.includeMatch(coreStub.logger.messages.debug, /Emitting event "namespace\.proxied" \(origin\)/);
            });
    });

    it('should unregister event proxy', () => {
        const t1 = new SafeEventEmitter();
        const t2 = new SafeEventEmitter();
        const spy = sinon.spy();
        const off1 = events.register(t1, 'namespace', ['event1', { origin1: 'proxied' }]);
        const off2 = events.register(t2, 'namespace', ['event1', { origin2: 'proxied' }]);
        const off3 = events.register(t1, 'namespace2', ['event2', { origin3: 'proxied2' }]);
        const off4 = events.register(t2, 'namespace2', ['event2', { origin4: 'proxied2' }]);

        events.on('namespace.proxied', () => {
            t1.emit('done');
            spy();
        });

        // t1 + t2 events
        assert.deepStrictEqual(events.registeredEvents, [
            'namespace.event1',
            'namespace.proxied',
            'namespace2.event2',
            'namespace2.proxied2'
        ]);

        setTimeout(() => t1.emit('origin1'), 10);
        return t1.waitFor('done')
            .then(() => {
                assert.includeMatch(coreStub.logger.messages.debug, /Emitting event "namespace\.proxied" \(origin1\)/);
                assert.deepStrictEqual(spy.callCount, 1);
                off1.off();
                off3.off();

                // t2 events left only
                assert.deepStrictEqual(events.registeredEvents, [
                    'namespace.event1',
                    'namespace.proxied',
                    'namespace2.event2',
                    'namespace2.proxied2'
                ]);

                coreStub.logger.removeAllMessages();
                setTimeout(() => t1.emit('origin2'), 10);
                return testUtils.sleep(30);
            })
            .then(() => {
                off2.off();
                off4.off();

                assert.deepStrictEqual(events.registeredEvents, []);

                assert.notIncludeMatch(coreStub.logger.messages.debug, /Emitting event "namespace\.proxied" \(origin2\)/);
                assert.deepStrictEqual(spy.callCount, 1);
                assert.doesNotThrow(() => off1.off());
            });
    });

    it('should remove all listeners', () => {
        const t1 = new SafeEventEmitter();
        const spy = sinon.spy();

        events.register(t1, 'namespace', ['event1', { origin: 'proxied' }]);
        events.on('namespace.proxied', () => {
            t1.emit('done');
            spy();
        });

        assert.deepStrictEqual(events.registeredEvents, [
            'namespace.event1',
            'namespace.proxied'
        ]);

        setTimeout(() => t1.emit('origin'), 10);
        return t1.waitFor('done')
            .then(() => {
                assert.includeMatch(coreStub.logger.messages.debug, /Emitting event "namespace\.proxied" \(origin\)/);
                assert.deepStrictEqual(spy.callCount, 1);

                events.stop();
                coreStub.logger.removeAllMessages();
                setTimeout(() => t1.emit('origin'), 10);
                return testUtils.sleep(30);
            })
            .then(() => {
                assert.deepStrictEqual(events.registeredEvents, []);
                assert.notIncludeMatch(coreStub.logger.messages.debug, /Emitting event "namespace\.proxied" \(origin\)/);
                assert.deepStrictEqual(spy.callCount, 1);
                assert.doesNotThrow(() => events.stop());
            });
    });

    it('should work with wildcards', () => {
        const t1 = new SafeEventEmitter();
        const counters = {};

        events.register(t1, 'namespace', ['event1', 'event2', 'event3.subevent']);
        events.on('*.event1', () => {
            counters['*.event1'] = (counters['*.event1'] || 0) + 1;
        });
        events.on('namespace.event1', () => {
            counters['namespace.event1'] = (counters['namespace.event1'] || 0) + 1;
        });
        events.on('namespace.*', () => {
            counters['namespace.*'] = (counters['namespace.*'] || 0) + 1;
        });
        events.on('namespace.*.subevent', () => {
            counters['namespace.*.subevent'] = (counters['namespace.*.subevent'] || 0) + 1;
        });
        events.on('*.*.subevent', () => {
            counters['*.*.subevent'] = (counters['*.*.subevent'] || 0) + 1;
        });
        events.on('**.subevent', () => {
            counters['**.subevent'] = (counters['**.subevent'] || 0) + 1;
        });
        events.on('namespace.**', () => {
            counters['namespace.**'] = (counters['namespace.**'] || 0) + 1;
        });
        t1.emit('event1');
        t1.emit('event2');
        t1.emit('event3.subevent');

        return testUtils.sleep(10)
            .then(() => {
                assert.deepStrictEqual(counters, {
                    '*.event1': 1,
                    '**.subevent': 1,
                    '*.*.subevent': 1,
                    'namespace.*': 2,
                    'namespace.**': 3,
                    'namespace.*.subevent': 1,
                    'namespace.event1': 1
                });
            });
    });

    it('should wait for event', () => {
        const t1 = new SafeEventEmitter();
        const spy = sinon.spy();

        events.register(t1, 'namespace', ['event1', 'done']);
        events.on('namespace.event1', () => {
            t1.emit('done');
            spy();
        });

        setTimeout(() => t1.emit('event1'), 10);
        return events.waitFor('namespace.done')
            .then(() => {
                assert.deepStrictEqual(spy.callCount, 1);
                assert.includeMatch(coreStub.logger.messages.debug, /Emitting event "namespace\.event1" \(event1\)/);
            });
    });
});
