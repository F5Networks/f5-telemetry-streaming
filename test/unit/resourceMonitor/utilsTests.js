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
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const stubs = require('../shared/stubs');

const rmUtils = sourceCode('src/lib/resourceMonitor/utils');

moduleCache.remember();

describe('Resource Monitor / Utils', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => sinon.restore());

    describe('.appMemoryUsage()', () => {
        it('should return memory stats', () => {
            const memUsage = rmUtils.appMemoryUsage();
            ['external', 'heapTotal', 'heapUsed', 'rss'].forEach((prop) => {
                assert.isNumber(memUsage[prop]);
                assert.isAbove(memUsage[prop], 0);
            });

            stubs.default.coreStub({ resourceMonitorUtils: true });
            assert.deepStrictEqual(rmUtils.appMemoryUsage(), {
                external: 100,
                heapTotal: 101,
                heapUsed: 90,
                rss: 300
            });
        });
    });

    describe('.bytesToMegabytes()', () => {
        it('should convert bytes to megabytes', () => {
            assert.deepStrictEqual(rmUtils.bytesToMegabytes(0), 0);
            assert.deepStrictEqual(rmUtils.bytesToMegabytes(1024 * 1024), 1);
            assert.deepStrictEqual(rmUtils.bytesToMegabytes(2 * 1024 * 1024), 2);
        });
    });

    describe('.formatFloat()', () => {
        it('should format float number', () => {
            assert.deepStrictEqual(rmUtils.formatFloat(1), '1.00');
            assert.deepStrictEqual(rmUtils.formatFloat(1.11), '1.11');
            assert.deepStrictEqual(rmUtils.formatFloat(1.1111111111, 3), '1.111');
        });
    });

    describe('.megabytesToStr()', () => {
        it('should convert number to string', () => {
            assert.deepStrictEqual(rmUtils.megabytesToStr(2), '2.00 MB');
            assert.deepStrictEqual(rmUtils.megabytesToStr(2.3436), '2.34 MB');
        });
    });

    describe('.osAvailableMem()', () => {
        it('should read and parse memory info', () => {
            const PROC_MEM_INFO_OUTPUT = `
                MemTotal:       16434000 kB
                MemFree:          617812 kB
                MemAvailable:    2097152 kB
                Buffers:          391188 kB
                Cached:          1353364 kB
                `;
            assert.deepStrictEqual(rmUtils.osAvailableMem(() => PROC_MEM_INFO_OUTPUT), 2048);

            stubs.default.coreStub({ resourceMonitorUtils: true });
            assert.deepStrictEqual(rmUtils.osAvailableMem(), 100);
        });

        it('should return -1 when unable to parse', () => {
            const PROC_MEM_INFO_OUTPUT = `
                MemTotal:       16434000 kB
                MemFree:          617812 kB
                Buffers:          391188 kB
                Cached:          1353364 kB
                `;
            assert.deepStrictEqual(rmUtils.osAvailableMem(() => PROC_MEM_INFO_OUTPUT), -1);
        });
    });

    describe('.percentToStr()', () => {
        it('should convert number to string', () => {
            assert.deepStrictEqual(rmUtils.percentToStr(2), '2.00%');
            assert.deepStrictEqual(rmUtils.percentToStr(2.3436), '2.34%');
        });
    });

    describe('.wrapMB()', () => {
        it('should convert number to string', () => {
            assert.deepStrictEqual(rmUtils.wrapMB(2), '2 MB');
            assert.deepStrictEqual(rmUtils.wrapMB(2.3436), '2.3436 MB');
        });
    });
});
