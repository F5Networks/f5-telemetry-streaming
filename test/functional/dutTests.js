/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

// this object not passed with lambdas, which mocha uses

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const net = require('net');
const readline = require('readline');
const util = require('./shared/util');
const constants = require('./shared/constants');
const DEFAULT_UNNAMED_NAMESPACE = require('../../src/lib/constants').DEFAULT_UNNAMED_NAMESPACE;

chai.use(chaiAsPromised);
const assert = chai.assert;

const duts = util.getHosts('BIGIP');
const packageDetails = util.getPackageDetails();
const basicDeclaration = JSON.parse(fs.readFileSync(constants.DECL.BASIC));
const namespaceDeclaration = JSON.parse(fs.readFileSync(constants.DECL.BASIC_NAMESPACE));

/**
 * Post declaration to TS on DUT
 *
 * @param {Object} dut          - DUT (device under test) object
 * @param {String} dut.ip       - host
 * @param {String} dut.user     - username
 * @param {String} dut.password - password
 * @param {String} dut.hostname - hostname
 * @param {Object} declaration  - declaration to send to TS
 *
 * @returns {Object} Promise resolved when request succeed
 */
function postDeclarationToDUT(dut, declaration) {
    util.logger.info(`Going to send following declaration to host ${dut.hostname}`, declaration);
    return util.postDeclaration(dut, declaration)
        .then((data) => {
            assert.strictEqual(data.message, 'success');
        });
}

/**
 * Post declaration to TS on DUTs
 *
 * @param {Function} callback - callback, should return declaration
 *
 * @returns {Object} Promise resolved when all requests succeed
 */
function postDeclarationToDUTs(callback) {
    return Promise.all(duts.map((dut) => postDeclarationToDUT(dut, callback(dut))));
}

/**
 * Send message(s) to TS Event Listener
 *
 * @param {Object}  dut             - DUT (device under test) object
 * @param {String}  dut.ip          - host
 * @param {String}  message         - message to send
 * @param {Object}  [opts]          - options
 * @param {Integer} [opts.numOfMsg] - number of messages to send, by default 15
 * @param {Integer} [opts.delay]    - delay (in ms) before sending next message, by default 4000ms
 *
 * @returns {Object} Promise resolved when all messages were sent to Event Listener
 */
function sendDataToEventListener(dut, message, opts) {
    opts = opts || {};
    opts.numOfMsg = typeof opts.numOfMsg === 'undefined' ? 15 : opts.numOfMsg;
    opts.delay = typeof opts.delay === 'undefined' ? 4000 : opts.delay;

    util.logger.info(`Sending ${opts.numOfMsg} messages to Event Listener ${dut.ip}`);
    return new Promise((resolve, reject) => {
        function sendData(i) {
            if (i >= opts.numOfMsg) {
                resolve();
                return;
            }
            new Promise((timeoutResolve) => setTimeout(timeoutResolve, opts.delay))
                .then(() => util.sendEvent(dut.ip, message))
                .then(() => sendData(i + 1))
                .catch(reject);
        }
        sendData(0);
    });
}

/**
 * Send data to TS Event Listener on DUTs
 *
 * @param {Function} callback  - callback, should return data
 * @param {Number}  [numOfMsg] - number of messages to send, by default 15
 * @param {Number}  [delay]    - delay (in ms) before sending next message, by default 4000ms
 *
 * @returns {Object} Promise resolved when all messages were sent to Event Listeners
 */
function sendDataToEventListeners(callback, numOfMsg, delay) {
    return Promise.all(duts.map((dut) => sendDataToEventListener(dut, callback(dut), { numOfMsg, delay })));
}

/**
 * Query a given PullConsumer for data.
 *
 * @param {Object}  dut                     - Device Under Test object
 * @param {String}  pullConsumerName        - Name of the configured Pull Consumer
 * @param {String}  [options.namespace]     - Optional namespace name
 * @param {Boolean} [options.rawResponse]   - Whether or not to return full HTTP response, or just the HTTP body
 *
 * @returns {Object} Promise resolved with HTTP body, or full HTTP response
 */
