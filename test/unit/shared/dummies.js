/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const defaultsDeep = require('lodash/defaultsDeep');
const cloneDeep = require('lodash/cloneDeep');
const setByKey = require('lodash/set');

// TODO: add tests for this file later

/**
 * Merge data
 *
 * Note: this method mutates 'object'.
 *
 * @param {object} object - target object
 * @param {...object} [sources] - source objects
 *
 * @returns {object} object
 */
function mergeData(object) {
    if (arguments.length < 2) {
        return object;
    }
    const setValueToObj = pair => setByKey(object, pair.key, pair.value);
    for (let i = 1; i < arguments.length; i += 1) {
        const source = arguments[i];
        if (Array.isArray(source)) {
            /**
             * probably an array of objects { key: key, value: value }
             */
            source.forEach(setValueToObj);
        } else {
            const keys = Object.keys(source);
            if (keys.length === 2 && keys.indexOf('key') !== -1 && keys.indexOf('value') !== -1) {
                setValueToObj(source);
            } else {
                // use 'object' as defaults for 'source'
                object = defaultsDeep(source, object);
            }
        }
    }
    return object;
}

/**
 * Merge data
 *
 * Note: this method mutates 'object'.
 *
 * @param {object} object - target object
 * @param {...object} [sources] - source objects
 *
 * @returns {function} function that returns object
 */
function mergeArgsTo(object) {
    return function () {
        const args = [cloneDeep(object)].concat(cloneDeep(Array.from(arguments)));
        return mergeData.apply(null, args);
    };
}

/**
 * Create Tracer Config if needed
 *
 * Note: this method mutates 'component'.
 *
 * @param {Component} component - configuration component
 *
 * @returns {Component} with assigned TRacer config
 */
function assignTracerConfig(component) {
    if (typeof component.trace !== 'undefined') {
        const traceConfig = {
            enable: component.enable && !!component.trace,
            encoding: 'utf8',
            maxRecords: 10,
            path: `/var/tmp/telemetry/${component.class}.${component.traceName}`,
            type: 'output'
        };
        component.trace = typeof component.trace !== 'object' ? {} : component.trace;
        component.trace = defaultsDeep(component.trace, traceConfig);
    }
    return component;
}

/**
 * Generate Configuration Component
 *
 * @param {Component} componentDefaults - defaults for configuration component
 *
 * @returns {function<Component>} function that returns generated component
 */
function configComponentGenerator(componentDefaults) {
    return function () {
        let component = mergeArgsTo(componentDefaults).apply(null, arguments);
        component = assignTracerConfig(component);
        return component;
    };
}

/**
 * Generate Declaration Component
 *
 * @param {Component} componentDefaults - defaults for declaration component
 *
 * @returns {function<Component>} function that returns generated component
 */
function declarationComponentGenerator(componentDefaults) {
    return function () {
        return mergeArgsTo(componentDefaults).apply(null, arguments);
    };
}

