/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable no-useless-escape */

module.exports = {
    /**
     * Set of data to check actual and expected results only.
     * If you need some additional check feel free to add additional
     * property or write separate test.
     *
     * Note: you can specify 'testOpts' property on the same level as 'name'.
     * Following options available:
     * - only (bool) - run this test only (it.only)
     * */
    _resolveConditional: [
        {
            name: 'should fail when unknown function in conditional block',
            contextData: {},
            conditionalBlock: {
                unknownFunction: 'something'
            },
            errorMessage: /Unknown property 'unknownFunction' in conditional block/
        },
        {
            name: 'should fail when no deviceVersion in contextData',
            contextData: {},
            conditionalBlock: {
                deviceVersionGreaterOrEqual: '11.0'
            },
            errorMessage: /deviceVersionGreaterOrEqual: context has no property 'deviceVersion'/
        },
        {
            name: 'should fail when no provisioning in contextData',
            contextData: {},
            conditionalBlock: {
                isModuleProvisioned: 'afm'
            },
            errorMessage: /isModuleProvisioned: context has no property 'provisioning'/
        },
        {
            name: 'should return true when device version is greater or equal',
            contextData: {
                deviceVersion: '11.6.5'
            },
            conditionalBlock: {
                deviceVersionGreaterOrEqual: '11.6.0'
            },
            expectedData: true
        },
        {
            name: 'should return false when device version is not greater or equal',
            contextData: {
                deviceVersion: '11.6.5'
            },
            conditionalBlock: {
                deviceVersionGreaterOrEqual: '14.1.0'
            },
            expectedData: false
        },
        {
            name: 'should return true when module provisioned',
            contextData: {
                provisioning: {
                    afm: {
                        level: 'nominal'
                    }
                }
            },
            conditionalBlock: {
                isModuleProvisioned: 'afm'
            },
            expectedData: true
        },
        {
            name: 'should return false when module not provisioned',
            contextData: {
                provisioning: {
                    afm: {
                        level: 'none'
                    }
                }
            },
            conditionalBlock: {
                isModuleProvisioned: 'afm'
            },
            expectedData: false
        },
        {
            name: 'should return false when module absent',
            contextData: {
                provisioning: {
                    ltm: {
                        level: 'none'
                    }
                }
            },
            conditionalBlock: {
                isModuleProvisioned: 'afm'
            },
            expectedData: false
        }
    ],
    _preprocessProperty: [
        {
            name: 'should process property without conditional blocks',
            contextData: {},
            propertyData: {
                foo: 'bar'
            },
            expectedData: {
                foo: 'bar'
            }
        },
        {
            name: 'should process property with null',
            contextData: {},
            propertyData: {
                foo: null
            },
            expectedData: {
                foo: null
            }
        },
        {
            name: 'should process conditional block without then/else branches',
            contextData: {
                deviceVersion: '11.6'
            },
            propertyData: {
                if: {
                    deviceVersionGreaterOrEqual: '11.0'
                },
                foo: 'bar'
            },
            expectedData: {
                foo: 'bar'
            }
        },
        {
            name: 'should process conditional block on top level (follow \'then\' block)',
            contextData: {
                deviceVersion: '11.6'
            },
            propertyData: {
                if: {
                    deviceVersionGreaterOrEqual: '11.0'
                },
                then: {
                    foo: 'bar'
                },
                else: {
                    foo: 'else'
                }
            },
            expectedData: {
                foo: 'bar'
            }
        },
        {
            name: 'should process conditional block on top level (follow \'else\' block)',
            contextData: {
                deviceVersion: '11.6'
            },
            propertyData: {
                if: {
                    deviceVersionGreaterOrEqual: '14.0'
                },
                then: {
                    foo: 'bar'
                },
                else: {
                    foo: 'else'
                }
            },
            expectedData: {
                foo: 'else'
            }
        },
        {
            name: 'should process nested conditional blocks (example 1)',
            contextData: {
                deviceVersion: '11.6'
            },
            propertyData: {
                if: {
                    deviceVersionGreaterOrEqual: '11.0'
                },
                then: {
                    if: {
                        deviceVersionGreaterOrEqual: '11.1'
                    },
                    then: {
                        foo: 'bar'
                    }
                },
                else: {
                    foo: 'else'
                }
            },
            expectedData: {
                foo: 'bar'
            }
        },
        {
            name: 'should process nested conditional blocks (example 2)',
            contextData: {
                deviceVersion: '11.6'
            },
            propertyData: {
                if: {
                    deviceVersionGreaterOrEqual: '11.0'
                },
                then: {
                    obj2: [
                        {
                            if: {
                                deviceVersionGreaterOrEqual: '11.1'
                            },
                            then: {
                                foo: 'bar'
                            }
                        }
                    ]
                },
                else: {
                    foo: 'else'
                }
            },
            expectedData: {
                obj2: [
                    {
                        foo: 'bar'
                    }
                ]
            }
        },
        {
            name: 'should process nested conditional blocks (example 3)',
            contextData: {
                deviceVersion: '11.6'
            },
            propertyData: {
                obj1: {
                    obj2: [
                        {
                            if: {
                                deviceVersionGreaterOrEqual: '11.0'
                            },
                            then: {
                                obj3: [
                                    {
                                        if: {
                                            deviceVersionGreaterOrEqual: '11.1'
                                        },
                                        then: {
                                            foo: 'bar'
                                        },
                                        else: {
                                            foo: 'else'
                                        }
                                    }
                                ]
                            },
                            else: {
                                foo: 'else'
                            }
                        }
                    ]
                }
            },
            expectedData: {
                obj1: {
                    obj2: [
                        {
                            obj3: [
                                {
                                    foo: 'bar'
                                }
                            ]
                        }
                    ]
                }
            }
        }
    ],
    _renderTemplate: [
        {
            name: 'should return string as is when no template',
            contextData: {},
            propertyData: {
                key: 'something'
            },
            expectedData: {
                key: 'something'
            }
        },
        {
            name: 'should not fail when key not in context',
            contextData: {},
            propertyData: {
                key: '{{ something }}'
            },
            expectedData: {
                key: ''
            }
        },
        {
            name: 'should not fail when key is null',
            contextData: {},
            propertyData: {
                key: null
            },
            expectedData: {
                key: null
            }
        },
        {
            name: 'should replace tokens with data from context',
            contextData: {
                someKey: 'something'
            },
            propertyData: {
                key: '{{ someKey }}'
            },
            expectedData: {
                key: 'something'
            }
        },
        {
            name: 'should replace tokens with data from context (any depth)',
            contextData: {
                someKey: 'something'
            },
            propertyData: {
                key: '{{ someKey }}',
                intKey: 10,
                boolKey: true,
                obj1: {
                    arr1: [
                        {
                            obj2: {
                                key: '{{ someKey }}'
                            }
                        }
                    ]
                },
                obj2: {
                    key: '{{ someKey }}'
                }
            },
            expectedData: {
                key: 'something',
                intKey: 10,
                boolKey: true,
                obj1: {
                    arr1: [
                        {
                            obj2: {
                                key: 'something'
                            }
                        }
                    ]
                },
                obj2: {
                    key: 'something'
                }
            }
        }
    ],
    renderProperty: [
        {
            name: 'should render property without template and conditionals',
            contextData: {},
            propertyData: {
                obj1: {
                    obj2: {
                        key: true
                    }
                },
                foo: 'bar'
            },
            expectedData: {
                obj1: {
                    obj2: {
                        key: true
                    }
                },
                foo: 'bar'
            }
        },
        {
            name: 'should render property with template and conditionals',
            contextData: {
                version13: '13.0',
                version14: '14.0',
                deviceVersion: '13.1'
            },
            propertyData: {
                obj1: {
                    template1: '{{ version13 }}, {{ version14 }}'
                },
                obj2: {
                    if: {
                        deviceVersionGreaterOrEqual: '{{ version13 }}'
                    },
                    then: {
                        foo: 'bar',
                        if: {
                            deviceVersionGreaterOrEqual: '{{ version14 }}'
                        },
                        then: {
                            foo: 'bar2'
                        }
                    },
                    else: {
                        if: {
                            deviceVersionGreaterOrEqual: '{{ version14 }}'
                        },
                        then: {
                            foo: 'bar2'
                        }
                    }
                }
            },
            expectedData: {
                obj1: {
                    template1: '13.0, 14.0'
                },
                obj2: {
                    foo: 'bar'
                }
            }
        }
    ]
};
