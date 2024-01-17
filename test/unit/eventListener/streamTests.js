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
const Stream = sourceCode('src/lib/eventListener/stream');

moduleCache.remember();

describe('Event Listener / Stream', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('constructor', () => {
        let parser;

        beforeEach(() => {
            parser = new Parser(() => {});
        });

        it('should use default values', () => {
            const stream = new Stream(parser);
            assert.deepStrictEqual(stream.mode, 'buffer');
            assert.deepStrictEqual(stream.strategy, 'ring');
            assert.deepStrictEqual(stream.maxPendingBytes, 256 * 1024);
            assert.deepStrictEqual(stream.buffers, 0);
            assert.deepStrictEqual(stream.bytes, 0);
            assert.deepStrictEqual(stream.length, 0);
            assert.deepStrictEqual(stream.closed, false);
            assert.isAbove(stream.lastProcessTimeDelta(), 0);
            assert.isAbove(stream.lastPushTimeDelta(), 0);
            assert.isFalse(stream.isReady());
        });

        it('should use non-default values', () => {
            const stream = new Stream(
                new Parser(() => {}, { mode: 'string' }),
                {
                    strategy: 'drop',
                    maxPendingBytes: 100
                }
            );
            assert.deepStrictEqual(stream.mode, 'string');
            assert.deepStrictEqual(stream.strategy, 'drop');
            assert.deepStrictEqual(stream.maxPendingBytes, 100);
            assert.deepStrictEqual(stream.buffers, 0);
            assert.deepStrictEqual(stream.bytes, 0);
            assert.deepStrictEqual(stream.length, 0);
            assert.deepStrictEqual(stream.closed, false);
            assert.isAbove(stream.lastProcessTimeDelta(), 0);
            assert.isAbove(stream.lastPushTimeDelta(), 0);
            assert.isFalse(stream.isReady());
        });
    });

    describe('.proccess()', () => {
        ['buffer', 'string'].forEach((mode) => {
            describe(`mode = ${mode}`, () => {
                let callback;
                let makeInput;
                let parser;
                let stream;
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

                const makeInput2 = (chunk) => makeInput(chunk)[0];

                beforeEach(() => {
                    parser = new Parser(callback, { mode });
                    stream = new Stream(parser);
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

                                let lastTimePush;
                                testConf.chunks.forEach((chunk) => {
                                    const payload = makeInput(chunk.replace(/\{sep\}/g, sep));
                                    totalBuffers += 1;
                                    totalBytes += payload[1];
                                    totalLength += payload[2];

                                    lastTimePush = stream.lastPushTimeDelta();
                                    stream.push(payload[0]);
                                    assert.notDeepEqual(stream.lastPushTimeDelta(), lastTimePush);
                                });

                                assert.deepStrictEqual(stream.buffers, totalBuffers, 'should match expected number of pending buffers');
                                assert.deepStrictEqual(stream.bytes, totalBytes, 'should match expected number of pending bytes');
                                assert.deepStrictEqual(stream.length, totalLength, 'should match expected number of pending bytes/chars');

                                const lastTimeProcess = stream.lastProcessTimeDelta();
                                stream.process(1e9, true);

                                assert.deepStrictEqual(
                                    results,
                                    testConf.expectedData.map((d) => d.replace(/\{sep\}/g, sep))
                                );
                                assert.notDeepEqual(stream.lastProcessTimeDelta(), lastTimeProcess);

                                assert.deepStrictEqual(stream.buffers, 0, 'should have no buffers left');
                                assert.deepStrictEqual(stream.bytes, 0, 'should have no bytes left');
                                assert.deepStrictEqual(stream.length, 0, 'should have no bytes/chars left');
                            });
                        });
                    });
                });

                it('should ignore empty data', () => {
                    assert.deepStrictEqual(stream.buffers, 0, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 0, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 0, 'should match expected number of pending bytes/chars');

                    stream.push(makeInput2('test'));
                    stream.push(makeInput2(''));
                    stream.push(makeInput2('line'));
                    stream.push(makeInput2(''));
                    stream.push(makeInput2('\n'));
                    stream.push(makeInput2(''));
                    stream.push(makeInput2(''));

                    assert.deepStrictEqual(stream.buffers, 3, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 9, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 9, 'should match expected number of pending bytes/chars');

                    stream.process(1e9, true);
                    assert.deepStrictEqual(results, ['testline']);

                    assert.deepStrictEqual(stream.buffers, 0, 'should have no buffers left');
                    assert.deepStrictEqual(stream.bytes, 0, 'should have no bytes left');
                    assert.deepStrictEqual(stream.length, 0, 'should have no bytes/chars left');
                });

                it('should not accept data once closed', () => {
                    assert.isFalse(stream.closed);

                    stream.push(makeInput2('test'));
                    stream.push(makeInput2('line'));
                    stream.push(makeInput2('\n'));
                    stream.push(makeInput2('test'));

                    stream.close();
                    stream.push(makeInput2('test'));
                    stream.push(makeInput2('line-2'));
                    stream.push(makeInput2('\n'));

                    assert.deepStrictEqual(stream.buffers, 4, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 13, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 13, 'should match expected number of pending bytes/chars');

                    stream.process(1e9);
                    assert.deepStrictEqual(results, ['testline', 'test']);

                    assert.deepStrictEqual(stream.buffers, 0, 'should have no buffers left');
                    assert.deepStrictEqual(stream.bytes, 0, 'should have no bytes left');
                    assert.deepStrictEqual(stream.length, 0, 'should have no bytes/chars left');
                });

                it('should flush parser if there is no free spots in parser\'s buffer ', () => {
                    parser = new Parser(callback, { mode, bufferSize: 2 });
                    stream = new Stream(parser);

                    stream.push(makeInput2('inc'));
                    stream.push(makeInput2('omp'));
                    stream.push(makeInput2('let'));
                    stream.push(makeInput2('e m'));
                    stream.push(makeInput2('ess'));
                    stream.push(makeInput2('age'));
                    stream.push(makeInput2('\n'));

                    assert.deepStrictEqual(stream.buffers, 7, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 19, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 19, 'should match expected number of pending bytes/chars');

                    assert.isTrue(stream.process(1e9)[0], 'should have data to process');
                    assert.deepStrictEqual(results, []);

                    assert.deepStrictEqual(stream.buffers, 7, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 19, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 19, 'should match expected number of pending bytes/chars');

                    assert.isTrue(stream.process(1e9)[0], 'should have data to process');
                    assert.deepStrictEqual(results, ['incomp']);

                    assert.deepStrictEqual(stream.buffers, 5, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 13, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 13, 'should match expected number of pending bytes/chars');

                    assert.isTrue(stream.process(1e9)[0], 'should have data to process');
                    assert.deepStrictEqual(results, ['incomp']);

                    assert.deepStrictEqual(stream.buffers, 5, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 13, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 13, 'should match expected number of pending bytes/chars');

                    assert.isTrue(stream.process(1e9)[0], 'should have data to process');
                    assert.deepStrictEqual(results, ['incomp', 'lete m']);

                    assert.deepStrictEqual(stream.buffers, 3, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 7, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 7, 'should match expected number of pending bytes/chars');

                    assert.isTrue(stream.process(1e9)[0], 'should have data to process');
                    assert.deepStrictEqual(results, ['incomp', 'lete m']);

                    assert.deepStrictEqual(stream.buffers, 3, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 7, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 7, 'should match expected number of pending bytes/chars');

                    assert.isTrue(stream.process(1e9)[0], 'should have data to process');
                    assert.deepStrictEqual(results, ['incomp', 'lete m', 'essage']);

                    assert.deepStrictEqual(stream.buffers, 1, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 1, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 1, 'should match expected number of pending bytes/chars');

                    assert.isFalse(stream.process(1e9)[0], 'should have data to process');
                    assert.deepStrictEqual(results, ['incomp', 'lete m', 'essage']);

                    assert.deepStrictEqual(stream.buffers, 0, 'should match expected number of pending buffers');
                    assert.deepStrictEqual(stream.bytes, 0, 'should match expected number of pending bytes');
                    assert.deepStrictEqual(stream.length, 0, 'should match expected number of pending bytes/chars');
                });

                it('should try to feed more data to parser even if reached "maxPendingBytes"', () => {
                    stream = new Stream(parser, { maxPendingBytes: 1 });

                    stream.push(makeInput2('test'));
                    assert.isTrue(stream.process(1e9)[0], 'should still have data to process');
                    assert.deepStrictEqual(results, []);

                    assert.isTrue(stream.process(1e9)[0], 'should still have data to process');
                    assert.deepStrictEqual(results, []);

                    stream.push(makeInput2('line\n'));
                    assert.isFalse(stream.process(1e9)[0], 'should have no data to process');
                    assert.deepStrictEqual(results, ['testline']);
                });

                describe('"drop" strategy', () => {
                    it('should drop new data when limits applied', () => {
                        stream = new Stream(parser, { strategy: 'drop' });

                        stream.push(makeInput2('testline\ntestline-2'));
                        assert.isTrue(stream.process(1e9)[0], 'should still have data to process');
                        assert.deepStrictEqual(results, ['testline']);

                        stream.push(makeInput2('\n'));
                        stream.disableIngress();
                        stream.disableIngress(); // should have no effect
                        stream.push(makeInput2('testline-3\ntestline-4'));

                        assert.isFalse(stream.process(1e9)[0], 'should have no data to process');
                        assert.deepStrictEqual(results, ['testline', 'testline-2']);

                        results = [];
                        stream.enableIngress();
                        stream.push(makeInput2('testline-5\ntestline-6\n'));
                        stream.push(makeInput2('testline-7\ntestl'));

                        stream.disableIngress();
                        stream.push(makeInput2('ine-8\n'));
                        assert.isTrue(stream.process(1e9)[0], 'should have data to process');
                        assert.deepStrictEqual(results, ['testline-5', 'testline-6', 'testline-7']);

                        results = [];
                        assert.isFalse(stream.process(1e9)[0], 'should have data to process');
                        assert.deepStrictEqual(results, ['testl']);

                        results = [];
                        stream.enableIngress();
                        stream.push(makeInput2('testline-9\ntestline-10\n'));
                        assert.isFalse(stream.process(1e9)[0], 'should have data to process');
                        assert.deepStrictEqual(results, ['testline-9', 'testline-10']);
                    });

                    it('should keep trying to flush all data from parser', () => {
                        stream = new Stream(parser, { strategy: 'drop' });

                        for (let i = 0; i < 5000; i += 1) {
                            stream.push(makeInput2(`testline-${i}\n`));
                        }
                        stream.push(makeInput2('testline-final'));
                        assert.deepStrictEqual(stream.buffers, 5001, 'should match expected number of pending buffers');
                        stream.disableIngress();

                        // should load all buffered data
                        assert.isTrue(stream.process(1)[0], 'should have data for processing');
                        assert.isNotEmpty(results);
                        assert.isAbove(stream.buffers, 0);

                        stream.push(makeInput2('testl'));
                        stream.push(makeInput2('ine-3\ntestln'));
                        stream.push(makeInput2('testl'));
                        stream.push(makeInput2('ine-5\ntestln'));
                        stream.push(makeInput2('testl'));
                        stream.push(makeInput2('ine-6\ntestln\n'));

                        assert.isTrue(stream.process(1)[0], 'should have no left data for processing');
                        assert.isTrue(stream.process(1)[0], 'should have no left data for processing');
                        assert.isFalse(stream.process(1e9)[0], 'should have no left data for processing');
                        assert.notDeepEqual(results.indexOf('testline-final'), -1, 'should have expected line');
                        assert.deepStrictEqual(results.indexOf('testln'), -1, 'should have expected line');
                    });
                });

                describe('"ring" strategy', () => {
                    it('should start overriding existing data', () => {
                        stream = new Stream(parser);

                        stream.push(makeInput2('testl'));
                        stream.push(makeInput2('ine-1\n'));
                        stream.push(makeInput2('testl'));
                        stream.push(makeInput2('ine-2\n'));
                        stream.push(makeInput2('testl'));

                        assert.deepStrictEqual(stream.buffers, 5, 'should match expected number of pending buffers');
                        assert.deepStrictEqual(stream.bytes, 27, 'should match expected number of pending bytes');
                        assert.deepStrictEqual(stream.length, 27, 'should match expected number of pending bytes/chars');

                        assert.isTrue(stream.process(1e9)[0], 'should still have data to process');
                        assert.deepStrictEqual(results, ['testline-1', 'testline-2']);

                        assert.deepStrictEqual(stream.buffers, 1, 'should match expected number of pending buffers');
                        assert.deepStrictEqual(stream.bytes, 5, 'should match expected number of pending bytes');
                        assert.deepStrictEqual(stream.length, 5, 'should match expected number of pending bytes/chars');

                        stream.push(makeInput2('\ntestline-3'));
                        stream.push(makeInput2('\ntestline-4'));

                        assert.deepStrictEqual(stream.buffers, 3, 'should match expected number of pending buffers');
                        assert.deepStrictEqual(stream.bytes, 27, 'should match expected number of pending bytes');
                        assert.deepStrictEqual(stream.length, 27, 'should match expected number of pending bytes/chars');

                        stream.disableIngress();
                        stream.disableIngress(); // should have no effect

                        stream.push(makeInput2('\ntestline-10'));
                        stream.push(makeInput2('\ntestline-11\n'));

                        // buffers were overriden
                        assert.deepStrictEqual(stream.buffers, 3, 'should match expected number of pending buffers');
                        assert.deepStrictEqual(stream.bytes, 30, 'should match expected number of pending bytes');
                        assert.deepStrictEqual(stream.length, 30, 'should match expected number of pending bytes/chars');

                        results = [];
                        assert.isFalse(stream.process(1e9)[0], 'should have no data to process');
                        assert.deepStrictEqual(results, ['testl', 'testline-10', 'testline-11']);
                        assert.deepStrictEqual(stream.buffers, 0, 'should match expected number of pending buffers');
                        assert.deepStrictEqual(stream.bytes, 0, 'should match expected number of pending bytes');
                        assert.deepStrictEqual(stream.length, 0, 'should match expected number of pending bytes/chars');

                        results = [];
                        stream.enableIngress();
                        stream.push(makeInput2('testl'));
                        stream.push(makeInput2('ine-5\ntestline-6\n'));
                        stream.push(makeInput2('testline-7'));
                        stream.push(makeInput2('\ntestl'));
                        stream.push(makeInput2('testline-8'));

                        assert.deepStrictEqual(stream.buffers, 5, 'should match expected number of pending buffers');
                        assert.deepStrictEqual(stream.bytes, 48, 'should match expected number of pending bytes');
                        assert.deepStrictEqual(stream.length, 48, 'should match expected number of pending bytes/chars');

                        stream.disableIngress();
                        stream.push(makeInput2('ine-8\n')); // should discard 2 first chunks

                        assert.deepStrictEqual(stream.buffers, 4, 'should match expected number of pending buffers');
                        assert.deepStrictEqual(stream.bytes, 32, 'should match expected number of pending bytes');
                        assert.deepStrictEqual(stream.length, 32, 'should match expected number of pending bytes/chars');

                        stream.push(makeInput2('testline-9\n')); // should not discard, ring have free spots

                        results = [];
                        assert.isFalse(stream.process(1e9)[0], 'should have data to process');
                        assert.deepStrictEqual(results, ['testline-7', 'testltestline-8ine-8', 'testline-9']);

                        stream.enableIngress();
                        stream.push(makeInput2('testline-A\n'));
                        stream.push(makeInput2('testline-B\n'));
                        stream.push(makeInput2('testline-C\n'));
                        stream.disableIngress();

                        assert.deepStrictEqual(stream.buffers, 3, 'should match expected number of pending buffers');
                        assert.deepStrictEqual(stream.bytes, 33, 'should match expected number of pending bytes');
                        assert.deepStrictEqual(stream.length, 33, 'should match expected number of pending bytes/chars');

                        stream.push(makeInput2('long-testline-that-should-replace-other-lines\n'));
                        results = [];
                        assert.isFalse(stream.process(1e9)[0], 'should have data to process');
                        assert.deepStrictEqual(results, ['long-testline-that-should-replace-other-lines']);

                        results = [];
                        stream.enableIngress();
                        stream.push(makeInput2('testline-9\ntestline-10\n'));
                        stream.push(makeInput2('testline-11\ntestline-12\n'));
                        stream.push(makeInput2('testline-13\ntestline-14\n'));
                        stream.push(makeInput2('testline-15\ntestline-16\n'));
                        stream.push(makeInput2('testline-17\ntestline-18\n'));
                        stream.push(makeInput2('testline-19\ntestline-20\n'));

                        assert.isFalse(stream.process(1e9)[0], 'should have data to process');
                        assert.deepStrictEqual(results, [
                            'testline-9',
                            'testline-10',
                            'testline-11',
                            'testline-12',
                            'testline-13',
                            'testline-14',
                            'testline-15',
                            'testline-16',
                            'testline-17',
                            'testline-18',
                            'testline-19',
                            'testline-20'
                        ]);
                        assert.deepStrictEqual(stream.buffers, 0, 'should match expected number of pending buffers');
                        assert.deepStrictEqual(stream.bytes, 0, 'should match expected number of pending bytes');
                        assert.deepStrictEqual(stream.length, 0, 'should match expected number of pending bytes/chars');
                    });

                    it('should keep trying to flush all data from parser', () => {
                        stream = new Stream(parser);

                        for (let i = 0; i < 5000; i += 1) {
                            stream.push(makeInput2(`testline-${i}\n`));
                        }
                        stream.push(makeInput2('testline-final'));
                        assert.deepStrictEqual(stream.buffers, 5001, 'should match expected number of pending buffers');

                        // should load all buffered data
                        assert.isTrue(stream.process(1)[0], 'should have data for processing');
                        assert.isNotEmpty(results);
                        assert.isAbove(stream.buffers, 0);

                        stream.disableIngress();
                        stream.push(makeInput2('testl'));
                        stream.push(makeInput2('ine-3\ntestln'));
                        stream.push(makeInput2('testl'));
                        stream.push(makeInput2('ine-5\ntestln'));
                        stream.push(makeInput2('testl'));
                        stream.push(makeInput2('ine-6\ntestln\n'));

                        assert.isTrue(stream.process(1)[0], 'should have no left data for processing');
                        assert.isTrue(stream.process(1)[0], 'should have no left data for processing');
                        assert.isFalse(stream.process(1e9)[0], 'should have no left data for processing');
                        assert.notDeepEqual(results.indexOf('testline-final'), -1, 'should have expected line');
                        assert.deepStrictEqual(results.indexOf('testln'), results.length - 1, 'should have expected line');
                    });
                });
            });
        });
    });
});
