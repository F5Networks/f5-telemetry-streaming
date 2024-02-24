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

/* eslint-disable no-multi-assign, no-plusplus, no-unneeded-ternary, operator-linebreak */
/* eslint-disable no-unused-expressions, no-var, one-var, one-var-declaration-per-line */

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
            checkSizeValue(arguments[0]);
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
                checkSizeValue(newSize);
                this._size = newSize;
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
     * - should check .length before calling .pop()
     */
    pop() {
        var retval = this._back.value;
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
                retval = this._back.value;

                this._front = this._front.next = this._back;
                this._back = this._front.next; // points to next node or to itself
                this._front.next = null;
                this._front.value = value;
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
            this._length++;
        }
        return retval;
    }
}

/** @throws {RangeError} when invalid value passed */
function checkSizeValue(size) {
    if (!Number.isSafeInteger(size) || size < 1) {
        throw RangeError(`Invalid "size" value. Should be an integer value greater than 0, got '${size}' instead (type = ${typeof size})`);
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

    /** @returns {any} value of the backmost node */
    bpeak() {
        return this._proxy.bpeak(this);
    }

    /** Destroy the reader */
    destroy() {
        this._proxy.destroy(this);
    }

    /** @returns {any} value of the topmost node */
    fpeak() {
        return this._proxy.fpeak(this);
    }

    /** @returns {boolean} true if there is data to read */
    hasData() {
        return this._proxy.hasData(this);
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
    constructor(clist) {
        this._clist = clist;
        // [Reader, node-to-read, is-last-node-read]
        // node-to-read usually is null when reader points to the tail
        this._readers = [];
    }

    /**
     * @param {Reader} rdr
     *
     * @returns {any} value of the backmost node
     */
    bpeak(rdr) {
        return this._readers[rdr._rid][1].value;
    }

    /** @returns {Reader} a new reader that points to the beginning of the data */
    create() {
        var rid = this._readers.length;
        // [Reader, node-to-read, is-last-node-read]
        this._readers.push([new Reader(this, rid), null, false]);
        return this._readers[rid][0];
    }

    /** @param {Reader} [rdr] - reader to destroy. If not set then all readers will be destroyed */
    destroy(rdr) {
        var rid;
        var readers = this._readers;
        var rlen = readers.length;

        // if there is only 1 reader then all data should be left untouched
        if (!rdr || rlen < 2) {
            // eslint-disable-next-line no-shadow
            this._readers.forEach((reader) => {
                reader[0]._proxy = null;
            });
            this._readers = [];
            return;
        }
        // if there are more than 1 reader then all nodes in between should be freed

        rid = rdr._rid;
        rdr = readers[rdr._rid];
        rdr[0]._proxy = null;

        // check that reader points to the backmost node and there is data at all
        if ((rdr[1] === null || rdr[1] === this._clist.back) && this._clist.length) {
            // if the reader is the single owner of the backmost node then
            // need to remove all nodes between that node and the next closest one
            rdr[2] = false; // reset flag
            while (this.numberOfBacknodeRefs() === 1 && this._clist.length) {
                // that's us, safe to .pop()
                this._clist.pop();
            }
        }

        // remove reader of the list of registered readers
        if (rid !== --rlen) {
            readers[rid] = readers[rlen];
            readers[rid][0]._rid = rid;
        }
        readers.length = rlen;
    }

    /**
     * @param {Reader} rdr
     *
     * @returns {any} value of the topmost node */
    fpeak() {
        return this._clist.fpeak();
    }

    /**
     * @param {Reader} rdr
     *
     * @returns {boolean} true if there is data to read */
    hasData(rdr) {
        rdr = this._readers[rdr._rid];
        return rdr[1] === null // points to the backmost node
            ? this._clist.length !== 0
            : (!rdr[2] || rdr[1].next !== null); // last node was read already or new data added after that
    }

    /**
     * @param {Array<Reader, any, boolean>} rdr
     *
     * @returns {integer} 1 if reader points to the backmost node else 0
     */
    isBacknodeRef(rdr) {
        return ((rdr[1] === this._clist.back && !rdr[2]) || rdr[1] === null)
            ? 1
            : 0;
    }

    /**
     * @param {Reader} rdr
     *
     * @returns {boolean} true the reader needs to make a copy of data it points to before any modifications
     */
    needCopy(rdr) {
        var rnode = this._readers[rdr._rid][1];
        return (rnode !== null && rnode !== this._clist.back) || this.numberOfBacknodeRefs() > 1;
    }

    /** @returns {integer} number of active refs for the backmost node */
    numberOfBacknodeRefs() {
        var i = 0;
        var readers = this._readers;
        var refsnum = 0;
        var rnum = readers.length;

        if (rnum === 1) {
            refsnum = this.isBacknodeRef(readers[0]);
        } else if (rnum === 2) {
            refsnum
                = this.isBacknodeRef(readers[0])
                + this.isBacknodeRef(readers[1]);
        } else if (rnum === 3) {
            refsnum
                = this.isBacknodeRef(readers[0])
                + this.isBacknodeRef(readers[1])
                + this.isBacknodeRef(readers[2]);
        } else if (rnum === 4) {
            refsnum
                = this.isBacknodeRef(readers[0])
                + this.isBacknodeRef(readers[1])
                + this.isBacknodeRef(readers[2])
                + this.isBacknodeRef(readers[3]);
        } else {
            for (; i < rnum; i++) {
                refsnum += this.isBacknodeRef(readers[i]);
            }
        }
        return refsnum;
    }

    /** @returns {integer} number of active readers */
    numberOfReaders() {
        return this._readers.length;
    }

    /**
     * `callee` is responsible to check `.hasData` property for presense of
     * data before call .pop() method
     *
     * @param {Reader} rdr
     *
     * @returns {any} value of the backmost node (will be deleted if no readers left behind)
     */
    pop(rdr) {
        var backnode = this._clist.back;
        var readers = this._readers;
        var retval;
        var rnode;
        rdr = readers[rdr._rid];

        if (readers.length === 1) {
            // shortcut for a single reader
            retval = this._clist._pop(); // throws error when no data
            rdr[1] = null;
            rdr[2] = false;
            return retval;
        }

        rnode = rdr[1];
        if (rnode === null) {
            // - new reader
            // - .erase() called
            // - no data left after prev call
            rnode = backnode; // may be a null but it is ok
        } else if (rdr[2]) {
            // the node is the head and was read already
            rnode = rnode.next; // may be a null but it is ok
        }

        retval = rnode.value; // throws error when no data because rnode === null
        // "retain" ref to next node
        if (rnode.next === null) {
            // the only line in the code
            // where ref to `backnode` can be saved
            rdr[1] = rnode;
            rdr[2] = true;
        } else {
            rdr[1] = rnode.next;
            rdr[2] = false;
        }

        // need to make decision about current node removal
        if (rnode === backnode && this.numberOfBacknodeRefs() === 0) {
            this._clist._pop();
            this.rebase(this._clist.length ? rnode : null);
        }
        return retval;
    }

    /**
     * Update readers of the backmost node to point to a new location
     *
     * @param {null | OneWayNode} oldback
     */
    rebase(oldback) {
        var readers = this._readers;
        var rnum = readers.length;
        var i;

        if (rnum === 1) {
            readers[0][1] = null;
            readers[0][2] = false;
        } else {
            for (i = 0; i < rnum; i++) {
                if (oldback === null || readers[i][1] === oldback) {
                    readers[i][1] = null;
                    readers[i][2] = false;
                }
            }
        }
    }

    /** Reset all readers to point to the beginning of data */
    resetAll() {
        this.rebase(null);
    }
}

/**
 * Circular List Class extension with Multiple Readers
 *
 * Multiple Readers are able to read data without removing
 * it from the underlying array until no refs left.
 *
 * Example:
 *
 * reader = cl.reader();
 * // reader.hasData() === true;
 * reader.pop(); // some data returned
 * // reader.hasData() === true;
 *
 * `callee` is responsible to check `.length` property for presense of
 * data before call .pop() method
 */
class CircularLinkedListMR extends CircularLinkedList {
    /** @returns {integer} number of active readers */
    get readers() {
        return this._readers.numberOfReaders();
    }

    /**
     * Origin pop method
     *
     * @see CircularLinkedList.pop
     */
    _pop() {
        return super.pop.apply(this, arguments);
    }

    /**
     * Erase all data
     *
     * @see CircularLinkedList.erase
     *
     * @param {boolean} [keepReaders = false] - keep readers
     */
    erase(keepReaders) {
        super.erase();
        if (keepReaders && this._readers) {
            this._readers.resetAll();
        } else if (this._readers) {
            this._readers.destroy();
        } else {
            this._readers = new ReaderProxy(this);
        }
    }

    /** @see CircularLinkedList.push */
    pop() {
        var backnode = this.back;
        var ret = super.pop.apply(this, arguments);
        this.readers && this._readers.rebase(backnode);
        return ret;
    }

    /** @see CircularLinkedList.push */
    push() {
        var backnode = this.back;
        var ret = super.push.apply(this, arguments);
        this.front === backnode && this.readers && this._readers.rebase(backnode);
        return ret;
    }

    /** @returns {Reader} a new reader */
    reader() {
        return this._readers.create();
    }
}

module.exports = {
    CircularLinkedList,
    CircularLinkedListMR
};

/**
 * @typedef OneWayNode
 * @type {Object}
 * @property {null | OneWayNode} next
 * @property {any} value
 */