// eslint-disable-next-line no-multi-assign
module.exports = {
    configuration: {
        consumer: {
            default: {
                decrypted: configComponentGenerator({
                    class: 'Telemetry_Consumer',
                    allowSelfSignedCert: false,
                    enable: true,
                    id: 'DefaultConsumer',
                    name: 'DefaultConsumer',
                    namespace: 'f5telemetry_default',
                    trace: false,
                    traceName: 'DefaultConsumer',
                    type: 'default'
                })
            }
        },
        ihealthPoller: {
            full: {
                encrypted: configComponentGenerator({
                    class: 'Telemetry_iHealth_Poller',
                    name: 'iHealthPoller',
                    enable: true,
                    trace: true,
                    iHealth: {
                        name: 'iHealthPoller',
                        credentials: {
                            username: 'test_user_1',
                            passphrase: {
                                cipherText: '$M$test_passphrase_1',
                                class: 'Secret',
                                protected: 'SecureVault'
                            }
                        },
                        downloadFolder: './',
                        interval: {
                            day: undefined,
                            frequency: 'daily',
                            timeWindow: {
                                start: '00:00',
                                end: '03:00'
                            }
                        },
                        proxy: {
                            connection: {
                                host: '192.168.100.1',
                                port: 443,
                                protocol: 'https',
                                allowSelfSignedCert: true
                            },
                            credentials: {
                                username: 'test_user_2',
                                passphrase: {
                                    cipherText: '$M$test_passphrase_2',
                                    class: 'Secret',
                                    protected: 'SecureVault'
                                }
                            }
                        }
                    },
                    system: {
                        host: '192.168.0.1',
                        name: 'System',
                        connection: {
                            port: 443,
                            protocol: 'https',
                            allowSelfSignedCert: true
                        },
                        credentials: {
                            username: 'test_user_3',
                            passphrase: {
                                cipherText: '$M$test_passphrase_3',
                                class: 'Secret',
                                protected: 'SecureVault'
                            }
                        }
                    },
                    id: 'System::iHealthPoller',
                    namespace: 'f5telemetry_default',
                    systemName: 'System',
                    traceName: 'System::iHealthPoller'
                })
            }
        }
    },
    declaration: {
        base: {
            decrypted: declarationComponentGenerator({ class: 'Telemetry' })
        },
        consumer: {
            default: {
                decrypted: declarationComponentGenerator({
                    class: 'Telemetry_Consumer',
                    type: 'default'
                })
            }
        },
        controls: {
            full: {
                decrypted: declarationComponentGenerator({
                    class: 'Controls',
                    debug: true,
                    logLevel: 'debug'
                })
            }
        },
        ihealthPoller: {
            full: {
                decrypted: declarationComponentGenerator({
                    class: 'Telemetry_iHealth_Poller',
                    trace: true,
                    enable: true,
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    interval: {
                        frequency: 'daily',
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    },
                    proxy: {
                        host: '192.168.100.1',
                        protocol: 'https',
                        port: 443,
                        allowSelfSignedCert: true,
                        enableHostConnectivityCheck: false,
                        username: 'test_user_1',
                        passphrase: {
                            cipherText: 'test_passphrase_2'
                        }
                    }
                })
            },
            inlineMinimal: {
                decrypted: declarationComponentGenerator({
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    interval: {
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    }
                })
            },
            inlineFull: {
                decrypted: declarationComponentGenerator({
                    trace: true,
                    enable: true,
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    downloadFolder: './',
                    interval: {
                        frequency: 'daily',
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    },
                    proxy: {
                        host: '192.168.100.1',
                        protocol: 'https',
                        port: 443,
                        allowSelfSignedCert: true,
                        enableHostConnectivityCheck: false,
                        username: 'test_user_1',
                        passphrase: {
                            cipherText: 'test_passphrase_2'
                        }
                    }
                })
            },
            minimal: {
                decrypted: declarationComponentGenerator({
                    class: 'Telemetry_iHealth_Poller',
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    },
                    interval: {
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    }
                })
            }
        },
        namespace: {
            base: {
                decrypted: declarationComponentGenerator({ class: 'Telemetry_Namespace' })
            }
        },
        system: {
            full: {
                decrypted: declarationComponentGenerator({
                    class: 'Telemetry_System',
                    enable: true,
                    trace: true,
                    host: '192.168.0.1',
                    port: 443,
                    protocol: 'https',
                    allowSelfSignedCert: true,
                    enableHostConnectivityCheck: false,
                    username: 'test_user_1',
                    passphrase: {
                        cipherText: 'test_passphrase_1'
                    }
                })
            },
            minimal: {
                decrypted: declarationComponentGenerator({
                    class: 'Telemetry_System'
                })
            }
        }
    }
};

module.exports.configuration.ihealthPoller.full.decrypted = configComponentGenerator(
    module.exports.configuration.ihealthPoller.full.encrypted([
        { key: 'iHealth.credentials.passphrase', value: { cipherText: 'test_passphrase_1' } },
        { key: 'iHealth.proxy.credentials.passphrase', value: { cipherText: 'test_passphrase_2' } },
        { key: 'system.credentials.passphrase', value: { cipherText: 'test_passphrase_3' } }
    ])
);
module.exports.configuration.ihealthPoller.minimal = {
    encrypted: configComponentGenerator(
        module.exports.configuration.ihealthPoller.full.encrypted([
            { key: 'iHealth.downloadFolder', value: undefined },
            {
                key: 'iHealth.proxy',
                value: {
                    connection: {
                        host: undefined,
                        port: undefined,
                        protocol: undefined,
                        allowSelfSignedCert: undefined
                    },
                    credentials: {
                        username: undefined,
                        passphrase: undefined
                    }
                }
            },
            {
                key: 'system',
                value: {
                    host: '192.168.0.1',
                    name: 'System',
                    connection: {
                        port: 8100,
                        protocol: 'http',
                        allowSelfSignedCert: false
                    },
                    credentials: {
                        username: undefined,
                        passphrase: undefined
                    }
                }
            }
        ])
    )
};
module.exports.configuration.ihealthPoller.minimal.decrypted = configComponentGenerator(
    module.exports.configuration.ihealthPoller.minimal.encrypted([
        { key: 'iHealth.credentials.passphrase', value: { cipherText: 'test_passphrase_1' } }
    ])
);
