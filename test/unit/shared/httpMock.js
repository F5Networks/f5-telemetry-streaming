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

const nock = require('nock');
const { Scope } = require('nock/lib/scope');
const { URLSearchParams } = require('url');

const assert = require('./assert');
const { deepCopy } = require('./util');

/**
 * Mock REST API endpoint with Nock library
 *
 * See Nock v11 documentation for additional details
 *
 * @property {string} host - host
 * @property {object} config - mock configuration
 * @property {(function(string): boolean) | RegExp | string } config.path - URI path to match
 *
 * Scope-wide options
 * @property {boolean} [config.autoContentLength = true] - calculate Content-Length header automatically
 * @property {string[]} [config.badHeaders] - do not match request if any of the `badHeaders` are present
 * @property {(function(any): any) | object<string, RegExp>} [config.bodyFilter] - request body pre-filtering
 * @property {object} [config.defaultReplyHeaders = {}] - default reply headers
 * @property {boolean} [config.encodedQueryParams = false]
 * @property {object<string, (function(string): boolean) | RegExp | string>} [config.matchHeaders] - match certain
 *  request headers only
 * @property {(function(string): string) | object<string, RegExp>} [config.pathFilter] - path pre-filtering
 * @property {object} [config.reqHeaders = {}] - request headers to match
 * @property {nock.Scope} [config.scope] - existing nock.Scope instance to re-use
 * @property {function(): boolean} [config.scopeConditional] - scope conditional pre-filtering
 * @property {function(string): boolean} [config.scopeFilter] - scope pre-filtering
 *
 * Request-wide options
 * @property {{ user: string, pass: string }} [config.basicAuth = undefined] - specify basic auth for request
 * @property {string} [config.method = 'GET'] - HTTP method to match
 * @property {boolean} [config.optionally = false] - is request optional or not
 * @property {number | {{ body: number, head: number }} } [config.replyDelay = 0] - reply delay
 * @property {number} [config.replyTimes = 0] - number of times to repeat the same response
 * @property {Buffer | (function(): boolean) | object | RegExp | string} [config.reqBody] - request body to match
 * @property {boolean | (function(object): boolean)
 *              | object | URLSearchParams} [config.reqQuery] - request query to match
 * @property {function(uri: string, reqBody: any, req: Object):(number | [number, any, object])} [config.response]
 * @property {object | string} [config.responseSocketError] - reply with socket error
 * @property {number} [config.socketTimeout = 0] - socket timeout simulation (in ms.)
 *
 * @returns {{interceptor: nock.Interceptor, scope: nock.Scope}}
 */
