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
 * Circular List Class (FIFO)
 *
 * NOTE:
 * - all methonds assume that instance has data already
 *   e.g. the user is repsonsible to check .length before call .pop()
 * - monomorphic types are prefered (same shape, type, hidden class and etc.),
 *   higher chance that array and code will be optimimzed by V8
 * - all properties should be declared during construction call
 * - all properties should use monomorphic values (same shape, type, hidden class and etc.)
 * - frontIdx points to the elem to assign data to, actual end of data is frontIdx - 1
 */
class CircularArray {
    /**
     * Constructor
     *
     * @param {InitOptions} [options] - options
     */
    constructor(options) {
        this._holeSet = false;
        this.erase(options);
    }

    /** @returns {integer} number of allocated cells */
    get allocated() {
        return this._storage.length;
    }

    /** @returns {integer} end index */
    get endIdx() {
        return this._isEmpty ? this._backIdx : this.prevIdx(this._frontIdx);
    }

    /** @returns {integer} number of items */
    get length() {
        return this._isEmpty
            ? 0
            : ((this._backIdx >= this._frontIdx ? this._size : 0) - this._backIdx + this._frontIdx);
    }

    /** @returns {integer} buffer size (max number of items) */
    get size() {
        return this._size;
    }

    /** @returns {integer} start index */
    get startIdx() {
        return this._backIdx;
    }

    /** @returns {any} value of the backmost node */
    bpeak() {
        return this._storage[this._backIdx];
    }

    /**
     * Erase all data
     *
     * @param {InitOptions} [options] - options
     */
    erase(options) {
        options = options || {};
        if (typeof options.size !== 'undefined') {
            const size = options.size;
            if (!(Number.isSafeInteger(size) && size > 0)) {
                throw RangeError(`Invalid "size" value. Should be an integer value greater than 0, got '${size}' instead (type = ${typeof size})`);
            }
            this._size = size;
        } else if (typeof this._size === 'undefined') {
            this._size = 1;
        }

        const prealloc = options.prealloc === true
            ? this._size
            : Math.min(
                this._size,
                Math.abs(Number.isSafeInteger(options.prealloc) ? options.prealloc : 0)
            );

        if (Object.prototype.hasOwnProperty.call(options, 'fill')) {
            this._hole = options.fill;
            this._holeSet = true;
        }

        if (!(this._storage && this._storage.length === prealloc)) {
            this._storage = new Array(prealloc);
        }
        if (this._holeSet) {
            this._storage.fill(this._hole);
        }

        this._backIdx = 0; // index to read from
        this._frontIdx = 0; // index to write to
        this._isEmpty = true;
    }

    /** Feel non-empty nodes with 'fill' value */
    fastErase() {
        var end = this.endIdx;
        var hole = this._hole;
        var idx = this._backIdx;
        var storage = this._storage;

        if (!this._isEmpty) {
            if (this.length === 1 || this.size === 1) {
                storage[idx] = hole;
            } else {
                // read from left to right or from left to end
                end = idx > end ? (this.allocated - 1) : end;
                while (idx <= end) {
                    storage[idx++] = hole;
                }
                if (this._backIdx > this.endIdx) {
                    idx = 0;
                    end = this._frontIdx;
                    while (idx < end) {
                        storage[idx++] = hole;
                    }
                }
            }
            this._isEmpty = true;
        }
        this._backIdx = this._frontIdx = 0;
    }

    /** @returns {any} value of the topmost node */
    fpeak() {
        return this._storage[this.endIdx];
    }

    /**
     * @param {integer} idx - base index number, 0 <= idx < size
     *
     * @returns {integer} next index number
     */
    nextIdx(idx) {
        return (idx + 1) % this._size;
    }

    /**
     * @param {integer} idx - index number, 0 <= idx < size
     *
     * @returns {any} value of the node at particular index
     */
    peak(idx) {
        return this._storage[idx];
    }

    /** @returns {any} value of deleted the backmost node */
    pop() {
        var value = this._storage[this._backIdx];
        this._storage[this._backIdx] = this._hole;
        this._backIdx = this.nextIdx(this._backIdx);
        this._isEmpty = this._backIdx === this._frontIdx;
        if (this._isEmpty) {
            // rebase
            this._backIdx = this._frontIdx = 0;
        }
        return value;
    }

    /**
     * @param {integer} idx - base index number, 0 <= idx < size
     *
     * @returns {integer} previous index number
     */
    prevIdx(idx) {
        return (idx || this._size) - 1;
    }

