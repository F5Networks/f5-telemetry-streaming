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

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const pathUtil = require('path');
const readline = require('readline');

const constants = require('./shared/constants');
const DEFAULT_UNNAMED_NAMESPACE = require('../../src/lib/constants').DEFAULT_UNNAMED_NAMESPACE;
const harnessUtils = require('./shared/harness');
const logger = require('./shared/utils/logger').getChild('dutTests');
const miscUtils = require('./shared/utils/misc');
const promiseUtils = require('./shared/utils/promise');
const testUtils = require('./shared/testUtils');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/dutTests
 */

/**
 * Setup DUTs
 */
function setup() {
    const harness = harnessUtils.getDefaultHarness();
    const tsRPMInfo = miscUtils.getPackageDetails();
    logger.info('RPM to install on DUT(s):', { tsRPMInfo });

    harness.bigip.forEach((bigip) => {
        describe(`DUT setup - ${bigip.name}`, () => {
            testUtils.shouldRemovePreExistingTSDeclaration(bigip);
            testUtils.shouldRemovePreExistingTSPackage(bigip);

            it('should stop restnoded', () => bigip.ssh.default.exec('bigstart stop restnoded'));

            it('should erase restnoded log(s)', () => bigip.ssh.default.exec(
                `rm -f ${pathUtil.join(constants.BIGIP.RESTNODED.LOGS_DIR, '*')}`
            ));

            it('should start restnoded', () => bigip.ssh.default.exec('bigstart start restnoded'));

            testUtils.shouldInstallTSPackage(bigip, () => tsRPMInfo);
            testUtils.shouldVerifyTSPackageInstallation(bigip);

            ['tcp', 'udp'].forEach((proto) => it(
                `should configure firewall rules - ${proto} protocol`,
                () => {
                    // BIGIP 14.1+ only:
                    // to reach listener via mgmt IP might require allowing through host fw
                    // using below command (or similar):
                    // tmsh modify security firewall management-ip-rules rules replace-all-with { telemetry
                    // { place-before first ip-protocol tcp destination {
                    // ports replace-all-with { 6514 } } action accept } }
                    const uri = '/mgmt/tm/security/firewall/management-ip-rules/rules';
                    const ruleName = `telemetry-${proto}`;
                    let passOnError = false;

                    return bigip.icontrol.default.makeRequestWithAuth({
                        method: 'GET',
                        uri
                    })
                        .catch((error) => {
                            // older versions of BIG-IP do not have security enabled by default
                            const errMsg = error.message;
                            // just info the user that something unexpected happened but still trying to proceed
                            if (!errMsg.includes('must be licensed')) {
                                bigip.logger.error('Unable to configure management-ip rules, continue with current config:', error);
                            }
                            passOnError = true;
                            return Promise.reject(error);
                        })
                        .then(() => bigip.icontrol.default.makeRequestWithAuth({
                            method: 'GET',
                            uri
                        }))
                        .then((data) => {
                            // check if rule already exists
                            if (data.items.some((i) => i.name === ruleName) === true) {
                                // exists, delete the rule
                                return bigip.icontrol.default.makeRequestWithAuth({
                                    method: 'DELETE',
                                    uri: `${uri}/${ruleName}`
                                });
                            }
                            return Promise.resolve();
                        })
                        .then(() => bigip.icontrol.default.makeRequestWithAuth({
                            body: {
                                name: ruleName,
                                'place-before': 'first',
                                action: 'accept',
                                ipProtocol: proto,
                                destination: {
                                    ports: [
                                        constants.TELEMETRY.LISTENER.PORT.DEFAULT,
                                        constants.TELEMETRY.LISTENER.PORT.SECONDARY,
                                        constants.TELEMETRY.LISTENER.PORT.NAMESPACE,
                                        constants.TELEMETRY.LISTENER.PORT.NAMESPACE_SECONDARY
                                    ].map((port) => ({ name: String(port) }))
                                }
                            },
                            json: true,
                            method: 'POST',
                            uri
                        }))
                        .catch((err) => (passOnError === true
                            ? Promise.resolve()
                            : Promise.reject(err)));
                }
            ));
        });

        if (miscUtils.getEnvArg(constants.ENV_VARS.TEST_CONTROLS.TESTS.DEV_ENV, {
            castTo: 'boolean',
            defaultValue: false
        })) {
            describe(`DUT dev patches - ${bigip.name}`, () => {
                it('should stop restnoded', () => bigip.ssh.default.exec('bigstart stop restnoded'));

                it('should update minimal value for polling interval', () => {
                    const schemaPath = pathUtil.join(
                        constants.BIGIP.RESTNODED.TELEMETRY_DIR,
                        'schema/latest/system_poller_schema.json'
                    );
                    const jqQuery = '.definitions.systemPoller.oneOf[0].allOf[0].else.properties.interval.minimum = 1';
                    return bigip.ssh.default.exec(`echo $(jq '${jqQuery}' "${schemaPath}") > "${schemaPath}"`);
                });

                it('should start restnoded', () => bigip.ssh.default.exec('bigstart start restnoded'));

                testUtils.shouldVerifyTSPackageInstallation(bigip);
            });
        }
    });
}

