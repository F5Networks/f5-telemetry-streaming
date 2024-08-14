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

const allIDs = [
    {
        class: 'Telemetry_System_Poller',
        id: 'f5telemetry_default::poller::poller'
    },
    {
        class: 'Telemetry_System_Poller',
        id: 'namespace::poller::poller'
    },
    {
        class: 'Telemetry_Consumer',
        id: 'f5telemetry_default::consumer'
    },
    {
        class: 'Telemetry_Consumer',
        id: 'namespace::consumer'
    },
    {
        class: 'Telemetry_System_Poller',
        id: 'f5telemetry_default::poller2::poller2'
    },
    {
        class: 'Telemetry_System_Poller',
        id: 'namespace::poller2::poller2'
    },
    {
        class: 'Telemetry_Consumer',
        id: 'f5telemetry_default::consumer2'
    },
    {
        class: 'Telemetry_Consumer',
        id: 'namespace::consumer2'
    },
    {
        class: 'Telemetry_Listener',
        id: 'f5telemetry_default::listener'
    },
    {
        class: 'Telemetry_Listener',
        id: 'namespace::listener'
    }
];

module.exports = {
    name: '.getComponents()',
    allIDs,
    declaration: {
        class: 'Telemetry',
        consumer: {
            class: 'Telemetry_Consumer',
            type: 'default'
        },
        consumer2: {
            class: 'Telemetry_Consumer',
            type: 'default'
        },
        listener: {
            class: 'Telemetry_Listener'
        },
        poller: {
            class: 'Telemetry_System_Poller'
        },
        poller2: {
            class: 'Telemetry_System_Poller'
        },
        namespace: {
            class: 'Telemetry_Namespace',
            consumer: {
                class: 'Telemetry_Consumer',
                type: 'default'
            },
            consumer2: {
                class: 'Telemetry_Consumer',
                type: 'default'
            },
            listener: {
                class: 'Telemetry_Listener'
            },
            poller: {
                class: 'Telemetry_System_Poller'
            },
            poller2: {
                class: 'Telemetry_System_Poller'
            }
        }
    },
    params: {
        class: [
            {
                filter: undefined,
                expected: allIDs
            },
            {
                filter: 'Telemetry_Consumer',
                expected: [
                    {
                        class: 'Telemetry_Consumer',
                        id: 'f5telemetry_default::consumer'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'namespace::consumer'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'f5telemetry_default::consumer2'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'namespace::consumer2'
                    }
                ]
            },
            {
                filter: ['Telemetry_Consumer', 'Telemetry_System_Poller'],
                expected: [
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'f5telemetry_default::poller::poller'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'namespace::poller::poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'f5telemetry_default::consumer'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'namespace::consumer'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'f5telemetry_default::poller2::poller2'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'namespace::poller2::poller2'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'f5telemetry_default::consumer2'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'namespace::consumer2'
                    }
                ]
            },
            {
                filter: (name) => name.endsWith('Listener'),
                expected: [
                    {
                        class: 'Telemetry_Listener',
                        id: 'f5telemetry_default::listener'
                    },
                    {
                        class: 'Telemetry_Listener',
                        id: 'namespace::listener'
                    }
                ]
            },
            {
                filter: 'something',
                expected: []
            },
            {
                filter: ['something'],
                expected: []
            },
            {
                filter: (v) => v === 'something',
                expected: []
            }
        ],
        name: [
            {
                filter: undefined,
                expected: allIDs
            },
            {
                filter: 'consumer',
                expected: [
                    {
                        class: 'Telemetry_Consumer',
                        id: 'f5telemetry_default::consumer'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'namespace::consumer'
                    }
                ]
            },
            {
                filter: ['consumer', 'poller'],
                expected: [
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'f5telemetry_default::poller::poller'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'namespace::poller::poller'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'f5telemetry_default::consumer'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'namespace::consumer'
                    }
                ]
            },
            {
                filter: (name) => name === 'listener',
                expected: [
                    {
                        class: 'Telemetry_Listener',
                        id: 'f5telemetry_default::listener'
                    },
                    {
                        class: 'Telemetry_Listener',
                        id: 'namespace::listener'
                    }
                ]
            },
            {
                filter: 'something',
                expected: []
            },
            {
                filter: ['something'],
                expected: []
            },
            {
                filter: (v) => v === 'something',
                expected: []
            }
        ],
        namespace: [
            {
                filter: undefined,
                expected: allIDs
            },
            {
                filter: 'f5telemetry_default',
                expected: [
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'f5telemetry_default::poller::poller'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'f5telemetry_default::poller2::poller2'
                    },
                    {
                        class: 'Telemetry_Listener',
                        id: 'f5telemetry_default::listener'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'f5telemetry_default::consumer'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'f5telemetry_default::consumer2'
                    }
                ]
            },
            {
                filter: ['f5telemetry_default', 'namespace'],
                expected: allIDs
            },
            {
                filter: (name) => name === 'namespace',
                expected: [
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'namespace::poller::poller'
                    },
                    {
                        class: 'Telemetry_System_Poller',
                        id: 'namespace::poller2::poller2'
                    },
                    {
                        class: 'Telemetry_Listener',
                        id: 'namespace::listener'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'namespace::consumer'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'namespace::consumer2'
                    }
                ]
            },
            {
                filter: 'something',
                expected: []
            },
            {
                filter: ['something'],
                expected: []
            },
            {
                filter: (v) => v === 'something',
                expected: []
            }
        ],
        filter: [
            {
                filter: undefined,
                expected: allIDs
            },
            {
                filter: (c) => c.name === 'consumer',
                expected: [
                    {
                        class: 'Telemetry_Consumer',
                        id: 'f5telemetry_default::consumer'
                    },
                    {
                        class: 'Telemetry_Consumer',
                        id: 'namespace::consumer'
                    }
                ]
            },
            {
                filter: (c) => c.name === 'consumer-something',
                expected: []
            }
        ]
    }
};
