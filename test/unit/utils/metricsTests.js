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

const metricsUtil = sourceCode('src/lib/utils/metrics');

moduleCache.remember();

describe('Metrics Util', () => {
    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('.parseNumber()', () => {
        it('should parse valid numbers', () => {
            assert.deepStrictEqual(metricsUtil.parseNumber('0'), 0);
            assert.deepStrictEqual(metricsUtil.parseNumber('10'), 10);
            assert.deepStrictEqual(metricsUtil.parseNumber('-0'), -0);
            assert.deepStrictEqual(metricsUtil.parseNumber('+0'), 0);
            assert.deepStrictEqual(metricsUtil.parseNumber('-10'), -10);
            assert.deepStrictEqual(metricsUtil.parseNumber('+10'), 10);
            assert.deepStrictEqual(metricsUtil.parseNumber('-10.10'), -10.10);
            assert.deepStrictEqual(metricsUtil.parseNumber('+10.10'), 10.10);
            assert.deepStrictEqual(metricsUtil.parseNumber('10.10'), 10.10);
            assert.deepStrictEqual(metricsUtil.parseNumber('+1.2E-38'), 1.2E-38);
            assert.deepStrictEqual(metricsUtil.parseNumber('-1.2E-38'), -1.2E-38);
            assert.deepStrictEqual(metricsUtil.parseNumber('1.2E-38'), 1.2E-38);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix 0'), 0);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix 10'), 10);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix -0'), -0);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix +10.10'), 10.10);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix 10.10'), 10.10);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix +1.2E-38'), 1.2E-38);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix0'), 0);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix10'), 10);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix-0'), -0);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix+10'), 10);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix-10.10'), -10.10);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix+10.10'), 10.10);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix-1.2E-38'), -1.2E-38);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix1.2E-38'), 1.2E-38);
            assert.deepStrictEqual(metricsUtil.parseNumber('0 suffix'), 0);
            assert.deepStrictEqual(metricsUtil.parseNumber('10 suffix'), 10);
            assert.deepStrictEqual(metricsUtil.parseNumber('-0 suffix'), -0);
            assert.deepStrictEqual(metricsUtil.parseNumber('+0 suffix'), 0);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix 100.10 suffix'), 100.1);
            assert.deepStrictEqual(metricsUtil.parseNumber('prefix100.10suffix'), 100.1);
        });

        it('should return false when unable to parse number', () => {
            assert.isFalse(metricsUtil.parseNumber('false'));
        });
    });

    describe('.parseNumberStrict()', () => {
        it('should parse valid numbers', () => {
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('0'), 0);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('10'), 10);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('-0'), -0);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('+0'), 0);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('-10'), -10);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('+10'), 10);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('-10.10'), -10.10);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('+10.10'), 10.10);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('10.10'), 10.10);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('+1.2E-38'), 1.2E-38);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('-1.2E-38'), -1.2E-38);
            assert.deepStrictEqual(metricsUtil.parseNumberStrict('1.2E-38'), 1.2E-38);
        });

        it('should return false when unable to parse number', () => {
            assert.isFalse(metricsUtil.parseNumberStrict('false'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix 0'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix 10'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix -0'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix +10.10'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix 10.10'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix +1.2E-38'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix0'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix10'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix-0'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix+10'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix-10.10'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix+10.10'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix-1.2E-38'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix1.2E-38'));
            assert.isFalse(metricsUtil.parseNumberStrict('0 suffix'));
            assert.isFalse(metricsUtil.parseNumberStrict('10 suffix'));
            assert.isFalse(metricsUtil.parseNumberStrict('-0 suffix'));
            assert.isFalse(metricsUtil.parseNumberStrict('+0 suffix'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix 100.10 suffix'));
            assert.isFalse(metricsUtil.parseNumberStrict('prefix100.10suffix'));
        });
    });
});
