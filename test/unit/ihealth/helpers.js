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

const os = require('os');

const assert = require('../shared/assert');
const dummies = require('../shared/dummies');

const localhost = 'localhost';
const oneHour = 60 * 60 * 1000; // 1h in ms;
const now = Date.now();
const dayOfWeek = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday'
};
let userID = 0;

function getHM(date) {
    return `${date.getHours()}:${date.getMinutes()}`;
}

function makeProxy({ full = false, auth = false, userOnly = false } = {}) {
    let ret = { host: 'remoteproxy.host' };
    if (full) {
        ret = Object.assign(ret, {
            protocol: 'https',
            port: 443,
            allowSelfSignedCert: true,
            enableHostConnectivityCheck: false
        });
    }
    if (auth || userOnly) {
        userID += 1;
        ret.username = `test_user_${userID}`;
        if (!userOnly) {
            ret.passphrase = {
                cipherText: `test_passphrase_${userID}`
            };
        }
    }
    return ret;
}

function getTimeWindow(startd) {
    return [
        new Date(startd + oneHour * 2),
        new Date(startd + oneHour * 4)
    ];
}

function getNextExecWindow(frequency, forward = 0) {
    let startd;
    if (frequency === 'daily') {
        startd = (new Date(now + forward * oneHour * 24));
    } else if (frequency === 'weekly') {
        // set for tomorrow
        startd = (new Date(now + 24 * oneHour + forward * 7 * oneHour * 24));
    } else if (frequency === 'monthly') {
        // set for tomorrow
        startd = new Date(now + 24 * oneHour);

        if (forward) {
            const originDay = startd.getUTCDate();
            startd.setDate(1);
            startd.setMonth(startd.getMonth() + forward + 1);
            startd.setDate(0);

            if (startd.getDate() > originDay) {
                startd.setDate(originDay);
            }
        }
    }
    const tw = getTimeWindow(startd.getTime());
    tw[0].setUTCMilliseconds(0);
    tw[1].setUTCMilliseconds(0);

    return tw;
}

function ihealthPoller({
    dayNo = false,
    dayStr = false,
    downloadFolder = os.tmpdir(),
    enable = true,
    frequency = 'daily',
    proxy = undefined,
    trace = false
} = {}) {
    const tw = getNextExecWindow(frequency);
    const interval = {
        frequency,
        timeWindow: {
            start: getHM(tw[0]),
            end: getHM(tw[1])
        }
    };

    if (frequency === 'weekly') {
        if (dayNo) {
            interval.day = tw[0].getDay();
        }
        if (dayStr) {
            interval.day = dayOfWeek[tw[0].getDay()];
        }
    } else if (frequency === 'monthly') {
        interval.day = tw[0].getDate();
    }

    userID += 1;
    const ret = dummies.declaration.ihealthPoller.minimal.decrypted({
        enable,
        trace,
        username: `test_user_${userID}`,
        passphrase: {
            cipherText: `test_passphrase_${userID}`
        },
        downloadFolder,
        interval
    });

    if (proxy) {
        ret.proxy = makeProxy(proxy);
    }

    return ret;
}

function system(options = {}) {
    const ret = dummies.declaration.system.minimal.decrypted();
    [
        'allowSelfSignedCert',
        'enable',
        'host',
        'port',
        'protocol',
        'trace'
    ].forEach((prop) => {
        if (typeof options[prop] !== 'undefined') {
            ret[prop] = options[prop];
        }
    });

    if (options.username === true || options.passphrase === true) {
        userID += 1;
        ret.username = `test_user_${userID}`;
    }
    if (options.passphrase === true) {
        ret.passphrase = {
            cipherText: `test_passphrase_${userID}`
        };
    }
    return ret;
}

