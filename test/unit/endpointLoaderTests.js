/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const sinon = require('sinon');

const EndpointLoader = require('../../src/lib/endpointLoader');
const deviceUtil = require('../../src/lib/deviceUtil');
const endpointLoaderTestsData = require('./endpointLoaderTestsData');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Endpoint Loader', () => {
    let eLoader;

    beforeEach(() => {
        eLoader = new EndpointLoader();
    });

    afterEach(() => {
        testUtil.checkNockActiveMocks(nock, assert);
        nock.cleanAll();
        sinon.restore();
    });

    describe('constructor', () => {
        it('should set defaults', () => {
            assert.strictEqual(eLoader.host, 'localhost');
            assert.deepStrictEqual(eLoader.options, { credentials: {}, connection: {} });
            assert.strictEqual(eLoader.endpoints, null);
            assert.deepStrictEqual(eLoader.cachedResponse, {});
        });

        it('should set host when argument is string', () => {
            eLoader = new EndpointLoader('10.10.0.1');
            assert.strictEqual(eLoader.host, '10.10.0.1');
        });

        it('should set options when argument is object', () => {
            eLoader = new EndpointLoader({ foo: 'bar' });
            assert.deepStrictEqual(eLoader.options, {
                foo: 'bar',
                credentials: {},
                connection: {}
            });
        });
    });

    describe('.setEndpoints()', () => {
        it('should set endpoints', () => {
            const expected = {
                foo: {
                    name: 'foo',
                    body: 'bar'
                },
                '/hello/world': {
                    path: '/hello/world',
                    body: 'Hello World!'
                }
            };
            eLoader.setEndpoints([
                {
                    name: 'foo',
                    body: 'bar'
                },
                {
                    path: '/hello/world',
                    body: 'Hello World!'
                }
            ]);
            assert.deepStrictEqual(eLoader.endpoints, expected);
        });

        it('should overwrite endpoints', () => {
            const expected = {
                bar: { name: 'bar' }
            };
            eLoader.endpoints = {
                foo: {}
            };
            eLoader.setEndpoints([
                {
                    name: 'bar'
                }
            ]);
            assert.deepStrictEqual(eLoader.endpoints, expected);
        });
    });

    describe('.auth()', () => {
        it('should not change token if already exists and resolve', () => {
            sinon.stub(deviceUtil, 'getAuthToken').resolves({ token: '12345' });
            eLoader = new EndpointLoader({ credentials: { token: '56789' } });
            return eLoader.auth()
                .then(() => {
                    assert.strictEqual(
                        eLoader.options.credentials.token,
                        '56789',
                        'Token should not have been updated'
                    );
                });
        });

        it('should save the token and resolve', () => {
            sinon.stub(deviceUtil, 'getAuthToken').resolves({ token: '12345' });
            return eLoader.auth()
                .then(() => {
                    assert.strictEqual(
                        eLoader.options.credentials.token,
                        '12345',
                        'Token should have been saved'
                    );
                });
        });

        it('should reject with error if getAuthToken fails', () => {
            sinon.stub(deviceUtil, 'getAuthToken').rejects(new Error('some error'));
            return assert.isRejected(eLoader.auth(), /some error/);
        });

        it('should pass connection and credential information to getAuthToken', () => {
            eLoader = new EndpointLoader({
                credentials: {
                    username: 'admin',
                    passphrase: '12345'
                },
                connection: {
                    protocol: 'https',
                    port: '8443'
                }
            });

            let getAuthTokenArgs;
            sinon.stub(deviceUtil, 'getAuthToken').callsFake((host, username, password, options) => {
                getAuthTokenArgs = {
                    host, username, password, options
                };
                return Promise.resolve('12345');
            });

            return eLoader.auth()
                .then(() => {
                    assert.deepStrictEqual(getAuthTokenArgs, {
                        host: 'localhost',
                        username: 'admin',
                        password: '12345',
                        options: {
                            protocol: 'https',
                            port: '8443'
                        }
                    });
                });
        });
    });

    describe('.replaceBodyVars()', () => {
        it('should replace string in body (object)', () => {
            const body = {
                command: 'run',
                utilCmdArgs: '-c "echo $replaceMe"'
            };
            return assert.deepStrictEqual(
                eLoader.replaceBodyVars(body, { '\\$replaceMe': 'Hello World' }),
                {
                    command: 'run',
                    utilCmdArgs: '-c "echo Hello World"'
                }
            );
        });

        it('should replace string in body (string)', () => assert.deepStrictEqual(
            eLoader.replaceBodyVars('$replaceMe', { '\\$replaceMe': 'Hello World' }),
            'Hello World'
        ));
    });

    describe('.getURIPath()', () => {
        it('should get path from URI', () => {
            assert.strictEqual(
                eLoader.getURIPath('https://localhost/path/to/something?arg=value'),
                '/path/to/something'
            );
        });
    });

    describe('.getData()', () => {
        it('should use POST when sending body', () => {
            // resolves with httOptions
            sinon.stub(deviceUtil, 'makeDeviceRequest').resolvesArg(2);
            return assert.becomes(
                eLoader.getData('/uri', { body: 'body' }),
                {
                    name: '/uri',
                    data: {
                        body: 'body',
                        method: 'POST',
                        credentials: {
                            username: undefined,
                            token: undefined
                        }
                    }
                }
            );
        });

        it('should retry request when failed', () => {
            const requestStub = sinon.stub(deviceUtil, 'makeDeviceRequest');
            requestStub.onFirstCall().rejects(new Error('some error'));
            requestStub.onSecondCall().resolves(Promise.resolve({ key: 'value' }));
            return eLoader.getData('/uri')
                .then((data) => {
                    assert.ok(requestStub.calledTwice, 'should re-try request on fail');
                    assert.deepStrictEqual(
                        data,
                        {
                            name: '/uri',
                            data: { key: 'value' }
                        }
                    );
                });
        });

        it('should build url using endpointFields', () => {
            // resolves with fullUri
            sinon.stub(deviceUtil, 'makeDeviceRequest').resolvesArg(1);
            return eLoader.getData('/uri', { endpointFields: ['field2', 'field1', 'field3'] })
                .then((data) => {
                    const fields = data.data.split('?')[1].split('=')[1].split(',').sort();
                    assert.deepStrictEqual(fields, ['field1', 'field2', 'field3']);
                });
        });
    });

    describe('.loadEndpoint()', () => {
        it('should error if endpoint is not defined', () => {
            eLoader.endpoints = {};
            return assert.isRejected(
                eLoader.loadEndpoint('badEndpoint'),
                /Endpoint not defined in file: badEndpoint/
            );
        });

        it('should fail when unable to get data', () => {
            sinon.stub(eLoader, 'getAndExpandData').rejects(new Error('some error'));
            eLoader.setEndpoints([{ name: 'path' }]);
            return assert.isRejected(
                eLoader.loadEndpoint('path'),
                /some error/
            );
        });

        it('should keep endpoint untouched when need to replace keys in body', () => {
            sinon.stub(eLoader, 'getAndExpandData').resolvesArg(0);
            const expectedEndpointObj = {
                path: '/mgmt/tm/util/bash',
                body: {
                    command: 'run',
                    utilCmdArgs: '-c "echo Hello World"'
                }
            };
            const endpoints = {
                bash: {
                    path: '/mgmt/tm/util/bash',
                    body: {
                        command: 'run',
                        utilCmdArgs: '-c "echo $replaceMe"'
                    }
                }
            };
            eLoader.endpoints = testUtil.deepCopy(endpoints);
            return eLoader.loadEndpoint('bash', { replaceStrings: { '\\$replaceMe': 'Hello World' } })
                .then((data) => {
                    assert.deepStrictEqual(data, expectedEndpointObj);
                    // verify that original endpoint not changed
                    assert.deepStrictEqual(eLoader.endpoints, endpoints);
                });
        });

        it('should reply with cached response', () => {
            eLoader.endpoints = { bash: { path: '/mgmt/tm/util/bash' } };
            eLoader.cachedResponse = { bash: 'Foo Bar' };
            return eLoader.loadEndpoint('bash')
                .then((data) => {
                    assert.deepStrictEqual(
                        data,
                        'Foo Bar',
                        'Cached response should have returned in callback'
                    );
                    assert.deepStrictEqual(eLoader.cachedResponse.bash,
                        'Foo Bar',
                        'Should not have updated cache');
                });
        });

        it('should invalidate cached response if ignoreCached is set', () => {
            const expected = {
                name: '/mgmt/tm/util/bash',
                data: 'New Data'
            };
            sinon.stub(eLoader, 'getAndExpandData').resolves(expected);

            eLoader.endpoints = {
                bash: {
                    path: '/mgmt/tm/util/bash',
                    ignoreCached: true
                }
            };
            eLoader.cachedResponse = { bash: 'Foo Bar' };
            return eLoader.loadEndpoint('bash')
                .then((data) => {
                    assert.deepStrictEqual(
                        data,
                        expected,
                        'Updated response should have returned in callback'
                    );
                    assert.deepStrictEqual(eLoader.cachedResponse.bash,
                        expected,
                        'Should have updated cache');
                });
        });

        it('should load updated data when cache is empty/erased', () => {
            const expected = {
                name: '/mgmt/tm/util/bash',
                data: 'New Data'
            };
            sinon.stub(eLoader, 'getAndExpandData').resolves(expected);

            eLoader.endpoints = {
                bash: {
                    path: '/mgmt/tm/util/bash',
                    ignoreCached: true
                }
            };
            eLoader.cachedResponse = { bash: 'Foo Bar' };
            eLoader.eraseCache();
            return eLoader.loadEndpoint('bash')
                .then((data) => {
                    assert.deepStrictEqual(
                        data,
                        expected,
                        'Updated response should have returned in callback'
                    );
                    assert.deepStrictEqual(eLoader.cachedResponse.bash,
                        expected,
                        'Should have updated cache');
                });
        });
    });

    describe('.getAndExpandData()', () => {
        const checkResponse = (endpointMock, response) => {
            if (!response.kind) {
                throw new Error(`Endpoint '${endpointMock.path}' has no property 'kind' in response`);
            }
        };

        endpointLoaderTestsData.getAndExpandData.forEach((testConf) => {
            testUtil.getCallableIt(testConf)(testConf.name, () => {
                testUtil.mockEndpoints(testConf.endpoints, { responseChecker: checkResponse });
                return assert.becomes(
                    eLoader.getAndExpandData(testConf.endpointObj),
                    testConf.expectedData
                );
            });
        });
    });
});