    /**
     * @param {any} value - value to push to the frontmost node
     *
     * @returns {any} previously storred element or 'fill' value
     */
    push(value) {
        var oldValue = this._hole;
        var sameCell = this._frontIdx === this._backIdx;

        if (this._frontIdx >= this._storage.length) {
            this._storage.push(value);
        } else {
            oldValue = this._storage[this._frontIdx];
            this._storage[this._frontIdx] = value;
        }

        this._frontIdx = this.nextIdx(this._frontIdx);

        if (!this._isEmpty && sameCell) {
            this._backIdx = this._frontIdx;
        }
        this._isEmpty = false;

        return oldValue;
    }

    /**
     * Rebase data and remove empty spots
     *
     * @param {boolean} [shrink = false] - shrink underlying storage to match actual size
     */
    rebase(shrink) {
        var backIdx = this._backIdx;
        var freeItems = false;
        var frontIdx = this._frontIdx;
        var i;
        var len = this.length;
        var storage = this._storage;
        if (len === storage.length) {
            // full, nothing to do
            return;
        }

        if (len === 0) {
            this._backIdx = this._frontIdx = 0;
        } else if (len === 1 || backIdx === 0) {
            // 1 elem or starts from 0 already
            storage[0] = storage[backIdx];
        } else if (!frontIdx || frontIdx > backIdx) {
            // starts from index > 0 and frontIdx points to first elem or greater backIdx
            // then array doens't need rotation
            shiftSubArray(storage, backIdx, frontIdx || storage.length);
            freeItems = true;
        } else {
            freeItems = rotateSubArray(storage, backIdx, frontIdx, len);
        }

        if (shrink) {
            // shrink array and remove empty items in it
            storage.length = len;
        } else if (len === 1 && backIdx) {
            storage[backIdx] = this._hole;
        } else if (freeItems) {
            // fill non-empty leftover elems with `fill` value
            backIdx = backIdx > len ? backIdx : len;
            frontIdx = frontIdx < backIdx ? storage.length : frontIdx;

            for (i = backIdx; i < frontIdx; i++) {
                storage[i] = this._hole;
            }
        }

        this._backIdx = 0;
        this._frontIdx = len;
    }

    /** @returns {any[]} shallow copy of underlying storage */
    storage() {
        return this._storage.slice();
    }
}

/** @returns {integer} Greater common divider */
function getGCD(a, b) {
    return (b ? getGCD(b, a % b) : a);
}

/**
 * Shift sub-array to index 0
 *
 * @param {any[]} array
 * @param {integer} startIdx
 * @param {integer} endIdx
 */
function shiftSubArray(array, startIdx, endIdx) {
    var i = startIdx;
    for (; i < endIdx; i += 1) {
        array[i - startIdx] = array[i];
    }
}

/**
 * Rotate sub-array
 *                                                end           start
 * Goal: rotate sub-array that looks like [9, 10, <empty>, <empty>, 1, 2, 3, 4, 5, 6, 7, 8]
 * Result should look like:
 * [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, <empty>, <empty>]
 * or                              should be removed
 * [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 7, 8]
 *
 *
 * @param {any[]} array
 * @param {integer} startIdx
 * @param {integer} endIdx
 * @param {integer} length - subarray legth (!== array.length)
 *
 * @returns {boolean} true if entire array was rotated or false if sub-array only
 */
function rotateSubArray(array, startIdx, endIdx, length) {
    var d = endIdx;
    var gcd, i, j, k, temp;
    var n = length;
    var delta = startIdx - endIdx;

    if ((length + (array.length - startIdx)) > array.length) {
        // rotate entire array (with empty spots) is faster than
        // rotating non-empty elems + copying the tail (part after backIdx)
        // O(array.length) < O(sub-length) + O(array.length - startIdx)
        n = array.length;
        d = startIdx;
        delta = 0;
    }

    gcd = getGCD(d, n);

    for (i = 0; i < gcd; i += 1) {
        temp = array[i];
        j = i;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            k = j + d;
            if (k >= n) {
                k -= n;
            }
            if (k === i) {
                break;
            }
            array[j + (j >= d ? delta : 0)] = array[k + (k >= d ? delta : 0)];
            j = k;
        }
        array[j + (j >= d ? delta : 0)] = temp;
    }
    if (delta) {
        // array look like: [1, 2, <empty>, <empty>, 3, 4, 5, 6, 7, 8, 9, 10]
        // need to copy tail to be closer to the head
        for (i = startIdx; i < array.length; i += 1) {
            array[endIdx++] = array[i];
        }
    }
    return delta !== 0;
}

module.exports = CircularArray;

/**
 * @typedef InitOptions
 * @type {object}
 * @property {integer} [options.size = 1] - max size
 * @property {boolean | integer} [options.prealloc = false] - number of cells to pre-allocate
 * @property {any} [options.fill] - value to use to fill pre-allocated items
 */
