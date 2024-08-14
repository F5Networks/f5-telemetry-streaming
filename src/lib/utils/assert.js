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

/* eslint-disable no-use-before-define */

const assert = require('assert');

const constants = require('../constants');

/**
 * @module utils/assert
 *
 * @typedef {import('./config').AdditionalOption} AdditionalOption
 * @typedef {import('./config').Component} Component
 * @typedef {import('./config').Connection} Connection
 * @typedef {import('./config').Credentials} Credentials
 * @typedef {import('./config').CredentialsPartial} CredentialsPartial
 * @typedef {import('./config').SystemPollerEndpoint} CustomEndpoint
 * @typedef {import('./config').DataActions} DataActions
 * @typedef {import('../systemPoller/loader').Endpoint} Endpoint
 * @typedef {import('./config').HttpAgentOption} HttpAgentOption
 * @typedef {import('./config').IHealthPollerCompontent} IHealthPollerCompontent
 * @typedef {import('./config').Proxy} Proxy
 * @typedef {import('./config').PullConsumerSystemPollerGroup} PullConsumerSystemPollerGroup
 * @typedef {import('./config').Secret} Secret
 * @typedef {import('../storage/storage').Key} StorageKey
 * @typedef {import('./config').SystemPollerComponent} SystemPollerComponent
 * @typedef {import('./config').TraceConfig} TraceConfig
 */

