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
 * NOTE: DO NOT REMOVE 'kind' AND 'selfLink' PROPERTIES FROM RESPONSE's TOP LEVEL
 */
/**
 * TODO: update/remove 'options: { times: XXXX }' when EndpointLoader's cache will be fixed
 */

module.exports = [
    {
        name: 'should get data empty data',
        endpointObj: {
            path: '/endpoint'
        },
        endpoints: [
            {
                endpoint: '/endpoint',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/endpoint?ver=X.X.X'
                }
            }
        ],
        expectedData: {
            name: '/endpoint',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/endpoint?ver=X.X.X'
            }
        }
    },
    {
        name: 'should fetch just the data',
        endpointObj: {
            path: '/endpoint'
        },
        endpoints: [
            {
                endpoint: '/endpoint',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/endpoint?ver=X.X.X',
                    items: [
                        {
                            name: 'object1',
                            selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                            key: 'value'
                        }
                    ]
                }
            }
        ],
        expectedData: {
            name: '/endpoint',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/endpoint?ver=X.X.X',
                items: [
                    {
                        name: 'object1',
                        selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                        key: 'value'
                    }
                ]
            }
        }
    },
    {
        name: 'should fetch data with stats when includeStats specified',
        endpointObj: {
            path: '/endpoint',
            includeStats: true
        },
        endpoints: [
            {
                endpoint: '/endpoint',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/endpoint?ver=X.X.X',
                    items: [
                        {
                            name: 'object1',
                            selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                            key: 'value'
                        }
                    ]
                }
            },
            {
                endpoint: '/endpoint/object1/stats',
                response: {
                    kind: 'endpoint:stats',
                    selfLink: 'https://localhost/endpoint/object1/stats?ver=X.X.X',
                    entries: {
                        'https://localhost/endpoint/object2/stats': {
                            nestedStats: {
                                kind: 'endpoint:stats',
                                selfLink: 'https://localhost/endpoint/object1/stats?ver=X.X.X',
                                statKey: 'statValue'
                            }
                        }
                    }
                }
            }
        ],
        expectedData: {
            name: '/endpoint',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/endpoint?ver=X.X.X',
                items: [
                    {
                        name: 'object1',
                        selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                        key: 'value',
                        kind: 'endpoint:stats',
                        entries: {
                            'https://localhost/endpoint/object2/stats': {
                                nestedStats: {
                                    kind: 'endpoint:stats',
                                    selfLink: 'https://localhost/endpoint/object1/stats?ver=X.X.X',
                                    statKey: 'statValue'
                                }
                            }
                        }
                    }
                ]
            }
        }
    },
    {
        name: 'should expand reference',
        endpointObj: {
            path: '/endpoint',
            expandReferences: { someRef: {} }
        },
        endpoints: [
            {
                endpoint: '/endpoint',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/endpoint?ver=X.X.X',
                    items: [
                        {
                            name: 'object1',
                            selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                            key: 'value',
                            someRef: {
                                link: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X'
                            }
                        }
                    ]
                }
            },
            {
                endpoint: '/anotherEndpoint/refObject',
                response: {
                    kind: 'anotherEndpoint:state',
                    selfLink: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X',
                    someKey: 'someValue',
                    items: [
                        {
                            nestedObjectName: 'name'
                        }
                    ]
                }
            }
        ],
        expectedData: {
            name: '/endpoint',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/endpoint?ver=X.X.X',
                items: [
                    {
                        name: 'object1',
                        selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                        key: 'value',
                        someRef: {
                            kind: 'anotherEndpoint:state',
                            selfLink: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X',
                            someKey: 'someValue',
                            items: [
                                {
                                    nestedObjectName: 'name'
                                }
                            ]
                        }
                    }
                ]
            }
        }
    },
    {
        name: 'should expand reference using endpointSuffix',
        endpointObj: {
            path: '/endpoint',
            expandReferences: { someRef: { endpointSuffix: '/suffix' } }
        },
        endpoints: [
            {
                endpoint: '/endpoint',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/endpoint?ver=X.X.X',
                    items: [
                        {
                            name: 'object1',
                            selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                            key: 'value',
                            someRef: {
                                link: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X'
                            }
                        }
                    ]
                }
            },
            {
                endpoint: '/anotherEndpoint/refObject/suffix',
                response: {
                    kind: 'anotherEndpoint:state',
                    selfLink: 'https://localhost/anotherEndpoint/refObject/suffix?ver=X.X.X',
                    someKey: 'someValue',
                    items: [
                        {
                            nestedObjectName: 'name'
                        }
                    ]
                }
            }
        ],
        expectedData: {
            name: '/endpoint',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/endpoint?ver=X.X.X',
                items: [
                    {
                        name: 'object1',
                        selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                        key: 'value',
                        someRef: {
                            kind: 'anotherEndpoint:state',
                            selfLink: 'https://localhost/anotherEndpoint/refObject/suffix?ver=X.X.X',
                            someKey: 'someValue',
                            items: [
                                {
                                    nestedObjectName: 'name'
                                }
                            ]
                        }
                    }
                ]
            }
        }
    },
    {
        name: 'should expand reference and include reference\'s stats',
        endpointObj: {
            path: '/endpoint',
            expandReferences: { someRef: { includeStats: true } }
        },
        endpoints: [
            {
                endpoint: '/endpoint',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/endpoint?ver=X.X.X',
                    items: [
                        {
                            name: 'object1',
                            selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                            key: 'value',
                            someRef: {
                                link: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X'
                            }
                        }
                    ]
                }
            },
            {
                endpoint: '/anotherEndpoint/refObject/stats',
                response: {
                    kind: 'anotherEndpoint:stats',
                    selfLink: 'https://localhost/anotherEndpoint/refObject/stats?ver=X.X.X',
                    entries: {
                        'https://localhost/anotherEndpoint/refObject/stats': {
                            nestedStats: {
                                kind: 'anotherEndpoint:stats',
                                selfLink: 'https://localhost/anotherEndpoint/refObject/stats?ver=X.X.X',
                                name: 'anotherStats',
                                statKey: 'statValue'
                            }
                        }
                    }
                }
            },
            {
                endpoint: '/anotherEndpoint/refObject',
                response: {
                    kind: 'anotherEndpoint:state',
                    selfLink: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X',
                    someKey: 'someValue',
                    items: [
                        {
                            nestedObjectName: 'name'
                        }
                    ]
                }
            }
        ],
        expectedData: {
            name: '/endpoint',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/endpoint?ver=X.X.X',
                items: [
                    {
                        name: 'object1',
                        selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                        key: 'value',
                        someRef: {
                            kind: 'anotherEndpoint:state',
                            selfLink: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X',
                            entries: {
                                'https://localhost/anotherEndpoint/refObject/stats': {
                                    nestedStats: {
                                        kind: 'anotherEndpoint:stats',
                                        selfLink: 'https://localhost/anotherEndpoint/refObject/stats?ver=X.X.X',
                                        name: 'anotherStats',
                                        statKey: 'statValue'
                                    }
                                }
                            },
                            someKey: 'someValue',
                            items: [
                                {
                                    nestedObjectName: 'name'
                                }
                            ]
                        }
                    }
                ]
            }
        }
    },
    {
        name: 'should expand reference and include reference\'s stats using endpointSuffix',
        endpointObj: {
            path: '/endpoint',
            expandReferences: { someRef: { includeStats: true, endpointSuffix: '/suffix' } }
        },
        endpoints: [
            {
                endpoint: '/endpoint',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/endpoint?ver=X.X.X',
                    items: [
                        {
                            name: 'object1',
                            selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                            key: 'value',
                            someRef: {
                                link: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X'
                            }
                        }
                    ]
                }
            },
            {
                endpoint: '/anotherEndpoint/refObject/stats',
                response: {
                    kind: 'anotherEndpoint:stats',
                    selfLink: 'https://localhost/anotherEndpoint/refObject/stats?ver=X.X.X',
                    entries: {
                        'https://localhost/anotherEndpoint/refObject/stats': {
                            nestedStats: {
                                kind: 'anotherEndpoint:stats',
                                selfLink: 'https://localhost/anotherEndpoint/refObject/stats?ver=X.X.X',
                                name: 'anotherStats',
                                statKey: 'statValue'
                            }
                        }
                    }
                }
            },
            {
                endpoint: '/anotherEndpoint/refObject/suffix',
                response: {
                    kind: 'anotherEndpoint:state',
                    selfLink: 'https://localhost/anotherEndpoint/refObject/suffix?ver=X.X.X',
                    someKey: 'someValue',
                    items: [
                        {
                            nestedObjectName: 'name'
                        }
                    ]
                }
            }
        ],
        expectedData: {
            name: '/endpoint',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/endpoint?ver=X.X.X',
                items: [
                    {
                        name: 'object1',
                        selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                        key: 'value',
                        someRef: {
                            kind: 'anotherEndpoint:state',
                            selfLink: 'https://localhost/anotherEndpoint/refObject/suffix?ver=X.X.X',
                            entries: {
                                'https://localhost/anotherEndpoint/refObject/stats': {
                                    nestedStats: {
                                        kind: 'anotherEndpoint:stats',
                                        selfLink: 'https://localhost/anotherEndpoint/refObject/stats?ver=X.X.X',
                                        name: 'anotherStats',
                                        statKey: 'statValue'
                                    }
                                }
                            },
                            someKey: 'someValue',
                            items: [
                                {
                                    nestedObjectName: 'name'
                                }
                            ]
                        }
                    }
                ]
            }
        }
    },
    {
        name: 'should include stats, expand reference using suffix and include reference\'s stats',
        endpointObj: {
            path: '/endpoint',
            expandReferences: { someRef: { includeStats: true } },
            includeStats: true
        },
        endpoints: [
            {
                endpoint: '/endpoint',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/endpoint?ver=X.X.X',
                    items: [
                        {
                            name: 'object1',
                            selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                            key: 'value',
                            someRef: {
                                link: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X'
                            }
                        }
                    ]
                }
            },
            {
                endpoint: '/anotherEndpoint/refObject/stats',
                response: {
                    kind: 'anotherEndpoint:stats',
                    selfLink: 'https://localhost/anotherEndpoint/refObject/stats?ver=X.X.X',
                    entries: {
                        'https://localhost/anotherEndpoint/refObject/stats': {
                            nestedStats: {
                                kind: 'anotherEndpoint:stats',
                                selfLink: 'https://localhost/anotherEndpoint/refObject/stats?ver=X.X.X',
                                name: 'anotherStats',
                                statKey: 'statValue'
                            }
                        }
                    }
                }
            },
            {
                endpoint: '/anotherEndpoint/refObject',
                response: {
                    kind: 'anotherEndpoint:state',
                    selfLink: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X',
                    someKey: 'someValue',
                    items: [
                        {
                            nestedObjectName: 'name'
                        }
                    ]
                }
            },
            {
                endpoint: '/endpoint/object1/stats',
                response: {
                    kind: 'endpoint:stats',
                    selfLink: 'https://localhost/endpoint/object1/stats?ver=X.X.X',
                    entries: {
                        'https://localhost/endpoint/object2/stats': {
                            nestedStats: {
                                kind: 'endpoint:stats',
                                selfLink: 'https://localhost/endpoint/object1/stats?ver=X.X.X',
                                statKey: 'statValue'
                            }
                        }
                    }
                }
            }
        ],
        expectedData: {
            name: '/endpoint',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/endpoint?ver=X.X.X',
                items: [
                    {
                        name: 'object1',
                        kind: 'endpoint:stats',
                        selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                        key: 'value',
                        entries: {
                            'https://localhost/endpoint/object2/stats': {
                                nestedStats: {
                                    kind: 'endpoint:stats',
                                    selfLink: 'https://localhost/endpoint/object1/stats?ver=X.X.X',
                                    statKey: 'statValue'
                                }
                            }
                        },
                        someRef: {
                            kind: 'anotherEndpoint:state',
                            selfLink: 'https://localhost/anotherEndpoint/refObject?ver=X.X.X',
                            entries: {
                                'https://localhost/anotherEndpoint/refObject/stats': {
                                    nestedStats: {
                                        kind: 'anotherEndpoint:stats',
                                        selfLink: 'https://localhost/anotherEndpoint/refObject/stats?ver=X.X.X',
                                        name: 'anotherStats',
                                        statKey: 'statValue'
                                    }
                                }
                            },
                            someKey: 'someValue',
                            items: [
                                {
                                    nestedObjectName: 'name'
                                }
                            ]
                        }
                    }
                ]
            }
        }
    },
    {
        name: 'should not query reference objects without link property',
        endpointObj: {
            path: '/endpoint',
            expandReferences: { someRef: { } }
        },
        endpoints: [
            {
                endpoint: '/endpoint',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/endpoint?ver=X.X.X',
                    items: [
                        {
                            name: 'object1',
                            selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                            key: 'value',
                            someRef: {
                                someRefKey: 'value'
                            }
                        }
                    ]
                }
            }
        ],
        expectedData: {
            name: '/endpoint',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/endpoint?ver=X.X.X',
                items: [
                    {
                        name: 'object1',
                        selfLink: 'https://localhost/endpoint/object1?ver=X.X.X',
                        key: 'value',
                        someRef: {
                            someRefKey: 'value'
                        }
                    }
                ]
            }
        }
    },
    {
        name: 'should not query objects without selfLink property',
        endpointObj: {
            path: '/endpoint',
            includeStats: true
        },
        endpoints: [
            {
                endpoint: '/endpoint',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/endpoint?ver=X.X.X',
                    items: [
                        {
                            name: 'object1',
                            key: 'value',
                            someRef: {
                                someRefKey: 'value'
                            }
                        }
                    ]
                }
            }
        ],
        expectedData: {
            name: '/endpoint',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/endpoint?ver=X.X.X',
                items: [
                    {
                        name: 'object1',
                        key: 'value',
                        someRef: {
                            someRefKey: 'value'
                        }
                    }
                ]
            }
        }
    },
    {
        name: 'should follow nextLink',
        endpointObj: {
            path: '/mgmt/tm/endpoint',
            expandReferences: { someRef: { includeStats: true } },
            includeStats: true,
            pagination: true
        },
        endpoints: [
            {
                endpoint: '/mgmt/tm/endpoint?%24top=30',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/mgmt/tm/endpoint?ver=X.X.X',
                    nextLink: '/mgmt/tm/endpoint?%24top=60&$skip=30',
                    items: [
                        {
                            name: 'object1',
                            selfLink: 'https://localhost/mgmt/tm/endpoint/object1?ver=X.X.X',
                            key: 'value',
                            someRef: {
                                link: 'https://localhost/mgmt/tm/anotherEndpoint/refObject?ver=X.X.X'
                            }
                        }
                    ]
                }
            },
            {
                endpoint: '/mgmt/tm/endpoint?%24top=60&$skip=30',
                response: {
                    kind: 'endpoint:state',
                    selfLink: 'https://localhost/mgmt/tm/endpoint?ver=X.X.X',
                    items: [
                        {
                            name: 'object2',
                            selfLink: 'https://localhost/mgmt/tm/endpoint/object2?ver=X.X.X',
                            key: 'value',
                            someRef: {
                                link: 'https://localhost/mgmt/tm/anotherEndpoint/refObject2?ver=X.X.X'
                            }
                        }
                    ]
                }
            },
            {
                endpoint: '/mgmt/tm/anotherEndpoint/refObject/stats',
                response: {
                    kind: 'anotherEndpoint:stats',
                    selfLink: 'https://localhost/mgmt/tm/anotherEndpoint/refObject/stats?ver=X.X.X',
                    entries: {
                        'https://localhost/mgmt/tm/anotherEndpoint/refObject/stats': {
                            nestedStats: {
                                kind: 'anotherEndpoint:stats',
                                selfLink: 'https://localhost/mgmt/tm/anotherEndpoint/refObject/stats?ver=X.X.X',
                                name: 'anotherStats',
                                statKey: 'statValue'
                            }
                        }
                    }
                }
            },
            {
                endpoint: '/mgmt/tm/anotherEndpoint/refObject',
                response: {
                    kind: 'anotherEndpoint:state',
                    selfLink: 'https://localhost/mgmt/tm/anotherEndpoint/refObject?ver=X.X.X',
                    someKey: 'someValue',
                    items: [
                        {
                            nestedObjectName: 'name'
                        }
                    ]
                }
            },
            {
                endpoint: '/mgmt/tm/endpoint/object1/stats',
                response: {
                    kind: 'endpoint:stats',
                    selfLink: 'https://localhost/mgmt/tm/endpoint/object1/stats?ver=X.X.X',
                    entries: {
                        'https://localhost/mgmt/tm/endpoint/object1/stats': {
                            nestedStats: {
                                kind: 'endpoint:stats',
                                selfLink: 'https://localhost/mgmt/tm/endpoint/object1/stats?ver=X.X.X',
                                statKey: 'statValue'
                            }
                        }
                    }
                }
            },
            {
                endpoint: '/mgmt/tm/anotherEndpoint/refObject2/stats',
                response: {
                    kind: 'anotherEndpoint:stats',
                    selfLink: 'https://localhost/mgmt/tm/anotherEndpoint/refObject2/stats?ver=X.X.X',
                    entries: {
                        'https://localhost/mgmt/tm/anotherEndpoint/refObject2/stats': {
                            nestedStats: {
                                kind: 'anotherEndpoint:stats',
                                selfLink: 'https://localhost/mgmt/tm/anotherEndpoint/refObject2/stats?ver=X.X.X',
                                name: 'anotherStats',
                                statKey: 'statValue2'
                            }
                        }
                    }
                }
            },
            {
                endpoint: '/mgmt/tm/anotherEndpoint/refObject2',
                response: {
                    kind: 'anotherEndpoint:state',
                    selfLink: 'https://localhost/mgmt/tm/anotherEndpoint/refObject2?ver=X.X.X',
                    someKey: 'someValue2',
                    items: [
                        {
                            nestedObjectName: 'name2'
                        }
                    ]
                }
            },
            {
                endpoint: '/mgmt/tm/endpoint/object2/stats',
                response: {
                    kind: 'endpoint:stats',
                    selfLink: 'https://localhost/mgmt/tm/endpoint/object2/stats?ver=X.X.X',
                    entries: {
                        'https://localhost/mgmt/tm/endpoint/object2/stats': {
                            nestedStats: {
                                kind: 'endpoint:stats',
                                selfLink: 'https://localhost/mgmt/tm/endpoint/object2/stats?ver=X.X.X',
                                statKey: 'statValue2'
                            }
                        }
                    }
                }
            }
        ],
        expectedData: {
            name: '/mgmt/tm/endpoint?%24top=30',
            data: {
                kind: 'endpoint:state',
                selfLink: 'https://localhost/mgmt/tm/endpoint?ver=X.X.X',
                items: [
                    {
                        name: 'object1',
                        kind: 'endpoint:stats',
                        selfLink: 'https://localhost/mgmt/tm/endpoint/object1?ver=X.X.X',
                        key: 'value',
                        entries: {
                            'https://localhost/mgmt/tm/endpoint/object1/stats': {
                                nestedStats: {
                                    kind: 'endpoint:stats',
                                    selfLink: 'https://localhost/mgmt/tm/endpoint/object1/stats?ver=X.X.X',
                                    statKey: 'statValue'
                                }
                            }
                        },
                        someRef: {
                            kind: 'anotherEndpoint:state',
                            selfLink: 'https://localhost/mgmt/tm/anotherEndpoint/refObject?ver=X.X.X',
                            entries: {
                                'https://localhost/mgmt/tm/anotherEndpoint/refObject/stats': {
                                    nestedStats: {
                                        kind: 'anotherEndpoint:stats',
                                        selfLink: 'https://localhost/mgmt/tm/anotherEndpoint/refObject/stats?ver=X.X.X',
                                        name: 'anotherStats',
                                        statKey: 'statValue'
                                    }
                                }
                            },
                            someKey: 'someValue',
                            items: [
                                {
                                    nestedObjectName: 'name'
                                }
                            ]
                        }
                    },
                    {
                        name: 'object2',
                        kind: 'endpoint:stats',
                        selfLink: 'https://localhost/mgmt/tm/endpoint/object2?ver=X.X.X',
                        key: 'value',
                        entries: {
                            'https://localhost/mgmt/tm/endpoint/object2/stats': {
                                nestedStats: {
                                    kind: 'endpoint:stats',
                                    selfLink: 'https://localhost/mgmt/tm/endpoint/object2/stats?ver=X.X.X',
                                    statKey: 'statValue2'
                                }
                            }
                        },
                        someRef: {
                            kind: 'anotherEndpoint:state',
                            selfLink: 'https://localhost/mgmt/tm/anotherEndpoint/refObject2?ver=X.X.X',
                            entries: {
                                'https://localhost/mgmt/tm/anotherEndpoint/refObject2/stats': {
                                    nestedStats: {
                                        kind: 'anotherEndpoint:stats',
                                        selfLink: 'https://localhost/mgmt/tm/anotherEndpoint/refObject2/stats?ver=X.X.X',
                                        name: 'anotherStats',
                                        statKey: 'statValue2'
                                    }
                                }
                            },
                            someKey: 'someValue2',
                            items: [
                                {
                                    nestedObjectName: 'name2'
                                }
                            ]
                        }
                    }
                ]
            }
        }
    }
];
