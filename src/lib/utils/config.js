/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const constants = require('../constants');
const declValidator = require('../declarationValidator');
const logger = require('../logger');
const util = require('./misc');

const CLASSES = constants.CONFIG_CLASSES;
const VALIDATOR = declValidator.getValidator();
const POLLER_KEYS = {
    toCopyToMissingSystem: [
        'allowSelfSignedCert', 'enable', 'enableHostConnectivityCheck', 'host',
        'port', 'protocol', 'passphrase', 'trace', 'username'
    ],
    toDelete: [
        'actions', 'allowSelfSignedCert', 'enableHostConnectivityCheck', 'host',
        'port', 'protocol', 'passphrase', 'username'
    ]
};
const IHEALTH_POLLER_KEYS = {
    toDelete: [
        'interval', 'username', 'passphrase', 'proxy'
    ]
};

/** @module configUtil */

/**
 * Gets the config validator
 *
 * @public
 *
 * @returns {Object} An instance of the config validator
 */
function getValidator() {
    return VALIDATOR;
}

/**
 * Validate JSON data against config schema
 *
 * @public
 * @param {Object} validator - the validator instance to use
 * @param {Object} data      - data to validate against config schema
 * @param {Object} [context] - context to pass to validator
 *
 * @returns {Promise.<Object>} Promise which is resolved with the validated schema
*/
function validate(validator, data, context) {
    return declValidator.validate(validator, data, context);
}

/**
 * Get controls object from config
 *
 * @public
 * @param normalizedConfig  - the config to lookup the controls from
 *
 * @returns {Object} The controls object if exists, otherwise {}
 */
function getControls(normalizedConfig) {
    if (normalizedConfig.components) {
        const controls = normalizedConfig.components.find(c => c.class === CLASSES.CONTROLS_CLASS_NAME);
        return controls || {};
    }
    return {};
}

function getComponents(config, className, namespace) {
    if (!config || !config.components) {
        return [];
    }
    if (namespace) {
        return config.components.filter(c => c.class === className && c.namespace === namespace);
    }
    return config.components.filter(c => c.class === className);
}

function getTelemetrySystems(config, namespace) {
    return getComponents(config, CLASSES.SYSTEM_CLASS_NAME, namespace);
}

function getTelemetrySystemPollers(config, namespace) {
    return getComponents(config, CLASSES.SYSTEM_POLLER_CLASS_NAME, namespace);
}

function getTelemetryEndpoints(config, namespace) {
    return getComponents(config, CLASSES.ENDPOINTS_CLASS_NAME, namespace);
}

function getTelemetryConsumers(config, namespace) {
    return getComponents(config, CLASSES.CONSUMER_CLASS_NAME, namespace);
}

function getTelemetryPullConsumers(config, namespace) {
    return getComponents(config, CLASSES.PULL_CONSUMER_CLASS_NAME, namespace);
}

function getTelemetryListeners(config, namespace) {
    return getComponents(config, CLASSES.EVENT_LISTENER_CLASS_NAME, namespace);
}

function getTelemetryIHealthPollers(config, namespace) {
    return getComponents(config, CLASSES.IHEALTH_POLLER_CLASS_NAME, namespace);
}

/**
 * Gets the defaults generated from schema
 * These are for components that are omitted from the declaration
 * but we need to explicitly create later on for mapping
 *
 * @private
 *
 * @returns {Promise.<Object>}
 */
function getComponentDefaults() {
    const defaultDecl = {
        class: 'Telemetry',
        Telemetry_System: {
            class: CLASSES.SYSTEM_CLASS_NAME
        }
    };

    return validate(VALIDATOR, defaultDecl, { expand: true });
}

/**
 * Compute poller trace's value from System and System Poller config
 *
 * @private
 * @param {Boolean|String} [systemTrace] - system's trace config
 * @param {Boolean|String} [pollerTrace] - poller's trace config
 *
 * @returns {Boolean|String} trace's value
 */
