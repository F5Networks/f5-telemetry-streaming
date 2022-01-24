/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

function encryptEncode(data) {
    return data.toString('base64').replace(/[+]/g, '-').replace(/\x2f/g, '_');
}

module.exports = {
    getDeviceType: {
        correctData: 'Edition: Final\nProduct: BIG-IP\nVersion: 14.1.0\n',
        incorrectData: 'Edition: Final\nProduct: BIG-IQ\nVersion: 14.1.0\n'
    },
    encryptSecret: {
        'encrypt-14.0.0': [
            {
                endpoint: '/mgmt/tm/ltm/auth/radius-server',
                method: 'post',
                request: {
                    name: `telemetry_delete_me_${encryptEncode('test')}`,
                    secret: 'foo',
                    server: 'foo'
                },
                response: {
                    secret: 'secret'
                }
            },
            {
                endpoint: '/mgmt/tm/sys/version',
                response: {
                    entries: {
                        someKey: {
                            nestedStats: {
                                entries: {
                                    version: {
                                        description: '14.0.0'
                                    },
                                    BuildInfo: {
                                        description: '0.0.1'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                endpoint: `/mgmt/tm/ltm/auth/radius-server/telemetry_delete_me_${encryptEncode('test')}`,
                method: 'delete'
            }
        ],
        'encrypt-14.1.x': [
            {
                endpoint: '/mgmt/tm/ltm/auth/radius-server',
                method: 'post',
                request: {
                    name: `telemetry_delete_me_${encryptEncode('test')}`,
                    secret: 'foo',
                    server: 'foo'
                },
                response: {
                    secret: 'secret'
                }
            },
            {
                endpoint: '/mgmt/tm/sys/version',
                response: {
                    entries: {
                        someKey: {
                            nestedStats: {
                                entries: {
                                    version: {
                                        description: '14.1.0'
                                    },
                                    BuildInfo: {
                                        description: '0.0.1'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                endpoint: `/mgmt/tm/ltm/auth/radius-server/telemetry_delete_me_${encryptEncode('test')}`,
                method: 'delete'
            },
            {
                endpoint: '/mgmt/tm/util/bash',
                method: 'post',
                request: {
                    command: 'run',
                    utilCmdArgs: `-c "tmsh -a list auth radius-server telemetry_delete_me_${encryptEncode('test')} secret"`
                },
                response: {
                    commandResult: 'auth radius-server telemetry_delete_me {\n    secret secret\n}'
                }
            }
        ],
        'encrypt-15.0.0': [
            {
                endpoint: '/mgmt/tm/ltm/auth/radius-server',
                method: 'post',
                request: {
                    name: `telemetry_delete_me_${encryptEncode('test')}`,
                    secret: 'foo',
                    server: 'foo'
                },
                response: {
                    secret: 'secret'
                }
            },
            {
                endpoint: '/mgmt/tm/sys/version',
                response: {
                    entries: {
                        someKey: {
                            nestedStats: {
                                entries: {
                                    version: {
                                        description: '15.0.0'
                                    },
                                    BuildInfo: {
                                        description: '0.0.1'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                endpoint: `/mgmt/tm/ltm/auth/radius-server/telemetry_delete_me_${encryptEncode('test')}`,
                method: 'delete'
            }
        ],
        errorResponseExample: [
            {
                endpoint: '/mgmt/tm/ltm/auth/radius-server',
                method: 'post',
                code: 400
            },
            {
                endpoint: `/mgmt/tm/ltm/auth/radius-server/telemetry_delete_me_${encryptEncode('test')}`,
                method: 'delete'
            },
            {
                endpoint: '/mgmt/tm/sys/version',
                response: {
                    entries: {
                        someKey: {
                            nestedStats: {
                                entries: {
                                    version: {
                                        description: '15.0.0'
                                    },
                                    BuildInfo: {
                                        description: '0.0.1'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ],
        encrypt1kSecret: [
            {
                endpoint: '/mgmt/tm/ltm/auth/radius-server',
                method: 'post',
                response: {
                    secret: 'secret'
                },
                options: {
                    times: 2
                }
            },
            {
                endpoint: '/mgmt/tm/sys/version',
                response: {
                    entries: {
                        someKey: {
                            nestedStats: {
                                entries: {
                                    version: {
                                        description: '14.0.0'
                                    },
                                    BuildInfo: {
                                        description: '0.0.1'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                endpoint: `/mgmt/tm/ltm/auth/radius-server/telemetry_delete_me_${encryptEncode('test')}`,
                method: 'delete',
                options: {
                    times: 2
                }
            }
        ],
        encrypt1kSecretWithNewLines: [
            {
                endpoint: '/mgmt/tm/sys/version',
                response: {
                    entries: {
                        someKey: {
                            nestedStats: {
                                entries: {
                                    version: {
                                        description: '14.0.0'
                                    },
                                    BuildInfo: {
                                        description: '0.0.1'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                endpoint: `/mgmt/tm/ltm/auth/radius-server/telemetry_delete_me_${encryptEncode('test')}`,
                method: 'delete',
                options: {
                    times: 2
                }
            }
        ],
        errorWhenResponseHasComma: [
            {
                endpoint: '/mgmt/tm/ltm/auth/radius-server',
                method: 'post',
                request: {
                    name: `telemetry_delete_me_${encryptEncode('test')}`,
                    secret: 'foo',
                    server: 'foo'
                },
                response: {
                    secret: 'secret,secret'
                }
            },
            {
                endpoint: '/mgmt/tm/sys/version',
                response: {
                    entries: {
                        someKey: {
                            nestedStats: {
                                entries: {
                                    version: {
                                        description: '14.0.0'
                                    },
                                    BuildInfo: {
                                        description: '0.0.1'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                endpoint: `/mgmt/tm/ltm/auth/radius-server/telemetry_delete_me_${encryptEncode('test')}`,
                method: 'delete'
            }
        ]
    }
};