function getPullConsumerData(dut, pullConsumerName, options) {
    options = options || {};
    const namespacePath = options.namespace ? `/namespace/${options.namespace}` : '';
    const rawResponse = options.rawResponse;
    const uri = `${constants.BASE_ILX_URI}${namespacePath}/pullconsumer/${pullConsumerName}`;
    const host = dut.ip;
    const user = dut.username;
    const password = dut.password;

    return util.getAuthToken(host, user, password)
        .then((data) => {
            const postOptions = {
                method: 'GET',
                headers: {
                    'x-f5-auth-token': data.token
                },
                rawResponse
            };
            return util.makeRequest(host, uri, postOptions);
        });
}

/**
 * Fetch System Poller data from DUT
 *
 * @param {Object} dut          - DUT (device under test) object
 * @param {String} dut.ip       - host
 * @param {String} dut.user     - username
 * @param {String} dut.password - password
 *
 * @returns {Object} Promise resolved when request succeed
 */
function getSystemPollerData(dut, sysPollerName) {
    const uri = `${constants.BASE_ILX_URI}/systempoller/${sysPollerName}`;
    const host = dut.ip;
    const user = dut.username;
    const password = dut.password;

    return util.getAuthToken(host, user, password)
        .then((data) => {
            const postOptions = {
                method: 'GET',
                headers: {
                    'x-f5-auth-token': data.token
                }
            };
            return util.makeRequest(host, uri, postOptions);
        });
}

/**
 * Fetch System Poller data from DUTs
 *
 * @param {Function} callback - callback(hostObj, data)
 *
 * @returns {Object} Promise resolved when all requests succeed
 */
function getSystemPollersData(callback) {
    return Promise.all(duts.map(
        (dut) => getSystemPollerData(dut, constants.DECL.SYSTEM_NAME)
            .then((data) => callback(dut, data))
    ));
}

/**
 * Uninstall all TS packages
 *
 * @param {String} host      - host
 * @param {String} authToken - auth token
 * @param {Object} options   - request options
 *
 * @returns Promise resolved once TS packages removed from F5 device
 */
function uninstallAllTSpackages(host, authToken, options) {
    const uri = `${constants.BASE_ILX_URI}/info`;
    let error;
    let data;

    return util.getInstalledPackages(host, authToken)
        .then((installedPackages) => Promise.all(installedPackages
            .filter((pkg) => pkg.packageName.includes('f5-telemetry'))
            .map((pkg) => util.uninstallPackage(host, authToken, pkg.packageName))))
        .then(() => util.makeRequest(host, uri, options))
        .then((resp) => {
            data = resp;
        })
        .catch((err) => {
            error = err;
        })
        .then(() => {
            if (data) {
                throw new Error(`Unexpected response from ${uri}: ${JSON.stringify(data)}`);
            }
            if (error && error.statusCode !== 404) {
                throw new Error(`Expected HTTP 404 Not Found. Actual error ${error}`);
            }
        });
}