function getPollerTraceValue(systemTrace, pollerTrace) {
    if (typeof systemTrace === 'undefined' && typeof pollerTrace === 'undefined') {
        pollerTrace = false;
    } else {
        // we know that one of the values is defined (or both)
        // set default value to true to do not block tracer usage
        systemTrace = typeof systemTrace === 'undefined' ? true : systemTrace;
        pollerTrace = typeof pollerTrace === 'undefined' ? true : pollerTrace;
        if (typeof pollerTrace === 'string') {
            // preserve poller's value
            pollerTrace = systemTrace && pollerTrace;
        } else if (pollerTrace === true) {
            // preserve system's value
            pollerTrace = systemTrace;
        }
    }
    return pollerTrace;
}

function hasSplunkLegacy(config, namespace) {
    return getTelemetryConsumers(config, namespace)
        .some(c => c.type === 'Splunk' && c.format === 'legacy');
}

function getTracePrefix(config) {
    if (config.namespace === constants.DEFAULT_UNNAMED_NAMESPACE) {
        return ''; // keep current behavior
    }
    return `${config.namespace}::`;
}

function updateSystemPollerConfig(systemConfig, pollerConfig, fetchTMStats, isACopy) {
    pollerConfig.id = isACopy || !pollerConfig.id ? util.generateUuid() : pollerConfig.id;
    pollerConfig.name = pollerConfig.name || pollerConfig.id;
    pollerConfig.namespace = pollerConfig.namespace || systemConfig.namespace;
    pollerConfig.traceName = `${getTracePrefix(pollerConfig)}${systemConfig.name}::${pollerConfig.name}`;
    pollerConfig.enable = Boolean(systemConfig.enable && (isACopy ? pollerConfig.orig.enable : pollerConfig.enable));
    pollerConfig.trace = getPollerTraceValue(systemConfig.trace,
        (isACopy ? pollerConfig.orig.trace : pollerConfig.trace));
    pollerConfig.connection = {
        host: systemConfig.host,
        port: systemConfig.port,
        protocol: systemConfig.protocol,
        allowSelfSignedCert: systemConfig.allowSelfSignedCert
    };
    pollerConfig.dataOpts = {
        tags: isACopy ? pollerConfig.dataOpts.tag : pollerConfig.tag,
        actions: isACopy ? pollerConfig.dataOpts.actions : pollerConfig.actions,
        noTMStats: !fetchTMStats
    };
    pollerConfig.credentials = {
        username: systemConfig.username,
        passphrase: systemConfig.passphrase
    };
    POLLER_KEYS.toDelete.forEach((key) => {
        delete pollerConfig[key];
    });
}

function updateIHealthPollerConfig(systemConfig, pollerConfig, isACopy) {
    if (isACopy) {
        pollerConfig.id = util.generateUuid();
        pollerConfig.enable = Boolean(systemConfig.enable && pollerConfig.orig.enable);
        pollerConfig.trace = getPollerTraceValue(systemConfig.trace, pollerConfig.orig.trace);
    } else {
        const ihProxy = pollerConfig.proxy || {};
        pollerConfig.id = pollerConfig.id || util.generateUuid();
        pollerConfig.class = CLASSES.IHEALTH_POLLER_CLASS_NAME;
        pollerConfig.enable = Boolean(systemConfig.enable && pollerConfig.enable);
        pollerConfig.namespace = pollerConfig.namespace || systemConfig.namespace;
        pollerConfig.trace = getPollerTraceValue(systemConfig.trace, pollerConfig.trace);
        pollerConfig.iHealth = {
            name: pollerConfig.name || '',
            credentials: {
                username: pollerConfig.username,
                passphrase: pollerConfig.passphrase
            },
            downloadFolder: pollerConfig.downloadFolder,
            interval: {
                timeWindow: {
                    start: pollerConfig.interval.timeWindow.start,
                    end: pollerConfig.interval.timeWindow.end
                },
                frequency: pollerConfig.interval.frequency,
                day: pollerConfig.interval.day
            }
        };
        pollerConfig.iHealth.proxy = {
            connection: {
                host: ihProxy.host,
                port: ihProxy.port,
                protocol: ihProxy.protocol,
                allowSelfSignedCert: ihProxy.allowSelfSignedCert
            },
            credentials: {
                username: ihProxy.username,
                passphrase: ihProxy.passphrase
            }
        };
        IHEALTH_POLLER_KEYS.toDelete.forEach((key) => {
            delete pollerConfig[key];
        });
    }
    pollerConfig.system = {
        name: systemConfig.name,
        host: systemConfig.host,
        connection: {
            port: systemConfig.port,
            protocol: systemConfig.protocol,
            allowSelfSignedCert: systemConfig.allowSelfSignedCert
        },
        credentials: {
            username: systemConfig.username,
            passphrase: systemConfig.passphrase
        }
    };
}