/**
 * Tests for DUTs
 */
function test() {
    const harness = harnessUtils.getDefaultHarness();
    const tests = [
        {
            name: 'basic declaration - default (no namespace)',
            eventListenerTests: true
        },
        {
            name: 'basic declaration with namespace',
            namespace: constants.DECL.NAMESPACE_NAME
        },
        {
            name: 'mixed declaration (default and namespace), verify default (no namespace)'
        },
        {
            name: 'mixed declaration (default and namespace), verify namespace',
            namespace: constants.DECL.NAMESPACE_NAME
        },
        {
            name: 'basic declaration - default (no namespace), verify default by "f5telemetry_default"',
            namespace: DEFAULT_UNNAMED_NAMESPACE
        },
        {
            name: 'mixed declaration (default and namespace), verify default by "f5telemetry_default"',
            namespace: DEFAULT_UNNAMED_NAMESPACE,
            eventListenerTests: true
        },
        {
            name: 'basic declaration - namespace endpoint',
            namespace: constants.DECL.NAMESPACE_NAME,
            eventListenerTests: true,
            useNamespaceDeclare: true
        }
    ];

    const basicDeclaration = miscUtils.readJsonFile(constants.DECL.BASIC);
    const namespaceDeclaration = miscUtils.readJsonFile(constants.DECL.BASIC_NAMESPACE);

    function getDeclToUse(testSetup) {
        let declaration = miscUtils.deepCopy(basicDeclaration);
        if (testSetup.name.startsWith('mixed')) {
            declaration.My_Namespace = miscUtils.deepCopy(namespaceDeclaration.My_Namespace);
        } else if (testSetup.useNamespaceDeclare) {
            declaration = miscUtils.deepCopy(namespaceDeclaration.My_Namespace);
        } else if (testSetup.namespace && testSetup.namespace !== DEFAULT_UNNAMED_NAMESPACE) {
            declaration = miscUtils.deepCopy(namespaceDeclaration);
        }
        return declaration;
    }

    // Selectively skip tests if the testSetup uses Namespaces
    // Tests that validate more complex SystemPoller logic can be skipped when only testing Namespace logic
    function ifNoNamespaceIt(title, testSetup, testFunc) {
        return testSetup.namespace ? () => {} : it(title, testFunc);
    }

    function searchCipherTexts(data, cb) {
        const stack = [data];
        const forKey = (key) => {
            const val = stack[0][key];
            if (key === 'cipherText') {
                const ret = cb(val);
                if (typeof ret !== 'undefined') {
                    stack[0][key] = ret;
                }
            } else if (typeof val === 'object' && val !== null) {
                stack.push(val);
            }
        };
        while (stack.length) {
            Object.keys(stack[0]).forEach(forKey);
            stack.shift();
        }
    }

    function checkPassphraseObject(data) {
        // check that the declaration returned contains encrypted text
        // note: this only applies to TS running on BIG-IP (which is all we are testing for now)
        let secretsFound = 0;
        searchCipherTexts(data, (cipherText) => {
            secretsFound += 1;
            assert.isTrue(cipherText.startsWith('$M'), true, 'cipherText should start with $M$');
        });
        assert.notStrictEqual(secretsFound, 0, 'Expected at least 1 cipherText field');
    }

    function removeCipherTexts(data) {
        searchCipherTexts(data, () => 'replacedSecret');
    }

    harness.bigip.forEach((bigip) => {
        describe(`DUT test - ${bigip.name}`, () => {
            describe('Event Listener tests', () => {
                it('should ensure event listener is up', () => {
                    const allListenerPorts = [
                        constants.TELEMETRY.LISTENER.PORT.DEFAULT,
                        constants.TELEMETRY.LISTENER.PORT.SECONDARY,
                        constants.TELEMETRY.LISTENER.PORT.NAMESPACE,
                        constants.TELEMETRY.LISTENER.PORT.NAMESPACE_SECONDARY
                    ];

                    /**
                     * Connector to Event Listener
                     *
                     * @param {number} port - port number
                     * @param {boolean} [retry = false] - retry on fail
                     *
                     * @returns {Promise} resolved once successfully connected
                     */
                    function connectToListener(port, retry) {
                        return bigip.tcp.ping(port, {
                            retry: {
                                // re-try 10 times for opened ports and 2 times for closed
                                // (in case of random conn error)
                                maxTries: retry ? 10 : 2,
                                delay: retry ? 300 : 50
                            }
                        });
                    }

                    /**
                     * Check Event Listener ports
                     *
                     * @param {Object} ports - ports to check
                     * @param {Array<number>} [ports.closed] - closed ports
                     * @param {Array<number>} [ports.opened] - opened ports
                     *
                     * @returns {Promise} resolved once all conditions satisfied
                     */
                    function checkListenerPorts(ports) {
                        bigip.logger.info('Checking following event listener ports', { ports });

                        const promises = {
                            closed: promiseUtils.allSettled((ports.closed || [])
                                .map((port) => connectToListener(port))),
                            opened: promiseUtils.allSettled((ports.opened || [])
                                .map((port) => connectToListener(port, true)))
                        };
                        return Promise.all([promises.closed, promises.opened])
                            .then((results) => {
                                const closed = results[0];
                                const opened = results[1];

                                const notClosed = closed
                                    .map((ret, idx) => [ret.status === 'fulfilled', ports.closed[idx]])
                                    .filter((ret) => ret[0])
                                    .map((ret) => ret[1]);
                                if (notClosed.length > 0) {
                                    throw new Error(`Port(s) ${notClosed.join(', ')} should be closed`);
                                }

                                const notOpened = opened
                                    .map((ret, idx) => [ret.status === 'rejected', ports.closed[idx]])
                                    .filter((ret) => ret[0])
                                    .map((ret) => ret[1]);
                                if (notOpened.length > 0) {
                                    throw new Error(`Port(s) ${notOpened.join(', ')} should be opened`);
                                }
                            });
                    }

                    /**
                     * Find Event Listeners in declaration
                     *
                     * @param {Object} obj - declaration
                     * @param {function} cb - callbacks
                     */
                    const findListeners = (obj, cb) => {
                        if (typeof obj === 'object') {
                            if (obj.class === 'Telemetry_Listener') {
                                cb(obj);
                            } else {
                                Object.keys(obj).forEach((key) => findListeners(obj[key], cb));
                            }
                        }
                    };

                    /**
                     * Get expected state for each port
                     *
                     * @param {Object} decl - declaration
                     *
                     * @returns {{opened: Array<integer>, closed: Array<integer>}}
                     */
                    const expectedPortStates = (decl) => {
                        const ports = { closed: [], opened: [] };
                        findListeners(decl, (listener) => {
                            const enabled = typeof listener.enable === 'undefined' ? true : listener.enable;
                            (enabled ? ports.opened : ports.closed)
                                .push(listener.port || constants.TELEMETRY.LISTENER.PORT.DEFAULT);
                        });
                        allListenerPorts.forEach((port) => {
                            if (ports.opened.indexOf(port) === -1) {
                                ports.closed.push(port);
                            }
                        });
                        // remove dups
                        ports.opened = ports.opened.filter((port, idx) => ports.opened.indexOf(port) === idx);
                        // remove dups and opened ports
                        ports.closed = ports.closed.filter((port, idx) => ports.closed.indexOf(port) === idx
                            && ports.opened.indexOf(port) === -1);

                        assert.sameMembers(
                            [].concat(ports.closed, ports.opened),
                            allListenerPorts,
                            'should use all expected ports'
                        );
                        assert.deepStrictEqual(
                            ports.closed.filter((port) => ports.opened.indexOf(port) !== -1),
                            [],
                            'should use different opened and closed ports'
                        );
                        return ports;
                    };

                    /**
                     * Create Telemetry_Listener object
                     *
                     * @param {integer} port - port
                     *
                     * @returns {Object} listener object
                     */
                    const createListener = (port, enable) => ({
                        class: 'Telemetry_Listener',
                        enable: typeof enable === 'undefined' ? true : enable,
                        port,
                        trace: false
                    });

                    /**
                     * Run sub-test
                     *
                     * @param {string} name - sub-test name
                     * @param {function} f - func tp run
                     *
                     * @returns {Promise}
                     */
                    const runSubTest = (function (name, declaration, namespace) {
                        this.subTestID += 1;
                        // keep 'promiseUtils.loopForEach' in case we will need to test posting same declaration twice
                        return promiseUtils.loopForEach([1], (item) => {
                            bigip.logger.info(`SubTest ${this.subTestID}.${item}: ${name}`);

                            let ts = bigip.telemetry;
                            if (namespace) {
                                ts = ts.toNamespace(namespace);
                            }
                            return ts.declare(miscUtils.deepCopy(declaration))
                                .then((data) => {
                                    bigip.logger.info('Declaration POST results:', { data });
                                    assert.deepStrictEqual(data.message, 'success', 'should return successful response');
                                    return bigip.telemetry.getDeclaration();
                                })
                                .then((data) => {
                                    bigip.logger.info('Declaration GET results:', { data });
                                    assert.deepStrictEqual(data.message, 'success', 'should return successful response');

                                    return assert.isFulfilled(
                                        checkListenerPorts(expectedPortStates(data)),
                                        'should have opened and closed ports as expected'
                                    );
                                });
                        });
                    }).bind({
                        subTestID: 0
                    });

                    return Promise.resolve()
                        .then(() => runSubTest('Empty declaration in default namespace', {
                            class: 'Telemetry'
                        }))
                        .then(() => runSubTest('Declaration with 1 enabled listener in default namespace', {
                            class: 'Telemetry',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT)
                        }))
                        .then(() => runSubTest('Declaration with 2 enabled listeners (different ports) in default namespace', {
                            class: 'Telemetry',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.SECONDARY)
                        }))
                        .then(() => runSubTest('Declaration with 2 enabled listeners (same ports) in default namespace', {
                            class: 'Telemetry',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT)
                        }))
                        .then(() => runSubTest('Declaration with 1 enabled and 1 disabled listeners (same ports) in default namespace', {
                            class: 'Telemetry',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT, false)
                        }))
                        .then(() => runSubTest('Declaration with 1 enabled and 1 disabled listeners (different ports) in default namespace', {
                            class: 'Telemetry',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.SECONDARY, false)
                        }))
                        .then(() => runSubTest('Empty declaration in Namespace', {
                            class: 'Telemetry_Namespace'
                        }, 'Namespace'))
                        .then(() => runSubTest('Declaration with 1 enabled listener in Namespace', {
                            class: 'Telemetry_Namespace',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE)
                        }, 'Namespace'))
                        .then(() => runSubTest('Declaration with 2 enabled listeners (different ports) in Namespace', {
                            class: 'Telemetry_Namespace',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE_SECONDARY)
                        }, 'Namespace'))
                        .then(() => runSubTest('Declaration with 2 enabled listeners (same ports) in Namespace', {
                            class: 'Telemetry_Namespace',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE_SECONDARY)
                        }, 'Namespace'))
                        .then(() => runSubTest('Declaration with 1 enabled and 1 disabled listeners (same ports) in Namespace', {
                            class: 'Telemetry_Namespace',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE_SECONDARY, false)
                        }, 'Namespace'))
                        .then(() => runSubTest('Declaration with 1 enabled and 1 disabled listeners (different ports) in Namespace', {
                            class: 'Telemetry_Namespace',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE_SECONDARY, false)
                        }, 'Namespace'))
                        .then(() => runSubTest('Declaration with 1 enabled and 1 disabled listeners (same ports as in default namespace) in Namespace', {
                            class: 'Telemetry_Namespace',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.SECONDARY, false)
                        }, 'Namespace'))
                        .then(() => runSubTest('Declaration with 2 enabled listeners (different ports) in each namespace', {
                            class: 'Telemetry',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.SECONDARY),
                            Namespace: {
                                class: 'Telemetry_Namespace',
                                Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE),
                                Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.NAMESPACE_SECONDARY)
                            }
                        }))
                        .then(() => runSubTest('Declaration with 2 enabled listeners (same ports) in each namespace', {
                            class: 'Telemetry',
                            Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT),
                            Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.SECONDARY),
                            Namespace: {
                                class: 'Telemetry_Namespace',
                                Listener_1: createListener(constants.TELEMETRY.LISTENER.PORT.DEFAULT),
                                Listener_2: createListener(constants.TELEMETRY.LISTENER.PORT.SECONDARY)
                            }
                        }))
                        .then(() => runSubTest('Empty declaration in Namespace', {
                            class: 'Telemetry_Namespace'
                        }, 'Namespace'))
                        .then(() => runSubTest('Empty declaration in default namespace', {
                            class: 'Telemetry'
                        }));
                });
            });

            describe('System Poller tests', () => {
                it('should fetch and process SNMP metrics', () => miscUtils.readJsonFile(constants.DECL.SNMP_METRICS, true)
                    .then((decl) => bigip.telemetry.declare(decl))
                    .then((data) => {
                        bigip.logger.info('POST declaration:', { data });
                        assert.deepStrictEqual(data.message, 'success', 'should return successful response');
                        // wait 0.5s in case if config was not applied yet
                        return promiseUtils.sleep(500);
                    })
                    .then(() => bigip.telemetry.getSystemPollerData(constants.DECL.SYSTEM_NAME))
                    .then((data) => {
                        bigip.logger.info(`SystemPoller "${constants.DECL.SYSTEM_NAME}" response:`, { data });
                        assert.isArray(data, 'should be array');
                        assert.isNotEmpty(data, 'should have at least one element');
                        // verify that 'system' key and child objects are included
                        data = data[0];

                        const snmpName = 'hrDeviceStatus.196608';

                        assert.isString(data.hrDeviceStatusOrigin[snmpName], 'should not convert SNMP enum to metric');
                        assert.isNotEmpty(data.hrDeviceStatusOrigin[snmpName], 'should fetch SNMP enum value');

                        assert.isString(data.hrDeviceStatusOriginWithOptions[snmpName], 'should not convert SNMP enum to metric');
                        assert.isNotEmpty(data.hrDeviceStatusOriginWithOptions[snmpName], 'should fetch SNMP enum value');

                        assert.isNumber(data.hrDeviceStatusAsMetric[snmpName], 'should convert SNMP enum to metric');
                    }));
            });

            tests.forEach((testSetup) => {
                describe(`${testSetup.name}`, () => {
                    const defaultTelemetry = bigip.telemetry;
                    const namespaceTelemetry = testSetup.namespace
                        ? bigip.telemetry.toNamespace(testSetup.namespace)
                        : defaultTelemetry;

                    describe('basic checks', () => {
                        it('should post same configuration twice and get it after', () => {
                            const ts = testSetup.useNamespaceDeclare
                                ? namespaceTelemetry
                                : defaultTelemetry;

                            let postResponses = [];

                            // wait 2s to buffer consecutive POSTs
                            return ts.declare(getDeclToUse(testSetup))
                                .then((data) => {
                                    bigip.logger.info('POST request #1: Declaration response:', { data });
                                    assert.deepStrictEqual(data.message, 'success', 'should return successful response');

                                    checkPassphraseObject(data);
                                    postResponses.push(data);
                                    // wait for 0.5 secs while declaration will be applied and saved to storage
                                    return promiseUtils.sleep(500);
                                })
                                .then(() => ts.declare(getDeclToUse(testSetup)))
                                .then((data) => {
                                    bigip.logger.info('POST request #2: Declaration response:', { data });
                                    assert.deepStrictEqual(data.message, 'success', 'should return successful response');

                                    checkPassphraseObject(data);
                                    postResponses.push(data);
                                    // wait for 0.5 secs while declaration will be applied and saved to storage
                                    return promiseUtils.sleep(500);
                                })
                                .then(() => ts.getDeclaration())
                                .then((data) => {
                                    bigip.logger.info('GET request: Declaration response:', { data });
                                    assert.deepStrictEqual(data.message, 'success', 'should return successful response');

                                    checkPassphraseObject(data);
                                    postResponses.push(data);

                                    // compare GET to recent POST
                                    assert.deepStrictEqual(postResponses[2], postResponses[1], 'should return same declaration every time');
                                    // lest compare first POST to second POST (only one difference is secrets)
                                    postResponses = postResponses.map(removeCipherTexts);
                                    assert.deepStrictEqual(postResponses[0], postResponses[1], 'should return same declaration every time');
                                })
                                .then(() => {
                                    if (testSetup.useNamespaceDeclare) {
                                        bigip.logger.info('Additional test for namespace endpoint - verify full declaration');
                                        return defaultTelemetry.getDeclaration()
                                            .then((data) => {
                                                bigip.logger.info('GET request: Declaration response', { data });
                                                assert.deepStrictEqual(data.message, 'success', 'should return successful response');
                                                // verify merged decl
                                                assert.isTrue(typeof data.declaration[constants.DECL.NAMESPACE_NAME] !== 'undefined', 'should return expected declaration'); // named namespace
                                                assert.isTrue(typeof data.declaration[constants.DECL.SYSTEM_NAME] !== 'undefined', 'should return expected declaration'); // default namespace
                                            });
                                    }
                                    return Promise.resolve();
                                });
                        });

                        // wait 500ms in case if config was not applied yet
                        it('should get response from systempoller endpoint', () => promiseUtils.sleep(500)
                            .then(() => namespaceTelemetry.getSystemPollerData(constants.DECL.SYSTEM_NAME))
                            .then((data) => {
                                bigip.logger.info(`SystemPoller "${constants.DECL.SYSTEM_NAME}" response:`, { data });
                                assert.isArray(data, 'should be array');
                                assert.isNotEmpty(data, 'should have at least one element');
                                // read schema and validate data
                                data = data[0];
                                const schema = miscUtils.readJsonFile(constants.DECL.SYSTEM_POLLER_SCHEMA);
                                const valid = miscUtils.validateAgainstSchema(data, schema);
                                if (valid !== true) {
                                    assert.fail(`output is not valid: ${JSON.stringify(valid.errors)}`);
                                }
                            }));
                    });

                    describe('advanced options', () => {
                        ifNoNamespaceIt('should apply configuration containing system poller filtering', testSetup, () => miscUtils.readJsonFile(constants.DECL.FILTER, true)
                            .then((decl) => defaultTelemetry.declare(decl))
                            .then((data) => {
                                bigip.logger.info('POST declaration:', { data });
                                assert.deepStrictEqual(data.message, 'success', 'should return successful response');
                                // wait 0.5s in case if config was not applied yet
                                return promiseUtils.sleep(500);
                            })
                            .then(() => namespaceTelemetry.getSystemPollerData(constants.DECL.SYSTEM_NAME))
                            .then((data) => {
                                bigip.logger.info(`SystemPoller "${constants.DECL.SYSTEM_NAME}" response:`, { data });
                                assert.isArray(data, 'should be array');
                                assert.isNotEmpty(data, 'should have at least one element');
                                // verify that certain data was filtered out, while other data was preserved
                                data = data[0];
                                assert.deepStrictEqual(Object.keys(data.system).indexOf('provisioning'), -1);
                                assert.deepStrictEqual(Object.keys(data.system.diskStorage).indexOf('/usr'), -1);
                                assert.notStrictEqual(Object.keys(data.system.diskStorage).indexOf('/'), -1);
                                assert.notStrictEqual(Object.keys(data.system).indexOf('version'), -1);
                                assert.notStrictEqual(Object.keys(data.system).indexOf('hostname'), -1);
                            }));

                        ifNoNamespaceIt('should apply configuration containing chained system poller actions', testSetup, () => miscUtils.readJsonFile(constants.DECL.ACTION_CHAINING, true)
                            .then((decl) => defaultTelemetry.declare(decl))
                            .then((data) => {
                                bigip.logger.info('POST declaration:', { data });
                                assert.deepStrictEqual(data.message, 'success', 'should return successful response');
                                // wait 0.5s in case if config was not applied yet
                                return promiseUtils.sleep(500);
                            })
                            .then(() => namespaceTelemetry.getSystemPollerData(constants.DECL.SYSTEM_NAME))
                            .then((data) => {
                                bigip.logger.info(`SystemPoller "${constants.DECL.SYSTEM_NAME}" response:`, { data });
                                assert.isArray(data, 'should be array');
                                assert.isNotEmpty(data, 'should have at least one element');
                                // verify /var is included with, with 1_tagB removed
                                data = data[0];
                                assert.notStrictEqual(Object.keys(data.system.diskStorage).indexOf('/var'), -1);
                                assert.deepStrictEqual(data.system.diskStorage['/var']['1_tagB'], { '1_valueB_1': 'value1' });
                                // verify /var/log is included with, with 1_tagB included
                                assert.deepStrictEqual(Object.keys(data.system.diskStorage['/var/log']).indexOf('1_tagB'), -1);
                                assert.deepStrictEqual(data.system.diskStorage['/var/log']['1_tagA'], 'myTag');
                            }));

                        ifNoNamespaceIt('should apply configuration containing filters with ifAnyMatch', testSetup, () => miscUtils.readJsonFile(constants.DECL.FILTERING_WITH_MATCHING, true)
                            .then((decl) => defaultTelemetry.declare(decl))
                            .then((data) => {
                                bigip.logger.info('POST declaration:', { data });
                                assert.deepStrictEqual(data.message, 'success', 'should return successful response');
                                // wait 0.5s in case if config was not applied yet
                                return promiseUtils.sleep(500);
                            })
                            .then(() => namespaceTelemetry.getSystemPollerData(constants.DECL.SYSTEM_NAME))
                            .then((data) => {
                                bigip.logger.info(`SystemPoller "${constants.DECL.SYSTEM_NAME}" response:`, { data });
                                assert.isArray(data, 'should be array');
                                assert.isNotEmpty(data, 'should have at least one element');
                                // verify that 'system' key and child objects are included
                                data = data[0];
                                assert.deepStrictEqual(Object.keys(data), ['system']);
                                assert.ok(Object.keys(data.system).length > 1);
                                // verify that 'system.diskStorage' is NOT excluded
                                assert.notStrictEqual(Object.keys(data.system).indexOf('diskStorage'), -1);
                            }));

                        ifNoNamespaceIt('should apply configuration containing multiple system pollers and endpointList', testSetup, () => miscUtils.readJsonFile(constants.DECL.ENDPOINTLIST, true)
                            .then((decl) => defaultTelemetry.declare(decl))
                            .then((data) => {
                                bigip.logger.info('POST declaration:', { data });
                                assert.deepStrictEqual(data.message, 'success', 'should return successful response');
                                // wait 0.5s in case if config was not applied yet
                                return promiseUtils.sleep(500);
                            })
                            .then(() => namespaceTelemetry.getSystemPollerData(constants.DECL.SYSTEM_NAME))
                            .then((data) => {
                                bigip.logger.info(`SystemPoller "${constants.DECL.SYSTEM_NAME}" response:`, { data });
                                assert.isArray(data, 'should be array');
                                assert.deepStrictEqual(data.length, 2, 'should have two elements');

                                const pollerOneData = data[0];
                                const pollerTwoData = data[1];
                                assert.notStrictEqual(pollerOneData.custom_ipOther, undefined);
                                assert.notStrictEqual(pollerOneData.custom_dns, undefined);
                                assert.ok(pollerTwoData.custom_provisioning.items.length > 0);
                            }));
                    });
                });
            });
        });
    });
}

