/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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