/**
 * Expand endpoints references in Telemetry_System_Poller objects.
 * 'endpointList' (Array) property will be renamed to 'endpoints' and converted to 'Object'
 *
 * @private
 *
 * @param {Object} originalConfig - original config
 */
function normalizeTelemetryEndpoints(originalConfig) {
    const telemetrySystemPollers = getTelemetrySystemPollers(originalConfig);
    let telemetryEndpoints;

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
            } else if (endpoint.class === CLASSES.ENDPOINTS_CLASS_NAME || endpoint.items) {
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
            endpoint = telemetryEndpoints.find(e => e.name === refs[0]);
            if (refs.length > 1) {
                // reference to a child of Telemetry_Endpoints.items
                endpoint = util.deepCopy(endpoint);
                endpoint.items = { [refs[1]]: endpoint.items[refs[1]] };
            }
            processEndpoint(endpoint, cb);
        }
    }

    telemetrySystemPollers.forEach((poller) => {
        telemetryEndpoints = getTelemetryEndpoints(originalConfig, poller.namespace);
        if (Object.prototype.hasOwnProperty.call(poller, 'endpointList')) {
            const endpoints = {};
            processEndpoint(poller.endpointList, (endpoint) => {
                // each endpoint has 'name' property and it is user's responsibility
                // to avoid 'name' duplicates in 'endpointList'
                if (endpoint.enable) {
                    if (endpoints[endpoint.name]) {
                        const existing = endpoints[endpoint.name];
                        logger.debug(`${poller.name}: endpoint '${endpoint.name}' ('${endpoint.path}') overrides  endpoint '${existing.name}' ('${existing.path}')`);
                    }
                    endpoints[endpoint.name] = endpoint;
                } else {
                    logger.debug(`${poller.name}: ignoring disabled endpoint '${endpoint.name}' ('${endpoint.path}')`);
                }
            });
            poller.endpoints = endpoints;
            delete poller.endpointList;
        }
    });
}

function addConsumerMapping(originalConfig, pollerID, namespace) {
    const consumers = getComponents(originalConfig, CLASSES.CONSUMER_CLASS_NAME, namespace);
    originalConfig.mappings[pollerID] = consumers.length === 0 ? [] : consumers.map(c => c.id);
}

/**
 * Normalize Telemetry_System objects
 *
 * - System objects will have .systemPollers prop that is an array of the pollerIDs
 * - System objects will have .iHealthPoller prop that is an array of the pollerIDs
 * - Pollers nested in the systems will be extracted into separate components
 * - Names and IDs automatically generated
 *
 * @private
 *
 * @param {Object} originalConfig - original config
 */
