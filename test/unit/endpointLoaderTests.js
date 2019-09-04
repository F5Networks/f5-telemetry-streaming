/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
const assert = chai.assert;

const EndpointLoader = require('../../src/lib/endpointLoader.js');
const deviceUtil = require('../../src/lib/deviceUtil.js');

describe('Endpoint Loader', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('should set defaults', () => {
        const eLoader = new EndpointLoader();
        assert.strictEqual(eLoader.host, 'localhost');
        assert.deepStrictEqual(eLoader.options, { credentials: {}, connection: {} });
        assert.strictEqual(eLoader.endpoints, null);
        assert.deepStrictEqual(eLoader.cachedResponse, {});
    });

    it('should set host when argument is string', () => {
        const eLoader = new EndpointLoader('10.10.0.1');
        assert.strictEqual(eLoader.host, '10.10.0.1');
    });

    it('should set options when argument is object', () => {
        const eLoader = new EndpointLoader({ foo: 'bar' });
        assert.deepStrictEqual(eLoader.options, {
            foo: 'bar',
            credentials: {},
            connection: {}
        });
    });

    describe('setEndpoints', () => {
        it('should set endpoints', () => {
            const eLoader = new EndpointLoader();
            const expected = {
                foo: {
                    name: 'foo',
                    body: 'bar'
                },
                '/hello/world': {
                    endpoint: '/hello/world',
                    body: 'Hello World!'
                }
            };

            eLoader.setEndpoints([
                {
                    name: 'foo',
                    body: 'bar'
                },
                {
                    endpoint: '/hello/world',
                    body: 'Hello World!'
                }
            ]);

            assert.deepStrictEqual(eLoader.endpoints, expected);
        });

        it('should overwrite endpoints', () => {
            const eLoader = new EndpointLoader();
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

    describe('setEndpoints', () => {
        it('should not change token if already exists and resolve', () => {
            const eLoader = new EndpointLoader({ credentials: { token: '56789' } });

            sinon.stub(deviceUtil, 'getAuthToken').resolves({ token: '12345' });

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
            const eLoader = new EndpointLoader();

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
            const eLoader = new EndpointLoader();
            const error = new Error('getAuthToken: Username and password required');

            sinon.stub(deviceUtil, 'getAuthToken').rejects(error);

            assert.isRejected(eLoader.auth(error));
        });

        it('should pass connection and credential information to getAuthToken', () => {
            const eLoader = new EndpointLoader({
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

    describe('loadEndpoint', () => {
        it('should error if endpoint is not defined', (done) => {
            const eLoader = new EndpointLoader();
            eLoader.endpoints = {};

            eLoader.loadEndpoint('badEndpoint', null, (data, err) => {
                try {
                    assert.strictEqual(err.message, 'Endpoint not defined in file: badEndpoint');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('should replace strings in endpoint body if replaceStrings option is provided', (done) => {
            const eLoader = new EndpointLoader();
            const body = {
                command: 'run',
                utilCmdArgs: '-c "echo Hello World"'
            };

            eLoader.endpoints = {
                bash: {
                    endpoint: '/mgmt/tm/util/bash',
                    body: {
                        command: 'run',
                        utilCmdArgs: '-c "echo $replaceMe"'
                    }
                }
            };

            sinon.stub(eLoader, '_getData').resolvesArg(1);

            eLoader.loadEndpoint('bash', { replaceStrings: { '\\$replaceMe': 'Hello World' } }, (data, err) => {
                if (err) {
                    done(err);
                    return;
                }

                try {
                    assert.deepStrictEqual(data, { name: undefined, body, endpointFields: undefined });
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('should reply with cached response', (done) => {
            const eLoader = new EndpointLoader();
            const hello = () => 'Hello World';

            eLoader.endpoints = { bash: { endpoint: '/mgmt/tm/util/bash' } };
            eLoader.cachedResponse = { bash: [true, [hello], 'Foo Bar'] };

            sinon.stub(deviceUtil, 'makeDeviceRequest').resolves('New Data');

            eLoader.loadEndpoint('bash', null, (data, err) => {
                if (err) {
                    done(err);
                    return;
                }

                try {
                    assert.deepStrictEqual(
                        data,
                        'Foo Bar',
                        'Cached response should have returned in callback'
                    );
                    assert.deepStrictEqual(eLoader.cachedResponse.bash, [
                        true,
                        [hello], // The hello cb will still exist when this cb is called due to order
                        'Foo Bar'
                    ], 'Should not have updated cache');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('should invalidate cached response if ignoreCached is set', (done) => {
            const eLoader = new EndpointLoader();
            const hello = () => 'Hello World';
            const expected = {
                name: '/mgmt/tm/util/bash',
                data: 'New Data'
            };

            eLoader.endpoints = {
                bash: {
                    endpoint: '/mgmt/tm/util/bash',
                    ignoreCached: true
                }
            };
            eLoader.cachedResponse = { bash: [true, [hello], 'Foo Bar'] };

            sinon.stub(deviceUtil, 'makeDeviceRequest').resolves('New Data');

            eLoader.loadEndpoint('bash', null, (data, err) => {
                if (err) {
                    done(err);
                    return;
                }

                try {
                    assert.deepStrictEqual(
                        data,
                        expected,
                        'Updated response should have returned in callback'
                    );
                    assert.deepStrictEqual(eLoader.cachedResponse.bash, [
                        true,
                        [hello], // The hello cb will still exist when this cb is called due to order
                        expected
                    ], 'Should have updated cache');
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });

        it('should expand references if expandReferences is set', (done) => {
            const eLoader = new EndpointLoader();
            const expected = {
                data: {
                    items: [
                        {
                            membersReference: {
                                stat: 12345,
                                uri: 'foo/stats'
                            }
                        },
                        {
                            membersReference: {
                                stat: 12345,
                                uri: 'bar/stats'
                            }
                        }
                    ]
                },
                name: '/mgmt/tm/ltm/pool'
            };

            eLoader.endpoints = {
                pools: {
                    endpoint: '/mgmt/tm/ltm/pool',
                    expandReferences: { membersReference: { endpointSuffix: '/stats' } }
                }
            };

            sinon.stub(deviceUtil, 'makeDeviceRequest').callsFake((host, uri) => {
                let data;
                if (uri.endsWith('stats')) {
                    data = {
                        uri,
                        stat: 12345
                    };
                } else {
                    data = {
                        items: [
                            { membersReference: { link: 'foo' } },
                            { membersReference: { link: 'bar' } }
                        ]
                    };
                }
                return Promise.resolve(data);
            });

            eLoader.loadEndpoint('pools', null, (data, err) => {
                if (err) {
                    done(err);
                    return;
                }

                try {
                    assert.deepStrictEqual(
                        data,
                        expected,
                        'Updated response should have returned in callback'
                    );
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
