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
const parserTestData = require('./data/parserTestsData');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const Parser = sourceCode('src/lib/eventListener/parser');

moduleCache.remember();

describe('Event Listener / Parser', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('constructor()', () => {
        const callback = () => {};

        it('should accept valid "mode" value', () => {
            let p = new Parser(callback, { mode: 'string' });
            assert.deepStrictEqual(p.mode, 'string');

            p = new Parser(callback, { mode: 'buffer' });
            assert.deepStrictEqual(p.mode, 'buffer');
        });

        it('should use default values', () => {
            const p = new Parser(callback);
            assert.deepStrictEqual(p.mode, 'buffer');
            assert.deepStrictEqual(p._buffers.allocated, 1000);
            assert.deepStrictEqual(p.maxSize, 16 * 1024);
            assert.deepStrictEqual(p.freeBuffers, 16 * 1024 + 1);
        });

        it('should use non-default values', () => {
            const p = new Parser(callback, {
                bufferPrealloc: 10,
                bufferSize: 11,
                maxSize: 100,
                mode: 'string'
            });
            assert.deepStrictEqual(p.mode, 'string');
            assert.deepStrictEqual(p._buffers.allocated, 10);
            assert.deepStrictEqual(p.maxSize, 100);
            assert.deepStrictEqual(p.freeBuffers, 11);
        });
    });

    describe('.process()', () => {
        ['buffer', 'string'].forEach((mode) => {
            describe(`mode = ${mode}`, () => {
                let callback;
                let makeInput;
                let parser;
                let results;

                if (mode === 'string') {
                    callback = (chunks) => {
                        results.push(chunks.length === 1 ? chunks[0] : chunks.reduce((a, v) => a + v, ''));
                    };
                    makeInput = (chunk) => [chunk, Buffer.from(chunk).length, chunk.length];
                } else {
                    callback = (chunks) => {
                        results.push(chunks.length === 1 ? chunks[0].toString() : chunks.reduce((a, v) => a + v.toString(), ''));
                    };
                    makeInput = (chunk) => {
                        chunk = Buffer.from(chunk);
                        return [chunk, chunk.length, chunk.length];
                    };
                }

                beforeEach(() => {
                    parser = new Parser(callback, { mode });
                    results = [];
                });

                describe('Data sets', () => {
                    parserTestData.process.forEach((testConf) => {
                        const separators = JSON.stringify(testConf.chunks).indexOf('{sep}') !== -1 ? ['\n', '\r\n'] : [''];
                        separators.forEach((sep) => {
                            let sepMsg = 'built-in the test new line separator';
                            if (sep) {
                                sepMsg = sep.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                            }
                            testUtil.getCallableIt(testConf)(`should process data - ${testConf.name} (${sepMsg})`, () => {
                                let totalBuffers = 0;
                                let totalBytes = 0;
                                let totalLength = 0;

                                testConf.chunks.forEach((chunk) => {
                                    const payload = makeInput(chunk.replace(/\{sep\}/g, sep));
                                    totalBuffers += 1;
                                    totalBytes += payload[1];
                                    totalLength += payload[2];
                                    parser.push(payload);
                                });

                                assert.deepStrictEqual(parser.buffers, totalBuffers, 'should match expected number of pending buffers');
                                assert.deepStrictEqual(parser.bytes, totalBytes, 'should match expected number of pending bytes');
                                assert.deepStrictEqual(parser.length, totalLength, 'should match expected number of pending bytes/chars');

                                parser.process(true);
                                assert.deepStrictEqual(
                                    results,
                                    testConf.expectedData.map((d) => d.replace(/\{sep\}/g, sep))
                                );

                                assert.deepStrictEqual(parser.buffers, 0, 'should have no buffers left');
                                assert.deepStrictEqual(parser.bytes, 0, 'should have no bytes left');
                                assert.deepStrictEqual(parser.length, 0, 'should have no bytes/chars left');
                            });
                        });
                    });
                });

                it('should not emit data on incomplete message (single buffer)', () => {
                    parser.push(makeInput('firstLine\nsecondLineIncomple="value'));

                    assert.deepStrictEqual(parser.buffers, 1);
                    assert.deepStrictEqual(parser.bytes, 35);
                    assert.deepStrictEqual(parser.length, 35);

                    assert.isTrue(parser.process()[0]);
                    assert.deepStrictEqual(results, ['firstLine'], 'should produce only 1 chunk of data');

                    assert.deepStrictEqual(parser.buffers, 1, 'should not discard buffer with pending data');
                    assert.deepStrictEqual(parser.bytes, 35);
                    assert.deepStrictEqual(parser.length, 35);

                    assert.isTrue(parser.process()[0]);
                    assert.deepStrictEqual(results, ['firstLine'], 'should produce only 1 chunk of data when no new data');

                    assert.deepStrictEqual(parser.buffers, 1, 'should not discard buffer with pending data');
                    assert.deepStrictEqual(parser.bytes, 35);
                    assert.deepStrictEqual(parser.length, 35);

                    assert.isFalse(parser.process(true)[0]);
                    assert.deepStrictEqual(results, ['firstLine', 'secondLineIncomple="value'], 'should produce 2 chunks of data when forced to flush');

                    assert.deepStrictEqual(parser.buffers, 0, 'should have no buffers left');
                    assert.deepStrictEqual(parser.bytes, 0, 'should have no bytes left');
                    assert.deepStrictEqual(parser.length, 0, 'should have no bytes/chars left');
                });

                it('should not emit data on incomplete message (multiple buffers)', () => {
                    parser.push(makeInput('firstLine\nsecondLineIncomple='));
                    parser.push(makeInput('"value'));

                    assert.deepStrictEqual(parser.buffers, 2);
                    assert.deepStrictEqual(parser.bytes, 35);
                    assert.deepStrictEqual(parser.length, 35);

                    assert.isTrue(parser.process()[0]);
                    assert.deepStrictEqual(results, ['firstLine'], 'should produce only 1 chunk of data');

                    assert.deepStrictEqual(parser.buffers, 2, 'should not discard buffer with pending data');
                    assert.deepStrictEqual(parser.bytes, 35);
                    assert.deepStrictEqual(parser.length, 35);

                    assert.isTrue(parser.process()[0]);
                    assert.deepStrictEqual(results, ['firstLine'], 'should produce only 1 chunk of data when no new data');

                    assert.deepStrictEqual(parser.buffers, 2, 'should not discard buffer with pending data');
                    assert.deepStrictEqual(parser.bytes, 35);
                    assert.deepStrictEqual(parser.length, 35);

                    assert.isFalse(parser.process(true)[0]);
                    assert.deepStrictEqual(results, ['firstLine', 'secondLineIncomple="value'], 'should produce 2 chunks of data when forced to flush');

                    assert.deepStrictEqual(parser.buffers, 0, 'should have no buffers left');
                    assert.deepStrictEqual(parser.bytes, 0, 'should have no bytes left');
                    assert.deepStrictEqual(parser.length, 0, 'should have no bytes/chars left');
                });

                it('should not emit data on incomplete message (multiple buffers)', () => {
                    parser.push(makeInput('first'));
                    parser.push(makeInput('Line\n'));
                    parser.push(makeInput('secondLineIncomple="value'));

                    assert.deepStrictEqual(parser.buffers, 3);
                    assert.deepStrictEqual(parser.bytes, 35);
                    assert.deepStrictEqual(parser.length, 35);

                    assert.isTrue(parser.process()[0]);
                    assert.deepStrictEqual(results, ['firstLine'], 'should produce only 1 chunk of data');

                    assert.deepStrictEqual(parser.buffers, 1, 'should not discard buffer with pending data');
                    assert.deepStrictEqual(parser.bytes, 25);
                    assert.deepStrictEqual(parser.length, 25);

                    assert.isTrue(parser.process()[0]);
                    assert.deepStrictEqual(results, ['firstLine'], 'should produce only 1 chunk of data when no new data');

                    assert.deepStrictEqual(parser.buffers, 1, 'should not discard buffer with pending data');
                    assert.deepStrictEqual(parser.bytes, 25);
                    assert.deepStrictEqual(parser.length, 25);

                    assert.isFalse(parser.process(true)[0]);
                    assert.deepStrictEqual(results, ['firstLine', 'secondLineIncomple="value'], 'should produce 2 chunks of data when forced to flush');

                    assert.deepStrictEqual(parser.buffers, 0, 'should have no buffers left');
                    assert.deepStrictEqual(parser.bytes, 0, 'should have no bytes left');
                    assert.deepStrictEqual(parser.length, 0, 'should have no bytes/chars left');
                });

                it('should process empty line', () => {
                    parser.push(makeInput('first'));
                    parser.push(makeInput('Line\n'));
                    parser.push(makeInput('\nsecondLineIncomple="value'));

                    assert.isFalse(parser.process(true)[0]);
                    assert.deepStrictEqual(results, ['firstLine', 'secondLineIncomple="value'], 'should produce 2 chunks of data when forced to flush');
                });

                it('should procees empty message with trailing new line', () => {
                    parser.push(makeInput('\n'));

                    assert.isFalse(parser.process()[0]);
                    assert.deepStrictEqual(results, [], 'should produce no data');
                });

                it('should correctly interact with underlying CircularBuffer', () => {
                    parser = new Parser(callback, {
                        bufferSize: 11,
                        mode,
                        maxSize: 100
                    });

                    for (let i = 0; i < 3; i += 1) {
                        parser.push(makeInput('li'));
                        parser.push(makeInput(`ne #${i}\n`));
                    }
                    parser.push(makeInput('li'));
                    parser.push(makeInput('ne'));
                    assert.isTrue(parser.process()[0]);
                    assert.deepStrictEqual(results, ['line #0', 'line #1', 'line #2'], 'should produce 2 chunks of data');

                    results = [];

                    for (let i = 0; i < 2; i += 1) {
                        parser.push(makeInput('l'));
                        parser.push(makeInput('i'));
                        parser.push(makeInput('n'));
                        parser.push(makeInput('e'));
                        parser.push(makeInput(` #${i}\n`));
                    }
                    assert.isFalse(parser.process()[0]);
                    assert.deepStrictEqual(results, ['lineline #0', 'line #1'], 'should produce 2 chunks of data');
                });

                it('should be able to process 1-byte data', () => {
                    const input = '1'.repeat(parser.freeBuffers - 1);
                    for (let i = 0; i < input.length; i += 1) {
                        parser.push(makeInput(input[i]));
                    }
                    parser.push(makeInput('\n'));
                    assert.isFalse(parser.process()[0]);
                    assert.deepStrictEqual(results, [input], 'should produce 1 chunk of data');
                });

                it('should preserve processing time limits', () => {
                    const timeLimit = 1e6; // really short amount of time
                    const lines = 10000;

                    for (let i = 0; i < lines; i += 1) {
                        parser.push(makeInput(`some string with index "\n${i % 10}\n" and line separator\n`));
                    }

                    const stats = [];
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        const ret = parser.process(timeLimit);
                        stats.push(ret);
                        if (!ret[0]) {
                            break;
                        }
                    }
                    assert.lengthOf(results, lines);
                    assert.isAbove(stats.length, 1, 'should have more than 1 iternation');
                    assert.isBelow(
                        stats.reduce((a, v) => a + v[1], 0) / stats.length,
                        timeLimit * 3,
                        'should have parsing time average lower than 3x time limit' // V8 compile affects the time
                    );
                    assert.isBelow(
                        stats.reduce((a, v) => a + v[2], 0) / stats.length,
                        timeLimit * 3,
                        'should have processing time average lower than 3x time limit' // V8 compile affects the time
                    );
                    for (let i = 0; i < lines; i += 1) {
                        assert.deepStrictEqual(results[i], `some string with index "\n${i % 10}\n" and line separator`, `should match expected string with ID=${i}`);
                    }
                });

                it('should flush data even if time limit specified', () => {
                    parser.push(makeInput('first'));
                    parser.push(makeInput('Line\n'));
                    parser.push(makeInput('secondLineIncomple="value'));
                    assert.isFalse(parser.process(1e6, true)[0]);
                    assert.deepStrictEqual(results, ['firstLine', 'secondLineIncomple="value'], 'should produce 2 chunks of data');
                });

                describe('.isReady()', () => {
                    it('should return true when data is pending', () => {
                        assert.isFalse(parser.isReady(), 'should return false when no data');
                        parser.push(makeInput('first'));

                        assert.isTrue(parser.isReady(), 'should return true once new data pushed');
                        parser.process();
                        assert.isFalse(parser.isReady(), 'should return false when incomplete message');

                        parser.push(makeInput('\n'));
                        assert.isTrue(parser.isReady(), 'should return true once new data pushed');
                        parser.process();
                        assert.isFalse(parser.isReady(), 'should return false when no data');

                        parser.push(makeInput('first\nsecond'));
                        assert.isTrue(parser.isReady(), 'should return true once new data pushed');
                        parser.process();
                        assert.isFalse(parser.isReady(), 'should return false when incomplete message');

                        parser.process(true);
                        assert.isFalse(parser.isReady(), 'should return false when no data');
                    });
                });

                describe('.hasFreeBuffers()', () => {
                    it('should return false when full', () => {
                        parser = new Parser(callback, {
                            bufferSize: 5,
                            mode,
                            maxSize: 100
                        });

                        assert.deepStrictEqual(parser.freeBuffers, 5);

                        for (let i = 0; i < 2; i += 1) {
                            parser.push(makeInput('li'));
                            parser.push(makeInput(`ne #${i}\n`));
                        }

                        assert.deepStrictEqual(parser.freeBuffers, 1);

                        parser.push(makeInput('li'));
                        assert.deepStrictEqual(parser.freeBuffers, 0);

                        parser.process(true);
                        assert.deepStrictEqual(parser.freeBuffers, 5);
                    });
                });
            });
        });
    });
});