function setup() {
    // get package details
    const packageFile = packageDetails.name;
    const packagePath = packageDetails.path;
    util.logger.info(`Package File to install on DUT: ${packageFile} [${packagePath}]`);

    // create logs directory - used later
    util.createDir(constants.ARTIFACTS_DIR);

    // account for 1+ DUTs
    duts.forEach((item) => {
        describe(`DUT setup - ${item.hostname}`, () => {
            const host = item.ip;
            const user = item.username;
            const password = item.password;

            let authToken = null;
            let options = {};

            before(() => util.getAuthToken(host, user, password)
                .then((data) => {
                    authToken = data.token;
                }));

            beforeEach(() => {
                options = {
                    headers: {
                        'x-f5-auth-token': authToken
                    }
                };
            });

            it('should remove pre-existing TS declaration', () => {
                const uri = `${constants.BASE_ILX_URI}/declare`;
                const postOptions = {
                    method: 'POST',
                    headers: options.headers,
                    body: {
                        class: 'Telemetry'
                    }
                };
                let data;
                let error;

                return util.makeRequest(host, uri, postOptions)
                    .then((resp) => {
                        data = resp;
                        util.logger.info('Existing declaration:', { host, data });
                    })
                    .catch((err) => {
                        error = err;
                    })
                    .then(() => {
                        // silently skip error - probably no TS package installed
                        if (error) {
                            return Promise.resolve();
                        }
                        assert.strictEqual(data.message, 'success');
                        // wait for 5 secs while declaration will be saved to storage
                        return util.sleep(5000);
                    });
            });

            it('should remove pre-existing TS packages', () => uninstallAllTSpackages(host, authToken, options));

            it('should erase restnoded log', () => {
                const uri = '/mgmt/tm/util/bash';
                const postOptions = {
                    method: 'POST',
                    headers: options.headers,
                    body: JSON.stringify({
                        command: 'run',
                        utilCmdArgs: '-c "> /var/log/restnoded/restnoded.log"'
                    })
                };
                return util.makeRequest(host, uri, postOptions);
            });

            it('should install package', () => {
                const fullPath = `${packagePath}/${packageFile}`;
                return util.installPackage(host, authToken, fullPath)
                    .then(() => {});
            });

            it('should verify installation', () => {
                const uri = `${constants.BASE_ILX_URI}/info`;

                return new Promise((resolve) => setTimeout(resolve, 5000))
                    .then(() => util.makeRequest(host, uri, options))
                    .then((data) => {
                        data = data || {};
                        util.logger.info(`${uri} response`, { host, data });
                        assert.notStrictEqual(data.version, undefined);
                    })
                    .catch((err) => {
                        util.logger.error(`Unable to verify package installation due following error: ${err}`);
                        return Promise.reject(err);
                    });
            });

            it('should configure firewall rules', () => {
                // BIGIP 14.1+ only:
                // to reach listener via mgmt IP might require allowing through host fw
                // using below command (or similar):
                // tmsh modify security firewall management-ip-rules rules replace-all-with { telemetry
                // { place-before first ip-protocol tcp destination {
                // ports replace-all-with { 6514 } } action accept } }
                const uri = '/mgmt/tm/security/firewall/management-ip-rules/rules';
                const ruleName = 'telemetry';
                let passOnError = false;

                return util.makeRequest(host, uri, options)
                    .catch((error) => {
                        // older versions of BIG-IP do not have security enabled by default
                        const errMsg = error.message;
                        // just info the user that something unexpected happened but still trying to proceed
                        if (!errMsg.includes('must be licensed')) {
                            util.logger.error(
                                `Unable to configure management-ip rules, continue with current config. Error message: ${error.message}`,
                                { host }
                            );
                        }
                        passOnError = true;
                        return Promise.reject(error);
                    })
                    .then(() => util.makeRequest(host, uri, options))
                    .then((data) => {
                        // check if rule already exists
                        if (data.items.some((i) => i.name === ruleName) === true) {
                            // exists, delete the rule
                            const deleteOptions = {
                                method: 'DELETE',
                                headers: options.headers
                            };
                            return util.makeRequest(host, `${uri}/${ruleName}`, deleteOptions);
                        }
                        return Promise.resolve();
                    })
                    .then(() => {
                        // create rule
                        const body = JSON.stringify({
                            name: ruleName,
                            'place-before': 'first',
                            action: 'accept',
                            ipProtocol: 'tcp',
                            destination: {
                                ports: [
                                    constants.EVENT_LISTENER_DEFAULT_PORT,
                                    constants.EVENT_LISTENER_SECONDARY_PORT,
                                    constants.EVENT_LISTENER_NAMESPACE_PORT,
                                    constants.EVENT_LISTENER_NAMESPACE_SECONDARY_PORT
                                ].map((port) => ({ name: String(port) }))
                            }
                        });
                        const postOptions = {
                            method: 'POST',
                            headers: options.headers,
                            body
                        };
                        return util.makeRequest(host, uri, postOptions);
                    })
                    .catch((err) => {
                        if (passOnError === true) {
                            return Promise.resolve();
                        }
                        return Promise.reject(err);
                    });
            });
        });
    });
}