function normalizeTelemetrySystems(originalConfig) {
    const telemetrySystems = getTelemetrySystems(originalConfig);
    let nameID;
    let existingNames;
    const assignPollerName = (type, poller) => {
        do {
            nameID += 1;
            poller.name = `${type}_${nameID}`;
        } while (existingNames.indexOf(poller.name) !== -1);
    };

    telemetrySystems.forEach((system) => {
        if (typeof system.allowSelfSignedCert === 'undefined') {
            system.allowSelfSignedCert = !constants.STRICT_TLS_REQUIRED;
        }
        const fetchTMStats = hasSplunkLegacy(originalConfig, system.namespace);
        const telemetrySystemPollers = getTelemetrySystemPollers(originalConfig, system.namespace);
        const telemetryIHealthPollers = getTelemetryIHealthPollers(originalConfig, system.namespace);
        // include declared pollers referenced by other systems so we don't reuse their names
        existingNames = telemetrySystemPollers.map(p => p.name);
        nameID = 0;
        system.systemPollers = [];
        if (system.systemPoller) {
            system.systemPollers = Array.isArray(system.systemPoller) ? system.systemPoller : [system.systemPoller];
            delete system.systemPoller;
        }

        system.systemPollers.forEach((systemPoller, index, pollers) => {
            let pollerObj;
            // systemPoller is a string ref
            if (typeof systemPoller === 'string') {
                pollerObj = telemetrySystemPollers.find(p => p.name === systemPoller);
                if (originalConfig.refdPollers.indexOf(pollerObj.id) === -1) {
                    // use existing object apply system overrides
                    // this prop will be deleted later
                    // preserve original values in case we need to clone later same poller is ref'd
                    pollerObj.orig = {
                        enable: pollerObj.enable,
                        trace: pollerObj.trace
                    };
                    updateSystemPollerConfig(system, pollerObj, fetchTMStats);
                } else {
                    // since this was previously ref'd
                    // add a new component so that system overrides can be applied
                    pollerObj = util.deepCopy(pollerObj);
                    updateSystemPollerConfig(system, pollerObj, fetchTMStats, true);
                    originalConfig.components.push(pollerObj);
                }
            // systemPoller is a nested object, so extract out into separate component
            } else {
                pollerObj = systemPoller;
                pollerObj.class = CLASSES.SYSTEM_POLLER_CLASS_NAME;
                assignPollerName('SystemPoller', pollerObj, nameID, existingNames);
                updateSystemPollerConfig(system, pollerObj, fetchTMStats);
                originalConfig.components.push(pollerObj);
                existingNames.push(pollerObj.name);
            }
            // system.systemPollers will now be an array of uuids
            pollers[index] = pollerObj.id;
            originalConfig.refdPollers.push(pollerObj.id);
            addConsumerMapping(originalConfig, pollerObj.id, system.namespace);
        });

        // Hoist iHealthPoller
        const iHealthPoller = system.iHealthPoller || undefined;
        if (typeof iHealthPoller !== 'undefined') {
            let pollerObj;
            // Reset nameID counter
            nameID = 0;
            // iHealthPoller is a reference
            if (typeof iHealthPoller === 'string') {
                pollerObj = telemetryIHealthPollers.find(p => p.name === iHealthPoller);
                if (originalConfig.refdPollers.indexOf(pollerObj.id) === -1) {
                    pollerObj.orig = {
                        enable: pollerObj.enable,
                        trace: pollerObj.trace
                    };
                    updateIHealthPollerConfig(system, pollerObj);
                } else {
                    pollerObj = util.deepCopy(pollerObj);
                    updateIHealthPollerConfig(system, pollerObj, true);
                    originalConfig.components.push(pollerObj);
                }
                addConsumerMapping(originalConfig, pollerObj.id, system.namespace);
                // Add reference
                system.iHealthPoller = pollerObj.id;
            // iHealthPoller is nested, pull into separate component
            } else if (typeof iHealthPoller === 'object') {
                pollerObj = iHealthPoller;
                assignPollerName('iHealthPoller', pollerObj, nameID, existingNames);
                updateIHealthPollerConfig(system, pollerObj);
                originalConfig.components.push(pollerObj);
                existingNames.push(pollerObj.name);
                addConsumerMapping(originalConfig, pollerObj.id, system.namespace);
                // Add reference
                system.iHealthPoller = pollerObj.id;
            }
            originalConfig.refdPollers.push(pollerObj.id);
        }
    });
    const allPollers = getTelemetrySystemPollers(originalConfig).concat(
        getTelemetryIHealthPollers(originalConfig)
    );
    // final cleanup of unneeded props that we used for cloning
    allPollers.forEach((poller) => {
        delete poller.orig;
    });
}

