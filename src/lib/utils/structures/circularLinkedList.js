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

/* eslint-disable no-multi-assign, no-plusplus, no-var, one-var, one-var-declaration-per-line */
/**
 * NOTE: `var`, `++` are intentional and helps to gain some perf
 */

/**
 * CircularLinked List Class (FIFO)
 *
 * NOTE:
 * - monomorphic types are prefered (same shape, type, hidden class and etc.),
 *   higher chance that array and code will be optimimzed by V8
 * - all properties should be declared during construction call
 * - all properties should use monomorphic values (same shape, type, hidden class and etc.)
 */
class CircularLinkedList {
    /**
     * @param {integer} [size = Number.MAX_SAFE_INTEGER] - ring buffer max size
     */
    constructor(size) {
        size = Number.MAX_SAFE_INTEGER;

        if (arguments.length) {
            this._checkSizeValue(arguments[0]);
            size = arguments[0];
        }

        this._size = size;
        this.erase();
    }

    /** @returns {OneWayNode} the backmost node */
    get back() {
        return this._back;
    }

    /** @returns {OneWayNode} the frontmost node */
    get front() {
        return this._front;
    }

    /** @returns {integer} length of the list */
    get length() {
        return this._length;
    }

    /** @returns {boolean} true if the topmost node points to the backmost node */
    get ring() {
        return this._ring;
    }

    /** @returns {integer} buffer size (max number of items) */
    get size() {
        return this._size;
    }

    /** @returns {any} value of the backmost node */
    bpeak() {
        return this._back.value;
    }

    /**
     * Disable `ring` feature
     *
     * @param {boolean} [restore = true] - restore initial `size` value
     */
    disableRing(restore) {
        if (this._ring) {
            this._ring = false;

            restore = arguments.length ? restore : true;
            if (restore) {
                this._size = this._oldSize;
            }

            if (this._front) {
                this._front.next = null;
            }
        }
    }

    /** @returns {any} value of the topmost node */
    fpeak() {
        return this._front.value;
    }

    /**
     * Enable `ring` feature
     *
     * @param {integer} [newSize] - ring buffer max size (override previous value)
     */
    enableRing(newSize) {
        if (!this._ring) {
            this._ring = true;

            this._oldSize = this._size;
            if (arguments.length) {
                this._checkSizeValue(newSize);
                this._size = newSize;
            }

            if (this._front) {
                this._front.next = this._back;
            }
        }
    }

    /** Erase all data */
    erase() {
        if (this._front) {
            // break circular ref
            this._front.next = null;
        }
        /** @type {OneWayNode} */
        this._back = null;
        /** @type {OneWayNode} */
        this._front = null;
        this._length = 0;
        this._ring = false;
    }

    /**
     * @returns {any} value of deleted the backmost node
     *
     * NOTE:
     * - if `ring` enabled it may remove nodes if limit exceeded
     * - should check .length before calling .pop()
     */
    pop() {
        var retval = this._back.value;
        if (this._ring) {
            // 0 (back) -> 1 (back.next) -> 2 -> 3 (front) -> 0 (front.next == back)
            this._front.next = this._back.next;
            // set to null if it was the last element in the ring
            this._back.next = this._back.next === this._back ? null : this._back.next;
        }
        this._back = this._back.next;
        this._front = this._back && this._front;
        this._length--;
        return retval;
    }

    /**
     * @param {any} value - value to push to the topmost node
     *
     * @returns {any} poped value if the backmost node was overriden by the topmost
     *
     * NOTE: if `ring` enabled then it overrides old nodes if limit exceeded
     */
    push(value) {
        var retval;
        if (this._front) {
            if (this._ring && this._length >= this._size) {
                // start overriding existing items
                this._front = this._front.next;
                retval = this._front.value;
                this._front.value = value;
                this._back = this._front.next;
            } else {
                this._front = this._front.next = {
                    next: this._front.next,
                    value
                };
                this._length++;
            }
        } else {
            this._front = this._back = {
                next: null,
                value
            };
            if (this._ring) {
                this._front.next = this._back;
            }
            this._length++;
        }
        return retval;
    }

    _checkSizeValue(size) {
        if (size < 1 || !Number.isSafeInteger(size)) {
            throw RangeError(`Invalid "size" value. Should be an integer value greater than 0, got '${size}' instead (type = ${typeof size})`);
        }
    }
}

module.exports = CircularLinkedList;