function mockHttpEndpoint(host, {
    autoContentLength = true,
    badHeaders = [],
    basicAuth = {},
    bodyFilter = {},
    defaultReplyHeaders = {},
    encodedQueryParams = false,
    includeDateHeader = false,
    matchHeaders = {},
    method = 'GET',
    optionally = false,
    path = undefined,
    pathFilter = {},
    replyDelay = 0,
    replyTimes = 0,
    reqBody = undefined,
    reqHeaders = {},
    reqQuery = undefined,
    response = undefined,
    responseSocketError = undefined,
    scope = null,
    scopeConditional = undefined,
    scopeFilter = undefined,
    socketTimeout = 0
} = {}) {
    const config = arguments[1];

    function assertObject(value, msg = 'expected value to be an object') {
        assert.allOfAssertions(
            () => assert.isNotNull(value),
            () => assert.isObject(value),
            msg
        );
    }

    /** required */
    assert.allOfAssertions(
        () => assert.isString(host),
        () => assert.isNotEmpty(host),
        'host should be a string'
    );
    assert.allOfAssertions(
        () => assertObject(config),
        () => assert.isNotEmpty(config),
        'config should be an object'
    );
    assert.oneOfAssertions(
        () => assert.isFunction(path),
        () => assert.instanceOf(path, RegExp),
        () => assert.isString(path),
        'config.path should be a function or a RegExp or a string'
    );

    /** optional */
    assert.isBoolean(autoContentLength, 'config.autoContentLength should be a boolean');
    assert.isArray(badHeaders, 'config.badHeaders should be an array');
    assert.oneOfAssertions(
        () => assertObject(bodyFilter),
        () => assert.isFunction(bodyFilter),
        'config.bodyFilter should be an object or a function'
    );
    assert.allOfAssertions(
        () => assertObject(basicAuth),
        () => assert.oneOfAssertions(
            () => assert.isEmpty(basicAuth),
            () => assert.allOfAssertions(
                () => assert.allOfAssertions(
                    () => assert.isString(basicAuth.user),
                    () => assert.isNotEmpty(basicAuth.user),
                    '"user" property should not be empty'
                ),
                () => assert.oneOfAssertions(
                    () => assert.isUndefined(basicAuth.pass),
                    () => assert.isString(basicAuth.pass)
                ),
                '"pass" property should be an undefined or a string'
            )
        ),
        'config.basicAuth should be an object'
    );
    assertObject(defaultReplyHeaders, 'config.defaultReplyHeaders should be an object');
    assert.isBoolean(encodedQueryParams, 'config.encodedQueryParams should be a boolean');
    assert.oneOfAssertions(
        () => assert.isBoolean(includeDateHeader),
        () => assert.instanceOf(includeDateHeader, Date),
        'config.includeDateHeader should be a boolean or instnace of Date'
    );
    assertObject(matchHeaders, 'config.matchHeaders should be an object');
    assert.isString(method, 'config.method should be a string');
    assert.isBoolean(optionally, 'config.optionally should be a boolean');
    assert.oneOfAssertions(
        () => assertObject(pathFilter),
        () => assert.isFunction(pathFilter),
        'config.pathFilter should be an object or a function'
    );
    assert.oneOfAssertions(
        () => assert.allOfAssertions(
            () => assert.isNumber(replyDelay),
            () => assert.isAtLeast(socketTimeout, 0),
            () => assert.isAtMost(socketTimeout, Number.MAX_SAFE_INTEGER),
            'config.replyDelay should be a number >= 0 and <= Number.MAX_SAFE_INTEGER'
        ),
        () => assert.allOfAssertions(
            () => assertObject(replyDelay),
            () => assert.anyOfAssertions(
                () => assert.isDefined(replyDelay.body),
                () => assert.isDefined(replyDelay.head),
                'should have "body" and/or "head" properties'
            ),
            () => assert.allOfAssertions(
                ...['body', 'head'].map((prop) => {
                    const val = replyDelay[prop];
                    return () => assert.oneOfAssertions(
                        () => assert.isUndefined(val),
                        () => assert.allOfAssertions(
                            () => assert.isNumber(val),
                            () => assert.isAtLeast(val, 0),
                            () => assert.isAtMost(val, Number.MAX_SAFE_INTEGER)
                        ),
                        `"${prop}" should be a number >= 0 and <= Number.MAX_SAFE_INTEGER`
                    );
                })
            ),
            'config.replyDelay should be an object'
        ),
        'config.replyDelay should be a number or an object'
    );
    assert.allOfAssertions(
        () => assert.isNumber(replyTimes),
        () => assert.isNotNaN(replyTimes),
        () => assert.oneOfAssertions(
            () => assert.isFalse(Number.isFinite(replyTimes)),
            () => assert.allOfAssertions(
                () => assert.isAtLeast(replyTimes, 0),
                () => assert.isAtMost(replyTimes, Number.MAX_SAFE_INTEGER)
            )
        ),
        'config.replyTimes should be a number >= 0 and <= Number.MAX_SAFE_INTEGER or INFITITY'
    );
    assert.oneOfAssertions(
        () => assert.isUndefined(reqBody),
        () => assert.instanceOf(reqBody, Buffer),
        () => assert.instanceOf(reqBody, RegExp),
        () => assert.isFunction(reqBody),
        () => assert.isString(reqBody),
        () => assertObject(reqBody),
        'config.reqBody should be an instance of Buffer or a function or an object or a RegExp or a string'
    );

    assertObject(reqHeaders, 'config.reqHeaders should be an object');
    assert.oneOfAssertions(
        () => assert.isUndefined(reqQuery),
        () => assert.isTrue(reqQuery),
        () => assert.isFunction(reqQuery),
        () => assert.instanceOf(reqQuery, URLSearchParams),
        () => assert.allOfAssertions(
            () => assertObject(reqQuery),
            () => assert.isNotEmpty(reqQuery)
        ),
        'config.reqQuery should be a boolean or a function or an object or a string or an instance of URLSearchParams'
    );

    assert.oneOfAssertions(
        () => assert.isUndefined(response),
        () => assert.isFunction(response),
        'config.response should be a function'
    );
    assert.oneOfAssertions(
        () => assert.isUndefined(responseSocketError),
        () => assert.allOfAssertions(
            () => assert.oneOfAssertions(
                () => assert.isString(responseSocketError),
                () => assertObject(responseSocketError)(responseSocketError)
            ),
            () => assert.isNotEmpty(responseSocketError)
        ),
        'config.responseSocketError should be an object or a string'
    );
    assert.oneOfAssertions(
        () => assert.isDefined(response),
        () => assert.isDefined(responseSocketError),
        'config.responseSocketError or config.response should be set'
    );
    assert.oneOfAssertions(
        () => assert.isNull(scope),
        () => assert.instanceOf(scope, Scope),
        'config.scope should be an instance of Scope'
    );
    assert.oneOfAssertions(
        () => assert.isUndefined(scopeConditional),
        () => assert.isFunction(scopeConditional),
        'config.scopeConditional should be a function'
    );
    assert.oneOfAssertions(
        () => assert.isUndefined(scopeFilter),
        () => assert.isFunction(scopeFilter),
        'config.scopeFilter should be a function'
    );
    assert.allOfAssertions(
        () => assert.isNumber(socketTimeout),
        () => assert.isAtLeast(socketTimeout, 0),
        () => assert.isAtMost(socketTimeout, Number.MAX_SAFE_INTEGER),
        'config.socketTimeout should be a number >= 0 and <= Number.MAX_SAFE_INTEGER'
    );

    /**
     * HOST SCOPE configuration
     */
    scope = scope || nock(host, Object.assign(
        { encodedQueryParams },
        Object.keys(reqHeaders).length > 0 ? { reqheaders: reqHeaders } : {},
        badHeaders.length > 0 ? { badheaders: deepCopy(badHeaders) } : {},
        typeof scopeConditional === 'function' ? { conditionally: scopeConditional } : {},
        typeof scopeFilter === 'function' ? { filteringScope: scopeFilter } : {}
    ));

    if (Number.isFinite(replyTimes) === false) {
        scope = scope.persist();
    }

    if (typeof bodyFilter === 'function') {
        scope = scope.filteringRequestBody(bodyFilter);
    } else if (Object.keys(bodyFilter).length > 0) {
        const [filter, value] = Object.entries(bodyFilter)[0];
        scope = scope.filteringRequestBody(filter, value);
    }

    if (typeof pathFilter === 'function') {
        scope = scope.filteringPath(pathFilter);
    } else if (Object.keys(pathFilter).length > 0) {
        const [filter, value] = Object.entries(pathFilter)[0];
        scope = scope.filteringPath(filter, value);
    }

    Object.entries(matchHeaders).forEach(([header, value]) => {
        scope = scope.matchHeader(header, value);
    });

    if (includeDateHeader) {
        scope = scope.replyDate(includeDateHeader);
    }

    if (autoContentLength) {
        scope = scope.replyContentLength();
    }

    if (Object.keys(defaultReplyHeaders).length > 0) {
        scope = scope.defaultReplyHeaders(deepCopy(defaultReplyHeaders));
    }

    /**
     * PATH/REQUEST SCOPE configuration
     */

    let interceptor = scope.intercept(path, method.toUpperCase(), reqBody);

    if (Object.keys(basicAuth).length > 0) {
        interceptor = interceptor.basicAuth(deepCopy(basicAuth));
    }

    if (typeof reqQuery !== 'undefined') {
        interceptor = interceptor.query(reqQuery);
    }

    interceptor = interceptor.optionally(optionally);

    if (socketTimeout > 0) {
        interceptor = interceptor.socketDelay(socketTimeout);
    }

    if (typeof replyDelay === 'object' || Number.isSafeInteger(replyDelay)) {
        interceptor = interceptor.delay(deepCopy(replyDelay));
    }

    if (Number.isFinite(replyTimes) && replyTimes > 0) {
        interceptor = interceptor.times(replyTimes);
    }

    if (response) {
        scope = interceptor.reply(async function (uri, requestBody, cb) {
            let fullReply;
            try {
                fullReply = await response(uri, requestBody, this.req);
            } catch (error) {
                return cb(error, null);
            }
            return cb(null, Number.isSafeInteger(fullReply) ? [fullReply] : fullReply);
        });
    } else {
        scope = interceptor.replyWithError(deepCopy(responseSocketError));
    }

    return { interceptor, scope };
}

