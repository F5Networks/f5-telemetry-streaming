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

/**
 * Object's ID might be one of the following:
 * - obj.traceName
 * - obj.namespace::obj.name
 * - UUID
 */

module.exports = {
    name: '.hasEnabledComponents()',
    tests: [
        {
            name: 'should ignore Controls',
            declaration: {
                class: 'Telemetry',
                controls: {
                    class: 'Controls'
                }
            },
            expected: false
        },
        {
            name: 'should return false when has no enabled components',
            declaration: {
                class: 'Telemetry',
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    }
                }
            },
            expected: false
        },
        {
            name: 'should return true when has enabled components',
            declaration: {
                class: 'Telemetry',
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: true
        },
        {
            name: 'should check components using class filter (string)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: true
        },
        {
            name: 'should check components using class filter (function)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: true
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: true
        },
        {
            name: 'should check components using namespace filter (string)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: true
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: true
        },
        {
            name: 'should check components using namespace filter (function)',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: true
        },
        {
            name: 'should filter components by namespace and class',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: true
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: true
        },
        {
            name: 'should filter components by arbitrary function',
            declaration: {
                class: 'Telemetry',
                Listener1: {
                    class: 'Telemetry_Listener',
                    enable: false
                },
                Consumer_1: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: true
                },
                Consumer_2: {
                    class: 'Telemetry_Consumer',
                    type: 'default',
                    enable: false
                },
                My_Namespace: {
                    class: 'Telemetry_Namespace',
                    Consumer_1: {
                        class: 'Telemetry_Consumer',
                        type: 'default',
                        enable: false
                    },
                    Consumer_2: {
                        class: 'Telemetry_Consumer',
                        type: 'default'
                    }
                }
            },
            expected: true
        }
    ]
};