function checkBigIpRequests(declaration, spies) {
    // ignore secrets encryption requests
    const secretsURI = '/mgmt/tm/ltm/auth/radius-server';
    const host = declaration.system.host || localhost;

    let allowSelfSignedCert = declaration.system.allowSelfSignedCert;
    if (typeof allowSelfSignedCert === 'undefined') {
        allowSelfSignedCert = false;
    }

    const props = {
        strictSSL: !allowSelfSignedCert
    };

    let numbOfRequests = 0;
    const numOfChecks = Object.assign({}, props);
    Object.keys(numOfChecks).forEach((key) => {
        numOfChecks[key] = 0;
    });

    Object.entries(spies).forEach(([key, spy]) => {
        if (spy.callCount !== 0) {
            spy.args.forEach((args) => {
                if (args[0].uri.includes(host) && !args[0].uri.includes(secretsURI)) {
                    numbOfRequests += 1;
                    Object.entries(props).forEach(([name, expected]) => {
                        const actual = args[0][name];
                        assert.deepStrictEqual(actual, expected, `request.${key} should use ${name} = ${expected}, got ${actual}`);
                        numOfChecks[name] += 1;
                    });
                }
            });
        }
    });

    if (numbOfRequests > 0) {
        Object.keys(numOfChecks).forEach((key) => {
            assert.isAbove(numOfChecks[key], 0);
        });
    }
}

function checkIHealthRequests(declaration, spies) {
    const host = '.f5.com';
    const props = {
        proxy: undefined,
        strictSSL: true
    };
    if (declaration.ihealthPoller.proxy) {
        const proxyDecl = declaration.ihealthPoller.proxy;
        if (typeof proxyDecl.allowSelfSignedCert === 'boolean') {
            props.strictSSL = !proxyDecl.allowSelfSignedCert;
        }
        if (proxyDecl.username) {
            props.proxy = proxyDecl.username;
            if (proxyDecl.passphrase) {
                props.proxy = `${props.proxy}:${proxyDecl.passphrase.cipherText}`;
            }
            props.proxy = `${props.proxy}@`;
        }
        props.proxy = `${proxyDecl.protocol || 'http'}://${props.proxy || ''}${proxyDecl.host}:${proxyDecl.port || 80}`;
    }

    let numbOfRequests = 0;
    const numOfChecks = Object.assign({}, props);
    Object.keys(numOfChecks).forEach((key) => {
        numOfChecks[key] = 0;
    });

    Object.entries(spies).forEach(([key, spy]) => {
        if (spy.callCount !== 0) {
            spy.args.forEach((args) => {
                if (args[0].uri.includes(host)) {
                    numbOfRequests += 1;
                    Object.entries(props).forEach(([name, expected]) => {
                        const actual = args[0][name];
                        assert.deepStrictEqual(actual, expected, `request.${key} should use ${name} = ${expected}, got ${actual}`);
                        numOfChecks[name] += 1;
                    });
                }
            });
        }
    });

    if (numbOfRequests > 0) {
        Object.keys(numOfChecks).forEach((key) => {
            assert.isAbove(numOfChecks[key], 0);
        });
    }
}

function attachPoller(pollerConfig, systemConfig) {
    if (!systemConfig) {
        systemConfig = system();
    }

    systemConfig.iHealthPoller = 'ihealthPoller';

    return {
        ihealthPoller: pollerConfig,
        system: systemConfig
    };
}

function getDeclaration({
    downloadFolder = undefined,
    enable = true,
    intervalConf = {},
    proxyConf = {},
    systemAuthConf = {},
    systemConf = {},
    trace = false
} = {}) {
    return attachPoller(
        ihealthPoller(
            Object.assign(
                {
                    downloadFolder,
                    enable,
                    proxy: proxyConf.value,
                    trace
                },
                intervalConf.value
            )
        ),
        system(
            Object.assign(
                {
                    enable,
                    trace
                },
                systemConf.value || {},
                systemAuthConf.value || {}
            )
        )
    );
}

module.exports = {
    attachPoller,
    checkBigIpRequests,
    checkIHealthRequests,
    getDeclaration,
    getNextExecWindow,
    ihealthPoller,
    makeProxy,
    system
};