module.exports = {
    // START OF HELP FUNCTIONS

    /**
     * Asserts that all assertions from the list are passing
     *
     * @param {function[]} assertions
     * @param {string} message
     *
     * @throws {Error} when assertion failed
     */
    allOfAssertions(...assertions) {
        assert(assertions.length > 0, 'should be at least one assertion function');

        let message = assertions[assertions.length - 1];
        if (typeof message === 'string') {
            message = `${message}: `;
            assertions.pop();
        } else {
            message = '';
        }

        assertions.forEach((assertion, idx) => {
            try {
                assertion();
            } catch (error) {
                error.message = `${message}assert.allOfAssertions: assertion #${idx + 1} failed to pass the test: [${error.message || error}]`;
                assert.ifError(error);
            }
        });
    },

    /**
     * Asserts that is at least one assertion from the list is passing
     *
     * @param {function[]} assertions
     * @param {string} message
     *
     * @throws {Error} first failed assertion
     */
    anyOfAssertions(...assertions) {
        assert(assertions.length > 0, 'should be at least one assertion function');

        let message = assertions[assertions.length - 1];
        if (typeof message === 'string') {
            message = `${message}: `;
            assertions.pop();
        } else {
            message = '';
        }

        const errors = [];
        const success = assertions.some((assertion) => {
            try {
                assertion();
            } catch (error) {
                errors.push(`#${errors.length + 1}: ${error.message || error}`);
                return false;
            }
            return true;
        });

        if (success === false) {
            assert.ifError(new Error(`${message}assert.anyOfAssertions: none assertions from the list are passing the test: [${errors.join(', ')}]`));
        }
    },

    /**
     * Asserts that only one assertion from the list is passing
     *
     * @param {function[]} assertions
     * @param {string} message
     */
    oneOfAssertions(...assertions) {
        assert(assertions.length > 0, 'should be at least one assertion function');

        let message = assertions[assertions.length - 1];
        if (typeof message === 'string') {
            message = `${message}: `;
            assertions.pop();
        } else {
            message = '';
        }

        let lastPassIdx = -1;
        const errors = [];

        assertions.forEach((assertion, idx) => {
            try {
                assertion();
            } catch (error) {
                errors.push(`#${errors.length + 1}: ${error.message || error}`);
                // it is OK to return here
                return;
            }
            // assertion passed, need to check if it is the only one passing the test or not
            if (lastPassIdx === -1) {
                lastPassIdx = idx;
            } else {
                assert.ifError(new Error(`${message}assert.oneOfAssertions: assertions #${lastPassIdx + 1} and #${idx + 1} are both passing the test`));
            }
        });

        if (lastPassIdx === -1) {
            assert.ifError(new Error(`${message}assert.oneOfAssertions: none assertions from the list are passing the test: [${errors.join(', ')}]`));
        }
    },

    // END OF HELP FUNCTIONS

    /**
     * Ensures the value is an array
     *
     * @property {any} value
     * @property {string} vname
     */
    array(value, vname) {
        assert(
            Array.isArray(value),
            `${vname} should be an array`
        );
    },

    /**
     * Ensures the value is a truthy value
     *
     * @param {any} value
     * @param {string} vname
     * @param {string} [msg]
     */
    assert(value, vname, msg) {
        assert(value, `${vname} ${msg || 'should result in truthy value'}`);
    },

    bigip: {
        /**
         * Ensures the BIG-IP connection object is valid (allows optional properties)
         *
         * @param {Connection} connection
         * @param {string} vname
         */
        connection(connection, vname) {
            m.http.connection(connection, vname);
        },

        /**
         * Ensures the BIG-IP connection object is strictly valid (all properties set)
         *
         * @param {Connection} connection
         * @param {string} vname
         */
        connectionStrict(connection, vname) {
            m.allOfAssertions(
                () => m.object(connection, vname),
                () => m.boolean(connection.allowSelfSignedCert, `${vname}.allowSelfSignedCert`),
                () => m.string(connection.host, `${vname}.host`),
                () => m.safeNumberBetweenExclusive(connection.port, 0, 2 ** 16, `${vname}.port`),
                () => m.string(connection.protocol, `${vname}.protocol`),
                () => m.oneOf(connection.protocol, constants.HTTP_REQUEST.ALLOWED_PROTOCOLS, `${vname}.protocol`)
            );
        },

        /**
         * Ensures the BIG-IP credentials object is valid
         *
         * @param {string} host
         * @param {Credentials | CredentialsPartial} credentials
         * @param {null | string} [credentials.token] - authorization token
         * @param {string} vname
         */
        credentials(host, credentials, vname) {
            if (host === constants.LOCAL_HOST) {
                m.oneOfAssertions(
                    () => m.not.defined(credentials, vname),
                    () => m.allOfAssertions(
                        () => m.object(credentials, vname),
                        () => m.oneOfAssertions(
                            () => m.not.exist(credentials.token, `${vname}.token`), // undefined or null are OK for localhost token
                            () => m.string(credentials.token, `${vname}.token`)
                        ),
                        () => optionalUserPass(credentials, vname)
                    )
                );
            } else {
                m.allOfAssertions(
                    () => m.object(credentials, vname),
                    () => m.oneOfAssertions(
                        () => m.allOfAssertions(
                            () => m.not.defined(credentials.token, `${vname}.token`),
                            () => m.string(credentials.username, `${vname}.username`),
                            () => m.string(credentials.passphrase, `${vname}.passphrase`)
                        ),
                        () => m.allOfAssertions(
                            () => m.string(credentials.token, `${vname}.token`),
                            () => optionalUserPass(credentials, vname)
                        )
                    )
                );
            }
        },

        /**
         * Ensures the BIG-IP REST API custom endpoint object is valid
         *
         * @param {CustomEndpoint} endpoint
         * @param {string} vname
         */
        customEndpoint(endpoint, vname) {
            m.config.customEndpoint(endpoint, vname);
        },

        /**
         * Ensures the BIG-IP REST API endpoint object is valid
         *
         * @param {Endpoint} endpoint
         * @param {string} vname
         */
        endpoint(endpoint, vname) {
            m.allOfAssertions(
                () => m.object(endpoint, vname),
                () => m.string(endpoint.path, `${vname}.path`),
                () => m.oneOfAssertions(
                    () => m.not.defined(endpoint.name, `${vname}.name`),
                    () => m.string(endpoint.name, `${vname}.name`)
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(endpoint.body, `${vname}.body`),
                    () => m.string(endpoint.body, `${vname}.body`),
                    () => m.object(endpoint.body, `${vname}.body`)
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(endpoint.ignoreCached, `${vname}.ignoreCached`),
                    () => m.boolean(endpoint.ignoreCached, `${vname}.ignoreCached`)
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(endpoint.includeStats, `${vname}.includeStats`),
                    () => m.boolean(endpoint.includeStats, `${vname}.includeStats`)
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(endpoint.parseDuplicateKeys, `${vname}.parseDuplicateKeys`),
                    () => m.boolean(endpoint.parseDuplicateKeys, `${vname}.parseDuplicateKeys`)
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(endpoint.pagination, `${vname}.pagination`),
                    () => m.boolean(endpoint.pagination, `${vname}.pagination`)
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(endpoint.query, `${vname}.query`),
                    () => m.object(endpoint.query, `${vname}.query`)
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(endpoint.expandReferences, `${vname}.expandReferences`),
                    () => m.allOfAssertions(
                        () => m.object(endpoint.expandReferences, `${vname}.expandReferences`),
                        () => Object.entries(endpoint.expandReferences).forEach(([ref, value]) => {
                            m.oneOfAssertions(
                                () => m.emptyObject(value, `${vname}.expandReferences.${ref}`),
                                () => m.allOfAssertions(
                                    () => m.object(value, `${vname}.expandReferences.${ref}`),
                                    () => m.oneOfAssertions(
                                        () => m.not.defined(value.includeStats, `${vname}.expandReferences.${ref}.includeStats`),
                                        () => m.boolean(value.includeStats, `${vname}.expandReferences.${ref}.includeStats`)
                                    ),
                                    () => m.oneOfAssertions(
                                        () => m.not.defined(value.endpointSuffix, `${vname}.expandReferences.${ref}.includeStats`),
                                        () => m.string(value.endpointSuffix, `${vname}.expandReferences.${ref}.includeStats`)
                                    )
                                )
                            );
                        })
                    )
                )
            );
        }
    },

    /**
     * Ensures the value is a boolean
     *
     * @property {any} value
     * @property {string} vname
     */
    boolean(value, vname) {
        assert(
            typeof value === 'boolean',
            `${vname} should be a boolean`
        );
    },

    config: {
        /**
         * Ensures the value is an array of AdditionalOption
         *
         * @property {AdditionalOption[]} value
         * @property {string} vname
         */
        additionalOptions(value, vname) {
            m.allOfAssertions(
                () => m.array(value, vname),
                () => m.not.empty(value, vname),
                () => value.forEach((v, idx) => {
                    const iname = `${vname}[${idx}]`;
                    m.string(v.name, `${iname}.name`);
                    m.defined(v.value, `${iname}.value`);
                })
            );
        },

        /**
         * Ensures the value is a Component type
         *
         * @property {Component} value
         * @property {string} cls - component's class
         * @property {string} vname
         * @property {object} [options] - options
         * @property {boolean} [options.noTrace = false] - do not check `trace`
         */
        component(config, cls, vname, { noTrace = false } = {}) {
            m.allOfAssertions(
                () => m.object(config, vname),
                () => m.oneOf(config.class, Object.values(constants.CONFIG_CLASSES), `${vname}.class`),
                () => m.assert(config.class === cls, `${vname}.class`, `should be a "${cls}" string`),
                () => m.boolean(config.enable, `${vname}.enable`),
                () => m.string(config.id, `${vname}.id`),
                () => m.string(config.name, `${vname}.name`),
                () => m.string(config.namespace, `${vname}.namespace`),
                () => m.string(config.traceName, `${vname}.traceName`),
                () => !noTrace && m.config.traceConfg(config.trace, `${vname}.trace`)
            );
        },

        /**
         * Ensures the value is a Connection type
         *
         * @param {Connection} connection
         * @param {string} vname
         */
        connection(connection, vname) {
            m.allOfAssertions(
                () => m.object(connection, vname),
                () => m.boolean(connection.allowSelfSignedCert, `${vname}.allowSelfSignedCert`),
                () => m.string(connection.host, `${vname}.host`),
                () => m.safeNumberBetweenExclusive(connection.port, 0, 2 ** 16, `${vname}.port`),
                () => m.string(connection.protocol, `${vname}.protocol`),
                () => m.oneOf(connection.protocol, constants.HTTP_REQUEST.ALLOWED_PROTOCOLS, `${vname}.protocol`)
            );
        },

        /**
         * Ensures the BIG-IP REST API custom endpoint object is valid
         *
         * @param {CustomEndpoint} endpoint
         * @param {string} vname
         */
        customEndpoint(endpoint, vname) {
            m.allOfAssertions(
                () => m.object(endpoint, vname),
                () => m.boolean(endpoint.enable, `${vname}.enable`),
                () => m.string(endpoint.name, `${vname}.name`),
                () => m.string(endpoint.path, `${vname}.path`),
                () => m.oneOfAssertions(
                    () => m.not.defined(endpoint.protocol, `${vname}.protocol`),
                    () => m.allOfAssertions(
                        () => m.string(endpoint.protocol, `${vname}.protocol`),
                        () => m.oneOf(endpoint.protocol, ['http', 'snmp'], `${vname}.protocol`)
                    )
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(endpoint.numericalEnums, `${vname}.numericalEnums`),
                    () => m.allOfAssertions(
                        () => m.assert(endpoint.protocol === 'snmp', `${vname}.protocol`),
                        () => m.boolean(endpoint.numericalEnums, `${vname}.numericalEnums`)
                    )
                )
            );
        },

        /**
         * Ensures the value is a DataActions type
         *
         * @param {DataActions} actions
         * @param {string} vname
         */
        dataActions(actions, vname) {
            m.allOfAssertions(
                () => m.array(actions, vname),
                () => actions.forEach((action, idx) => {
                    const iname = `${vname}[${idx}]`;

                    m.boolean(action.enable, `${iname}.enable`);
                    m.oneOfAssertions(
                        () => m.allOfAssertions(
                            () => m.oneOfAssertions(
                                () => m.emptyObject(action.setTag, `${iname}.setTag`),
                                () => m.object(action.setTag, `${iname}.setTag`)
                            ),
                            () => m.oneOfAssertions(
                                () => m.not.defined(action.locations, `${iname}.locations`),
                                () => m.emptyObject(action.locations, `${iname}.locations`),
                                () => m.object(action.locations, `${iname}.locations`)
                            )
                        ),
                        () => m.allOfAssertions(
                            () => m.oneOfAssertions(
                                () => m.emptyObject(action.includeData, `${iname}.includeData`),
                                () => m.emptyObject(action.excludeData, `${iname}.excludeData`)
                            ),
                            () => m.oneOfAssertions(
                                () => m.emptyObject(action.locations, `${iname}.locations`),
                                () => m.object(action.locations, `${iname}.locations`)
                            )
                        )
                    );
                    m.oneOfAssertions(
                        () => m.allOfAssertions(
                            () => m.not.defined(action.ifAllMatch, `${iname}.ifAllMatch`),
                            () => m.not.defined(action.ifAnyMatch, `${iname}.ifAnyMatch`)
                        ),
                        () => m.allOfAssertions(
                            () => m.not.defined(action.ifAllMatch, `${iname}.ifAllMatch`),
                            () => m.array(action.ifAnyMatch, `${iname}.ifAnyMatch`)
                        ),
                        () => m.allOfAssertions(
                            () => m.not.defined(action.ifAnyMatch, `${iname}.ifAnyMatch`),
                            () => m.oneOfAssertions(
                                () => m.emptyObject(action.ifAllMatch, `${iname}.ifAllMatch`),
                                () => m.object(action.ifAllMatch, `${iname}.ifAllMatch`)
                            )
                        )
                    );
                })
            );
        },

        /**
         * Ensures the value is a Credentials type
         *
         * @param {Credentials | CredentialsPartial} credentials
         * @param {boolean} strict
         * @param {string} vname
         */
        credentials(credentials, strict, vname) {
            if (strict) {
                m.allOfAssertions(
                    () => m.object(credentials, vname),
                    () => m.string(credentials.username, `${vname}.username`),
                    () => m.oneOfAssertions(
                        () => m.string(credentials.passphrase, `${vname}.passphrase`),
                        () => m.config.secret(credentials.passphrase, `${vname}.passphrase`)
                    )
                );
            } else {
                m.oneOfAssertions(
                    () => m.not.defined(credentials, vname),
                    () => m.allOfAssertions(
                        () => m.object(credentials, vname),
                        () => m.string(credentials.username, `${vname}.username`),
                        () => m.oneOfAssertions(
                            () => m.not.defined(credentials.passphrase, `${vname}.passphrase`),
                            () => m.string(credentials.passphrase, `${vname}.passphrase`),
                            () => m.config.secret(credentials.passphrase, `${vname}.passphrase`)
                        )
                    )
                );
            }
        },

        /**
         * Ensures the value is an array of HttpAgentOption
         *
         * @property {HttpAgentOption[]} value
         * @property {string} vname
         */
        httpAgentOptions(value, vname) {
            m.oneOfAssertions(
                () => m.not.defined(value, vname),
                () => m.allOfAssertions(
                    () => m.config.additionalOptions(value, vname),
                    () => value.forEach((v, idx) => {
                        const iname = `${vname}[${idx}]`;
                        m.string(v.name, `${iname}.name`);
                        m.defined(v.value, `${iname}.value`);

                        m.oneOfAssertions(
                            () => m.allOfAssertions(
                                () => m.assert(v.name === 'keepAlive', `${iname}.name`, 'should be "keepAlive"'),
                                () => m.boolean(v.value, `${iname}.value`)
                            ),
                            () => m.allOfAssertions(
                                () => m.oneOf(v.name, [
                                    'keepAliveMsecs',
                                    'maxFreeSockets',
                                    'maxSockets'
                                ], `${iname}.name`),
                                () => m.safeNumberGrEq(v.value, 0, `${iname}.value`)
                            )
                        );
                    })
                )
            );
        },

        /**
         * Ensures the value is a IHealthPollerCompontent type
         *
         * @property {IHealthPollerCompontent} value
         * @property {string} vname
         */
        ihealthPoller(config, vname) {
            m.allOfAssertions(
                () => m.config.component(config, constants.CONFIG_CLASSES.IHEALTH_POLLER_CLASS_NAME, vname),
                () => m.object(config.iHealth, `${vname}.iHealth`),
                () => m.string(config.iHealth.name, `${vname}.iHealth.name`),
                () => m.config.credentials(config.iHealth.credentials, true, `${vname}.iHealth.credentials`),
                () => m.string(config.iHealth.downloadFolder, `${vname}.iHealth.downloadFolder`),
                () => m.object(config.iHealth.interval, `${vname}.iHealth.interval`),
                () => m.object(config.iHealth.interval.timeWindow, `${vname}.iHealth.interval.timeWindow`),
                () => m.string(config.iHealth.interval.timeWindow.start, `${vname}.iHealth.interval.timeWindow.start`),
                () => m.string(config.iHealth.interval.timeWindow.end, `${vname}.iHealth.interval.timeWindow.end`),
                () => m.string(config.iHealth.interval.frequency, `${vname}.iHealth.interval.frequency`),
                () => m.oneOfAssertions(
                    () => m.allOfAssertions(
                        () => m.assert(config.iHealth.interval.frequency === 'daily', `${vname}.iHealth.interval.frequency`),
                        () => m.not.defined(config.iHealth.interval.day, `${vname}.iHealth.interval.day`)
                    ),
                    () => m.allOfAssertions(
                        () => m.assert(config.iHealth.interval.frequency === 'weekly', `${vname}.iHealth.interval.frequency`),
                        () => m.oneOfAssertions(
                            () => m.string(config.iHealth.interval.day, `${vname}.iHealth.interval.day`),
                            () => m.safeNumberBetweenInclusive(config.iHealth.interval.day, 0, 7, `${vname}.iHealth.interval.day`)
                        )
                    ),
                    () => m.allOfAssertions(
                        () => m.assert(config.iHealth.interval.frequency === 'monthly', `${vname}.iHealth.interval.frequency`),
                        () => m.safeNumberBetweenInclusive(config.iHealth.interval.day, 1, 31, `${vname}.iHealth.interval.day`)
                    )
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(config.iHealth.proxy, `${vname}.iHealth.proxy`),
                    () => m.config.proxy(config.iHealth.proxy, `${vname}.iHealth.proxy`)
                ),
                () => m.object(config.system, `${vname}.system`),
                () => m.string(config.system.name, `${vname}.system.name`),
                () => m.config.connection(config.system.connection, `${vname}.system.connection`),
                () => m.config.credentials(config.system.credentials, false, `${vname}.system.credentials`)
            );
        },

        /**
         * Ensures the value is a Proxy type
         *
         * @param {Proxy} proxy
         * @param {string} vname
         */
        proxy(proxy, vname) {
            m.allOfAssertions(
                () => m.object(proxy, vname),
                () => m.config.connection(proxy.connection, `${vname}.connection`),
                () => m.config.credentials(proxy.credentials, false, `${vname}.credentials`)
            );
        },

        /**
         * Ensures the value is a Proxy type
         *
         * @param {PullConsumerSystemPollerGroup} config
         * @param {string} vname
         */
        pullConsumerPollerGroup(config, vname) {
            m.allOfAssertions(
                () => m.config.component(
                    config,
                    constants.CONFIG_CLASSES.PULL_CONSUMER_SYSTEM_POLLER_GROUP_CLASS_NAME,
                    vname,
                    { noTrace: true }
                ),
                () => m.string(config.pullConsumer, `${vname}.pullConsumer`),
                () => m.string(config.pullConsumerName, `${vname}.pullConsumerName`),
                () => m.array(config.systemPollers, `${vname}.systemPollers`),
                () => m.oneOfAssertions(
                    () => m.empty(config.systemPollers, `${vname}.systemPollers`),
                    () => m.allOfAssertions(
                        ...config.systemPollers.map((sp, idx) => () => m.string(sp, `${vname}.systemPollers[${idx}]`))
                    )
                )
            );
        },

        /**
         * Ensures the value is a Secret type
         *
         * @property {Secret} value
         * @property {string} vname
         */
        secret(secret, vname) {
            m.allOfAssertions(
                () => m.object(secret, vname),
                () => m.string(secret.protected, `${vname}.protected`),
                () => m.oneOf(secret.protected, ['plainText', 'plainBase64', 'SecureVault'], `${vname}.protected`),
                () => m.oneOfAssertions(
                    () => m.allOfAssertions(
                        () => m.not.defined(secret.cipherText, `${vname}.cipherText`),
                        () => m.string(secret.environmentVar, `${vname}.environmentVar`)
                    ),
                    () => m.allOfAssertions(
                        () => m.string(secret.cipherText, `${vname}.cipherText`),
                        () => m.not.defined(secret.environmentVar, `${vname}.environmentVar`)
                    )
                )
            );
        },

        /**
         * Ensures the value is a SystemPollerComponent type
         *
         * @property {SystemPollerComponent} value
         * @property {string} vname
         */
        systemPoller(config, vname) {
            m.allOfAssertions(
                () => m.config.component(config, constants.CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME, vname),
                () => m.string(config.systemName, `${vname}.systemName`),
                () => m.config.connection(config.connection, `${vname}.connection`),
                () => m.config.credentials(config.credentials, false, `${vname}.credentials`),
                () => m.safeNumberGrEq(config.interval, 0, `${vname}.interval`),
                () => m.safeNumberGrEq(config.workers, 1, `${vname}.workers`),
                () => m.safeNumberGrEq(config.chunkSize, 1, `${vname}.chunkSize`),
                () => m.object(config.dataOpts, `${vname}.dataOpts`),
                () => m.boolean(config.dataOpts.noTMStats, `${vname}.dataOpts.noTMStats`),
                () => m.oneOfAssertions(
                    () => m.not.defined(config.dataOpts.tags, `${vname}.dataOpts.tags`),
                    () => m.object(config.dataOpts.tags, `${vname}.dataOpts.tags`)
                ),
                () => m.config.dataActions(config.dataOpts.actions, `${vname}.dataOpts.actions`),
                () => m.oneOfAssertions(
                    () => m.not.defined(config.endpoints, `${vname}.endpoints`),
                    () => m.emptyObject(config.endpoints, `${vname}.endpoints`),
                    () => m.allOfAssertions(
                        () => m.object(config.endpoints, `${vname}.endpoints`),
                        () => Object.entries(config.endpoints).forEach(([key, value]) => m.config.customEndpoint(value, `${vname}.endpoints[${key}]`))
                    )
                ),
                () => m.config.httpAgentOptions(config.httpAgentOpts, `${vname}.httpAgentOpts`)
            );
        },

        /**
         * Ensures the value is a TraceConfig type
         *
         * @property {TraceConfig} value
         * @property {string} vname
         */
        traceConfg(config, vname) {
            m.allOfAssertions(
                () => m.object(config, vname),
                () => m.boolean(config.enable, `${vname}.enable`),
                () => m.string(config.encoding, `${vname}.encoding`),
                () => m.safeNumber(config.maxRecords, `${vname}.maxRecords`),
                () => m.string(config.path, `${vname}.path`),
                () => m.string(config.type, `${vname}.type`),
                () => m.oneOf(config.type, ['input', 'output'], `${vname}.type`)
            );
        }
    },

    /**
     * Ensures the value is defined (not undefined)
     *
     * @param {any} value
     * @param {string} vname
     */
    defined(value, vname) {
        assert(typeof value !== 'undefined', `${vname} should not be undefined`);
    },

    /**
     * Ensures the value is empty
     *
     * @param {Array | object | string} value
     * @param {string} vname
     */
    empty(value, vname) {
        assert(
            (typeof value === 'object' && value !== null && Object.keys(value).length === 0)
            || (typeof value.length === 'number' && value.length === 0),
            `${vname} should be an empty collection`
        );
    },

    /**
     * Ensures the value is empty object
     *
     * @param {object} value
     * @param {string} vname
     */
    emptyObject(value, vname) {
        assert(typeof value === 'object'
                && value !== null
                && !Array.isArray(value)
                && Object.keys(value).length === 0,
        `${vname} should be an empty object`);
    },

    /**
     * Ensures the value is neither null nor undefined
     *
     * @property {any} value
     * @property {string} vname
     */
    exist(value, vname) {
        assert(
            typeof value !== 'undefined' && value !== null,
            `${vname} should be neither null or undefined`
        );
    },

    /**
     * Ensures the value is a function
     *
     * @property {any} value
     * @property {string} vname
     */
    function(value, vname) {
        assert(typeof value === 'function', `${vname} should be a function`);
    },

    http: {
        /**
         * Ensures the HTTP connection object is valid
         *
         * @param {Connection} connection
         * @param {string} vname
         */
        connection(connection, vname) {
            m.allOfAssertions(
                () => m.object(connection, vname),
                () => m.oneOfAssertions(
                    () => m.not.defined(connection.allowSelfSignedCert, `${vname}.allowSelfSignedCert`),
                    () => m.boolean(connection.allowSelfSignedCert, `${vname}.allowSelfSignedCert`)
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(connection.port, `${vname}.port`),
                    () => m.safeNumberBetweenExclusive(connection.port, 0, 2 ** 16, `${vname}.port`)
                ),
                () => m.oneOfAssertions(
                    () => m.not.defined(connection.protocol, `${vname}.protocol`),
                    () => m.allOfAssertions(
                        () => m.string(connection.protocol, `${vname}.protocol`),
                        () => m.oneOf(connection.protocol, constants.HTTP_REQUEST.ALLOWED_PROTOCOLS, `${vname}.protocol`)
                    )
                )
            );
        },

        /**
         * Ensures the HTTP proxy object is valid
         *
         * @param {Proxy} proxy
         * @param {string} vname
         */
        proxy(proxy, vname) {
            m.allOfAssertions(
                () => m.object(proxy, vname),
                () => m.http.connection(proxy.connection, `${vname}.connection`),
                () => m.string(proxy.connection.host, `${vname}.connection.string`),
                () => m.oneOfAssertions(
                    () => m.not.defined(proxy.credentials, `${vname}.credentials`),
                    () => m.allOfAssertions(
                        () => m.object(proxy.credentials, `${vname}.credentials`),
                        () => optionalUserPass(proxy.credentials, `${vname}.credentials`)
                    )
                )
            );
        }
    },

    ihealth: {
        /**
         * Ensures the iHealth credentials object is valid
         *
         * @param {Credentials} credentials
         * @param {string} vname
         */
        credentials(credentials, vname) {
            m.allOfAssertions(
                () => m.object(credentials, vname),
                () => m.string(credentials.username, `${vname}.username`),
                () => m.string(credentials.passphrase, `${vname}.passphrase`)
            );
        },

        /**
         * Ensures the iHealth Report object is fulfilled with diagnostics data
         *
         * @param {object} report
         * @param {string} vname
         */
        diagnosticsReport(report, vname) {
            m.allOfAssertions(
                () => m.ihealth.report(report, vname),
                () => m.assert(report.status.done === true, `${vname}.status.done`, 'should be true'),
                () => m.assert(report.status.error === false, `${vname}.status.error`, 'should be false'),
                () => m.object(report.metadata, `${vname}.metadata`),
                () => m.safeNumberGr(report.metadata.cycleStart, 0, `${vname}.metadata.cycleStart`),
                () => m.safeNumberGr(report.metadata.cycleEnd, 0, `${vname}.metadata.cycleEnd`),
                () => m.string(report.metadata.qkviewURI, `${vname}.metadata.qkviewURI`)
            );
        },

        /**
         * Ensures the iHealth Report object is valid
         *
         * @param {object} report
         * @param {string} vname
         */
        report(report, vname) {
            m.allOfAssertions(
                () => m.object(report, vname),
                () => m.object(report.status, `${vname}.status`),
                () => m.boolean(report.status.done, `${vname}.status.done`),
                () => m.boolean(report.status.error, `${vname}.status.error`),
                () => m.string(report.qkviewURI, `${vname}.qkviewURI`),
                () => m.oneOfAssertions(
                    () => m.allOfAssertions(
                        () => m.assert(report.status.done === true, `${vname}.status.done`),
                        () => m.assert(report.status.error === true, `${vname}.status.error`),
                        () => m.string(report.status.errorMessage, `${vname}.status.errorMessage`),
                        () => m.not.defined(report.diagnosticsURI, `${vname}.diagnosticsURI`),
                        () => m.not.defined(report.diagnostics, `${vname}.diagnostics`)
                    ),
                    () => m.allOfAssertions(
                        () => m.assert(report.status.done === false, `${vname}.status.done`),
                        () => m.assert(report.status.error === false, `${vname}.status.error`),
                        () => m.not.defined(report.status.errorMessage, `${vname}.status.errorMessage`),
                        () => m.not.defined(report.diagnosticsURI, `${vname}.diagnosticsURI`),
                        () => m.not.defined(report.diagnostics, `${vname}.diagnostics`)
                    ),
                    () => m.allOfAssertions(
                        () => m.assert(report.status.done === true, `${vname}.status.done`),
                        () => m.assert(report.status.error === false, `${vname}.status.error`),
                        () => m.not.defined(report.status.errorMessage, `${vname}.status.errorMessage`),
                        () => m.string(report.diagnosticsURI, `${vname}.diagnosticsURI`),
                        () => m.object(report.diagnostics, `${vname}.diagnostics`)
                    )
                )
            );
        },

        response: {
            /**
             * Ensures the iHealth Auth response data is valid
             *
             * @param {object} response
             * @param {string} vname
             */
            auth(response, vname) {
                m.allOfAssertions(
                    () => m.object(response, vname),
                    () => m.string(response.access_token, `${vname}.access_token`),
                    () => m.safeNumberGr(response.expires_in, 0, `${vname}.expires_in`)
                );
            },

            /**
             * Ensures the iHealth Qkview Diagnostics response data is valid
             *
             * @param {object} response
             * @param {string} vname
             */
            diagnostics(response, vname) {
                m.allOfAssertions(
                    () => m.object(response, vname),
                    () => m.object(response.diagnostics, `${vname}.diagnostics`),
                    () => m.object(response.system_information, `${vname}.system_information`),
                    () => m.string(response.system_information.hostname, `${vname}.system_information.hostname`)
                );
            },

            /**
             * Ensures the iHealth Qkview Report response data is valid
             *
             * @param {object} response
             * @param {string} vname
             */
            report(response, vname) {
                m.allOfAssertions(
                    () => m.object(response, vname),
                    () => m.string(response.processing_status, `${vname}.processing_status`),
                    () => m.string(response.diagnostics, `${vname}.diagnostics`)
                );
            },

            /**
             * Ensures the iHealth Qkview Upload response data is valid
             *
             * @param {object} response
             * @param {string} vname
             */
            upload(response, vname) {
                m.allOfAssertions(
                    () => m.object(response, vname),
                    () => m.allOfAssertions(
                        () => m.string(response.result, `${vname}.result`),
                        () => m.assert(response.result === 'OK', `${vname}.result`, 'should be "OK"')
                    ),
                    () => m.string(response.location, `${vname}.location`)
                );
            }
        }
    },

    /**
     * Ensures the value is instance of cls
     *
     * @property {any} value
     * @property {object} cls
     * @property {string} vname
     */
    instanceOf(value, cls, vname) {
        assert(value instanceof cls, `${vname} should be an instance of ${cls.name}`);
    },

    /**
     * Ensures the value is an object
     *
     * @property {any} value
     * @property {string} vname
     */
    object(value, vname) {
        this.allOfAssertions(
            () => assert(typeof value === 'object', `${vname} should be an object`),
            () => m.not.array(value, vname),
            () => m.not.empty(value, vname)
        );
    },

    /**
     * Ensures the value appears in the list
     *
     * @property {any} value
     * @property {any[]} list
     * @property {string} vname
     */
    oneOf(value, list, vname) {
        assert(list.includes(value), `${vname} should be one of ${list}`);
    },

    /**
     * Emsures the value is a safe number
     *
     * @param {any} value
     * @param {string} vname
     */
    safeNumber(value, vname) {
        assert(Number.isSafeInteger(value), `${vname} should be a safe number`);
    },

    /**
     * Ensures `value` is a safe number and `lhs` < `value` < `rhs`
     *
     * @param {any} value
     * @param {number} lhs
     * @param {number} rhs
     * @param {string} vname
     */
    safeNumberBetweenExclusive(value, lhs, rhs, vname) {
        this.allOfAssertions(
            () => m.safeNumber(value, vname),
            () => assert(lhs < value, `${vname} should be > ${lhs}, got ${value}`),
            () => assert(value < rhs, `${vname} should be < ${rhs}, got ${value}`)
        );
    },

    /**
     * Ensures `value` is a safe number and `lhs` <= `value` <= `rhs`
     *
     * @param {any} value
     * @param {number} lhs
     * @param {number} rhs
     * @param {string} vname
     */
    safeNumberBetweenInclusive(value, lhs, rhs, vname) {
        this.allOfAssertions(
            () => m.safeNumber(value, vname),
            () => assert(lhs <= value, `${vname} should be >= ${lhs}, got ${value}`),
            () => assert(value <= rhs, `${vname} should be <= ${rhs}, got ${value}`)
        );
    },

    /**
     * Ensures `lhs` is a safe number and === `rhs`
     *
     * @param {any} lhs
     * @param {number} rhs
     * @param {string} vname
     */
    safeNumberEq(lhs, rhs, vname) {
        this.allOfAssertions(
            () => m.safeNumber(lhs, vname),
            () => assert(lhs === rhs, `${vname} should be === ${rhs}, got ${lhs}`)
        );
    },

    /**
     * Ensures `lhs` is a safe number and >= `rhs`
     *
     * @param {any} lhs
     * @param {number} rhs
     * @param {string} vname
     */
    safeNumberGrEq(lhs, rhs, vname) {
        this.allOfAssertions(
            () => m.safeNumber(lhs, vname),
            () => assert(lhs >= rhs, `${vname} should be >= ${rhs}, got ${lhs}`)
        );
    },

    /**
     * Ensures `lhs` is a safe number and > `rhs`
     *
     * @param {any} lhs
     * @param {number} rhs
     * @param {string} vname
     */
    safeNumberGr(lhs, rhs, vname) {
        this.allOfAssertions(
            () => m.safeNumber(lhs, vname),
            () => assert(lhs >= rhs, `${vname} should be > ${rhs}, got ${lhs}`)
        );
    },

    /**
     * Ensures `lhs` is a safe number and <= `rhs`
     *
     * @param {any} lhs
     * @param {number} rhs
     * @param {string} vname
     */
    safeNumberLsEq(lhs, rhs, vname) {
        this.allOfAssertions(
            () => m.safeNumber(lhs, vname),
            () => assert(lhs <= rhs, `${vname} should be <= ${rhs}, got ${lhs}`)
        );
    },

    storage: {
        /**
         * Ensures the value is non-empty string
         *
         * @property {StorageKey} value
         * @property {string} vname
         */
        key(key, vname) {
            m.oneOfAssertions(
                () => m.string(key, vname),
                () => m.allOfAssertions(
                    () => m.array(key, vname),
                    () => key.forEach((k, idx) => m.string(k, `${vname}[${idx}]`))
                )
            );
        }
    },

    /**
     * Ensures the value is non-empty string
     *
     * @property {any} value
     * @property {string} vname
     */
    string(value, vname) {
        this.allOfAssertions(
            () => assert(typeof value === 'string', `${vname} should be a string`),
            () => m.not.empty(value, vname)
        );
    },

    not: {
        /**
         * Ensures the value is not an array
         *
         * @param {any} value
         * @param {string} vname
         */
        array(value, vname) {
            assert(!Array.isArray(value), `${vname} should not be an array`);
        },

        /**
         * Ensures the value is not defined
         *
         * @param {any} value
         * @param {string} vname
         */
        defined(value, vname) {
            assert(typeof value === 'undefined', `${vname} should be an undefined`);
        },

        /**
         * Ensures the value is not empty
         *
         * @param {Array | object | string} value
         * @param {string} vname
         */
        empty(value, vname) {
            assert(
                (typeof value === 'object' && (value !== null && Object.keys(value).length > 0))
                || (typeof value.length === 'number' && value.length > 0),
                `${vname} should be a non-empty collection`
            );
        },

        /**
         * Ensures the value is neither null nor undefined
         *
         * @property {any} value
         * @property {string} vname
         */
        exist(value, vname) {
            assert(
                typeof value === 'undefined' || value === null,
                `${vname} should be either null or undefined`
            );
        }
    }
};

function optionalUserPass(credentials, vname) {
    return m.oneOfAssertions(
        () => m.allOfAssertions(
            () => m.not.defined(credentials.username, `${vname}.username`),
            () => m.not.defined(credentials.passphrase, `${vname}.passphrase`)
        ),
        () => m.allOfAssertions(
            () => m.string(credentials.username, `${vname}.username`),
            () => m.oneOfAssertions(
                () => m.not.defined(credentials.passphrase, `${vname}.passphrase`),
                () => m.string(credentials.passphrase, `${vname}.passphrase`)

            )
        )
    );
}

const m = module.exports;