/**
 * Normalize Telemetry_System_Poller objects
 *
 * - System pollers that do not have associated system will create system from defaults
 * - Names and IDs automatically generated
 *
 * @private
 *
 * @param {Object} originalConfig - original config
 */
function normalizeTelemetrySystemPollers(originalConfig, componentDefaults) {
    const allPollers = getTelemetrySystemPollers(originalConfig);
    const pollersWithoutSystem = allPollers
        .filter(poller => originalConfig.refdPollers.indexOf(poller.id) === -1);

    function createSystemFromSystemPoller(systemPoller) {
        const newSystem = componentDefaults[CLASSES.SYSTEM_CLASS_NAME];
        POLLER_KEYS.toCopyToMissingSystem.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(systemPoller, key)) {
                newSystem[key] = systemPoller[key];
            }
        });
        newSystem.id = util.generateUuid();
        newSystem.name = `${systemPoller.name}_System`;
        newSystem.systemPollers = [systemPoller.id];
        return newSystem;
    }

    pollersWithoutSystem.forEach((systemPoller) => {
        const newSystem = createSystemFromSystemPoller(systemPoller);
        const fetchTMStats = hasSplunkLegacy(originalConfig, systemPoller.namespace);
        updateSystemPollerConfig(newSystem, systemPoller, fetchTMStats);
        originalConfig.components.push(newSystem);
    });
}

/**
 * Normalize Telemetry_iHealth_Poller objects
 *
 * - iHealth pollers that do not have associated system will create system from defaults
 * - Names and IDs automatically generated
 *
 * @private
 *
 * @param {Object} originalConfig       - original config
 * @param {Object} componentDefaults    - Default components values
 */
function normalizeTelemetryIHealthPollers(originalConfig, componentDefaults) {
    const allPollers = getTelemetryIHealthPollers(originalConfig);
    const pollersWithoutSystem = allPollers
        .filter(poller => originalConfig.refdPollers.indexOf(poller.id) === -1);

    function createSystemFromIHealthPoller(iHealthPoller) {
        const newSystem = componentDefaults[CLASSES.SYSTEM_CLASS_NAME];
        POLLER_KEYS.toCopyToMissingSystem.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(iHealthPoller, key)) {
                newSystem[key] = iHealthPoller[key];
            }
        });
        newSystem.id = util.generateUuid();
        newSystem.name = `${iHealthPoller.name}_System`;
        newSystem.namespace = iHealthPoller.namespace;
        newSystem.iHealthPoller = iHealthPoller.id;
        newSystem.systemPollers = [];
        return newSystem;
    }

    pollersWithoutSystem.forEach((iHealthPoller) => {
        const newSystem = createSystemFromIHealthPoller(iHealthPoller);
        // Do not copy iHealthPoller secrets to the new System
        ['passphrase', 'username'].forEach((secretKey) => {
            delete newSystem[secretKey];
        });
        // Make sure to update our iHealthPoller config
        updateIHealthPollerConfig(newSystem, iHealthPoller);
        originalConfig.components.push(newSystem);
    });
}

/**
 * Normalize Telemetry_Listener objects
 *
 * - Names automatically generated
 * - Defaults not specified in schema will be added
 *
 * @private
 *
 * @param {Object} originalConfig - original config
 */
function normalizeTelemetryListeners(originalConfig) {
    const listeners = getTelemetryListeners(originalConfig);
    listeners.forEach((listener) => {
        listener.tag = listener.tag || {};
        listener.traceName = `${getTracePrefix(listener)}${listener.name}`;
    });
}

