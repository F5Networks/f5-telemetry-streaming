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

const CircularArray = sourceCode('src/lib/utils/structures').CircularArray;

moduleCache.remember();

describe('Structures / Circular Array', () => {
    describe('initialization', () => {
        it('should create list with default size equal 1', () => {
            const cl = new CircularArray();
            assert.deepStrictEqual(cl.size, 1, 'should use default size value');
            assert.lengthOf(cl, 0, 'should be empty');
            assert.deepStrictEqual(cl.allocated, 0, 'should have 0 alloceted items');
            assert.deepStrictEqual(cl.storage(), []);
        });

        it('should preallocate only 1 element when "size" missing', () => {
            const cl = new CircularArray({ prealloc: true });
            assert.deepStrictEqual(cl.size, 1, 'should use default size value');
            assert.lengthOf(cl, 0, 'should be empty');
            assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
            assert.deepStrictEqual(cl.storage(), new Array(1));
        });

        it('should preallocate and fill only 1 element when "size" missing', () => {
            const cl = new CircularArray({ prealloc: true, fill: 0 });
            assert.deepStrictEqual(cl.size, 1, 'should use default size value');
            assert.lengthOf(cl, 0, 'should be empty');
            assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
            assert.deepStrictEqual(cl.storage(), [0]);
        });

        it('should preallocate only 1 element when "size" missing and preallocate > size', () => {
            const cl = new CircularArray({ prealloc: 10 });
            assert.deepStrictEqual(cl.size, 1, 'should use default size value');
            assert.lengthOf(cl, 0, 'should be empty');
            assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
            assert.deepStrictEqual(cl.storage(), new Array(1));
        });

        it('should preallocate amd fill only 1 element when "size" missing and preallocate > size', () => {
            const cl = new CircularArray({ prealloc: 10, fill: 0 });
            assert.deepStrictEqual(cl.size, 1, 'should use default size value');
            assert.lengthOf(cl, 0, 'should be empty');
            assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
            assert.deepStrictEqual(cl.storage(), [0]);
        });

        it('should preallocate 0 element when "size" missing and "prealloc" is false', () => {
            const cl = new CircularArray({ prealloc: false });
            assert.deepStrictEqual(cl.size, 1, 'should use default size value');
            assert.lengthOf(cl, 0, 'should be empty');
            assert.deepStrictEqual(cl.allocated, 0, 'should have 0 alloceted items');
            assert.deepStrictEqual(cl.storage(), []);
        });

        it('should preallocate 1 element when "size" missing and "prealloc" is negative', () => {
            [
                -1,
                -2,
                -Number.MAX_SAFE_INTEGER
            ].forEach((prealloc) => {
                const cl = new CircularArray({ prealloc });
                assert.deepStrictEqual(cl.size, 1, 'should use default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, 1, 'should have 0 alloceted items');
                assert.deepStrictEqual(cl.storage(), new Array(1));
            });
        });

        it('should preallocate 0 element when "size" missing and "prealloc" is invalid value', () => {
            [
                NaN,
                Infinity,
                -Infinity,
                Number.MAX_VALUE,
                -0,
                0,
                +0,
                'string'
            ].forEach((prealloc) => {
                const cl = new CircularArray({ prealloc });
                assert.deepStrictEqual(cl.size, 1, 'should use default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, 0, 'should have 0 alloceted items');
                assert.deepStrictEqual(cl.storage(), []);
            });
        });

        it('should fail on attempt to set incorrect "size"', () => {
            assert.throws(() => new CircularArray({ size: 'size' }));
            assert.throws(() => new CircularArray({ size: Infinity }));
            assert.throws(() => new CircularArray({ size: 0 }));
            assert.throws(() => new CircularArray({ size: -1 }));
            assert.throws(() => new CircularArray({ size: NaN }));
            assert.throws(() => new CircularArray({ size: true }));
            assert.throws(() => new CircularArray({ size: Number.MAX_VALUE }));
            assert.doesNotThrow(() => new CircularArray({ size: Number.MAX_SAFE_INTEGER }));
        });

        it('should create list with non-default size', () => {
            [
                1,
                2,
                Number.MAX_SAFE_INTEGER
            ].forEach((size) => {
                const cl = new CircularArray({ size });
                assert.deepStrictEqual(cl.size, size, 'should use non-default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, 0, 'should have 0 alloceted items');
                assert.deepStrictEqual(cl.storage(), []);
            });
        });

        it('should preallocate elements with non-default size', () => {
            [
                1,
                2,
                100
            ].forEach((size) => {
                const cl = new CircularArray({ size, prealloc: true });
                assert.deepStrictEqual(cl.size, size, 'should use non-default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, size, 'should have 0 alloceted items');
                assert.deepStrictEqual(cl.storage(), new Array(size));
            });
        });

        it('should preallocate and fill elements with non-default size', () => {
            const fill = 0;
            [
                1,
                2,
                100
            ].forEach((size) => {
                const cl = new CircularArray({ size, prealloc: true, fill });
                assert.deepStrictEqual(cl.size, size, 'should use non-default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, size, 'should have 0 alloceted items');
                assert.deepStrictEqual(cl.storage(), (new Array(size)).fill(fill));
            });
        });

        it('should preallocate elements with non-default size and preallocate > size', () => {
            [
                1,
                2,
                100
            ].forEach((size) => {
                const cl = new CircularArray({ size, prealloc: size * 2 });
                assert.deepStrictEqual(cl.size, size, 'should use non-default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, size, 'should have 0 alloceted items');
                assert.deepStrictEqual(cl.storage(), (new Array(size)));
            });
        });

        it('should preallocate and fill elements with non-default size and preallocate > size', () => {
            const fill = 0;
            [
                1,
                2,
                100
            ].forEach((size) => {
                const cl = new CircularArray({ size, prealloc: size * 2, fill });
                assert.deepStrictEqual(cl.size, size, 'should use non-default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, size, 'should have 0 alloceted items');
                assert.deepStrictEqual(cl.storage(), (new Array(size)).fill(fill));
            });
        });

        it('should preallocate amd fill only 1 element when "size" missing and preallocate > size', () => {
            const cl = new CircularArray({ prealloc: 10, fill: 0 });
            assert.deepStrictEqual(cl.size, 1, 'should use default size value');
            assert.lengthOf(cl, 0, 'should be empty');
            assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
            assert.deepStrictEqual(cl.storage(), [0]);
        });

        it('should create list with non-default size and do not preallocate items', () => {
            [
                1,
                2,
                Number.MAX_SAFE_INTEGER
            ].forEach((size) => {
                const cl = new CircularArray({ size, prealloc: false });
                assert.deepStrictEqual(cl.size, size, 'should use non-default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, 0, 'should have 0 alloceted items');
                assert.deepStrictEqual(cl.storage(), []);
            });
        });
    });

    [
        { prealloc: true },
        { prealloc: 6 },
        { prealloc: 4 },
        { prealloc: 1 },
        { prealloc: false },
        { prealloc: true, fill: 0 },
        { prealloc: 6, fill: 0 },
        { prealloc: 4, fill: 0 },
        { prealloc: 1, fill: 0 },
        { prealloc: false, fill: 0 }
    ].forEach((opts) => {
        describe(`size = 1, opts=${JSON.stringify(opts)}`, () => {
            it('should do basic operaionts', () => {
                const preallocSize = Math.min(1, (Number.isSafeInteger(opts.prealloc)
                    ? opts.prealloc
                    : ((opts.prealloc && 1) || 0)));

                const preallocArray = (new Array(preallocSize));
                if (Object.prototype.hasOwnProperty.call(opts, 'fill')) {
                    preallocArray.fill(opts.fill);
                }

                const cl = new CircularArray(Object.assign({}, opts));
                assert.lengthOf(cl, 0);
                assert.deepStrictEqual(cl.size, 1);
                assert.deepStrictEqual(cl.storage(), preallocArray);

                assert.deepStrictEqual(cl.push(1), opts.fill);
                assert.lengthOf(cl, 1);
                assert.deepStrictEqual(cl.peak(0), 1);
                assert.deepStrictEqual(cl.allocated, 1);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 0);
                assert.deepStrictEqual(cl.bpeak(), 1);
                assert.deepStrictEqual(cl.fpeak(), 1);

                assert.deepStrictEqual(cl.pop(), 1);
                assert.lengthOf(cl, 0);
                assert.deepStrictEqual(cl.allocated, 1);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 0);
                assert.deepStrictEqual(cl.storage(), [opts.fill]);

                assert.deepStrictEqual(cl.pop(), opts.fill);
                assert.lengthOf(cl, 0);
                assert.deepStrictEqual(cl.allocated, 1);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 0);

                assert.deepStrictEqual(cl.push(1), opts.fill);
                assert.deepStrictEqual(cl.push(2), 1);
                assert.deepStrictEqual(cl.push(3), 2);

                assert.lengthOf(cl, 1);
                assert.deepStrictEqual(cl.peak(0), 3);
                assert.deepStrictEqual(cl.allocated, 1);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 0);
                assert.deepStrictEqual(cl.bpeak(), 3);
                assert.deepStrictEqual(cl.fpeak(), 3);
                assert.deepStrictEqual(cl.storage(), [3]);

                cl.rebase();
                assert.deepStrictEqual(cl.storage(), [3]);

                cl.rebase(true);
                assert.deepStrictEqual(cl.storage(), [3]);

                assert.deepStrictEqual(cl.pop(), 3);
                assert.lengthOf(cl, 0);
                assert.deepStrictEqual(cl.allocated, 1);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 0);

                assert.deepStrictEqual(cl.nextIdx(cl.endIdx), 0);
                assert.deepStrictEqual(cl.nextIdx(cl.startIdx), 0);
                assert.deepStrictEqual(cl.prevIdx(cl.endIdx), 0);
                assert.deepStrictEqual(cl.prevIdx(cl.startIdx), 0);
                assert.deepStrictEqual(cl.storage(), [opts.fill]);

                cl.rebase();
                assert.deepStrictEqual(cl.storage(), [opts.fill]);

                cl.rebase(true);
                assert.deepStrictEqual(cl.storage(), []);
            });
        });

        describe(`size = 2, opts=${JSON.stringify(opts)}`, () => {
            it('should do basic operaionts', () => {
                const preallocSize = Math.min(2, (Number.isSafeInteger(opts.prealloc)
                    ? opts.prealloc
                    : ((opts.prealloc && 2) || 0)));

                const preallocArray = (new Array(preallocSize));
                if (Object.prototype.hasOwnProperty.call(opts, 'fill')) {
                    preallocArray.fill(opts.fill);
                }

                const cl = new CircularArray(Object.assign({ size: 2 }, opts));
                assert.lengthOf(cl, 0);
                assert.deepStrictEqual(cl.size, 2);
                assert.deepStrictEqual(
                    cl.storage(),
                    preallocArray
                );

                assert.deepStrictEqual(cl.push(1), opts.fill);
                assert.lengthOf(cl, 1);
                assert.deepStrictEqual(cl.peak(0), 1);
                assert.deepStrictEqual(cl.allocated, preallocArray.length || 1);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 0);
                assert.deepStrictEqual(cl.bpeak(), 1);
                assert.deepStrictEqual(cl.fpeak(), 1);

                assert.deepStrictEqual(cl.pop(), 1);
                assert.lengthOf(cl, 0);
                assert.deepStrictEqual(cl.allocated, preallocArray.length || 1);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 0);
                assert.deepStrictEqual(
                    cl.storage(),
                    preallocArray.length ? preallocArray : [opts.fill]
                );

                assert.deepStrictEqual(cl.push(1), opts.fill);
                assert.deepStrictEqual(cl.push(2), opts.fill);

                assert.deepStrictEqual(cl.push(3), 1);

                assert.lengthOf(cl, 2);
                assert.deepStrictEqual(cl.peak(0), 3);
                assert.deepStrictEqual(cl.allocated, 2);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 1);
                assert.deepStrictEqual(cl.bpeak(), 2);
                assert.deepStrictEqual(cl.fpeak(), 3);
                assert.deepStrictEqual(cl.storage(), [3, 2]);

                cl.rebase();
                assert.deepStrictEqual(cl.storage(), [3, 2]);

                cl.rebase(true);
                assert.deepStrictEqual(cl.storage(), [3, 2]);

                assert.deepStrictEqual(cl.pop(), 2);

                cl.rebase();
                assert.deepStrictEqual(cl.storage(), [3, opts.fill]);

                cl.rebase(true);
                assert.deepStrictEqual(cl.storage(), [3]);

                assert.deepStrictEqual(cl.pop(), 3);
                assert.lengthOf(cl, 0);
                assert.deepStrictEqual(cl.allocated, 1);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 0);

                assert.deepStrictEqual(cl.nextIdx(cl.endIdx), 1);
                assert.deepStrictEqual(cl.nextIdx(cl.startIdx), 1);
                assert.deepStrictEqual(cl.prevIdx(cl.endIdx), 1);
                assert.deepStrictEqual(cl.prevIdx(cl.startIdx), 1);
                assert.deepStrictEqual(cl.storage(), [opts.fill]);

                cl.rebase();
                assert.deepStrictEqual(cl.storage(), [opts.fill]);

                cl.rebase(true);
                assert.deepStrictEqual(cl.storage(), []);
            });
        });

        describe(`size = 6, opts=${JSON.stringify(opts)}`, () => {
            it('should do basic operaionts', () => {
                const preallocSize = Math.min(6, (Number.isSafeInteger(opts.prealloc)
                    ? opts.prealloc
                    : ((opts.prealloc && 6) || 0)));

                const preallocArray = (new Array(preallocSize));
                if (Object.prototype.hasOwnProperty.call(opts, 'fill')) {
                    preallocArray.fill(opts.fill);
                }

                const cl = new CircularArray(Object.assign({ size: 6 }, opts));
                assert.lengthOf(cl, 0);
                assert.deepStrictEqual(cl.size, 6);
                assert.deepStrictEqual(
                    cl.storage(),
                    preallocArray
                );

                assert.deepStrictEqual(cl.push(1), opts.fill);
                assert.lengthOf(cl, 1);
                assert.deepStrictEqual(cl.peak(0), 1);
                assert.deepStrictEqual(cl.allocated, preallocArray.length || 1);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 0);
                assert.deepStrictEqual(cl.bpeak(), 1);
                assert.deepStrictEqual(cl.fpeak(), 1);

                assert.deepStrictEqual(cl.pop(), 1);
                assert.lengthOf(cl, 0);
                assert.deepStrictEqual(cl.allocated, preallocArray.length || 1);
                assert.deepStrictEqual(cl.endIdx, 0);
                assert.deepStrictEqual(cl.startIdx, 0);
                assert.deepStrictEqual(
                    cl.storage(),
                    preallocArray.length ? preallocArray : [opts.fill]
                );

                assert.deepStrictEqual(cl.push(1), opts.fill);
                assert.deepStrictEqual(cl.push(2), opts.fill);
                assert.deepStrictEqual(cl.push(3), opts.fill);

                assert.lengthOf(cl, 3);
                assert.deepStrictEqual(cl.allocated, Math.max(preallocArray.length, 3));
                assert.deepStrictEqual(cl.endIdx, 2);
                assert.deepStrictEqual(cl.startIdx, 0);
                assert.deepStrictEqual(cl.bpeak(), 1);
                assert.deepStrictEqual(cl.fpeak(), 3);

                assert.deepStrictEqual(cl.push(4), opts.fill);
                assert.deepStrictEqual(cl.push(5), opts.fill);
                assert.deepStrictEqual(cl.push(6), opts.fill);
                assert.deepStrictEqual(cl.push(7), 1);
                assert.deepStrictEqual(cl.pop(), 2);
                assert.deepStrictEqual(cl.pop(), 3);
                assert.deepStrictEqual(cl.pop(), 4);
                assert.deepStrictEqual(cl.push(8), opts.fill);
                assert.deepStrictEqual(cl.push(9), opts.fill);
                assert.deepStrictEqual(cl.push(10), opts.fill);
                assert.deepStrictEqual(cl.push(11), 5);
                assert.deepStrictEqual(cl.push(12), 6);
                assert.deepStrictEqual(cl.push(13), 7);
                assert.deepStrictEqual(cl.push(14), 8);
                assert.deepStrictEqual(cl.peak(0), 13);

                assert.deepStrictEqual(cl.pop(), 9);
                cl.rebase();
                assert.deepStrictEqual(cl.storage(), [10, 11, 12, 13, 14, opts.fill]);

                assert.deepStrictEqual(cl.pop(), 10);
                assert.deepStrictEqual(cl.pop(), 11);
                cl.rebase();
                assert.deepStrictEqual(cl.storage(), [12, 13, 14, opts.fill, opts.fill, opts.fill]);

                assert.deepStrictEqual(cl.pop(), 12);
                cl.rebase(true);
                assert.deepStrictEqual(cl.storage(), [13, 14]);

                assert.deepStrictEqual(cl.pop(), 13);
                cl.rebase();
                assert.deepStrictEqual(cl.storage(), [14, opts.fill]);
            });
        });
    });

    describe('.rebase()', () => {
        it('should shift array', () => {
            const cl = new CircularArray({ size: 4 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4);
            cl.pop();
            cl.rebase();
            assert.deepStrictEqual(cl.storage(), [2, 3, 4, undefined]);
        });

        it('should rotate array', () => {
            const cl = new CircularArray({ size: 4 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4);
            cl.pop();
            cl.pop();
            cl.pop();
            cl.push(5);
            cl.rebase();
            assert.deepStrictEqual(cl.storage(), [4, 5, undefined, undefined]);
        });
    });

    describe('.erase()', () => {
        it('should re-use size if not defined', () => {
            const cl = new CircularArray({ size: 4 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4);

            cl.erase();
            assert.deepStrictEqual(cl.size, 4);
        });

        it('should re-use size if not defined', () => {
            const cl = new CircularArray({ size: 4 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4);

            cl.erase({ prealloc: true, fill: 0 });
            assert.deepStrictEqual(cl.size, 4);
            assert.deepStrictEqual(cl.storage(), [0, 0, 0, 0]);
        });

        it('should re-use "fill" if not defined', () => {
            const cl = new CircularArray({ size: 4, fill: 0 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4);

            cl.erase({ prealloc: true });
            assert.deepStrictEqual(cl.size, 4);
            assert.deepStrictEqual(cl.storage(), [0, 0, 0, 0]);
        });

        it('should not re-use "fill" if not defined at init', () => {
            const cl = new CircularArray({ size: 4 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4);

            cl.erase({ prealloc: true });
            assert.deepStrictEqual(cl.size, 4);
            assert.deepStrictEqual(cl.storage(), [1, 2, 3, 4], 'should not overide prev values when "fill" not defined');
        });
    });

    describe('.fastErase()', () => {
        it('should erases all elems (case 1)', () => {
            const cl = new CircularArray({ size: 4, fill: 0 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4);

            cl.fastErase();
            assert.deepStrictEqual(cl.storage(), [0, 0, 0, 0]);
        });

        it('should erases all elems (case 2)', () => {
            const cl = new CircularArray({ size: 4, fill: 0 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5);

            cl.fastErase();
            assert.deepStrictEqual(cl.storage(), [0, 0, 0, 0]);
        });

        it('should erases all elems (case 3)', () => {
            const cl = new CircularArray({ size: 4, fill: 0 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5); cl.push(6);

            cl.fastErase();
            assert.deepStrictEqual(cl.storage(), [0, 0, 0, 0]);
        });

        it('should erase all elems (size of 1)', () => {
            const cl = new CircularArray({ size: 1, fill: 0 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5); cl.push(6);

            cl.fastErase();
            assert.deepStrictEqual(cl.storage(), [0]);
        });

        it('should erases non-empty elems only', () => {
            const cl = new CircularArray({ size: 4, fill: 0 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5);
            cl.pop(); cl.pop();

            cl._storage[1] = 10; cl._storage[2] = 11;

            cl.fastErase();
            assert.deepStrictEqual(cl.storage(), [0, 10, 11, 0]);
        });

        it('should erases non-empty elems only (size > 1, length = 1)', () => {
            const cl = new CircularArray({ size: 4, fill: 0 });
            cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5); cl.push(6);
            cl.pop(); cl.pop(); cl.pop();

            cl._storage[0] = 10; cl._storage[2] = 11; cl._storage[3] = 12;

            cl.fastErase();
            assert.deepStrictEqual(cl.storage(), [10, 0, 11, 12]);
        });
    });
});
