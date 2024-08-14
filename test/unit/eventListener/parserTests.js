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

/* eslint-disable import/order, no-restricted-properties, prefer-template, no-bitwise */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');
const StringDecoder = require('string_decoder').StringDecoder;

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
            assert.isTrue(p.featKVPairs);
            assert.isTrue(p.featF5EvtCategory);
            assert.deepStrictEqual(p.features & Parser.FEAT_ALL, Parser.FEAT_ALL);
            assert.deepStrictEqual(p.maxKVPairs, 2000);
        });

        it('should use non-default values', () => {
            const p = new Parser(callback, {
                bufferPrealloc: 10,
                bufferSize: 11,
                maxKVPairs: 0,
                maxSize: 100,
                mode: 'string'
            });
            assert.deepStrictEqual(p.mode, 'string');
            assert.deepStrictEqual(p._buffers.allocated, 10);
            assert.deepStrictEqual(p.maxSize, 100);
            assert.deepStrictEqual(p.freeBuffers, 11);
            assert.isFalse(p.featKVPairs);
            assert.isTrue(p.featF5EvtCategory);
            assert.deepStrictEqual(p.features & Parser.FEAT_ALL, Parser.FEAT_ALL);
            assert.deepStrictEqual(p.maxKVPairs, 0);
        });

        it('should use non-default values (example 2)', () => {
            const p = new Parser(callback, {
                bufferPrealloc: 10,
                bufferSize: 11,
                features: Parser.FEAT_NONE,
                maxSize: 100,
                mode: 'string'
            });
            assert.deepStrictEqual(p.mode, 'string');
            assert.deepStrictEqual(p._buffers.allocated, 10);
            assert.deepStrictEqual(p.maxSize, 100);
            assert.deepStrictEqual(p.freeBuffers, 11);
            assert.isFalse(p.featKVPairs);
            assert.isFalse(p.featF5EvtCategory);
            assert.deepStrictEqual(p.features & Parser.FEAT_ALL, Parser.FEAT_NONE);
            assert.deepStrictEqual(p.maxKVPairs, 2000);
        });

        it('should use non-default values (example 3)', () => {
            const p = new Parser(callback, {
                bufferPrealloc: 10,
                bufferSize: 11,
                features: Parser.FEAT_KV_PAIRS,
                maxSize: 100,
                mode: 'string'
            });
            assert.deepStrictEqual(p.mode, 'string');
            assert.deepStrictEqual(p._buffers.allocated, 10);
            assert.deepStrictEqual(p.maxSize, 100);
            assert.deepStrictEqual(p.freeBuffers, 11);
            assert.isTrue(p.featKVPairs);
            assert.isFalse(p.featF5EvtCategory);
            assert.deepStrictEqual(p.features & Parser.FEAT_ALL, Parser.FEAT_KV_PAIRS);
            assert.deepStrictEqual(p.maxKVPairs, 2000);
        });
    });

    describe('data processing', () => {
        const inputModes = [
            // 'regular',
            'byHalf'
        ];
        const featMap = {
            FEAT_KV_PAIRS: Parser.FEAT_KV_PAIRS,
            FEAT_F5_EVT_CAT: Parser.FEAT_F5_EVT_CAT,
            FEAT_ALL: Parser.FEAT_ALL,
            FEAT_NONE: Parser.FEAT_NONE
        };
        const modes = [
            // 'buffer',
            'string'
        ];

        function checkCharCodesKVPairs(results, mayHaveKeyValuePairs) {
            mayHaveKeyValuePairs.forEach((symb, idx) => {
                if (symb) {
                    for (let i = 1; i < symb.length; i += 2) {
                        assert.deepStrictEqual(
                            results[idx][symb[i]],
                            i & 0b1 ? ',' : '=',
                            'should match char codes at particular position'
                        );
                    }
                }
            });
        }

        function checkCharCodesF5Telemetry(results, mayHaveF5EventCategory) {
            mayHaveF5EventCategory.forEach((offset, idx) => {
                if (offset) {
                    assert.deepStrictEqual(results[idx].slice(offset - 1, offset + 1), '$F', 'should match char codes at particular position');
                }
            });
        }

        testUtil.product(inputModes, Object.keys(featMap), modes).forEach((product) => {
            const feature = product[1];
            const inputMode = product[0];
            const mode = product[2];

            describe(`mode = ${mode}, features = ${feature}, input = ${inputMode}`, () => {
                let callback;
                let makeInput;
                let parser;
                let results;
                let mayHaveKeyValuePairs;
                let mayHaveF5EventCategory;
                let stringDecoder;

                const defaultStringDecoder = new StringDecoder('utf8');

                if (mode === 'string') {
                    callback = (chunks, hasKVPair, hasEvtCat) => {
                        mayHaveF5EventCategory.push(hasEvtCat);
                        mayHaveKeyValuePairs.push(hasKVPair);
                        assert.deepStrictEqual(chunks.length, chunks.reduce((a) => a + 1, 0), 'should not allocate more slots than actual  data');
                        results.push(chunks.length === 1 ? chunks[0] : chunks.reduce((a, v) => a + v, ''));
                    };
                    makeInput = (chunk) => [chunk, Buffer.from(chunk).length, chunk.length];
                } else {
                    callback = (chunks, hasKVPair, hasEvtCat) => {
                        mayHaveF5EventCategory.push(hasEvtCat);
                        mayHaveKeyValuePairs.push(hasKVPair);

                        chunks = chunks.map((c) => stringDecoder.write(c));
                        chunks.push(stringDecoder.end());
                        results.push(chunks.join(''));
                    };
                    makeInput = (chunk) => {
                        chunk = Buffer.from(chunk);
                        return [chunk, chunk.length, chunk.length];
                    };
                }

                beforeEach(() => {
                    mayHaveF5EventCategory = [];
                    mayHaveKeyValuePairs = [];
                    parser = new Parser(callback, { mode, features: featMap[feature] });
                    results = [];

                    if (stringDecoder !== defaultStringDecoder) {
                        stringDecoder = defaultStringDecoder;
                    }
                });

                describe('Data sets', () => {
                    parserTestData.process.forEach((testConf) => {
                        const separators = JSON.stringify(testConf.chunks).indexOf('{sep}') !== -1 ? ['\n', '\r\n'] : [''];
                        separators.forEach((sep) => {
                            let sepMsg = 'built in the test new line separator';
                            if (sep) {
                                sepMsg = sep.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                            }
                            testUtil.getCallableIt(testConf)(`should process data - ${testConf.name} (${sepMsg})`, () => {
                                let totalBuffers = 0;
                                let totalBytes = 0;
                                let totalLength = 0;

                                if (inputMode === 'regular') {
                                    testConf.chunks.forEach((chunk) => {
                                        const payload = makeInput(chunk.replace(/\{sep\}/g, sep));
                                        totalBuffers += 1;
                                        totalBytes += payload[1];
                                        totalLength += payload[2];
                                        parser.push(payload);
                                    });
                                } else {
                                    testConf.chunks.forEach((chunk) => {
                                        chunk = chunk.replace(/\{sep\}/g, sep);
                                        const mid = (chunk.length / 2) >> 0;
                                        const payloads = [];
                                        if (mid) {
                                            payloads.push(makeInput(chunk.slice(0, mid)));
                                        }
                                        payloads.push(makeInput(chunk.slice(mid)));
                                        payloads.forEach((payload) => {
                                            totalBuffers += 1;
                                            totalBytes += payload[1];
                                            totalLength += payload[2];
                                            parser.push(payload);
                                        });
                                    });
                                }

                                assert.deepStrictEqual(parser.buffers, totalBuffers, 'should match expected number of pending buffers');
                                assert.deepStrictEqual(parser.bytes, totalBytes, 'should match expected number of pending bytes');
                                assert.deepStrictEqual(parser.length, totalLength, 'should match expected number of pending bytes/chars');

                                parser.process(true);
                                assert.deepStrictEqual(
                                    results,
                                    testConf.expectedData.map((d) => d.replace(/\{sep\}/g, sep))
                                );

                                if (parser.featKVPairs && testConf.mayHaveKeyValuePairs) {
                                    assert.deepStrictEqual(mayHaveKeyValuePairs.length, results.length, 'should match length of results');
                                    assert.deepStrictEqual(mayHaveKeyValuePairs, testConf.mayHaveKeyValuePairs, 'should match expected key-value pairs');
                                    checkCharCodesKVPairs(results, mayHaveKeyValuePairs);
                                } else if (!parser.featKVPairs) {
                                    assert.deepStrictEqual(mayHaveKeyValuePairs.length, results.length, 'should match length of results');
                                    assert.deepStrictEqual(mayHaveKeyValuePairs, (new Array(results.length)).fill(null), 'should match expected key-value pairs');
                                }

                                if (parser.featF5EvtCategory && testConf.mayHaveF5EventCategory) {
                                    assert.deepStrictEqual(mayHaveF5EventCategory.length, results.length, 'should match length of results');
                                    assert.deepStrictEqual(mayHaveF5EventCategory, testConf.mayHaveF5EventCategory, 'should match expected event categories');
                                    checkCharCodesF5Telemetry(results, mayHaveF5EventCategory);
                                } else if (!parser.featF5EvtCategory) {
                                    assert.deepStrictEqual(mayHaveF5EventCategory.length, results.length, 'should match length of results');
                                    assert.deepStrictEqual(mayHaveF5EventCategory, (new Array(results.length)).fill(0), 'should match expected event categories');
                                }

                                assert.deepStrictEqual(parser.buffers, 0, 'should have no buffers left');
                                assert.deepStrictEqual(parser.bytes, 0, 'should have no bytes left');
                                assert.deepStrictEqual(parser.length, 0, 'should have no bytes/chars left');
                            });
                        });
                    });
                });

                if (mode === 'string') {
                    it('should process UTF-8 broken into parts', () => {
                        parser.push(['ключ=значение,$F5TelemetryEventCategory=категор\nия', 51]);
                        parser.process(true);

                        assert.deepStrictEqual(results, [
                            'ключ=значение,$F5TelemetryEventCategory=категор',
                            'ия'
                        ]);
                        assert.deepStrictEqual(
                            mayHaveKeyValuePairs,
                            parser.featKVPairs
                                ? [new Uint16Array([4, 13, 39]), null]
                                : [null, null]
                        );

                        checkCharCodesKVPairs(results, mayHaveKeyValuePairs);

                        assert.deepStrictEqual(
                            mayHaveF5EventCategory,
                            parser.featF5EvtCategory ? [15, 0] : [0, 0]
                        );

                        checkCharCodesF5Telemetry(results, mayHaveF5EventCategory);
                    });
                }

                if (mode === 'buffer') {
                    it('should process UTF-8 broken into parts', () => {
                        Buffer.from('ключ=значение,$F5TelemetryEventCategory=категор\nия', 'utf-8')
                            .forEach((byte) => parser.push([Buffer.from([byte]), 1]));

                        parser.process(true);

                        assert.deepStrictEqual(results, [
                            'ключ=значение,$F5TelemetryEventCategory=категор',
                            'ия'
                        ]);

                        if (parser.featKVPairs) {
                            assert.notDeepEqual(mayHaveKeyValuePairs, [
                                new Uint16Array([4, 13, 39]),
                                null
                            ], 'UTF-8 parsing fixed???????!!! HURAY');
                        } else {
                            assert.deepStrictEqual(mayHaveKeyValuePairs, [null, null]);
                        }

                        if (parser.featF5EvtCategory) {
                            assert.notDeepEqual(mayHaveF5EventCategory, [
                                15,
                                0
                            ], 'UTF-8 parsing fixed???????!!! HURAY');
                        } else {
                            assert.deepStrictEqual(mayHaveF5EventCategory, [0, 0]);
                        }
                    });
                }

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

                    assert.deepStrictEqual(
                        mayHaveKeyValuePairs,
                        parser.featKVPairs
                            ? [null, new Uint16Array([18])]
                            : [null, null]
                    );
                    checkCharCodesKVPairs(results, mayHaveKeyValuePairs);

                    assert.deepStrictEqual(mayHaveF5EventCategory, [0, 0]);
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

                    assert.deepStrictEqual(
                        mayHaveKeyValuePairs,
                        parser.featKVPairs
                            ? [null, new Uint16Array([18])]
                            : [null, null]
                    );
                    checkCharCodesKVPairs(results, mayHaveKeyValuePairs);

                    assert.deepStrictEqual(mayHaveF5EventCategory, [0, 0]);
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

                    assert.deepStrictEqual(
                        mayHaveKeyValuePairs,
                        parser.featKVPairs
                            ? [null, new Uint16Array([18])]
                            : [null, null]
                    );
                    checkCharCodesKVPairs(results, mayHaveKeyValuePairs);

                    assert.deepStrictEqual(mayHaveF5EventCategory, [0, 0]);
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

                it('should update metadata for every pointer and do not allocate more chunks than actual data size', () => {
                    parser = new Parser(callback, {
                        mode,
                        maxSize: 30
                    });

                    parser.push(makeInput('first1'));
                    parser.push(makeInput('first2'));
                    parser.push(makeInput('first3'));
                    parser.push(makeInput('Line\n'));
                    parser.push(makeInput('ple="value'));
                    parser.push(makeInput('first1'));
                    parser.push(makeInput('first2'));
                    parser.push(makeInput('fi\nrst3'));
                    assert.isTrue(parser.process(1e6)[0]);

                    parser.push(makeInput('first4'));
                    parser.push(makeInput('Line\n'));
                    assert.isFalse(parser.process(1e6, true)[0]);
                    assert.deepStrictEqual(results, [
                        'first1first2first3Line',
                        'ple="valuefirst1first2fi',
                        'rst3first4Line'
                    ], 'should produce 2 chunks of data');
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

                describe('.erase()', () => {
                    it('should erase state', () => {
                        parser = new Parser(callback, {
                            bufferSize: 5,
                            mode,
                            maxSize: 100
                        });

                        for (let i = 0; i < 2; i += 1) {
                            parser.push(makeInput('li'));
                            parser.push(makeInput(`ne #${i}\n`));
                        }

                        assert.deepStrictEqual(parser.buffers, 4);
                        assert.deepStrictEqual(parser.bytes, 16);

                        parser.erase();

                        assert.deepStrictEqual(parser.buffers, 0);
                        assert.deepStrictEqual(parser.bytes, 0);
                    });
                });

                it('should use non-default values (Uint32Array)', () => {
                    const p = new Parser(callback, {
                        maxSize: Math.pow(2, 16) + 100,
                        mode
                    });
                    assert.deepStrictEqual(p.maxSize, Math.pow(2, 16) + 100);

                    p.push(makeInput(
                        'something=test'
                        + '\\'.repeat(64 * 1024)
                        + ',something2=test2,something3=test3\\\\\\\n'
                    ));

                    assert.deepStrictEqual(p.bytes, 65588);
                    assert.deepStrictEqual(p.buffers, 1);

                    p.process();

                    assert.deepStrictEqual(mayHaveKeyValuePairs, [
                        new Uint32Array([9, 65550, 65561, 65567, 65578])
                    ]);
                    checkCharCodesKVPairs(results, mayHaveKeyValuePairs);

                    assert.deepStrictEqual(mayHaveF5EventCategory, [0]);
                });

                it('should use custom maxSize', () => {
                    const p = new Parser(callback, {
                        maxSize: 100,
                        mode
                    });
                    assert.deepStrictEqual(p.maxSize, 100);

                    const str = 'something=testtest1,';

                    p.push(makeInput(str.repeat(5)));
                    p.push(makeInput(str.repeat(5)));
                    p.push(makeInput(str.repeat(5)));
                    p.push(makeInput(str.repeat(5)));
                    p.push(makeInput(str.repeat(5)));
                    p.push(makeInput(str.repeat(5)));

                    assert.deepStrictEqual(p.bytes, str.length * 5 * 6);
                    assert.deepStrictEqual(p.buffers, 6);

                    p.process(true);
                    assert.isFalse(parser.isReady(), 'should return false when no data');

                    assert.deepStrictEqual(results, [
                        str.repeat(5),
                        str.repeat(5),
                        str.repeat(5),
                        str.repeat(5),
                        str.repeat(5),
                        str.repeat(5)
                    ]);

                    assert.deepStrictEqual(mayHaveKeyValuePairs, [
                        new Uint16Array([
                            9, 19, 29, 39, 49, 59, 69, 79, 89, 99
                        ]),
                        new Uint16Array([
                            9, 19, 29, 39, 49, 59, 69, 79, 89, 99
                        ]),
                        new Uint16Array([
                            9, 19, 29, 39, 49, 59, 69, 79, 89, 99
                        ]),
                        new Uint16Array([
                            9, 19, 29, 39, 49, 59, 69, 79, 89, 99
                        ]),
                        new Uint16Array([
                            9, 19, 29, 39, 49, 59, 69, 79, 89, 99
                        ]),
                        new Uint16Array([
                            9, 19, 29, 39, 49, 59, 69, 79, 89, 99
                        ])
                    ]);
                    checkCharCodesKVPairs(results, mayHaveKeyValuePairs);

                    assert.deepStrictEqual(mayHaveF5EventCategory, [0, 0, 0, 0, 0, 0]);
                });

                it('should use custom maxKVPairs', () => {
                    const p = new Parser(callback, {
                        maxKVPairs: 2,
                        maxSize: 100,
                        mode
                    });
                    assert.deepStrictEqual(p.maxKVPairs, 2);
                    assert.deepStrictEqual(p.maxSize, 100);

                    const str = 'something=testtest1,';

                    p.push(makeInput(str.repeat(5)));
                    p.push(makeInput(str.repeat(5)));
                    p.push(makeInput(str.repeat(5)));
                    p.push(makeInput(str.repeat(5)));
                    p.push(makeInput(str.repeat(5)));
                    p.push(makeInput(str.repeat(5)));

                    assert.deepStrictEqual(p.bytes, str.length * 5 * 6);
                    assert.deepStrictEqual(p.buffers, 6);

                    p.process(true);
                    assert.isFalse(parser.isReady(), 'should return false when no data');

                    assert.deepStrictEqual(results, [
                        str.repeat(5),
                        str.repeat(5),
                        str.repeat(5),
                        str.repeat(5),
                        str.repeat(5),
                        str.repeat(5)
                    ]);

                    assert.deepStrictEqual(mayHaveKeyValuePairs, [
                        new Uint16Array([
                            9, 19, 29, 39
                        ]),
                        new Uint16Array([
                            9, 19, 29, 39
                        ]),
                        new Uint16Array([
                            9, 19, 29, 39
                        ]),
                        new Uint16Array([
                            9, 19, 29, 39
                        ]),
                        new Uint16Array([
                            9, 19, 29, 39
                        ]),
                        new Uint16Array([
                            9, 19, 29, 39
                        ])
                    ]);
                    checkCharCodesKVPairs(results, mayHaveKeyValuePairs);

                    assert.deepStrictEqual(mayHaveF5EventCategory, [0, 0, 0, 0, 0, 0]);
                });

                it('should correctly process extended ASCII', () => {
                    stringDecoder = {
                        write(chunk) {
                            return chunk.toString('binary');
                        },
                        end() {
                            return '';
                        }
                    };

                    const str = '"key=value,key=value';

                    const asciiTable = 255;
                    const buffer = Buffer.alloc(asciiTable + str.length);
                    for (let i = 0; i < asciiTable; i += 1) {
                        buffer[i] = i;
                    }
                    for (let i = asciiTable; i < asciiTable + str.length; i += 1) {
                        buffer[i] = str.charCodeAt(i - asciiTable);
                    }
                    const expected = buffer.toString('binary');

                    parser.push([
                        mode === 'string' ? buffer.toString('binary') : buffer,
                        buffer.length
                    ]);
                    parser.process(true);
                    assert.isFalse(parser.isReady(), 'should return false when no data');

                    assert.deepStrictEqual(results, [
                        expected.slice(0, 10),
                        expected.slice(11)
                    ]);

                    assert.deepStrictEqual(mayHaveKeyValuePairs, [
                        null,
                        parser.featKVPairs ? new Uint16Array([248, 254, 258]) : null
                    ]);
                    checkCharCodesKVPairs(results, mayHaveKeyValuePairs);

                    assert.deepStrictEqual(mayHaveF5EventCategory, [0, 0]);
                });
            });
        });
    });
});