/**
 * @public
 *
 * @param {MockNockStubBase} mock
 *
 * @returns {MockNockStubBase}
 */
function wrapMockNock(mock) {
    mock.disable = () => mock.interceptor.optionally(true);
    mock.remove = () => removeInterceptor(mock);
    return mock;
}

/**
 * @public
 *
 * @param {Object<string, MockNockStubBase>} stubs
 *
 * @returns {Object<string, MockNockStubBase>}
 */
function wrapMockNockSet(stubs) {
    stubs.disable = () => Object.entries(stubs)
        .forEach((entry) => {
            if (typeof entry[1] === 'object' && typeof entry[1].disable === 'function') {
                entry[1].disable();
            }
        });
    stubs.remove = () => Object.entries(stubs)
        .forEach((entry) => {
            if (typeof entry[1] === 'object' && typeof entry[1].remove === 'function') {
                entry[1].remove();
            }
        });

    return stubs;
}

/**
 * @public
 *
 * @param {MockNockStubBase} stub
 */
function removeInterceptor(stub) {
    // when scope configured with `persist` option then
    // .remove does not removes the mock.
    // Need to use nock.removeInterceptor or configure
    // mock with replyTimes instead
    stub.scope.remove(stub.interceptor._key, stub.interceptor);
}

module.exports = {
    mockHttpEndpoint,
    removeInterceptor,
    wrapMockNock,
    wrapMockNockSet
};

/**
 * @typedef {object} MockNockStubBase
 * @property {nock.Interceptor} interceptor - request interceptor
 * @property {nock.Scope} scope - request scope
 * @property {sinon.stub} stub - stub function to call on request match
 * @property {function} disable - make optional
 * @property {function} remove - remove from HTTP trap
 */
