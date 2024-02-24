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
const moduleCache = require('../../shared/restoreCache')();

const assert = require('../../shared/assert');
const sourceCode = require('../../shared/sourceCode');

const CircularLinkedList = sourceCode('src/lib/utils/structures').CircularLinkedList;
const CircularLinkedListMR = sourceCode('src/lib/utils/structures').CircularLinkedListMR;

moduleCache.remember();

describe('Structures / Circular Linked List', () => {
    [
        CircularLinkedList,
        CircularLinkedListMR
    ].forEach((Cls) => describe(`${Cls.name}`, () => {
        describe('initialization', () => {
            it('should create list with default size equal Number.MAX_SAFE_INTEGER', () => {
                const cl = new Cls();
                assert.deepStrictEqual(cl.size, Number.MAX_SAFE_INTEGER, 'should use default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.isFalse(cl.ring, 'should have ring disabled by default');
            });

            it('should throw error on incorrect size', () => {
                assert.throws(() => new Cls(-1));
                assert.throws(() => new Cls(0));
                assert.throws(() => new Cls(NaN));
                assert.throws(() => new Cls(false));
                assert.throws(() => new Cls(Number.MAX_VALUE));
            });

            it('should allow to specify size', () => {
                let cl = new Cls(10);
                assert.deepStrictEqual(cl.size, 10, 'should use provided size');

                cl = new Cls(1);
                assert.deepStrictEqual(cl.size, 1, 'should use provided size');
            });
        });

        describe('non-ring', () => {
            it('should do basic operations', () => {
                const cl = new Cls();
                assert.deepStrictEqual(cl.size, Number.MAX_SAFE_INTEGER, 'should use default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.isFalse(cl.ring, 'should have ring disabled by default');

                cl.push(0);
                assert.lengthOf(cl, 1, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 0);
                assert.deepStrictEqual(cl.fpeak(), 0);

                cl.push(1);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 0);
                assert.deepStrictEqual(cl.fpeak(), 1);
                assert.deepStrictEqual(cl.size, Number.MAX_SAFE_INTEGER, 'should use default size value');

                cl.push(2);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 0);
                assert.deepStrictEqual(cl.fpeak(), 2);

                assert.deepStrictEqual(cl.pop(), 0, 'should pop element');
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 1);
                assert.deepStrictEqual(cl.fpeak(), 2);

                assert.deepStrictEqual(cl.pop(), 1, 'should pop element');
                assert.lengthOf(cl, 1, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 2);
                assert.deepStrictEqual(cl.fpeak(), 2);
                assert.deepStrictEqual(cl.size, Number.MAX_SAFE_INTEGER, 'should use default size value');

                assert.deepStrictEqual(cl.pop(), 2, 'should pop element');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.size, Number.MAX_SAFE_INTEGER, 'should use default size value');

                cl.push(0);
                cl.push(1);
                cl.push(2);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 0);
                assert.deepStrictEqual(cl.fpeak(), 2);

                cl.erase();
                assert.lengthOf(cl, 0, 'should be empty');
            });
        });

        describe('ring', () => {
            it('should be able to work with size = 1', () => {
                const cl = new Cls(1);

                cl.push(0);
                cl.push(1);
                cl.push(2);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 0);
                assert.deepStrictEqual(cl.fpeak(), 2);

                cl.enableRing();
                assert.isTrue(cl.ring);

                assert.deepStrictEqual(cl.push(3), 0);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 1);
                assert.deepStrictEqual(cl.fpeak(), 3);

                assert.deepStrictEqual(cl.push(4), 1);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 2);
                assert.deepStrictEqual(cl.fpeak(), 4);

                assert.deepStrictEqual(cl.pop(), 2);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 3);
                assert.deepStrictEqual(cl.fpeak(), 4);

                assert.deepStrictEqual(cl.push(5), 3);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 4);
                assert.deepStrictEqual(cl.fpeak(), 5);

                assert.deepStrictEqual(cl.pop(), 4);
                assert.lengthOf(cl, 1, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 5);
                assert.deepStrictEqual(cl.fpeak(), 5);

                assert.deepStrictEqual(cl.push(6), 5);
                assert.lengthOf(cl, 1, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 6);
                assert.deepStrictEqual(cl.fpeak(), 6);

                assert.deepStrictEqual(cl.pop(), 6);
                assert.lengthOf(cl, 0, 'should be empty');

                assert.deepStrictEqual(cl.push(7), undefined);
                assert.lengthOf(cl, 1, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 7);
                assert.deepStrictEqual(cl.fpeak(), 7);

                assert.deepStrictEqual(cl.push(8), 7);
                assert.lengthOf(cl, 1, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 8);
                assert.deepStrictEqual(cl.fpeak(), 8);

                cl.disableRing();

                assert.deepStrictEqual(cl.push(9), undefined);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 8);
                assert.deepStrictEqual(cl.fpeak(), 9);

                cl.erase();
                assert.lengthOf(cl, 0, 'should be empty');
                assert.isFalse(cl.ring, 'should disable ring on erase');
            });

            it('should be able to work with size = 2', () => {
                const cl = new Cls(2);

                cl.push(0);
                cl.push(1);
                cl.push(2);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 0);
                assert.deepStrictEqual(cl.fpeak(), 2);

                cl.enableRing();
                assert.isTrue(cl.ring);

                assert.deepStrictEqual(cl.push(3), 0);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 1);
                assert.deepStrictEqual(cl.fpeak(), 3);

                assert.deepStrictEqual(cl.push(4), 1);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 2);
                assert.deepStrictEqual(cl.fpeak(), 4);

                assert.deepStrictEqual(cl.pop(), 2);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 3);
                assert.deepStrictEqual(cl.fpeak(), 4);

                assert.deepStrictEqual(cl.push(5), 3);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 4);
                assert.deepStrictEqual(cl.fpeak(), 5);

                assert.deepStrictEqual(cl.pop(), 4);
                assert.lengthOf(cl, 1, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 5);
                assert.deepStrictEqual(cl.fpeak(), 5);

                assert.deepStrictEqual(cl.push(6), undefined);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 5);
                assert.deepStrictEqual(cl.fpeak(), 6);

                assert.deepStrictEqual(cl.pop(), 5);
                assert.lengthOf(cl, 1, 'should not be empty');

                assert.deepStrictEqual(cl.pop(), 6);
                assert.lengthOf(cl, 0, 'should be empty');

                assert.deepStrictEqual(cl.push(7), undefined);
                assert.lengthOf(cl, 1, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 7);
                assert.deepStrictEqual(cl.fpeak(), 7);

                assert.deepStrictEqual(cl.push(8), undefined);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 7);
                assert.deepStrictEqual(cl.fpeak(), 8);

                assert.deepStrictEqual(cl.push(9), 7);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 8);
                assert.deepStrictEqual(cl.fpeak(), 9);

                cl.disableRing();

                assert.deepStrictEqual(cl.push(10), undefined);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 8);
                assert.deepStrictEqual(cl.fpeak(), 10);

                cl.erase();
                assert.lengthOf(cl, 0, 'should be empty');
                assert.isFalse(cl.ring, 'should disable ring on erase');
            });

            it('should be able to work with size = 3', () => {
                const cl = new Cls(3);

                cl.push(0);
                cl.push(1);
                cl.push(2);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 0);
                assert.deepStrictEqual(cl.fpeak(), 2);

                cl.enableRing();
                assert.isTrue(cl.ring);

                assert.deepStrictEqual(cl.push(3), 0);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 1);
                assert.deepStrictEqual(cl.fpeak(), 3);

                assert.deepStrictEqual(cl.push(4), 1);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 2);
                assert.deepStrictEqual(cl.fpeak(), 4);

                assert.deepStrictEqual(cl.pop(), 2);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 3);
                assert.deepStrictEqual(cl.fpeak(), 4);

                assert.deepStrictEqual(cl.push(5), undefined);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 3);
                assert.deepStrictEqual(cl.fpeak(), 5);

                assert.deepStrictEqual(cl.pop(), 3);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 4);
                assert.deepStrictEqual(cl.fpeak(), 5);

                assert.deepStrictEqual(cl.push(6), undefined);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 4);
                assert.deepStrictEqual(cl.fpeak(), 6);

                assert.deepStrictEqual(cl.pop(), 4);
                assert.lengthOf(cl, 2, 'should not be empty');

                assert.deepStrictEqual(cl.pop(), 5);
                assert.lengthOf(cl, 1, 'should not be empty');

                assert.deepStrictEqual(cl.push(7), undefined);
                assert.lengthOf(cl, 2, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 6);
                assert.deepStrictEqual(cl.fpeak(), 7);

                assert.deepStrictEqual(cl.push(8), undefined);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 6);
                assert.deepStrictEqual(cl.fpeak(), 8);

                assert.deepStrictEqual(cl.push(9), 6);
                assert.lengthOf(cl, 3, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 7);
                assert.deepStrictEqual(cl.fpeak(), 9);

                cl.disableRing();

                assert.deepStrictEqual(cl.push(10), undefined);
                assert.lengthOf(cl, 4, 'should not be empty');
                assert.deepStrictEqual(cl.bpeak(), 7);
                assert.deepStrictEqual(cl.fpeak(), 10);

                cl.erase();
                assert.lengthOf(cl, 0, 'should be empty');
                assert.isFalse(cl.ring, 'should disable ring on erase');
            });

            it('should set new size and restore old one', () => {
                const cl = new Cls(1);
                cl.push(1);
                cl.push(2);

                assert.lengthOf(cl, 2);

                cl.enableRing();
                assert.deepStrictEqual(cl.push(3), 1);
                assert.deepStrictEqual(cl.push(4), 2);
                assert.deepStrictEqual(cl.pop(), 3);
                assert.deepStrictEqual(cl.push(5), 4);
                assert.deepStrictEqual(cl.push(6), 5);

                assert.deepStrictEqual(cl.size, 1);

                cl.enableRing(3);
                assert.deepStrictEqual(cl.size, 1, 'should ignore new size while enabled');

                cl.disableRing();
                cl.enableRing(2);
                assert.deepStrictEqual(cl.size, 2, 'should set new size while enabled');

                assert.deepStrictEqual(cl.push(7), undefined);
                assert.deepStrictEqual(cl.push(8), 6);
                assert.deepStrictEqual(cl.push(9), 7);
                assert.lengthOf(cl, 2);

                cl.disableRing();
                assert.isFalse(cl.ring);
                // should have no effect
                cl.disableRing();
                assert.isFalse(cl.ring);

                assert.deepStrictEqual(cl.size, 1, 'should restore old value');

                cl.enableRing();
                assert.deepStrictEqual(cl.push(10), 8);
                assert.deepStrictEqual(cl.pop(), 9);
                assert.deepStrictEqual(cl.push(11), 10);
                assert.deepStrictEqual(cl.push(12), 11);

                cl.disableRing();
                cl.enableRing(3);
                assert.deepStrictEqual(cl.size, 3, 'should set new value');

                cl.disableRing(false);
                assert.deepStrictEqual(cl.size, 3, 'should not restore prev value');

                cl.enableRing(5);
                assert.deepStrictEqual(cl.size, 5, 'should set new value');

                cl.disableRing(true);
                assert.deepStrictEqual(cl.size, 3, 'should restore old value');
            });

            it('should be able to enable/disable ring on empty list', () => {
                const cl = new Cls(3);
                cl.enableRing();

                assert.deepStrictEqual(cl.size, 3);
                assert.isTrue(cl.ring);
                assert.lengthOf(cl, 0);

                cl.push(1); cl.push(2); cl.push(3);
                assert.deepStrictEqual(cl.push(4), 1);
                assert.lengthOf(cl, 3);

                assert.deepStrictEqual(cl.pop(), 2);
                assert.deepStrictEqual(cl.pop(), 3);
                assert.deepStrictEqual(cl.pop(), 4);

                assert.lengthOf(cl, 0);
                cl.disableRing();

                cl.push(5);
                assert.lengthOf(cl, 1);
            });
        });

        it('should provie access to nodes', () => {
            const cl = new Cls();

            assert.isNull(cl.back);
            assert.isNull(cl.front);

            cl.push(1);
            assert.deepStrictEqual(cl.back, {
                next: null,
                value: 1
            });
            assert.deepStrictEqual(cl.front, {
                next: null,
                value: 1
            });

            cl.push(2);
            assert.deepStrictEqual(cl.back.value, 1);
            assert.deepStrictEqual(cl.front.value, 2);

            cl.push(3);
            assert.deepStrictEqual(cl.back.value, 1);
            assert.deepStrictEqual(cl.front.value, 3);
        });
    }));

    describe('CircularLinkedListMR', () => {
        it('should create and destroy readers', () => {
            const cl = new CircularLinkedListMR();
            assert.deepStrictEqual(cl.readers, 0, 'should have no readers after initialization');

            const r1 = cl.reader();
            assert.deepStrictEqual(cl.readers, 1);

            const r2 = cl.reader();
            assert.deepStrictEqual(cl.readers, 2);

            r2.destroy();
            assert.deepStrictEqual(cl.readers, 1);

            r1.destroy();
            assert.deepStrictEqual(cl.readers, 0);
        });

        it('should keep readers after calling .erase()', () => {
            const cl = new CircularLinkedListMR(10);
            const r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3);
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.deepStrictEqual(r1.pop(), 1);
            assert.isTrue(r1.hasData());
            assert.lengthOf(cl, 2);

            cl.erase(true);
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
            assert.throws(() => r1.pop());

            cl.push(1); cl.push(2); cl.push(3);

            assert.lengthOf(cl, 3);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.isTrue(r1.hasData());

            const r2 = cl.reader();
            assert.isTrue(r2.hasData());
            assert.deepStrictEqual(r2.pop(), 2);
            assert.isTrue(r2.hasData());
            assert.lengthOf(cl, 2);

            cl.erase(true);
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
            assert.isFalse(r2.hasData());
            assert.throws(() => r1.pop());
            assert.throws(() => r2.pop());

            cl.push(1); cl.push(2); cl.push(3);
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());
            assert.deepStrictEqual(r2.pop(), 1);
            assert.isTrue(r2.hasData());
            assert.deepStrictEqual(r1.pop(), 1);
            assert.isTrue(r1.hasData());
            assert.lengthOf(cl, 2);
        });

        it('should destroy readers after calling .erase()', () => {
            const cl = new CircularLinkedListMR(10);
            let r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3);

            assert.isTrue(r1.hasData());
            assert.lengthOf(cl, 3);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.isTrue(r1.hasData());
            assert.lengthOf(cl, 2);

            cl.erase();
            assert.lengthOf(cl, 0);
            assert.throws(() => r1.hasData());
            assert.throws(() => r1.pop());

            cl.push(1); cl.push(2); cl.push(3);

            assert.throws(() => r1.pop());

            r1 = cl.reader();
            const r2 = cl.reader();
            assert.lengthOf(cl, 3);
            assert.isTrue(r2.hasData());
            assert.isTrue(r1.hasData());
            assert.deepStrictEqual(r2.pop(), 1);
            assert.lengthOf(cl, 3);
            assert.isTrue(r2.hasData());
            assert.isTrue(r1.hasData());
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(cl, 2);
            assert.isTrue(r2.hasData());
            assert.isTrue(r1.hasData());

            cl.erase(false);
            cl.push(1); cl.push(2); cl.push(3);

            assert.throws(() => r1.hasData());
            assert.throws(() => r1.pop());
            assert.throws(() => r2.hasData());
            assert.throws(() => r2.pop());
        });

        it('should re-sync readers after calling array.pop()', () => {
            const cl = new CircularLinkedListMR(10);
            const r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3);
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.deepStrictEqual(r1.pop(), 1);
            assert.isTrue(r1.hasData());
            assert.lengthOf(cl, 2);

            assert.deepStrictEqual(cl.pop(), 2);
            assert.isTrue(r1.hasData());
            assert.lengthOf(cl, 1);

            const r2 = cl.reader();
            cl.push(4); cl.push(5); cl.push(6);
            assert.lengthOf(cl, 4);

            assert.deepStrictEqual(cl.pop(), 3);
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            assert.deepStrictEqual(r1.pop(), 4);
            assert.deepStrictEqual(r2.pop(), 4);
        });

        it('should re-sync readers after calling array.push()', () => {
            const cl = new CircularLinkedListMR(3);
            const r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3);
            cl.enableRing();

            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(cl, 2);
            assert.isTrue(r1.hasData());

            cl.push(4);
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());

            cl.push(5);
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());

            const r2 = cl.reader();
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());
            assert.deepStrictEqual(r2.pop(), 3);
            assert.isTrue(r2.hasData());

            cl.push(6);
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            cl.push(7);
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            assert.deepStrictEqual(r1.pop(), 5);
            assert.deepStrictEqual(r2.pop(), 5);
        });

        it('should remove extra nodes on reader.destroy()', () => {
            const cl = new CircularLinkedListMR(4);
            let r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3); cl.push(4);
            cl.enableRing();
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());

            r1.pop(); r1.pop();
            assert.lengthOf(cl, 2);
            assert.isTrue(r1.hasData());

            r1.destroy();
            assert.throws(() => r1.hasData());
            assert.lengthOf(cl, 2);

            r1 = cl.reader();
            let r2 = cl.reader();
            cl.push(5); cl.push(6);

            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.pop(); r2.pop(); r2.pop();
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r1.destroy();

            assert.lengthOf(cl, 1);
            assert.isTrue(r2.hasData());

            cl.push(7); cl.push(8); cl.push(9);
            r1 = cl.reader();

            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.pop(); r2.pop(); r2.pop();
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.destroy();
            assert.throws(() => r2.hasData());
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());

            r2 = cl.reader();
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.pop(); r2.pop(); r2.pop(); r2.pop();
            assert.isFalse(r2.hasData());
            r1.destroy();

            assert.lengthOf(cl, 0);
            assert.isFalse(r2.hasData());
            assert.throws(() => r1.hasData());

            r1 = cl.reader();
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
            assert.isFalse(r2.hasData());

            cl.push(1); cl.push(2); cl.push(3);
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.pop(); r2.pop(); r2.pop();
            r1.pop();
            assert.lengthOf(cl, 2);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());

            cl.push(4); cl.push(5);
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r1.destroy();
            assert.throws(() => r1.hasData());
            assert.lengthOf(cl, 2);
            assert.isTrue(r2.hasData());

            r1 = cl.reader();
            assert.lengthOf(cl, 2);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            cl.push(6); cl.push(7);
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.pop(); r2.pop(); r2.pop(); r2.pop();
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());

            r1.pop(); r1.pop(); r1.pop();
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());

            r1.destroy();
            assert.throws(() => r1.hasData());
            assert.lengthOf(cl, 0);
            assert.isFalse(r2.hasData());

            r1 = cl.reader();
            cl.push(1); cl.push(2); cl.push(3); cl.push(4);
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.pop(); r2.pop(); r2.pop(); r2.pop();
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());
            assert.throws(() => r2.pop());

            r1.pop(); r1.pop(); r1.pop();
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());

            r2.destroy();
            assert.throws(() => r2.hasData());
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());

            r1.pop();
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
        });

        it('should update reader when new data pushed/poped', () => {
            const cl = new CircularLinkedListMR(4);
            const r1 = cl.reader();

            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());

            cl.push(1);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());

            r1.pop();
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());

            cl.push(2);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());

            const r2 = cl.reader();
            assert.isTrue(r2.hasData());

            cl.push(3); cl.push(4);
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.pop(); r2.pop(); r2.pop();

            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());
            assert.throws(() => r2.pop());

            r1.pop(); r1.pop();
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());

            cl.push(5); cl.push(6); cl.push(7);
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r1.pop();
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r1.pop();
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r1.pop();
            assert.lengthOf(cl, 3);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            r1.pop();
            assert.lengthOf(cl, 3);
            assert.isFalse(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.pop();
            assert.lengthOf(cl, 2);
            assert.isFalse(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.pop();
            assert.lengthOf(cl, 1);
            assert.isFalse(r1.hasData());
            assert.isTrue(r2.hasData());

            r2.pop();
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
            assert.isFalse(r2.hasData());
        });

        it('edge case: size = 1', () => {
            const cl = new CircularLinkedListMR(1);
            cl.push(1);
            cl.enableRing();

            const r1 = cl.reader();

            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());

            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());

            cl.push(1);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            cl.push(2);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.deepStrictEqual(r1.pop(), 2);
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());

            const r2 = cl.reader();
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
            assert.isFalse(r2.hasData());

            cl.push(3);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            cl.pop();
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
            assert.isFalse(r2.hasData());

            cl.push(4);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            assert.deepStrictEqual(r2.pop(), 4);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());

            assert.deepStrictEqual(r1.pop(), 4);
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
            assert.isFalse(r2.hasData());

            cl.push(5);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            assert.deepStrictEqual(r2.pop(), 5);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());

            cl.pop();
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
            assert.isFalse(r2.hasData());

            cl.push(6);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            assert.deepStrictEqual(r2.pop(), 6);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());

            cl.push(7);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            assert.deepStrictEqual(r2.pop(), 7);
            assert.lengthOf(cl, 1);
            assert.isTrue(r1.hasData());
            assert.isFalse(r2.hasData());

            assert.deepStrictEqual(r1.pop(), 7);
            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
            assert.isFalse(r2.hasData());
        });

        it('reader.needCopy()', () => {
            const cl = new CircularLinkedListMR(4);
            const r1 = cl.reader();
            cl.push(1); cl.push(2); cl.push(3); cl.push(4);

            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());

            while (r1.hasData()) {
                assert.isFalse(r1.needCopy());
                r1.pop();
            }

            cl.push(1); cl.push(2); cl.push(3); cl.push(4);
            const r2 = cl.reader();

            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            while (r1.hasData()) {
                assert.isTrue(r1.needCopy());
                r1.pop();
            }
            while (r2.hasData()) {
                assert.isFalse(r2.needCopy());
                assert.isFalse(r1.hasData());
                r2.pop();
                assert.isFalse(r1.hasData());
            }

            assert.lengthOf(cl, 0);
            assert.isFalse(r1.hasData());
            assert.isFalse(r2.hasData());

            cl.push(1); cl.push(2); cl.push(3); cl.push(4);
            assert.lengthOf(cl, 4);
            assert.isTrue(r1.hasData());
            assert.isTrue(r2.hasData());

            assert.isTrue(r1.needCopy());
            assert.isTrue(r2.needCopy());

            r1.pop(); r1.pop();
            assert.isTrue(r1.needCopy());
            assert.isFalse(r2.needCopy());

            r2.pop();
            assert.isFalse(r2.needCopy());
            r2.pop();
            assert.isTrue(r2.needCopy());
            r2.pop();
            assert.isTrue(r2.needCopy());

            r2.destroy();
            assert.throws(() => r2.hasData());
            assert.isFalse(r1.needCopy());
        });

        it('should support multiple readers', () => {
            const cl = new CircularLinkedListMR(20);

            for (let i = 0; i < 20; i += 1) {
                cl.push(i);
            }

            assert.lengthOf(cl, 20);

            const r1 = cl.reader();
            assert.isTrue(r1.hasData());
            assert.deepStrictEqual(r1.pop(), 0);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(cl, 18);

            const r2 = cl.reader();
            assert.isTrue(r2.hasData());
            assert.deepStrictEqual(r2.pop(), 2);
            assert.deepStrictEqual(r2.pop(), 3);
            assert.lengthOf(cl, 18);
            assert.deepStrictEqual(r1.pop(), 2);
            assert.deepStrictEqual(r1.pop(), 3);
            assert.lengthOf(cl, 16);

            const r3 = cl.reader();
            assert.deepStrictEqual(r3.pop(), 4);
            assert.deepStrictEqual(r3.pop(), 5);
            assert.lengthOf(cl, 16);
            assert.deepStrictEqual(r1.pop(), 4);
            assert.deepStrictEqual(r1.pop(), 5);
            assert.lengthOf(cl, 16);

            const r4 = cl.reader();
            assert.deepStrictEqual(r4.pop(), 4);
            assert.deepStrictEqual(r4.pop(), 5);
            assert.deepStrictEqual(r4.pop(), 6);
            assert.lengthOf(cl, 16);

            const r5 = cl.reader();
            assert.deepStrictEqual(r5.pop(), 4);
            assert.deepStrictEqual(r5.pop(), 5);
            assert.deepStrictEqual(r5.pop(), 6);
            assert.deepStrictEqual(r5.pop(), 7);
            assert.lengthOf(cl, 16);

            const r6 = cl.reader();
            assert.deepStrictEqual(r6.pop(), 4);
            assert.deepStrictEqual(r6.pop(), 5);
            assert.deepStrictEqual(r6.pop(), 6);
            assert.deepStrictEqual(r6.pop(), 7);
            assert.lengthOf(cl, 16);

            assert.isFalse(r2.needCopy());
            assert.deepStrictEqual(r2.pop(), 4);
            assert.isFalse(r2.needCopy());
            assert.deepStrictEqual(r2.pop(), 5);
            assert.isTrue(r2.needCopy());
            assert.lengthOf(cl, 14);

            while (r1.hasData()) {
                r1.pop();
            }
            assert.isFalse(r1.hasData());
            assert.lengthOf(cl, 14);

            r1.destroy();
            assert.lengthOf(cl, 14);

            r2.destroy();
            assert.lengthOf(cl, 14);

            assert.deepStrictEqual(r6.fpeak(), 19);
            assert.deepStrictEqual(r6.bpeak(), 8);

            assert.deepStrictEqual(r4.fpeak(), 19);
            assert.deepStrictEqual(r4.bpeak(), 7);

            assert.deepStrictEqual(r3.fpeak(), 19);
            assert.deepStrictEqual(r3.bpeak(), 6);
        });
    });
});
