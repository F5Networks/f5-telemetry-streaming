/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('../shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const BadUrlHandler = require('../../../src/lib/requestHandlers/badUrlHandler');
const MockRestOperation = require('../shared/util').MockRestOperation;
const parseURL = require('../shared/util').parseURL;

chai.use(chaiAsPromised);
const assert = chai.assert;


describe('BadUrlHandler', () => {
    let requestHandler;

    beforeEach(() => {
        const restOpMock = new MockRestOperation();
        restOpMock.uri = parseURL('http://localhost:8100/a/b/c/d');
        requestHandler = new BadUrlHandler(restOpMock);
    });

    it('should return code 400', () => {
        assert.strictEqual(requestHandler.getCode(), 400, 'should return expected code');
    });

    it('should return body with message', () => {
        const expectedBody = 'Bad URL: /a/b/c/d';
        assert.strictEqual(requestHandler.getBody(), expectedBody, 'should match expected body');
    });

    it('should return self as result of process', () => requestHandler.process()
        .then((handler) => {
            assert.ok(handler === requestHandler, 'should return a reference to original handler');
        }));
});
