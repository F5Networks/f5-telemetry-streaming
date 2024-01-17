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

moduleCache.remember();

describe('Structures / Circular Linked List', () => {
    describe('initialization', () => {
        it('should create list with default size equal Number.MAX_SAFE_INTEGER', () => {
            const cl = new CircularLinkedList();
            assert.deepStrictEqual(cl.size, Number.MAX_SAFE_INTEGER, 'should use default size value');
            assert.lengthOf(cl, 0, 'should be empty');
            assert.isFalse(cl.ring, 'should have ring disabled by default');
        });

        it('should throw error on incorrect size', () => {
            assert.throws(() => new CircularLinkedList(-1));
            assert.throws(() => new CircularLinkedList(0));
            assert.throws(() => new CircularLinkedList(NaN));
            assert.throws(() => new CircularLinkedList(false));
            assert.throws(() => new CircularLinkedList(Number.MAX_VALUE));
        });

        it('should allow to specify size', () => {
            let cl = new CircularLinkedList(10);
            assert.deepStrictEqual(cl.size, 10, 'should use provided size');

            cl = new CircularLinkedList(1);
            assert.deepStrictEqual(cl.size, 1, 'should use provided size');
        });
    });

    describe('non-ring', () => {
        it('should do basic operations', () => {
            const cl = new CircularLinkedList();
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
            const cl = new CircularLinkedList(1);

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
            const cl = new CircularLinkedList(2);

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
            const cl = new CircularLinkedList(3);

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
            const cl = new CircularLinkedList(1);
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
            const cl = new CircularLinkedList(3);
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
        const cl = new CircularLinkedList();

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
});
