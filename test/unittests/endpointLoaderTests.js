/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const sinon = require('sinon');
const EndpointLoader = require('../../src/nodejs/endpointLoader.js');

describe('Endpoint Loader', () => {
    afterEach(() => {
        sinon.restore();
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

        it('should replace default endpoint body if bodyOverride option is provided', (done) => {
            const eLoader = new EndpointLoader();
            const body = {
                command: 'run',
                utilCmdArgs: '-c "ls ."'
            };

            eLoader.endpoints = {
                bash: {
                    endpoint: '/mgmt/tm/util/bash',
                    body: {
                        command: 'run',
                        utilCmdArgs: '-c "echo Hello World"'
                    }
                }
            };

            sinon.stub(eLoader, '_getData').resolvesArg(1);

            eLoader.loadEndpoint('bash', { bodyOverride: body }, (data, err) => {
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

        it('should invalidate cached response if ignoreCached is set', (done) => {
            const eLoader = new EndpointLoader();
            const hello = () => 'Hello World';

            eLoader.endpoints = {
                bash: {
                    endpoint: '/mgmt/tm/util/bash',
                    ignoreCached: true
                }
            };
            eLoader.cachedResponse = {
                bash: [true, [hello], 'Foo Bar']
            };

            sinon.stub(eLoader, '_getAndExpandData').resolves('New Data');

            eLoader.loadEndpoint('bash', null, (data, err) => {
                if (err) {
                    done(err);
                    return;
                }

                try {
                    assert.strictEqual(data, 'New Data', 'Updated response should have returned in callback');
                    assert.deepStrictEqual(eLoader.cachedResponse.bash, [
                        true,
                        [hello], // The hello cb will still exist when this cb is called due to order
                        'New Data'
                    ]);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