function test() {
    const tests = [
        {
            name: 'basic declaration - default (no namespace)'
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
            namespace: DEFAULT_UNNAMED_NAMESPACE
        },
        {
            name: 'basic declaration - namespace endpoint',
            namespace: constants.DECL.NAMESPACE_NAME,
            useNamespaceDeclare: true
        }
    ];

    function getDeclToUse(testSetup) {
        let declaration = util.deepCopy(basicDeclaration);
        if (testSetup.name.startsWith('mixed')) {
            declaration.My_Namespace = util.deepCopy(namespaceDeclaration.My_Namespace);
        } else if (testSetup.useNamespaceDeclare) {
            declaration = util.deepCopy(namespaceDeclaration.My_Namespace);
        } else if (testSetup.namespace && testSetup.namespace !== DEFAULT_UNNAMED_NAMESPACE) {
            declaration = util.deepCopy(namespaceDeclaration);
        }
        return declaration;
    }

    // Selectively skip tests if the testSetup uses Namespaces
    // Tests that validate more complex SystemPoller logic can be skipped when only testing Namespace logic
    function ifNoNamespaceIt(title, testSetup, testFunc) {
        return testSetup.namespace ? it.skip(title, testFunc) : it(title, testFunc);
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
            assert.strictEqual(cipherText.startsWith('$M'), true, 'cipherText should start with $M$');
        });
        assert.notStrictEqual(secretsFound, 0, 'Expected at least 1 cipherText field');
    }

    function removeCipherTexts(data) {
        searchCipherTexts(data, () => 'replacedSecret');
    }

    tests.forEach((testSetup) => {
        describe(`${testSetup.name}`, () => {
            const namespacePath = testSetup.namespace ? `/namespace/${testSetup.namespace}` : '';

            duts.forEach((item) => {
                describe(`DUT test - ${item.hostname}`, () => {
                    const host = item.ip;
                    const user = item.username;
                    const password = item.password;

                    let authToken = null;
                    let options = {};

                    before(() => util.getAuthToken(host, user, password)
                        .then((data) => {
                            authToken = data.token;
                        }));

                    beforeEach(() => {
                        options = {
                            headers: {
                                'x-f5-auth-token': authToken
                            }
                        };
                    });

                    describe('basic checks', () => {
                        it('should post same configuration twice and get it after', () => {
                            const uri = testSetup.useNamespaceDeclare ? `${constants.BASE_ILX_URI}${namespacePath}/declare` : `${constants.BASE_ILX_URI}/declare`;
                            const postOptions = Object.assign(util.deepCopy(options), {
                                method: 'POST',
                                body: getDeclToUse(testSetup)
                            });
                            let postResponses = [];

                            // wait 2s to buffer consecutive POSTs
                            return util.sleep(2000)
                                .then(() => util.makeRequest(host, uri, util.deepCopy(postOptions)))
                                .then((data) => {
                                    util.logger.info('POST request #1: Declaration response:', { host, data });
                                    assert.strictEqual(data.message, 'success');

                                    checkPassphraseObject(data);
                                    postResponses.push(data);
                                    // wait for 5 secs while declaration will be applied and saved to storage
                                    return util.sleep(5000);
                                })
                                .then(() => util.makeRequest(host, uri, util.deepCopy(postOptions)))
                                .then((data) => {
                                    util.logger.info('POST request #2: Declaration response:', { host, data });
                                    assert.strictEqual(data.message, 'success');

                                    checkPassphraseObject(data);
                                    postResponses.push(data);

                                    // wait for 5 secs while declaration will be applied and saved to storage
                                    return util.sleep(5000);
                                })
                                .then(() => util.makeRequest(host, uri, util.deepCopy(options)))
                                .then((data) => {
                                    util.logger.info('GET request: Declaration response:', { host, data });
                                    assert.strictEqual(data.message, 'success');

                                    checkPassphraseObject(data);
                                    postResponses.push(data);

                                    // compare GET to recent POST
                                    assert.deepStrictEqual(postResponses[2], postResponses[1]);
                                    // lest compare first POST to second POST (only one difference is secrets)
                                    postResponses = postResponses.map(removeCipherTexts);
                                    assert.deepStrictEqual(postResponses[0], postResponses[1]);
                                })
                                .then(() => {
                                    if (testSetup.useNamespaceDeclare) {
                                        util.logger.info('Additional test for namespace endpoint - verify full declaration');
                                        const url = `${constants.BASE_ILX_URI}/declare`;

                                        return util.makeRequest(host, url, util.deepCopy(options))
                                            .then((data) => {
                                                util.logger.info('GET request: Declaration response', { host, data });
                                                assert.strictEqual(data.message, 'success');
                                                // verify merged decl
                                                assert.isTrue(typeof data.declaration[constants.DECL.NAMESPACE_NAME] !== 'undefined'); // named namespace
                                                assert.isTrue(typeof data.declaration[constants.DECL.SYSTEM_NAME] !== 'undefined'); // default namespace
                                            });
                                    }
                                    return Promise.resolve();
                                });
                        });

                        it('should get response from systempoller endpoint', () => {
                            const uri = `${constants.BASE_ILX_URI}${namespacePath}/systempoller/${constants.DECL.SYSTEM_NAME}`;
                            // wait 500ms in case if config was not applied yet
                            return util.sleep(500)
                                .then(() => util.makeRequest(host, uri, options))
                                .then((data) => {
                                    data = data || [];
                                    util.logger.info(`SystemPoller response (${uri}):`, { host, data });
                                    assert.strictEqual(data.length, 1);
                                    // read schema and validate data
                                    data = data[0];
                                    const schema = JSON.parse(fs.readFileSync(constants.DECL.SYSTEM_POLLER_SCHEMA));
                                    const valid = util.validateAgainstSchema(data, schema);
                                    if (valid !== true) {
                                        assert.fail(`output is not valid: ${JSON.stringify(valid.errors)}`);
                                    }
                                });
                        });

                        it('should ensure event listener is up', () => {
                            const connectToEventListener = (port) => new Promise((resolve, reject) => {
                                const client = net.createConnection({ host, port }, () => {
                                    client.end();
                                });
                                client.on('end', () => {
                                    resolve();
                                });
                                client.on('error', (err) => {
                                    reject(new Error(`Can not connect to TCP port ${port}: ${err}`));
                                });
                            });

                            // ports = { opened: [], closed: [] }
                            const checkPorts = (ports) => Promise.all(
                                (ports.opened || []).map(
                                    (openedPort) => assert.isFulfilled(connectToEventListener(openedPort))
                                ).concat(
                                    (ports.closed || []).map(
                                        (closedPort) => connectToEventListener(closedPort)
                                            .then(
                                                () => Promise.reject(new Error(`Port ${closedPort} expected to be closed`)),
                                                () => {} // do nothing on catch
                                            )
                                    )
                                )
                            );

                            const findListeners = (obj, cb) => {
                                if (typeof obj === 'object') {
                                    if (obj.class === 'Telemetry_Listener') {
                                        cb(obj);
                                    } else {
                                        Object.keys(obj).forEach((key) => findListeners(obj[key], cb));
                                    }
                                }
                            };

                            const fetchListenerPorts = (decl) => {
                                const ports = [];
                                findListeners(decl, (listener) => ports.push(listener.port || 6514));
                                return ports;
                            };

                            const allListenerPorts = [
                                constants.EVENT_LISTENER_DEFAULT_PORT,
                                constants.EVENT_LISTENER_SECONDARY_PORT,
                                constants.EVENT_LISTENER_NAMESPACE_PORT,
                                constants.EVENT_LISTENER_NAMESPACE_SECONDARY_PORT
                            ];
                            const newPorts = [
                                constants.EVENT_LISTENER_SECONDARY_PORT,
                                constants.EVENT_LISTENER_NAMESPACE_SECONDARY_PORT
                            ];

                            const uri = testSetup.useNamespaceDeclare ? `${constants.BASE_ILX_URI}${namespacePath}/declare` : `${constants.BASE_ILX_URI}/declare`;
                            const postOptions = Object.assign(util.deepCopy(options), {
                                method: 'POST',
                                body: testSetup.useNamespaceDeclare ? { class: 'Telemetry_Namespace' } : { class: 'Telemetry' }
                            });
                            return util.makeRequest(host, uri, util.deepCopy(postOptions))
                                .then(() => checkPorts({
                                    closed: util.deepCopy(allListenerPorts)
                                }))
                                .then(() => {
                                    postOptions.body = getDeclToUse(testSetup);
                                    return util.makeRequest(host, uri, util.deepCopy(postOptions));
                                })
                                .then(() => {
                                    const ports = { opened: fetchListenerPorts(postOptions.body) };
                                    ports.closed = allListenerPorts.filter((port) => ports.opened.indexOf(port) === -1);
                                    return checkPorts(ports);
                                })
                                // post declaration again and check that listeners are still available
                                .then(() => util.makeRequest(host, uri, util.deepCopy(postOptions)))
                                .then(() => {
                                    const ports = { opened: fetchListenerPorts(postOptions.body) };
                                    ports.closed = allListenerPorts.filter((port) => ports.opened.indexOf(port) === -1);
                                    return checkPorts(ports);
                                })
                                .then(() => {
                                    let idx = 0;
                                    // already a copy
                                    postOptions.body = getDeclToUse(testSetup);
                                    // disable all listeners
                                    findListeners(postOptions.body, (listener) => {
                                        if (idx >= newPorts.length) {
                                            throw new Error(`Expected ${newPorts.length} listeners only`);
                                        }
                                        listener.port = newPorts[idx];
                                        idx += 1;
                                    });
                                    return util.makeRequest(host, uri, util.deepCopy(postOptions));
                                })
                                .then(() => {
                                    const ports = { opened: fetchListenerPorts(postOptions.body) };
                                    ports.closed = allListenerPorts.filter((port) => ports.opened.indexOf(port) === -1);
                                    return checkPorts(ports);
                                })
                                // post declaration again and check that listeners are still available
                                .then(() => util.makeRequest(host, uri, util.deepCopy(postOptions)))
                                .then(() => {
                                    const ports = { opened: fetchListenerPorts(postOptions.body) };
                                    ports.closed = allListenerPorts.filter((port) => ports.opened.indexOf(port) === -1);
                                    return checkPorts(ports);
                                })
                                .then(() => {
                                    // already a copy
                                    postOptions.body = getDeclToUse(testSetup);
                                    // disable all listeners
                                    findListeners(postOptions.body, (listener) => {
                                        listener.enable = false;
                                    });
                                    return util.makeRequest(host, uri, util.deepCopy(postOptions));
                                })
                                .then(() => checkPorts({
                                    closed: util.deepCopy(allListenerPorts)
                                }));
                        });
                    });

                    describe('advanced options', () => {
                        ifNoNamespaceIt('should apply configuration containing system poller filtering', testSetup, () => {
                            let uri = `${constants.BASE_ILX_URI}/declare`;
                            const postOptions = Object.assign(util.deepCopy(options), {
                                method: 'POST',
                                body: fs.readFileSync(constants.DECL.FILTER).toString()
                            });

                            // wait 2s to buffer consecutive POSTs
                            return util.sleep(2000)
                                .then(() => util.makeRequest(host, uri, postOptions))
                                .then((data) => {
                                    util.logger.info('Declaration response:', { host, data });
                                    assert.strictEqual(data.message, 'success');
                                    // wait 5s in case if config was not applied yet
                                    return util.sleep(5000);
                                })
                                .then(() => {
                                    uri = `${constants.BASE_ILX_URI}${namespacePath}/systempoller/${constants.DECL.SYSTEM_NAME}`;
                                    return util.makeRequest(host, uri, util.deepCopy(options));
                                })
                                .then((data) => {
                                    data = data || [];
                                    util.logger.info(`Filtered SystemPoller response (${uri}):`, { host, data });

                                    assert.strictEqual(data.length, 1);
                                    // verify that certain data was filtered out, while other data was preserved
                                    data = data[0];
                                    assert.strictEqual(Object.keys(data.system).indexOf('provisioning'), -1);
                                    assert.strictEqual(Object.keys(data.system.diskStorage).indexOf('/usr'), -1);
                                    assert.notStrictEqual(Object.keys(data.system.diskStorage).indexOf('/'), -1);
                                    assert.notStrictEqual(Object.keys(data.system).indexOf('version'), -1);
                                    assert.notStrictEqual(Object.keys(data.system).indexOf('hostname'), -1);
                                });
                        });

                        ifNoNamespaceIt('should apply configuration containing chained system poller actions', testSetup, () => {
                            let uri = `${constants.BASE_ILX_URI}/declare`;
                            const postOptions = Object.assign(util.deepCopy(options), {
                                method: 'POST',
                                body: fs.readFileSync(constants.DECL.ACTION_CHAINING).toString()
                            });

                            // wait 2s to buffer consecutive POSTs
                            return util.sleep(2000)
                                .then(() => util.makeRequest(host, uri, postOptions))
                                .then((data) => {
                                    util.logger.info('Declaration response:', { host, data });
                                    assert.strictEqual(data.message, 'success');
                                    // wait 5s in case if config was not applied yet
                                    return util.sleep(5000);
                                })
                                .then(() => {
                                    uri = `${constants.BASE_ILX_URI}${namespacePath}/systempoller/${constants.DECL.SYSTEM_NAME}`;
                                    return util.makeRequest(host, uri, util.deepCopy(options));
                                })
                                .then((data) => {
                                    data = data || {};
                                    util.logger.info(`Filtered SystemPoller response (${uri}):`, { host, data });

                                    assert.strictEqual(data.length, 1);
                                    data = data[0];
                                    // verify /var is included with, with 1_tagB removed
                                    assert.notStrictEqual(Object.keys(data.system.diskStorage).indexOf('/var'), -1);
                                    assert.deepEqual(data.system.diskStorage['/var']['1_tagB'], { '1_valueB_1': 'value1' });
                                    // verify /var/log is included with, with 1_tagB included
                                    assert.strictEqual(Object.keys(data.system.diskStorage['/var/log']).indexOf('1_tagB'), -1);
                                    assert.deepEqual(data.system.diskStorage['/var/log']['1_tagA'], 'myTag');
                                });
                        });

                        ifNoNamespaceIt('should apply configuration containing filters with ifAnyMatch', testSetup, () => {
                            let uri = `${constants.BASE_ILX_URI}/declare`;
                            const postOptions = Object.assign(util.deepCopy(options), {
                                method: 'POST',
                                body: fs.readFileSync(constants.DECL.FILTERING_WITH_MATCHING).toString()
                            });

                            // wait 2s to buffer consecutive POSTs
                            return util.sleep(2000)
                                .then(() => util.makeRequest(host, uri, postOptions))
                                .then((data) => {
                                    util.logger.info('Declaration response:', { host, data });
                                    assert.strictEqual(data.message, 'success');
                                    // wait 5s in case if config was not applied yet
                                    return util.sleep(5000);
                                })
                                .then(() => {
                                    uri = `${constants.BASE_ILX_URI}${namespacePath}/systempoller/${constants.DECL.SYSTEM_NAME}`;
                                    return util.makeRequest(host, uri, util.deepCopy(options));
                                })
                                .then((data) => {
                                    data = data || {};
                                    util.logger.info(`Filtered and Matched SystemPoller response (${uri}):`, { host, data });

                                    assert.strictEqual(data.length, 1);
                                    data = data[0];
                                    // verify that 'system' key and child objects are included
                                    assert.deepEqual(Object.keys(data), ['system']);
                                    assert.ok(Object.keys(data.system).length > 1);
                                    // verify that 'system.diskStorage' is NOT excluded
                                    assert.notStrictEqual(Object.keys(data.system).indexOf('diskStorage'), -1);
                                });
                        });

                        ifNoNamespaceIt('should apply configuration containing multiple system pollers and endpointList', testSetup, () => {
                            let uri = `${constants.BASE_ILX_URI}/declare`;
                            const postOptions = Object.assign(util.deepCopy(options), {
                                method: 'POST',
                                body: fs.readFileSync(constants.DECL.ENDPOINTLIST).toString()
                            });

                            // wait 2s to buffer consecutive POSTs
                            return util.sleep(2000)
                                .then(() => util.makeRequest(host, uri, postOptions))
                                .then((data) => {
                                    util.logger.info('Declaration response:', { host, data });
                                    assert.strictEqual(data.message, 'success');
                                    // wait 2s in case if config was not applied yet
                                    return util.sleep(2000);
                                })
                                .then(() => {
                                    uri = `${constants.BASE_ILX_URI}${namespacePath}/systempoller/${constants.DECL.SYSTEM_NAME}`;
                                    return util.makeRequest(host, uri, util.deepCopy(options));
                                })
                                .then((data) => {
                                    util.logger.info(`System Poller with endpointList response (${uri}):`, { host, data });
                                    assert.ok(Array.isArray(data));

                                    const pollerOneData = data[0];
                                    const pollerTwoData = data[1];
                                    assert.notStrictEqual(pollerOneData.custom_ipOther, undefined);
                                    assert.notStrictEqual(pollerOneData.custom_dns, undefined);
                                    assert.ok(pollerTwoData.custom_provisioning.items.length > 0);
                                });
                        });
                    });
                });
            });
        });
    });
}

