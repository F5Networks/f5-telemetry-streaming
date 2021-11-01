/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const defaultConsumer = require('../../../src/lib/consumers/default');

chai.use(chaiAsPromised);
const assert = chai.assert;

moduleCache.remember();

describe('Default Consumer', () => {
    const tracerMock = {
        write() {}
    };
    const loggerMock = {
        error() {},
        exception() {},
        info() {},
        debug() {}
    };

    const context = {
        event: {},
        config: {},
        tracer: tracerMock,
        logger: loggerMock
    };

    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should process event', () => assert.isFulfilled(defaultConsumer(context)));

    it('should reject on missing event', () => {
        sinon.stub(context, 'event').value(null);
        return assert.isRejected(
            defaultConsumer(context),
            /No event to process/
        );
    });

    it('should continue without tracer', () => {
        sinon.stub(context, 'tracer').value(null);
        return assert.isFulfilled(defaultConsumer(context));
    });
});