function normalizeTelemetryConsumers(originalConfig) {
    const consumers = getTelemetryConsumers(originalConfig);
    consumers.forEach((consumer) => {
        consumer.traceName = `${getTracePrefix(consumer)}${consumer.name}`;
    });
}

function normalizeTelemetryPullConsumers(originalConfig) {
    const pullConsumers = getTelemetryPullConsumers(originalConfig);
    pullConsumers.forEach((consumer) => {
        consumer.traceName = `${getTracePrefix(consumer)}${consumer.name}`;
    });
}

/**
 * Determines whether class type is used as key for mapping
 *
 * @private
 * @param {String} className - the config object's class name
 *
 * @returns {Boolean} - true if class is a type that should be used as key
 */
function useForMapping(className) {
    const dataSourceClasses = [
        CLASSES.EVENT_LISTENER_CLASS_NAME,
        CLASSES.SYSTEM_POLLER_CLASS_NAME,
        CLASSES.IHEALTH_POLLER_CLASS_NAME,
        // also add mapping for pull consumer so we can look up poller config
        CLASSES.PULL_CONSUMER_CLASS_NAME
    ];
    return dataSourceClasses.indexOf(className) > -1;
}


/**
 * Convert config to format with mapped components for easier consumption
 *
 * @public
 * @param {Object} data - data to format
 *
 * @returns {Promise<Object>} Returns a promise with the converted config
 *
 *      convertedConfig: {
 *          mappings: {
 *            $pollerid: [ $consumerid ]
 *            $eventListenerId: [ $consumerid ]
 *            $pullConsumerId: [ $pollerId ]
 *          },
 *         components: [
 *            {
 *               id : $uuid,
 *               name: $objectName,
 *               class: $className,
 *               .... {rest of config}
 *            }
 *         ]
 *      }
 */
function componentizeConfig(data) {
    // convertedConfig.mappings
    //   for forwarder: map source to destination, so we can tag dataContext as it passes through pipeline
    //   we can inspect dataContext.sourceId which can be the pollerId or eventListenerId
    //   then lookup the corresponding destinations (consumers to load)
    //   for pull consumer: map consumer to the poller so we can look up configuration to use to then fetch data
    // convertedConfig.components
    //   leaving components in array makes it easier to group by property value
    //   e.g. components.filter(c => c.class === 'Telemetry_Consumer' || c.namespace === 'abx')
    //   and find by property value as needed as opposed to needing to traverse each object

    const convertedConfig = {
        mappings: {},
        components: []
    };
    const parseComponent = (obj, namespace) => {
        Object.keys(obj).forEach((k) => {
            const v = obj[k];
            if (typeof v === 'object' && v.class) {
                if (v.class === 'Telemetry_Namespace') {
                    parseComponent(v, k);
                } else {
                    const component = util.copy(v);
                    component.name = k;
                    component.id = util.generateUuid();
                    component.namespace = namespace || constants.DEFAULT_UNNAMED_NAMESPACE;
                    convertedConfig.components.push(component);
                    if (useForMapping(v.class)) {
                        // use namespace as value for lookup
                        convertedConfig.mappings[component.id] = {
                            isPull: v.class === CLASSES.PULL_CONSUMER_CLASS_NAME,
                            namespace: component.namespace
                        };
                    }
                }
            }
        });
    };

    return Promise.resolve(data)
        .then((config) => {
            if (config && typeof config === 'object' && !Array.isArray(config)) {
                parseComponent(data);

                Object.keys(convertedConfig.mappings).forEach((id) => {
                    let receivers;
                    const mapItem = convertedConfig.mappings[id];
                    if (mapItem.isPull) {
                        // add poller references
                        let pollerNames = convertedConfig.components.find(c => c.id === id).systemPoller;
                        if (!Array.isArray(pollerNames)) {
                            pollerNames = [pollerNames];
                        }
                        receivers = convertedConfig.components
                            .filter(c => c.namespace === mapItem.namespace
                                && c.class === CLASSES.SYSTEM_POLLER_CLASS_NAME
                                && pollerNames.indexOf(c.name) > -1)
                            .map(c => c.id);
                    } else {
                        // add consumer references
                        receivers = convertedConfig.components
                            .filter(c => c.namespace === mapItem.namespace
                                && c.class === CLASSES.CONSUMER_CLASS_NAME)
                            .map(c => c.id);
                    }
                    convertedConfig.mappings[id] = receivers;
                });
            }
            return convertedConfig;
        });
}

