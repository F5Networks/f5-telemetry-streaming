/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const constants = require('./constants');
const logger = require('./logger');
const util = require('./util');

const CONFIG_CLASSES = constants.CONFIG_CLASSES;

/** @module normalizeConfig */

function getTelemetryObjects(originalConfig, className) {
    return originalConfig[className] || {};
}

function getTelemetrySystems(originalConfig) {
    return getTelemetryObjects(originalConfig, CONFIG_CLASSES.SYSTEM_CLASS_NAME);
}

function getTelemetrySystemPollers(originalConfig) {
    return getTelemetryObjects(originalConfig, CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME);
}

function getTelemetryEndpoints(originalConfig) {
    return getTelemetryObjects(originalConfig, CONFIG_CLASSES.ENDPOINTS_CLASS_NAME);
}

/**
 * Force allowSelfSignedCert to default value if not specified
 *
 * @param {Object} originalConfig - origin config
 */
function verifyAllowSelfSignedCert(originalConfig) {
    const telemetrySystems = getTelemetrySystems(originalConfig);
    Object.keys(telemetrySystems).forEach((systemName) => {
        const system = telemetrySystems[systemName];
        if (typeof system.allowSelfSignedCert === 'undefined') {
            system.allowSelfSignedCert = !constants.STRICT_TLS_REQUIRED;
        }
    });
}

/**
 * Expand endpoints references in Telemetry_System objects.
 * 'endpointList' (Array) property will be renamed to 'endpoints' and converted to 'Object'
 *
 * @param {Object} originalConfig - origin config
 */
function normalizeTelemetryEndpoints(originalConfig) {
    const telemetryEndpoints = getTelemetryEndpoints(originalConfig);
    const telemetrySystems = getTelemetrySystems(originalConfig);

    function computeBasePath(endpoint) {
        let basePath = '';
        if (endpoint.basePath && endpoint.basePath.length > 0) {
            const pathPrefix = endpoint.basePath.startsWith('/') ? '' : '/';
            if (endpoint.basePath.endsWith('/')) {
                basePath = endpoint.basePath.substring(0, endpoint.basePath.length - 1);
            } else {
                basePath = endpoint.basePath;
            }
            basePath = `${pathPrefix}${basePath}`;
        }
        endpoint.basePath = basePath;
    }

    function fixEndpointPath(endpoint) {
        endpoint.path = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;
    }

    function parseEndpointItem(endpoint, key) {
        const innerEndpoint = util.deepCopy(endpoint.items[key]);
        fixEndpointPath(innerEndpoint);
        innerEndpoint.enable = endpoint.enable && innerEndpoint.enable;
        innerEndpoint.path = `${endpoint.basePath}${innerEndpoint.path}`;
        // 'key' is endpoint's name too, but if 'name' defined, then use it
        // because it might be actual endpoint's name and 'key' (in this situation)
        // might be just 'unique key' to store endpoints with similar names but
        // different paths under Telemetry_Endpoints (e.g 'key' indicates different
        // BIG-IP versions)
        innerEndpoint.name = innerEndpoint.name || key;
        return innerEndpoint;
    }

    function processEndpoint(endpoint, cb) {
        if (typeof endpoint === 'object') {
            // array of definitions - can be all of the following
            if (Array.isArray(endpoint)) {
                endpoint.forEach(innerEndpoint => processEndpoint(innerEndpoint, cb));
            // endpoint is Telemetry_Endpoints
            } else if (endpoint.class === CONFIG_CLASSES.ENDPOINTS_CLASS_NAME || endpoint.items) {
                // don't need to copy 'endpoint' because it was either reference or inline config
                computeBasePath(endpoint);
                Object.keys(endpoint.items).forEach(key => cb(parseEndpointItem(endpoint, key)));
            // endpoint is Telemetry_Endpoint
            } else if (typeof endpoint.path === 'string') {
                // it has 'name' and 'path' properties already (see endpoints_schema.json)
                fixEndpointPath(endpoint);
                cb(endpoint);
            }
        } else if (typeof endpoint === 'string') {
            const refs = endpoint.split('/');
            // reference to a Telemetry_Endpoints object
            // format is ObjectName/pathName
            endpoint = telemetryEndpoints[refs[0]];
            if (refs.length > 1) {
                // reference to a child of Telemetry_Endpoints.items
                endpoint = util.deepCopy(endpoint);
                endpoint.items = { [refs[1]]: endpoint.items[refs[1]] };
            }
            processEndpoint(endpoint, cb);
        }
    }

    Object.keys(telemetrySystems).forEach((systemName) => {
        const system = telemetrySystems[systemName];
        system.systemPollers.forEach((poller) => {
            if (Object.prototype.hasOwnProperty.call(poller, 'endpointList')) {
                const endpoints = {};
                processEndpoint(poller.endpointList, (endpoint) => {
                    // each endpoint has 'name' property and it is user's responsibility
                    // to avoid 'name' duplicates in 'endpointList'
                    if (endpoint.enable) {
                        if (endpoints[endpoint.name]) {
                            const existing = endpoints[endpoint.name];
                            logger.debug(`${systemName}: endpoint '${endpoint.name}' ('${endpoint.path}') overrides  endpoint '${existing.name}' ('${existing.path}')`);
                        }
                        endpoints[endpoint.name] = endpoint;
                    } else {
                        logger.debug(`${systemName}: ignoring disabled endpoint '${endpoint.name}' ('${endpoint.path}')`);
                    }
                });
                poller.endpoints = endpoints;
                delete poller.endpointList;
            }
        });
    });
}