/**
 * Teardown DUTs
 */
function teardown() {
    const cmd = `cat ${pathUtil.join(constants.BIGIP.RESTNODED.LOGS_DIR, '*.log')} | grep telemetry`;
    const harness = harnessUtils.getDefaultHarness();
    const getLogFilePath = (bigip) => `${constants.ARTIFACTS_DIR}/restnoded_${bigip.name}__${bigip.host.host}.log`;
    const regexp = /\[telemetry][\S\s]*error/i;

    harness.bigip.forEach((bigip) => {
        describe(`Cleanup DUT - ${bigip.name}`, () => {
            let logFilePath;

            before(() => {
                logFilePath = getLogFilePath(bigip);
                bigip.logger.info('Path to save restnoded logs:', { logFilePath });
            });

            // grab restnoded log - useful during test failures
            // interested only in lines with 'telemetry'
            it('should get restnoded log', () => bigip.icAPI.default.runBashCmd(cmd)
                .then((response) => {
                    bigip.logger.info('Saving restnoded logs to:', { logFilePath });
                    fs.writeFileSync(logFilePath, response.commandResult);
                }));

            it('should check restnoded log for errors in [telemetry] messages', () => new Promise((resolve, reject) => {
                let errCounter = 0;
                const rl = readline.createInterface({
                    input: fs.createReadStream(logFilePath)
                });
                rl.on('line', (line) => {
                    if (regexp.test(line)) {
                        errCounter += 1;
                    }
                });
                rl.on('close', () => {
                    if (errCounter) {
                        reject(new Error(`${errCounter} error messages were found in ${logFilePath}`));
                    } else {
                        resolve();
                    }
                });
            }));

            testUtils.shouldRemovePreExistingTSPackage(bigip);

            it('teardown all connections', () => bigip.teardown());
        });
    });
}

module.exports = {
    setup,
    test,
    teardown
};
