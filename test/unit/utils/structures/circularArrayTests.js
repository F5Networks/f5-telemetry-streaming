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

/* eslint-disable import/order, no-plusplus, no-nested-ternary */
const moduleCache = require('../../shared/restoreCache')();

const assert = require('../../shared/assert');
const sourceCode = require('../../shared/sourceCode');

const CircularArray = sourceCode('src/lib/utils/structures').CircularArray;
const CircularArrayMR = sourceCode('src/lib/utils/structures').CircularArrayMR;

moduleCache.remember();

describe('Structures / Circular Arrays', () => {
    [
        CircularArray,
        CircularArrayMR
    ].forEach((Cls) => describe(`${Cls.name}`, () => {
        describe('initialization', () => {
            it('should create list with default size equal 1', () => {
                const cl = new Cls();
                assert.deepStrictEqual(cl.size, 1, 'should use default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
                assert.deepStrictEqual(cl.storage(), [undefined]);
            });

            it('should preallocate only 1 element when "size" missing', () => {
                const cl = new Cls({ prealloc: true });
                assert.deepStrictEqual(cl.size, 1, 'should use default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
                assert.deepStrictEqual(cl.storage(), new Array(1));
            });

            it('should preallocate and fill only 1 element when "size" missing', () => {
                const cl = new Cls({ prealloc: true, fill: 0 });
                assert.deepStrictEqual(cl.size, 1, 'should use default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
                assert.deepStrictEqual(cl.storage(), [0]);
            });

            it('should preallocate only 1 element when "size" missing and preallocate > size', () => {
                const cl = new Cls({ prealloc: 10 });
                assert.deepStrictEqual(cl.size, 1, 'should use default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
                assert.deepStrictEqual(cl.storage(), new Array(1));
            });

            it('should preallocate amd fill only 1 element when "size" missing and preallocate > size', () => {
                const cl = new Cls({ prealloc: 10, fill: 0 });
                assert.deepStrictEqual(cl.size, 1, 'should use default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
                assert.deepStrictEqual(cl.storage(), [0]);
            });

            it('should preallocate 1 element when "size" missing and "prealloc" is false', () => {
                const cl = new Cls({ prealloc: false });
                assert.deepStrictEqual(cl.size, 1, 'should use default size value');
                assert.lengthOf(cl, 0, 'should be empty');
                assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
                assert.deepStrictEqual(cl.storage(), [undefined]);
            });

            it('should preallocate 1 element when "size" missing and "prealloc" is negative', () => {
                [
                    -1,
                    -2,
                    -Number.MAX_SAFE_INTEGER
                ].forEach((prealloc) => {
                    const cl = new Cls({ prealloc });
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
                    const cl = new Cls({ prealloc });
                    assert.deepStrictEqual(cl.size, 1, 'should use default size value');
                    assert.lengthOf(cl, 0, 'should be empty');
                    assert.deepStrictEqual(cl.allocated, 1, 'should have 1 alloceted items');
                    assert.deepStrictEqual(cl.storage(), [undefined]);
                });
            });

            it('should fail on attempt to set incorrect "size"', () => {
                assert.throws(() => new Cls({ size: 'size' }));
                assert.throws(() => new Cls({ size: Infinity }));
                assert.throws(() => new Cls({ size: 0 }));
                assert.throws(() => new Cls({ size: -1 }));
                assert.throws(() => new Cls({ size: NaN }));
                assert.throws(() => new Cls({ size: true }));
                assert.throws(() => new Cls({ size: Number.MAX_VALUE }));
                assert.doesNotThrow(() => new Cls({ size: Number.MAX_SAFE_INTEGER }));
            });

            it('should create list with non-default size', () => {
                [
                    1,
                    2,
                    Number.MAX_SAFE_INTEGER
                ].forEach((size) => {
                    const cl = new Cls({ size });
                    assert.deepStrictEqual(cl.size, size, 'should use non-default size value');
                    assert.lengthOf(cl, 0, 'should be empty');
                    assert.deepStrictEqual(cl.allocated, size === 1 ? 1 : 0);
                    assert.deepStrictEqual(cl.storage(), size === 1 ? [undefined] : []);
                });
            });

            it('should preallocate elements with non-default size', () => {
                [
                    1,
                    2,
                    100
                ].forEach((size) => {
                    const cl = new Cls({ size, prealloc: true });
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
                    const cl = new Cls({ size, prealloc: true, fill });
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
                    const cl = new Cls({ size, prealloc: size * 2 });
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
                    const cl = new Cls({ size, prealloc: size * 2, fill });
                    assert.deepStrictEqual(cl.size, size, 'should use non-default size value');
                    assert.lengthOf(cl, 0, 'should be empty');
                    assert.deepStrictEqual(cl.allocated, size, 'should have 0 alloceted items');
                    assert.deepStrictEqual(cl.storage(), (new Array(size)).fill(fill));
                });
            });

            it('should preallocate amd fill only 1 element when "size" missing and preallocate > size', () => {
                const cl = new Cls({ prealloc: 10, fill: 0 });
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
                    const cl = new Cls({ size, prealloc: false });
                    assert.deepStrictEqual(cl.size, size, 'should use non-default size value');
                    assert.lengthOf(cl, 0, 'should be empty');
                    assert.deepStrictEqual(cl.allocated, size === 1 ? 1 : 0);
                    assert.deepStrictEqual(cl.storage(), size === 1 ? [undefined] : []);
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
                    const preallocArray = new Array(1);
                    if (Object.prototype.hasOwnProperty.call(opts, 'fill')) {
                        preallocArray.fill(opts.fill);
                    }

                    const cl = new Cls(Object.assign({}, opts));
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

                    const cl = new Cls(Object.assign({ size: 2 }, opts));
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

                    const cl = new Cls(Object.assign({ size: 6 }, opts));
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
                const cl = new Cls({ size: 4 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4);
                cl.pop();
                cl.rebase();
                assert.deepStrictEqual(cl.storage(), [2, 3, 4, undefined]);
            });

            it('should rotate array', () => {
                const cl = new Cls({ size: 4 });
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
                const cl = new Cls({ size: 4 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4);

                cl.erase();
                assert.deepStrictEqual(cl.size, 4);
            });

            it('should re-use size if not defined', () => {
                const cl = new Cls({ size: 4 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4);

                cl.erase({ prealloc: true, fill: 0 });
                assert.deepStrictEqual(cl.size, 4);
                assert.deepStrictEqual(cl.storage(), [0, 0, 0, 0]);
            });

            it('should re-use "fill" if not defined', () => {
                const cl = new Cls({ size: 4, fill: 0 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4);

                cl.erase({ prealloc: true });
                assert.deepStrictEqual(cl.size, 4);
                assert.deepStrictEqual(cl.storage(), [0, 0, 0, 0]);
            });

            it('should not re-use "fill" if not defined at init', () => {
                const cl = new Cls({ size: 4 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4);

                cl.erase({ prealloc: true });
                assert.deepStrictEqual(cl.size, 4);
                assert.deepStrictEqual(cl.storage(), [1, 2, 3, 4], 'should not overide prev values when "fill" not defined');
            });
        });

        describe('.fastErase()', () => {
            it('should erases all elems (case 1)', () => {
                const cl = new Cls({ size: 4, fill: 0 });
                cl.fastErase();
                assert.deepStrictEqual(cl.storage(), []);

                cl.push(1); cl.push(2); cl.push(3); cl.push(4);

                cl.fastErase();
                assert.deepStrictEqual(cl.storage(), [0, 0, 0, 0]);
            });

            it('should erases all elems (case 2)', () => {
                const cl = new Cls({ size: 4, fill: 0 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5);

                cl.fastErase();
                assert.deepStrictEqual(cl.storage(), [0, 0, 0, 0]);
            });

            it('should erases all elems (case 3)', () => {
                const cl = new Cls({ size: 4, fill: 0 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5); cl.push(6);

                cl.fastErase();
                assert.deepStrictEqual(cl.storage(), [0, 0, 0, 0]);
            });

            it('should erase all elems (size of 1)', () => {
                const cl = new Cls({ size: 1, fill: 0 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5); cl.push(6);

                cl.fastErase();
                assert.deepStrictEqual(cl.storage(), [0]);
            });

            it('should erases non-empty elems only', () => {
                const cl = new Cls({ size: 4, fill: 0 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5);
                cl.pop(); cl.pop();

                cl._storage[1] = 10; cl._storage[2] = 11;

                cl.fastErase();
                assert.deepStrictEqual(cl.storage(), [0, 10, 11, 0]);
            });

            it('should erases non-empty elems only (size > 1, length = 1)', () => {
                const cl = new Cls({ size: 4, fill: 0 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5); cl.push(6);
                cl.pop(); cl.pop(); cl.pop();

                cl._storage[0] = 10; cl._storage[2] = 11; cl._storage[3] = 12;

                cl.fastErase();
                assert.deepStrictEqual(cl.storage(), [10, 0, 11, 12]);
            });

            it('should reset indexes but keep data', () => {
                const cl = new Cls({ size: 4, fill: 0 });
                cl.push(1); cl.push(2); cl.push(3); cl.push(4); cl.push(5); cl.push(6);

                cl.fastErase(false);

                assert.deepStrictEqual(cl.content(0, 10), [5, 6, 3, 4]);
            });
        });

        describe('.content()', () => {
            it('should return correct content for size = 1', () => {
                const cl = new Cls({ size: 1, fill: 0, prealloc: true });
                assert.deepStrictEqual(cl.content(), [0]);
                assert.deepStrictEqual(cl.content(1, 1), []);
                assert.deepStrictEqual(cl.content(0, 0), [0]);
                assert.deepStrictEqual(cl.content(0, 1), [0]);
                assert.deepStrictEqual(cl.content(0), [0]);

                cl.push(1);
                assert.deepStrictEqual(cl.content(), [1]);
                assert.deepStrictEqual(cl.content(1, 1), []);
                assert.deepStrictEqual(cl.content(0, 0), [1]);
                assert.deepStrictEqual(cl.content(0, 1), [1]);
                assert.deepStrictEqual(cl.content(0), [1]);
            });

            it('should return correct content for size = 2', () => {
                const cl = new Cls({ size: 2, fill: 0, prealloc: true });
                assert.deepStrictEqual(cl.content(), [0]);
                assert.deepStrictEqual(cl.content(1, 1), [0]);
                assert.deepStrictEqual(cl.content(0, 0), [0]);
                assert.deepStrictEqual(cl.content(0, 1), [0, 0]);
                assert.deepStrictEqual(cl.content(0), [0]);

                cl.push(1);
                assert.deepStrictEqual(cl.content(), [1]);
                assert.deepStrictEqual(cl.content(1, 1), [0]);
                assert.deepStrictEqual(cl.content(0, 0), [1]);
                assert.deepStrictEqual(cl.content(0, 1), [1, 0]);
                assert.deepStrictEqual(cl.content(0), [1]);

                cl.push(2);
                assert.deepStrictEqual(cl.content(), [1, 2]);
                assert.deepStrictEqual(cl.content(1, 1), [2]);
                assert.deepStrictEqual(cl.content(0, 0), [1]);
                assert.deepStrictEqual(cl.content(0, 1), [1, 2]);
                assert.deepStrictEqual(cl.content(0, 2), [1, 2]);
                assert.deepStrictEqual(cl.content(1, 2), [2]);
                assert.deepStrictEqual(cl.content(2, 2), []);
                assert.deepStrictEqual(cl.content(2, 0), [1]);
                assert.deepStrictEqual(cl.content(1, 0), [2, 1]);
                assert.deepStrictEqual(cl.content(0), [1, 2]);

                cl.push(3);
                assert.deepStrictEqual(cl.content(), [2, 3]);
                assert.deepStrictEqual(cl.content(1, 1), [2]);
                assert.deepStrictEqual(cl.content(0, 0), [3]);
                assert.deepStrictEqual(cl.content(0, 1), [3, 2]);
                assert.deepStrictEqual(cl.content(0, 2), [3, 2]);
                assert.deepStrictEqual(cl.content(1, 2), [2]);
                assert.deepStrictEqual(cl.content(2, 2), []);
                assert.deepStrictEqual(cl.content(1, 0), [2, 3]);
                assert.deepStrictEqual(cl.content(0), [3]);
                assert.deepStrictEqual(cl.content(1), [2, 3]);

                cl.push(4);
                assert.deepStrictEqual(cl.content(), [3, 4]);
                assert.deepStrictEqual(cl.content(1, 1), [4]);
                assert.deepStrictEqual(cl.content(0, 0), [3]);
                assert.deepStrictEqual(cl.content(0, 1), [3, 4]);
                assert.deepStrictEqual(cl.content(0, 2), [3, 4]);
                assert.deepStrictEqual(cl.content(1, 2), [4]);
                assert.deepStrictEqual(cl.content(2, 2), []);
                assert.deepStrictEqual(cl.content(1, 0), [4, 3]);
                assert.deepStrictEqual(cl.content(0), [3, 4]);
                assert.deepStrictEqual(cl.content(1), [4]);
            });

            it('should return correct content for size = 3', () => {
                const cl = new Cls({ size: 3, fill: 0, prealloc: true });
                assert.deepStrictEqual(cl.content(), [0]);
                assert.deepStrictEqual(cl.content(1, 1), [0]);
                assert.deepStrictEqual(cl.content(0, 0), [0]);
                assert.deepStrictEqual(cl.content(0, 1), [0, 0]);
                assert.deepStrictEqual(cl.content(0), [0]);

                cl.push(1);
                assert.deepStrictEqual(cl.content(), [1]);
                assert.deepStrictEqual(cl.content(1, 1), [0]);
                assert.deepStrictEqual(cl.content(0, 0), [1]);
                assert.deepStrictEqual(cl.content(0, 1), [1, 0]);
                assert.deepStrictEqual(cl.content(0), [1]);

                cl.push(2);
                assert.deepStrictEqual(cl.content(), [1, 2]);
                assert.deepStrictEqual(cl.content(1, 1), [2]);
                assert.deepStrictEqual(cl.content(0, 0), [1]);
                assert.deepStrictEqual(cl.content(0, 1), [1, 2]);
                assert.deepStrictEqual(cl.content(0, 2), [1, 2, 0]);
                assert.deepStrictEqual(cl.content(1, 2), [2, 0]);
                assert.deepStrictEqual(cl.content(2, 2), [0]);
                assert.deepStrictEqual(cl.content(2, 0), [0, 1]);
                assert.deepStrictEqual(cl.content(1, 0), [2, 0, 1]);
                assert.deepStrictEqual(cl.content(0), [1, 2]);

                cl.push(3);
                assert.deepStrictEqual(cl.content(), [1, 2, 3]);
                assert.deepStrictEqual(cl.content(1, 1), [2]);
                assert.deepStrictEqual(cl.content(0, 0), [1]);
                assert.deepStrictEqual(cl.content(0, 1), [1, 2]);
                assert.deepStrictEqual(cl.content(0, 2), [1, 2, 3]);
                assert.deepStrictEqual(cl.content(1, 2), [2, 3]);
                assert.deepStrictEqual(cl.content(2, 2), [3]);
                assert.deepStrictEqual(cl.content(1, 0), [2, 3, 1]);
                assert.deepStrictEqual(cl.content(0), [1, 2, 3]);
                assert.deepStrictEqual(cl.content(1), [2, 3]);

                cl.push(4);
                assert.deepStrictEqual(cl.content(), [2, 3, 4]);
                assert.deepStrictEqual(cl.content(1, 1), [2]);
                assert.deepStrictEqual(cl.content(0, 0), [4]);
                assert.deepStrictEqual(cl.content(0, 1), [4, 2]);
                assert.deepStrictEqual(cl.content(0, 2), [4, 2, 3]);
                assert.deepStrictEqual(cl.content(1, 2), [2, 3]);
                assert.deepStrictEqual(cl.content(2, 2), [3]);
                assert.deepStrictEqual(cl.content(1, 0), [2, 3, 4]);
                assert.deepStrictEqual(cl.content(0), [4]);
                assert.deepStrictEqual(cl.content(1), [2, 3, 4]);
            });
        });

        describe('.nextIdx()/.prevIdx()', () => {
            it('should return correct index for size = 1', () => {
                const cl = new Cls({ size: 1, fill: 0, prealloc: true });
                cl.push(1);

                for (let i = 0; i < 10; i += 1) {
                    assert.deepStrictEqual(cl.nextIdx(i), 0);
                    assert.deepStrictEqual(cl.prevIdx(i), 0);
                }
            });

            it('should return correct index for size = 2', () => {
                const cl = new Cls({ size: 2, fill: 0, prealloc: true });
                cl.push(1);
                cl.push(2);

                for (let i = 0; i < 10; i += 1) {
                    assert.deepStrictEqual(cl.nextIdx(i), (i >= cl._size ? 0 : (i % 2) ? 0 : 1));
                    assert.deepStrictEqual(cl.prevIdx(i), (i >= cl._size ? (cl._size - 1) : (i % 2) ? 0 : 1));
                }
            });

            it('should return correct index for size = 3', () => {
                const cl = new Cls({ size: 3, fill: 0, prealloc: true });
                cl.push(1);
                cl.push(2);
                cl.push(3);

                for (let i = 0; i < 10; i += 1) {
                    assert.deepStrictEqual(cl.nextIdx(i), (i >= cl._size ? 0 : ((i + 1) % 3)));
                }
                assert.deepStrictEqual(cl.prevIdx(0), 2);
                assert.deepStrictEqual(cl.prevIdx(1), 0);
                assert.deepStrictEqual(cl.prevIdx(2), 1);
                assert.deepStrictEqual(cl.prevIdx(3), 2);
                assert.deepStrictEqual(cl.prevIdx(4), 2);
                assert.deepStrictEqual(cl.prevIdx(5), 2);
            });
        });
    }));

    describe('CircularArrayMR', () => {
        it('should create and destroy readers', () => {
            const cl = new CircularArrayMR();
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
            const cl = new CircularArrayMR({ size: 10 });
            const r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(r1, 2);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            cl.erase({ keepReaders: true });
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);

            cl.push(1); cl.push(2); cl.push(3);

            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(r1, 2);

            const r2 = cl.reader();
            assert.lengthOf(r2, 2);
            assert.deepStrictEqual(r2.pop(), 2);
            assert.lengthOf(r2, 1);

            cl.erase({ keepReaders: true });
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);
            assert.lengthOf(r2, 0);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r2.startIdx, cl.startIdx);

            cl.push(1); cl.push(2); cl.push(3);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);
            assert.lengthOf(r2, 3);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(r2.pop(), 1);
            assert.lengthOf(r2, 2);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(r1, 2);
        });

        it('should destroy readers after calling .erase()', () => {
            const cl = new CircularArrayMR({ size: 10 });
            let r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3);

            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(r1, 2);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            cl.erase();
            assert.lengthOf(cl, 0);
            assert.throws(() => r1.length, /length/);

            cl.push(1); cl.push(2); cl.push(3);

            assert.throws(() => r1.pop());

            r1 = cl.reader();
            const r2 = cl.reader();
            assert.lengthOf(r2, 3);
            assert.deepStrictEqual(r2.pop(), 1);
            assert.lengthOf(r2, 2);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(r1, 2);

            cl.erase({ keepReaders: false });
            cl.push(1); cl.push(2); cl.push(3);

            assert.throws(() => r1.length, /length/);
            assert.throws(() => r1.pop());
            assert.throws(() => r2.length, /length/);
            assert.throws(() => r2.pop());
        });

        it('should reset readers position after calling .fastErase()', () => {
            const cl = new CircularArrayMR({ size: 10 });
            let r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(r1, 2);

            cl.fastErase();
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);

            cl.push(1); cl.push(2); cl.push(3);

            r1 = cl.reader();
            const r2 = cl.reader();
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);
            assert.lengthOf(r2, 3);
            assert.deepStrictEqual(r2.pop(), 1);
            assert.lengthOf(r2, 2);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(r1, 2);

            cl.fastErase();
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);
            assert.lengthOf(r2, 0);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r2.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);
        });

        it('should re-sync readers after calling array.pop()', () => {
            const cl = new CircularArrayMR({ size: 10 });
            const r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(r1, 2);

            assert.deepStrictEqual(cl.pop(), 2);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);

            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            const r2 = cl.reader();
            cl.push(4); cl.push(5); cl.push(6);

            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(r2.startIdx, cl.startIdx);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);

            assert.deepStrictEqual(cl.pop(), 3);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(r2.startIdx, cl.startIdx);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);

            assert.deepStrictEqual(r1.pop(), 4);
            assert.deepStrictEqual(r2.pop(), 4);
        });

        it('should re-sync readers after calling array.push()', () => {
            const cl = new CircularArrayMR({ size: 3 });
            const r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(r1, 2);

            cl.push(4);
            assert.lengthOf(cl, 3);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(cl.startIdx, 1);
            assert.deepStrictEqual(cl.endIdx, 0);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            cl.push(5);
            assert.lengthOf(cl, 3);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(cl.startIdx, 2);
            assert.deepStrictEqual(cl.endIdx, 1);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            const r2 = cl.reader();
            assert.lengthOf(r2, 3);
            assert.deepStrictEqual(r2.pop(), 3);
            assert.deepStrictEqual(r2.startIdx, 0);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            cl.push(6);
            assert.lengthOf(r2, 3);
            assert.lengthOf(cl, 3);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(r2.startIdx, 0);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(cl.startIdx, 0);
            assert.deepStrictEqual(cl.endIdx, 2);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            cl.push(7);
            assert.lengthOf(r2, 3);
            assert.lengthOf(cl, 3);
            assert.lengthOf(r1, 3);
            assert.deepStrictEqual(cl.startIdx, 1);
            assert.deepStrictEqual(cl.endIdx, 0);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(r2.startIdx, cl.startIdx);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);
        });

        it('should re-sync readers after calling .rebase()', () => {
            const cl = new CircularArrayMR({ size: 4 });
            const r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3); cl.push(4);
            assert.lengthOf(cl, 4);
            assert.lengthOf(r1, 4);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            r1.pop(); r1.pop();
            assert.lengthOf(cl, 2);
            assert.lengthOf(r1, 2);
            assert.deepStrictEqual(r1.startIdx, 2);
            assert.deepStrictEqual(r1.endIdx, 3);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            cl.rebase();
            assert.lengthOf(cl, 2);
            assert.lengthOf(r1, 2);
            assert.deepStrictEqual(r1.startIdx, 0);
            assert.deepStrictEqual(r1.endIdx, 1);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            const r2 = cl.reader();
            cl.push(5); cl.push(6); cl.push(7); cl.push(8);
            assert.deepStrictEqual(r1.startIdx, 2);
            assert.deepStrictEqual(r1.endIdx, 1);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(r2.startIdx, cl.startIdx);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);

            r1.pop(); r2.pop(); r2.pop();
            assert.deepStrictEqual(r1.startIdx, 3);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(r2.startIdx, 0);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);
            assert.lengthOf(cl, 3);
            assert.lengthOf(r1, 3);
            assert.lengthOf(r2, 2);

            cl.rebase(true);
            assert.lengthOf(cl, 3);
            assert.lengthOf(r1, 3);
            assert.lengthOf(r2, 2);
            assert.deepStrictEqual(r1.startIdx, 0);
            assert.deepStrictEqual(r1.endIdx, 2);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(r2.startIdx, 1);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);
        });

        it('should remove extra nodes on reader.destroy()', () => {
            const cl = new CircularArrayMR({ size: 4 });
            let r1 = cl.reader();

            cl.push(1); cl.push(2); cl.push(3); cl.push(4);
            assert.lengthOf(cl, 4);
            assert.lengthOf(r1, 4);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            r1.pop(); r1.pop();
            assert.lengthOf(cl, 2);
            assert.lengthOf(r1, 2);
            assert.deepStrictEqual(r1.startIdx, 2);
            assert.deepStrictEqual(r1.endIdx, 3);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            r1.destroy();
            assert.throws(() => r1.length);

            assert.lengthOf(cl, 2);
            assert.deepStrictEqual(cl.startIdx, 2);
            assert.deepStrictEqual(cl.endIdx, 3);

            r1 = cl.reader();
            let r2 = cl.reader();
            cl.push(5); cl.push(6);
            assert.deepStrictEqual(r1.startIdx, 2);
            assert.deepStrictEqual(r1.endIdx, 1);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.deepStrictEqual(r2.startIdx, cl.startIdx);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);

            r2.pop(); r2.pop(); r2.pop();
            assert.deepStrictEqual(r2.startIdx, 1);
            assert.deepStrictEqual(r2.endIdx, 1);
            assert.deepStrictEqual(r1.startIdx, 2);
            assert.deepStrictEqual(r1.endIdx, 1);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            assert.lengthOf(cl, 4);
            assert.lengthOf(r1, 4);
            assert.lengthOf(r2, 1);

            r1.destroy();

            assert.lengthOf(cl, 1);
            assert.lengthOf(r2, 1);
            assert.deepStrictEqual(r2.startIdx, 1);
            assert.deepStrictEqual(r2.endIdx, 1);
            assert.deepStrictEqual(r2.startIdx, cl.startIdx);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);

            cl.push(7); cl.push(8); cl.push(9);
            r1 = cl.reader();

            assert.deepStrictEqual(r2.startIdx, 1);
            assert.deepStrictEqual(r2.endIdx, 0);
            assert.deepStrictEqual(r2.startIdx, cl.startIdx);
            assert.deepStrictEqual(r2.endIdx, cl.endIdx);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);

            r2.pop(); r2.pop(); r2.pop();
            assert.deepStrictEqual(r2.startIdx, 0);
            assert.deepStrictEqual(r2.endIdx, 0);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.lengthOf(cl, 4);
            assert.lengthOf(r1, 4);
            assert.lengthOf(r2, 1);

            r2.destroy();
            assert.throws(() => r2.length);
            assert.deepStrictEqual(r1.startIdx, cl.startIdx);
            assert.deepStrictEqual(r1.endIdx, cl.endIdx);
            assert.lengthOf(cl, 4);
            assert.lengthOf(r1, 4);

            r2 = cl.reader();
            assert.lengthOf(r2, 4);

            assert.deepStrictEqual(cl.startIdx, 1);
            assert.deepStrictEqual(r2.startIdx, 1);
            assert.deepStrictEqual(r1.startIdx, 1);

            r2.pop(); r2.pop(); r2.pop(); r2.pop();
            assert.lengthOf(r2, 0);
            r1.destroy();
            assert.lengthOf(r2, 0);
            assert.lengthOf(cl, 0);
            // should reset all indexes - all data removed from the list
            assert.deepStrictEqual(cl.startIdx, 0);
            assert.deepStrictEqual(r2.startIdx, 0);

            r1 = cl.reader();
            assert.lengthOf(r1, 0);
            assert.lengthOf(r2, 0);
            assert.lengthOf(cl, 0);

            cl.push(1); cl.push(2); cl.push(3);
            assert.lengthOf(r1, 3);
            assert.lengthOf(r2, 3);
            assert.lengthOf(cl, 3);

            r2.pop(); r2.pop(); r2.pop();
            r1.pop();
            assert.lengthOf(r1, 2);
            assert.lengthOf(r2, 0);
            assert.lengthOf(cl, 2);

            cl.push(4); cl.push(5);
            assert.lengthOf(r1, 4);
            assert.lengthOf(r2, 2);
            assert.lengthOf(cl, 4);

            r1.destroy();
            assert.throws(() => r1.length);
            assert.lengthOf(r2, 2);
            assert.lengthOf(cl, 2);
        });

        it('reader.needCopy()', () => {
            const cl = new CircularArrayMR({ size: 4 });
            const r1 = cl.reader();
            cl.push(1); cl.push(2); cl.push(3); cl.push(4);

            assert.lengthOf(cl, 4);
            assert.lengthOf(r1, 4);

            while (r1.length) {
                assert.isFalse(r1.needCopy());
                r1.pop();
            }

            cl.push(1); cl.push(2); cl.push(3); cl.push(4);
            const r2 = cl.reader();

            assert.lengthOf(cl, 4);
            assert.lengthOf(r1, 4);
            assert.lengthOf(r2, 4);

            while (r1.length) {
                assert.isTrue(r1.needCopy());
                r1.pop();
            }
            while (r2.length) {
                assert.isFalse(r2.needCopy());
                assert.lengthOf(r1, 0);
                r2.pop();
                assert.lengthOf(r1, 0);
            }

            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);
            assert.lengthOf(r2, 0);

            cl.push(1); cl.push(2); cl.push(3); cl.push(4);
            assert.lengthOf(cl, 4);
            assert.lengthOf(r1, 4);
            assert.lengthOf(r2, 4);

            assert.isTrue(r1.needCopy());
            assert.isTrue(r2.needCopy());

            r1.pop(); r1.pop();
            assert.isTrue(r1.needCopy());

            r2.destroy();
            assert.throws(() => r2.length);
            assert.isFalse(r1.needCopy());
        });

        it('should update reader when new data pushed/poped', () => {
            const cl = new CircularArrayMR({ size: 4 });
            const r1 = cl.reader();

            assert.lengthOf(r1, 0);
            cl.push(1);
            assert.lengthOf(r1, 1);
            r1.pop();
            assert.lengthOf(r1, 0);
            assert.lengthOf(cl, 0);

            cl.push(2);
            assert.lengthOf(r1, 1);
            assert.lengthOf(cl, 1);

            const r2 = cl.reader();
            assert.lengthOf(r2, 1);

            cl.push(3); cl.push(4);

            assert.lengthOf(r2, 3);
            assert.lengthOf(r1, 3);
            assert.lengthOf(cl, 3);

            r2.pop(); r2.pop(); r2.pop();

            assert.lengthOf(r2, 0);
            assert.lengthOf(r1, 3);
            assert.lengthOf(cl, 3);

            r1.pop(); r1.pop();
            assert.lengthOf(r2, 0);
            assert.lengthOf(r1, 1);
            assert.lengthOf(cl, 1);

            cl.push(5); cl.push(6); cl.push(7);

            assert.lengthOf(r2, 3);
            assert.lengthOf(r1, 4);
            assert.lengthOf(cl, 4);

            r1.pop();
            assert.lengthOf(r2, 3);
            assert.lengthOf(r1, 3);
            assert.lengthOf(cl, 3);

            r1.pop();
            assert.lengthOf(r2, 2);
            assert.lengthOf(r1, 2);
            assert.lengthOf(cl, 2);

            r1.pop();
            assert.lengthOf(r2, 2);
            assert.lengthOf(r1, 1);
            assert.lengthOf(cl, 2);

            r1.pop();
            assert.lengthOf(r2, 2);
            assert.lengthOf(r1, 0);
            assert.lengthOf(cl, 2);

            r2.pop();
            assert.lengthOf(r2, 1);
            assert.lengthOf(r1, 0);
            assert.lengthOf(cl, 1);

            r2.pop();
            assert.lengthOf(r2, 0);
            assert.lengthOf(r1, 0);
            assert.lengthOf(cl, 0);
        });

        it('edge case: size = 1', () => {
            const cl = new CircularArrayMR({ size: 1 });
            cl.push(1);
            const r1 = cl.reader();

            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);

            assert.deepStrictEqual(r1.pop(), 1);
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);

            cl.push(1);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            cl.push(2);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            assert.deepStrictEqual(r1.pop(), 2);
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);

            const r2 = cl.reader();
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);
            assert.lengthOf(r2, 0);

            cl.push(3);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            assert.lengthOf(r2, 1);

            cl.pop();
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);
            assert.lengthOf(r2, 0);

            cl.push(4);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            assert.lengthOf(r2, 1);

            assert.deepStrictEqual(r2.pop(), 4);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            assert.lengthOf(r2, 0);

            assert.deepStrictEqual(r1.pop(), 4);
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);
            assert.lengthOf(r2, 0);

            cl.push(5);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            assert.lengthOf(r2, 1);

            assert.deepStrictEqual(r2.pop(), 5);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            assert.lengthOf(r2, 0);

            cl.pop();
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);
            assert.lengthOf(r2, 0);

            cl.push(6);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            assert.lengthOf(r2, 1);

            assert.deepStrictEqual(r2.pop(), 6);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            assert.lengthOf(r2, 0);

            cl.push(7);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            assert.lengthOf(r2, 1);

            assert.deepStrictEqual(r2.pop(), 7);
            assert.lengthOf(cl, 1);
            assert.lengthOf(r1, 1);
            assert.lengthOf(r2, 0);

            assert.deepStrictEqual(r1.pop(), 7);
            assert.lengthOf(cl, 0);
            assert.lengthOf(r1, 0);
            assert.lengthOf(r2, 0);
        });
    });
});