/**
 * Expand references in Telemetry_System objects
 * Note: as result each System and its System Pollers will have 'name' property with actual name
 *
 * @param {Object} originalConfig - origin config
 */
function normalizeTelemetrySystems(originalConfig) {
    const sysPollersToDelete = {};
    const telemetrySystems = getTelemetrySystems(originalConfig);
    const telemetrySystemPollers = getTelemetrySystemPollers(originalConfig);
    const keysToCopy = [
        'actions', 'enable', 'endpointList',
        'interval', 'tag', 'trace'
    ];

    const copySystemPoller = (systemPoller) => {
        const newSystemPoller = {};
        systemPoller = util.deepCopy(systemPoller);
        keysToCopy.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(systemPoller, key)) {
                newSystemPoller[key] = systemPoller[key];
            }
        });
        return newSystemPoller;
    };

    const createSystemPollerName = id => `SystemPoller_${id}`;

    Object.keys(telemetrySystems).forEach((systemName) => {
        const system = telemetrySystems[systemName];
        system.name = systemName;

        system.systemPollers = system.systemPoller;
        delete system.systemPoller;

        if (!Array.isArray(system.systemPollers)) {
            system.systemPollers = system.systemPollers ? [system.systemPollers] : [];
        }
        // existing Telemetry_System_Poller names
        const existingNames = [];
        system.systemPollers.forEach((systemPoller, index, pollers) => {
            // systemPoller can be either string or object
            if (typeof systemPoller === 'string') {
                // expand reference and replace it with existing configuration
                sysPollersToDelete[systemPoller] = true;
                pollers[index] = copySystemPoller(telemetrySystemPollers[systemPoller]);
                pollers[index].name = systemPoller;
                existingNames.push(systemPoller);
            }
        });
        // time to assign name to pollers without name
        let nameID = 0;
        system.systemPollers.forEach((systemPoller) => {
            if (typeof systemPoller.name === 'undefined') {
                do {
                    nameID += 1;
                    systemPoller.name = createSystemPollerName(nameID);
                } while (existingNames.indexOf(systemPoller.name) !== -1);
            }
        });
    });
    // remove System Pollers that were used as references
    Object.keys(sysPollersToDelete).forEach((key) => {
        delete telemetrySystemPollers[key];
    });
}

/**
 * Convert Telemetry_System_Poller to Telemetry_System
 * Note: as result each System and its System Pollers will have 'name' property with actual name
 *
 * @param {Object} originalConfig - origin config
 */
function normalizeTelemetrySystemPollers(originalConfig) {
    const telemetrySystems = getTelemetrySystems(originalConfig);
    const telemetrySystemPollers = getTelemetrySystemPollers(originalConfig);
    const keysToCopy = [
        'allowSelfSignedCert', 'enable', 'enableHostConnectivityCheck', 'host',
        'port', 'protocol', 'passphrase', 'trace', 'username'
    ];
    const skipDelete = ['enable', 'trace'];
    delete originalConfig[CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME];

    function createSystemFromSystemPoller(systemPollerName, systemPoller) {
        /**
         * if Telemetry_System_Poller is not referenced by any of Telemetry_System
         * then it should be converted to Telemetry_System.
         * Don't need to make copy of origin object.
         */
        delete systemPoller.class;
        const newSystem = {
            class: CONFIG_CLASSES.SYSTEM_CLASS_NAME
        };
        keysToCopy.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(systemPoller, key)) {
                newSystem[key] = systemPoller[key];
                if (skipDelete.indexOf(key) === -1) {
                    delete systemPoller[key];
                }
            }
        });

        systemPoller.name = systemPollerName;
        newSystem.name = systemPollerName;
        newSystem.systemPollers = [systemPoller];
        return newSystem;
    }

    Object.keys(telemetrySystemPollers).forEach((systemPollerName) => {
        logger.debug(`Converting ${CONFIG_CLASSES.SYSTEM_POLLER_CLASS_NAME} '${systemPollerName}' to ${CONFIG_CLASSES.SYSTEM_CLASS_NAME}`);
        telemetrySystems[systemPollerName] = createSystemFromSystemPoller(
            systemPollerName, telemetrySystemPollers[systemPollerName]
        );
    });
    if (Object.keys(telemetrySystems).length) {
        originalConfig[CONFIG_CLASSES.SYSTEM_CLASS_NAME] = telemetrySystems;
    }
}

/**
 * Normalize configuration and expand all references.
 *
 * @param {object} originalConfig - original config, should be copied by caller
 *
 * @returns {Object} normalized configuration with expanded references
 */
module.exports = function (originalConfig) {
    /**
     * Assume that originalConfig is valid declaration.
     * originalConfig should look like following:
     * {
     *     'classNameA': {
     *          'objectA': {},
     *          'objectB': {}
     *      },
     *      ...
     *      'classNameZ': {
     *          'objectY': {},
     *          'objectZ': {}
     *      }
     * }
     */
    // TODO: add normalization for Telemetry_iHealth_Poller and Telemetry_Listener classes
    normalizeTelemetrySystems(originalConfig);
    normalizeTelemetrySystemPollers(originalConfig);
    verifyAllowSelfSignedCert(originalConfig);
    normalizeTelemetryEndpoints(originalConfig);
    return originalConfig;
};
