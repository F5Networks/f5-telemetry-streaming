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

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');

const assert = require('../shared/assert');
const common = require('./common');
const declValidator = require('./common').validate;

moduleCache.remember();

describe('Declarations -> Telemetry_iHealth_Poller', () => {
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(async () => {
        coreStub = common.stubCoreModules();
        await coreStub.startServices();
    });

    afterEach(async () => {
        await coreStub.destroyServices();
        sinon.restore();
    });

    it('should pass minimal declaration', () => {
        const data = {
            class: 'Telemetry',
            My_iHealth_Poller: {
                class: 'Telemetry_iHealth_Poller',
                username: 'username',
                passphrase: {
                    cipherText: 'passphrase'
                },
                interval: {
                    timeWindow: {
                        start: '00:00',
                        end: '03:00'
                    }
                }
            }
        };
        return declValidator(data)
            .then((validConfig) => {
                const poller = validConfig.My_iHealth_Poller;
                assert.notStrictEqual(poller, undefined);
                assert.strictEqual(poller.class, 'Telemetry_iHealth_Poller');
                assert.strictEqual(poller.username, 'username');
                assert.strictEqual(poller.passphrase.cipherText, '$M$passphrase');
                assert.deepStrictEqual(poller.interval, {
                    timeWindow: {
                        start: '00:00',
                        end: '03:00'
                    },
                    frequency: 'daily'
                });
            });
    });

    it('should pass full declaration', () => {
        const data = {
            class: 'Telemetry',
            My_iHealth_Poller: {
                class: 'Telemetry_iHealth_Poller',
                username: 'username',
                passphrase: {
                    cipherText: 'passphrase'
                },
                interval: {
                    frequency: 'weekly',
                    day: 1,
                    timeWindow: {
                        start: '00:00',
                        end: '03:00'
                    }
                },
                proxy: {
                    host: 'localhost',
                    protocol: 'https',
                    port: 80,
                    allowSelfSignedCert: true,
                    enableHostConnectivityCheck: false,
                    username: 'username',
                    passphrase: {
                        cipherText: 'proxyPassphrase'
                    }
                }
            }
        };
        return declValidator(data)
            .then((validConfig) => {
                const poller = validConfig.My_iHealth_Poller;
                assert.notStrictEqual(poller, undefined);
                assert.strictEqual(poller.class, 'Telemetry_iHealth_Poller');
                assert.strictEqual(poller.username, 'username');
                assert.strictEqual(poller.passphrase.cipherText, '$M$passphrase');
                assert.deepStrictEqual(poller.interval, {
                    frequency: 'weekly',
                    day: 1,
                    timeWindow: {
                        start: '00:00',
                        end: '03:00'
                    }
                });
                const proxy = poller.proxy;
                assert.strictEqual(proxy.protocol, 'https');
                assert.strictEqual(proxy.host, 'localhost');
                assert.strictEqual(proxy.port, 80);
                assert.strictEqual(proxy.allowSelfSignedCert, true);
                assert.strictEqual(proxy.enableHostConnectivityCheck, false);
                assert.strictEqual(proxy.username, 'username');
                assert.strictEqual(proxy.passphrase.cipherText, '$M$proxyPassphrase');
            });
    });

    it('should not allow additional properties in declaration', () => {
        const data = {
            class: 'Telemetry',
            My_iHealth_Poller: {
                class: 'Telemetry_iHealth_Poller',
                username: 'username',
                passphrase: {
                    cipherText: 'passphrase'
                },
                someProp: 'someValue'
            }
        };
        return assert.isRejected(declValidator(data), /someProp.*should NOT have additional properties/);
    });

    it('should not allow empty string as downloadFolder\' value', () => {
        const data = {
            class: 'Telemetry',
            My_iHealth_Poller: {
                class: 'Telemetry_iHealth_Poller',
                username: 'username',
                passphrase: {
                    cipherText: 'passphrase'
                },
                downloadFolder: ''
            }
        };
        return assert.isRejected(declValidator(data), /downloadFolder.*minLength/);
    });

    describe('interval', () => {
        it('should pass minimal declaration', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        frequency: 'daily',
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    }
                }
            };
            return assert.isFulfilled(declValidator(data));
        });

        it('should pass full declaration', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        frequency: 'weekly',
                        day: 'Sunday',
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    }
                }
            };
            return assert.isFulfilled(declValidator(data));
        });

        it('should allow to specify single-digit minutes', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        frequency: 'weekly',
                        day: 'Sunday',
                        timeWindow: {
                            start: '00:0',
                            end: '03:9'
                        }
                    }
                }
            };
            return assert.isFulfilled(declValidator(data));
        });

        it('should not allow additional properties', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        frequency: 'weekly',
                        day: 'Sunday',
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        },
                        someProp: 'someValue'
                    }
                }
            };
            return assert.isRejected(declValidator(data), /someProp.*should NOT have additional properties/);
        });

        it('should fail parse invalid time string', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        frequency: 'daily',
                        timeWindow: {
                            start: '3456',
                            end: '6789'
                        }
                    }
                }
            };
            return assert.isRejected(declValidator(data), /interval.timeWindow.start.*should match pattern/);
        });

        it('should preserve difference between start and end time (2hr min)', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        frequency: 'daily',
                        timeWindow: {
                            start: '23:00',
                            end: '00:59'
                        }
                    }
                }
            };
            return assert.isRejected(declValidator(data), /interval.timeWindow.*specify window with size of a/);
        });

        it('should fail when invalid weekly day name specified', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        frequency: 'weekly',
                        day: 'satursunday',
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    }
                }
            };
            return assert.isRejected(declValidator(data), /interval.day.*should match pattern/);
        });

        it('should fail when invalid weekly day specified', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        frequency: 'weekly',
                        day: 8,
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    }
                }
            };
            return assert.isRejected(declValidator(data), /interval.day.*should be <= 7/);
        });

        it('should fail when invalid monthly day specified', () => {
            const data = {
                class: 'Telemetry',
                My_iHealth: {
                    class: 'Telemetry_iHealth_Poller',
                    username: 'username',
                    passphrase: {
                        cipherText: 'cipherText'
                    },
                    interval: {
                        frequency: 'monthly',
                        day: 35,
                        timeWindow: {
                            start: '00:00',
                            end: '03:00'
                        }
                    }
                }
            };
            return assert.isRejected(declValidator(data), /interval.day.*should be <= 31/);
        });
    });
});
