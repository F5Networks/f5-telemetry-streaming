/*
 * Copyright 2019. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const nock = require('nock');

const systemPollerData = require('../consumers/data/systemPollerData.json');
const avrData = require('../consumers/data/avrData.json');

module.exports = {
    /**
     * Deep copy
     *
     * @param {any} obj - object to copy
     *
     * @returns {any} deep copy of source object
     */
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Generates a consumer config
     *
     * @param {Object} [options]           - options to pass to context builder
     * @param {String} [options.eventType] - which event type to return
     * @param {Object} [options.config]    - optional config to inject into context
     *
     * @returns {Object} Returns object representing consumer config
     */
    buildConsumerContext(options) {
        let data;
        const opts = options || {};

        switch (opts.eventType) {
        case 'systemInfo':
            data = this.deepCopy(systemPollerData);
            break;
        case 'AVR':
            data = this.deepCopy(avrData);
            break;
        default:
            data = {};
        }
        const context = {
            config: opts.config || {},
            event: {
                data,
                type: opts.eventType || ''
            },
            logger: {
                error: () => { },
                debug: () => { }
            }
        };
        return context;
    },

    /**
     * Returns mocha's 'it' or 'it.only'
     *
     * @param {Object} testConf - test config
     * @param {Object} [testConf.testOpts] - test options
     * @param {Boolean} [testConf.testOpts.only] - true if use .only
     *
     * @returns {Function} mocha's 'it' function
     */
    getCallableIt(testConf) {
        return testConf.testOpts && testConf.testOpts.only ? it.only : it;
    },

    /**
     * Returns mocha's 'describe' or 'describe.only'
     *
     * @param {Object} testConf - test config
     * @param {Object} [testConf.testOpts] - test options
     * @param {Boolean} [testConf.testOpts.only] - true if use .only
     *
     * @returns {Function} mocha's 'describe' function
     */
    getCallableDescribe(testConf) {
        return testConf.testOpts && testConf.testOpts.only ? describe.only : describe;
    },

    /**
     * Setup endpoints mocks via nock
     *
     * @param {Array}   endpointMocks                   - array of mocks
     * @param {String}  endpointMocks[].endpoint        - endpoint
     * @param {String}  [endpointMocks[].method]        - request method, by default 'get'
     * @param {Any}     [endpointMocks[].request]       - request body
     * @param {Any}     [endpointMocks[].response]      - request body
     * @param {Integer} [endpointMocks[].code]          - response code, by default 200
     * @param {Integer} [endpointMocks[].options.times] - repeat response N times
     * @param {Object}  [options]                       - options
     * @param {String}  [options.host]                  - host, by default 'localhost'
     * @param {Integer} [options.port]                  - port, by default 8100
     * @param {String}  [options.proto]                 - protocol, by default 'http'
     * @param {Function} [options.responseChecker]      - function to check response
     */
    mockEndpoints(endpointMocks, options) {
        options = options || {};
        const hostMock = nock(`${options.proto || 'http'}://${options.host || 'localhost'}:${options.port || 8100}`);
        endpointMocks.forEach((endpointMock) => {
            let request = endpointMock.request;
            if (typeof request === 'object') {
                request = this.deepCopy(request);
            }
            let apiMock = hostMock[endpointMock.method || 'get'](endpointMock.endpoint, request);
            if (endpointMock.options) {
                const opts = endpointMock.options;
                if (opts.times) {
                    apiMock = apiMock.times(opts.times);
                }
            }
            let response = endpointMock.response;
            if (typeof response === 'object') {
                // deep copy in any case, do not rely on nock lib
                response = this.deepCopy(response);
            }
            if (options.responseChecker) {
                if (typeof response === 'object') {
                    options.responseChecker(endpointMock, response);
                } else if (typeof response === 'function') {
                    const originResponse = response;
                    response = (uri, requestBody) => {
                        const ret = originResponse(uri, requestBody);
                        options.responseChecker(endpointMock, ret);
                        return ret;
                    };
                }
            }
            apiMock.reply(endpointMock.code || 200, response);
        });
    }
};