/**
 * Normalize configuration and expand all references.
 * Modifies the input parameter.
 * It is expected that originalConfig has been pre-parsed into componentized format
 *
 *
 * @param {object} originalConfig - original config, should be copied by caller
 *
 * @returns {Object} normalized configuration with expanded references
 */
function normalizeComponents(originalConfig) {
    if (!originalConfig) {
        return Promise.resolve({});
    }
    originalConfig.refdPollers = [];
    // ensure we're getting our "base" config for missing components based on schema
    return getComponentDefaults()
        .then((defaults) => {
            normalizeTelemetrySystems(originalConfig);
            normalizeTelemetrySystemPollers(originalConfig, defaults);
            normalizeTelemetryIHealthPollers(originalConfig, defaults);
            normalizeTelemetryEndpoints(originalConfig);
            normalizeTelemetryListeners(originalConfig);
            normalizeTelemetryConsumers(originalConfig);
            normalizeTelemetryPullConsumers(originalConfig);
            delete originalConfig.refdPollers;
            return originalConfig;
        });
}

/**
 * Converts config to new normalized format
 * - polymorphic components like poller, systems and endpoints are normalized
 * - mappings for components are added for easy lookup
 *
 * @public
 * @param {Object} data - the config to normalize (declared components must be expanded)
 *
 * @returns {Promise.<Object>} normalized config
 */
function normalizeConfig(data) {
    if (util.isObjectEmpty(data) || Array.isArray(data)) {
        return Promise.resolve({});
    }
    return componentizeConfig(data)
        .then(convertedConfig => normalizeComponents(convertedConfig));
}

/**
 * Converts a namespace config to new normalized format
 * and merges it with existing config
 *
 * @public
 * @param {Object} namespaceConfig - the namespace config to normalize (declared components must already be expanded)
 * @param {String} options.namespaceToUpdate - namespace name
 * @param {Object} options.savedConfig - existing config to merge namespace config with
 *
 * @returns {Promise.<Object>} normalized config
 */
function mergeNamespaceConfig(namespaceConfig, options) {
    const toNormalize = { [options.namespaceToUpdate]: namespaceConfig };

    return this.normalizeConfig(toNormalize)
        .then((namespaceNormalized) => {
            const savedNormalized = options.savedConfig.normalized;
            const removedIds = [];
            savedNormalized.components.forEach((component) => {
                if (component.namespace === options.namespaceToUpdate) {
                    delete savedNormalized.mappings[component.id];
                    removedIds.push(component.id);
                }
            });
            savedNormalized.components = savedNormalized.components.filter(c => removedIds.indexOf(c.id) === -1);
            const allNormalized = {
                mappings: Object.assign(savedNormalized.mappings, namespaceNormalized.mappings),
                components: savedNormalized.components.concat(namespaceNormalized.components)
            };
            return allNormalized;
        });
}

module.exports = {
    getPollerTraceValue,
    getValidator,
    validate,
    componentizeConfig,
    normalizeComponents,
    normalizeConfig,
    mergeNamespaceConfig,
    getControls,
    getTelemetrySystems,
    getTelemetrySystemPollers,
    getTelemetryConsumers,
    getTelemetryPullConsumers,
    getTelemetryListeners,
    getTelemetryIHealthPollers
};
