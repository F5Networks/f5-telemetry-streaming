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

/* eslint-disable no-multi-assign, no-plusplus, no-var, one-var, one-var-declaration-per-line, no-unused-expressions */
/* eslint-disable no-nested-ternary */
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
        return this._isEmpty ? 0 : segmentLength(this._backIdx, this._frontIdx, this._size);
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
     * Array data (shallow-copy of it)
     *
     * NOTE:
     * `callee` is responsible for cheking `start` and `end` to be
     * withing the boundaries (>= startIdx and <= endIdx)
     *
     * @param {integer} [start] - start index
     * @param {integer} [end] - index of last item to include
     *
     * @returns {Array<any>} shallow-copy of data for provided range of indexes
     */
    content(start, end) {
        var slen = this._storage.length;
        var storage = this._storage;

        if (arguments.length === 0) {
            start = this.startIdx;
        }
        if (arguments.length < 2) {
            end = this.endIdx;
        }
        return start <= end
            ? storage.slice(start, end + 1)
            : storage.slice(start, slen).concat(storage.slice(0, end + 1));
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
            checkSizeValue(size);
            this._size = size;
        } else if (typeof this._size === 'undefined') {
            this._size = 1;
        }

        const prealloc = (this._size === 1 || options.prealloc === true)
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
            // TODO: provide option for TypedArray
            this._storage = new Array(prealloc);
        }
        if (this._holeSet) {
            this._storage.fill(this._hole);
        }

        this._backIdx = 0; // index to read from
        this._frontIdx = 0; // index to write to
        this._isEmpty = true;
    }

    /**
     * Feel non-empty nodes with 'fill' value
     *
     * @param {boolean} [freeRefs = true] - free object references
     */
    fastErase(freeRefs) {
        var end = this.endIdx;
        var hole = this._hole;
        var idx = this._backIdx;
        var storage = this._storage;

        if (!this._isEmpty && freeRefs !== false) {
            if (this.length === 1) {
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
        }
        this._isEmpty = true;
        this._backIdx = this._frontIdx = 0;
    }

    /** @returns {any} value of the topmost node */
    fpeak() {
        return this._storage[this.endIdx];
    }

    /**
     * @param {integer} idx - base index number, 0 <= idx < size
     *
     * NOTE: '%' is slow, use basic comparisons
     *
     * @returns {integer} next index number
     */
    nextIdx(idx) {
        return (this._size === 1 || ++idx >= this._size) ? 0 : idx;
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
        if (this._size === 1) {
            this._isEmpty = true;
        } else {
            this._backIdx = this.nextIdx(this._backIdx);
            this._isEmpty = this._backIdx === this._frontIdx;
            if (this._isEmpty) {
                // rebase
                this._backIdx = this._frontIdx = 0;
            }
        }
        return value;
    }

    /**
     * @param {integer} idx - base index number, 0 <= idx < size
     *
     * NOTE: '%' is slow, use basic comparisons
     *
     * @returns {integer} previous index number
     */
    prevIdx(idx) {
        return this._size === 1 ? 0 : (idx === 0 || idx >= this._size) ? (this._size - 1) : --idx;
    }

    /**
     * @param {any} value - value to push to the frontmost node
     *
     * @returns {any} previously storred element or 'fill' value
     */
    push(value) {
        var oldValue = this._hole;
        var sameCell;
        var storage = this._storage;

        if (this._size === 1) {
            oldValue = storage[0];
            storage[0] = value;
        } else {
            sameCell = this._frontIdx === this._backIdx;

            if (this._frontIdx >= storage.length) {
                storage.push(value);
            } else {
                oldValue = storage[this._frontIdx];
                storage[this._frontIdx] = value;
            }

            this._frontIdx = this.nextIdx(this._frontIdx);

            if (!this._isEmpty && sameCell) {
                this._backIdx = this._frontIdx;
            }
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

/**
 * Reader Class
 */
class Reader {
    /**
     * @param {ReaderProxy} proxy - Reader proxy
     * @param {integer} rid - Reader ID
     */
    constructor(proxy, rid) {
        this._proxy = proxy;
        this._rid = rid;
    }

    /** @returns {integer} end index */
    get endIdx() {
        return this._proxy.endIdx(this);
    }

    /** @returns {number} number of elements from current position to the end, e.g. from 5 to 10 = 6 */
    get length() {
        return this._proxy.length(this);
    }

    /** @returns {integer} start index */
    get startIdx() {
        return this._proxy.startIdx(this);
    }

    /** Destroy the reader */
    destroy() {
        this._proxy.destroy(this);
    }

    /** @returns {boolean} true the reader may need to make a copy of data it points to before any modifications */
    needCopy() {
        return this._proxy.needCopy(this);
    }

    /** @returns {any} value of the backmost node (will be deleted if no readers left behind) */
    pop() {
        return this._proxy.pop(this);
    }
}

/**
 * Reader Proxy Class
 */
class ReaderProxy {
    /** @param {CircularArrayMR} carr */
    constructor(carr) {
        this._carr = carr;
        // - readers should be sorted by .length property
        // - reader with idx 0 should point to the backmost node
        // [Reader, index, is-empty]
        this._readers = [];
    }

    /** @returns {Reader} a new reader that points to the beginning of the data */
    create() {
        var readers = this._readers;
        var rid = 0; // set it to 0 index

        readers.unshift([new Reader(this, rid), this._carr.startIdx, false]);
        if (readers.length > 1) {
            // re-index readers
            readers.forEach((rdr, idx) => { rdr[0]._rid = idx; });
        }
        return readers[rid][0];
    }

    /** @param {Reader} [rdr] - reader to destroy. If not set then all readers will be destroyed */
    destroy(rdr) {
        var rid;
        var readers = this._readers;
        var rlen = readers.length;
        var dlen = 0;

        // if there is only 1 reader then all data should be left untouched
        if (!rdr || rlen < 2) {
            readers.forEach((reader) => {
                reader[0]._proxy = null;
            });
            this._readers = [];
            return;
        }
        // if there are more than 1 reader then all nodes between
        // reader 0 and reader 1 should be freed

        rid = rdr._rid;
        rdr = readers[rid];
        rdr[0]._proxy = null;

        // if reader is empty and rid === 0 - no data at all in the list
        if (rid === 0 && this.length(rdr[0])) {
            // free nodes between reader 0 and 1
            dlen = this._carr.length - this.length(readers[1][0]);
            while (dlen--) {
                this._carr._pop();
            }
            // no data left - reset all readers to be in sync with the array
            if (this._carr._isEmpty && rlen) {
                this.resetAll();
            }
        }

        // re-index readers
        rid++;
        while (rid < rlen) {
            rdr = readers[rid];
            rdr[0]._rid = rid - 1;
            readers[rdr[0]._rid] = rdr;
            rid++;
        }

        readers.length = rlen - 1;
    }

    /**
     * @param {Reader} rdr
     *
     * @returns {integer} end index
     */
    endIdx() {
        return this._carr.endIdx;
    }

    /**
     * @param {Reader} rdr
     *
     * @returns {number} calculate length for the reader
     */
    length(rdr) {
        rdr = this._readers[rdr._rid];
        return (this._carr._isEmpty || (rdr[2] && rdr[1] === this._carr._frontIdx))
            ? 0
            : segmentLength(rdr[1], this._carr._frontIdx, this._carr.size);
    }

    /**
     * @param {Reader} rdr
     *
     * @returns {boolean} true the reader needs to make a copy of data it points to before any modifications
     */
    needCopy(rdr) {
        var readers = this._readers;
        // data may need a copy if:
        // - more than 1 reader registered
        // - reader doesn't point to the backmost item
        // if reader points to the backmost item and
        // next reader too and has no data left to read
        // then no copy needed
        return readers.length !== 1 && (
            rdr._rid !== 0
            || (readers[0][1] === readers[1][1] && !readers[1][2]));
    }

    /** @returns {integer} number of active readers */
    numberOfReaders() {
        return this._readers.length;
    }

    /**
     * `callee` is responsible to check `.length` property for presense of
     * data before call .pop() method
     *
     * @param {Reader} rdr
     *
     * @returns {any} value of the backmost node (will be deleted if no readers left behind)
     */
    pop(rdr) {
        var cid;
        var nextlen;
        var readers = this._readers;
        var retval;
        var rid = rdr._rid;
        var rlen = readers.length - 1;
        rdr = readers[rid];
        nextlen = this.length(rdr[0]) - 1;
        cid = rdr[1];

        if (rlen === 0 || (rid === 0 && (readers[1][1] !== cid || readers[1][2]))) {
            // call .pop() when:
            // - one reader only
            // - the reader points to the tail and:
            //   - next reader does not
            //   - next reader has no data to read (is empty)
            // NOTE: _readers should be sorted already
            retval = this._carr._pop();

            if (this._carr._isEmpty) {
                // all data read, reset position of all readers to be in sync with the array
                // also is a shortcut for size === 1
                this.resetAll();
            } else if (rlen && readers[1][1] === cid && readers[1][2] && cid !== this._carr._frontIdx) {
                // next reader points to `cid` (origin position) and read its data already and new
                // data was pushed since last .pop() for that reader - need to sync
                this.sync();
            }
            cid = this._carr._backIdx;
        } else {
            retval = this._carr.peak(cid);
            // array sorted already, readers[i].length >= readers[i + 1].length
            while (rid < rlen && this.length(readers[rid + 1][0]) > nextlen) {
                // swap readers and update rid
                readers[rid] = readers[rid + 1];
                readers[rid][0]._rid = rid++;
            }
            if (rdr[0]._rid !== rid) {
                // position changed
                rdr[0]._rid = rid;
                readers[rid] = rdr;
            }
            cid = this._carr.nextIdx(cid);
            rdr[2] = cid === this._carr._frontIdx;
        }

        rdr[1] = cid;
        return retval;
    }

    /**
     * Update all readers after .rebase() call
     *
     * @param {integer} delta - difference for the backmost node IDx before and aftet .rebase() call
     */
    rebase(delta) {
        if (delta) {
            this._readers.forEach((reader) => {
                var cid = reader[1] - delta;
                if (cid < 0) {
                    // frontIndx <= backIndx in the past
                    // calculate a new position
                    cid += this._carr.size;
                }
                reader[1] = cid;
            });
        }
    }

    /** Reset all readers to point to the beginning of data */
    resetAll() {
        this._readers.forEach((reader) => {
            reader[1] = this._carr.startIdx;
            reader[2] = false;
        });
    }

    /**
     * @param {Reader} rdr
     *
     * @returns {integer} start index
     */
    startIdx(rdr) {
        return this._readers[rdr._rid][1];
    }

    /** Synchronize readers state with the underlying array state */
    sync() {
        var isEmpty = this._carr._isEmpty;
        var readers = this._readers;
        var rlen = readers.length;
        var rdr = readers[0];
        var prev = rdr[1]; // points to prev value of _backIdx
        var cur = this._carr.nextIdx(prev);

        if (rlen === 1) {
            // single reader points to the backmost node only
            rdr[1] = cur;
            rdr[2] = isEmpty;
        } else {
            for (let i = 0; i < rlen; i++) {
                rdr = readers[i];
                if (rdr[1] !== prev) {
                    break;
                }
                rdr[1] = cur;
                rdr[2] = isEmpty;
            }
        }
    }
}

/**
 * Circular Array Class extension with Multiple Readers
 *
 * Multiple Readers are able to read data without removing
 * it from the underlying array until no refs left.
 *
 * Example:
 *
 * reader = cl.reader();
 * // reader.length === cl.length === 5;
 * reader.pop(); // some data returned
 * // reader.length === cl.length === 4;
 *
 * reader2 = cl.reader();
 * // reader2.length === reader.length === cl.length === 4;
 * reader2.pop(); // some data returned
 * // reader2.length === 3, reader.length === cl.length === 4;
 * reader2.pop(); // some data returned
 * // reader2.length === 2, reader.length === cl.length === 4;
 * reader.pop(); // some data returned
 * // reader2.length === 2, reader.length === cl.length === 3;
 * reader.destroy();
 * // reader2.length === cl.length === 2;
 *
 * `callee` is responsible to check `.length` property for presense of
 * data before call .pop() method
 */
class CircularArrayMR extends CircularArray {
    /** @returns {integer} number of active readers */
    get readers() {
        return this._readers.numberOfReaders();
    }

    /**
     * Origin pop method
     *
     * @see CircularArray.pop
     */
    _pop() {
        return super.pop.apply(this, arguments);
    }

    /**
     * Erase all data
     *
     * @see CircularArray.erase
     *
     * @param {boolean} [options.keepReaders = false] - keep readers
     */
    erase(options) {
        super.erase(options);

        if (options && options.keepReaders && this._readers) {
            // reset readers state only
            this._readers.resetAll();
        } else if (this._readers) {
            this._readers.destroy();
        } else {
            this._readers = new ReaderProxy(this);
        }
    }

    /** @see CircularArray.fastErase */
    fastErase() {
        super.fastErase.apply(this, arguments);
        this._readers.resetAll();
    }

    /** @see CircularArray.pop */
    pop() {
        var ret = super.pop.apply(this, arguments);
        this.readers && this._readers.sync();
        return ret;
    }

    /** @see CircularArray.push */
    push() {
        var before = this._backIdx;
        var ret = super.push.apply(this, arguments);
        (this._size === 1 || this._backIdx !== before) && this.readers && this._readers.sync();
        return ret;
    }

    /** @returns {Reader} a new reader */
    reader() {
        return this._readers.create();
    }

    /** @see CircularArray.rebase */
    rebase() {
        const before = this._backIdx;
        super.rebase.apply(this, arguments);
        this._readers.rebase(before - this._backIdx);
    }
}

/** @throws {RangeError} when invalid value passed */
function checkSizeValue(size) {
    if (!Number.isSafeInteger(size) || size < 1) {
        throw RangeError(`Invalid "size" value. Should be an integer value greater than 0, got '${size}' instead (type = ${typeof size})`);
    }
}

/** @returns {integer} Greater common divider */
function getGCD(a, b) {
    return (b ? getGCD(b, a % b) : a);
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

/**
 * @param {integer} start - start position
 * @param {integer} end - end position
 * @param {integer} size - size of object
 *
 * @returns {integer} length of segment defined by `start` and `end`
 */
function segmentLength(start, end, size) {
    return (start >= end ? size : 0) - start + end;
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

module.exports = {
    CircularArray,
    CircularArrayMR
};

/**
 * @typedef InitOptions
 * @type {object}
 * @property {integer} [options.size = 1] - max size
 * @property {boolean | integer} [options.prealloc = false] - number of cells to pre-allocate
 * @property {any} [options.fill] - value to use to fill pre-allocated items
 */