function teardown() {
    // purpose: cleanup tests
    // account for 1+ DUTs
    duts.forEach((item) => {
        describe(`Cleanup DUT - ${item.hostname}`, () => {
            const host = item.ip;
            const user = item.username;
            const password = item.password;

            let authToken = null;
            let logFile = null;
            let options = {};

            before(() => util.getAuthToken(host, user, password)
                .then((data) => {
                    authToken = data.token;
                }));

            beforeEach(() => {
                options = {
                    headers: {
                        'x-f5-auth-token': authToken
                    }
                };
            });

            it('should get restnoded log', () => {
                // grab restnoded log - useful during test failures
                // interested only in lines with 'telemetry'
                const uri = '/mgmt/tm/util/bash';
                const postOptions = {
                    method: 'POST',
                    headers: options.headers,
                    body: JSON.stringify({
                        command: 'run',
                        utilCmdArgs: '-c "cat /var/log/restnoded/restnoded.log | grep telemetry"'
                    })
                };
                return util.makeRequest(host, uri, postOptions)
                    .then((data) => {
                        logFile = `${constants.ARTIFACTS_DIR}/restnoded_${host}.log`;
                        util.logger.info(`Saving restnoded log to ${logFile}`);
                        fs.writeFileSync(logFile, data.commandResult);
                    });
            });

            it('should check restnoded log for errors in [telemetry] messages', () => {
                let errCounter = 0;
                const regexp = new RegExp(/\[telemetry][\S\s]*error/, 'i');

                const rl = readline.createInterface({
                    input: fs.createReadStream(logFile)
                });
                rl.on('line', (line) => {
                    if (regexp.test(line)) {
                        errCounter += 1;
                    }
                });
                return new Promise((resolve) => {
                    rl.on('close', resolve);
                })
                    .then(() => {
                        if (errCounter) {
                            return Promise.reject(new Error(`${errCounter} error messages were found in ${logFile}`));
                        }
                        return Promise.resolve();
                    });
            });

            it('should remove existing TS packages', () => new Promise((resolve, reject) => {
                uninstallAllTSpackages(host, authToken, options)
                    .then(resolve)
                    .catch((err) => {
                        util.logger.info(`Unable to verify package uninstall due following error: ${err}`);
                        setTimeout(() => reject(err), 5000);
                    });
            }));
        });
    });
}

module.exports = {
    setup,
    test,
    teardown,
    utils: {
        getPullConsumerData,
        getSystemPollerData,
        getSystemPollersData,
        postDeclarationToDUT,
        postDeclarationToDUTs,
        sendDataToEventListener,
        sendDataToEventListeners
    }
};
