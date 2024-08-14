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

const pathUtil = require('path');
const crypto = require('crypto');

const constants = require('../constants');
const declValidator = require('../declarationValidator');
const deviceUtil = require('./device');
const logger = require('../logger');
const util = require('./misc');

/** @module utils/config */

const CLASSES = constants.CONFIG_CLASSES;
const POLLER_KEYS = {
    toCopyToMissingSystem: [
        'allowSelfSignedCert', 'enable', 'enableHostConnectivityCheck', 'host', 'name', 'namespace',
        'port', 'protocol', 'passphrase', 'trace', 'username'
    ],
    toDelete: [
        'actions', 'allowSelfSignedCert', 'enableHostConnectivityCheck', 'host',
        'port', 'protocol', 'passphrase', 'tag', 'username', 'usedAsRef'
    ]
};
const IHEALTH_POLLER_KEYS = {
    toDelete: [
        'downloadFolder', 'interval', 'username', 'passphrase', 'proxy', 'usedAsRef'
    ]
};

// store reference to module.exports to be able to refer to function outside of module.exports
let _module;

/**
 * Returns correct value for 'allowSelfSignedCert' property
 *
 * @param {object} config - config
 * @param {boolean} [config.allowSelfSignedCert]
 *
 * @returns {boolean}
 */
function getAllowSelfSignedCertVal(config) {
    return typeof config.allowSelfSignedCert === 'undefined'
        ? !constants.STRICT_TLS_REQUIRED
        : config.allowSelfSignedCert;
}

/**
 * Remove useless components
 *
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 */
function cleanupComponents(convertedConfig) {
    removeComponents(convertedConfig, { class: CLASSES.NAMESPACE_CLASS_NAME });
}

/**
 * Convert config to format with single-level components for easier consumption
 *
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {object} originConfig - original declaration
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} when original declaration converted into component-based config
 */
function componentizeConfig(originConfig, convertedConfig) {
    // convertedConfig.components
    //   leaving components in array makes it easier to group by property value
    //   e.g. components.filter(c => c.class === 'Telemetry_Consumer' || c.namespace === 'abx')
    //   and find by property value as needed as opposed to needing to traverse each object
    const parseComponent = (obj, namespace) => {
        Object.keys(obj).forEach((k) => {
            const v = obj[k];
            if (typeof v === 'object' && v.class) {
                if (v.class === CLASSES.NAMESPACE_CLASS_NAME) {
                    /**
                     * namespace should be converted to a component too
                     * to handle cases when Telemetry_Namespace has no objects in it
                     */
                    convertedConfig.components.push({
                        name: k,
                        class: CLASSES.NAMESPACE_CLASS_NAME,
                        namespace: k
                    });
                    parseComponent(v, k);
                } else {
                    const component = util.deepCopy(v);
                    component.name = k;
                    component.namespace = namespace || constants.DEFAULT_UNNAMED_NAMESPACE;
                    convertedConfig.components.push(component);

                    if (v.class === CLASSES.PULL_CONSUMER_CLASS_NAME) {
                        const pollerGroup = {
                            class: CLASSES.PULL_CONSUMER_SYSTEM_POLLER_GROUP_CLASS_NAME,
                            namespace: namespace || constants.DEFAULT_UNNAMED_NAMESPACE,
                            pullConsumer: component.name
                        };
                        convertedConfig.components.push(pollerGroup);
                    }
                }
            }
        });
    };
    if (convertedConfig.components.some((c) => c.namespace === constants.DEFAULT_UNNAMED_NAMESPACE)) {
        // add 'default' namespace as object too, will be removed later
        convertedConfig.components.push({
            name: constants.DEFAULT_UNNAMED_NAMESPACE,
            class: CLASSES.NAMESPACE_CLASS_NAME,
            namespace: constants.DEFAULT_UNNAMED_NAMESPACE
        });
    }
    parseComponent(originConfig);
}

/**
 * Gets the defaults generated from schema
 * These are for components that are omitted from the declaration
 * but we need to explicitly create later on for mapping
 *
 * @returns {object} once got default values from the schema
 */
async function getComponentDefaults() {
    const defaultDecl = {
        class: 'Telemetry',
        Telemetry_System: {
            class: CLASSES.SYSTEM_CLASS_NAME
        }
    };
    return _module.validate(_module.getValidators().full, defaultDecl, { expand: true });
}

/**
 * Compute poller trace's value from System and System Poller/iHealth Poller config
 *
 * ------------------+
 * pollerTrace  ---> |  undefined   truthful    falsy
 * ------------------+
 * systemTrace       |
 * ------------------+
 * undefined            false       truthful    false
 * truthful             truthful    truthful    false
 * falsy                false       false       false
 *
 * @param {boolean | string | undefined} [systemTrace] - system's trace config
 * @param {boolean | string | undefined} [pollerTrace] - poller's trace config
 *
 * @returns {boolean | string} trace's value
 */
function getPollerTraceValue(systemTrace, pollerTrace) {
    if (typeof systemTrace === 'undefined' && typeof pollerTrace === 'undefined') {
        return false;
    }
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
    return pollerTrace;
}

/**
 * @param {Component} component - component
 *
 * @returns {string} trace prefix, which is the namespace (even for the default namespace)
 */
function getTracePrefix(component) {
    return `${component.namespace}::`;
}

/**
 * @param {Component} component - component
 * @param {boolean | object | string} [traceConfig] - trace config to process instead of component.trace
 *
 * @returns {TracerConfig} Tracer config
 */
function getTracerConfig(component, traceConfig) {
    traceConfig = arguments.length > 1 ? traceConfig : component.trace;
    if (Array.isArray(traceConfig)) {
        return traceConfig.map((config) => getTracerConfig(component, config));
    }
    if (typeof traceConfig !== 'object') {
        /**
         * old-style tracer configuration, possible values are true, false, "pathToFile"
         */
        return getTracerConfig(component, {
            enable: !!traceConfig,
            path: typeof traceConfig === 'string' ? traceConfig : undefined, // undefined will be converted to default path by assignDefaults,
            type: 'output'
        });
    }
    const pathPrefix = traceConfig.type === 'input' ? 'INPUT.' : '';
    const maxRecords = traceConfig.type === 'input' ? constants.TRACER.MAX_RECORDS_INPUT : constants.TRACER.MAX_RECORDS_OUTPUT;
    traceConfig = util.assignDefaults(util.deepCopy(traceConfig), {
        enable: true,
        encoding: constants.TRACER.ENCODING,
        maxRecords,
        path: traceConfig.path || pathUtil.join(constants.TRACER.DIR, `${pathPrefix}${component.class}.${component.traceName}`),
        type: 'output'
    });
    traceConfig.enable = component.enable && traceConfig.enable;
    return traceConfig;
}

/**
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} when unique ID generated for each Component within Configuration
 */
function generateComponentsIDs(convertedConfig) {
    _module.getComponents(convertedConfig)
        .forEach((component) => {
            // ATTENTION: have to call 'generateUuid' with 'component' as context to be able to generate
            // predictable IDs for testing
            component.id = util.generateUuid.call(component);
        });
}

/**
 * Get Telemetry_Endpoints objects
 *
 * @param {Configuration} config - config
 * @param {FilterOptions} [filter] - filtering options
 *
 * @returns {Component[]} array of Telemetry_Endpoints objects
 */
function getTelemetryEndpoints(config, filter = {}) {
    return _module.getComponents(config, {
        ...filter,
        ...{
            class: CLASSES.ENDPOINTS_CLASS_NAME
        }
    });
}

/**
 * Get Telemetry_System objects
 *
 * @param {Configuration} config - config
 *
 * @returns {Component[]} array of Telemetry_System objects
 */
function getTelemetrySystems(config) {
    return _module.getComponents(config, { class: CLASSES.SYSTEM_CLASS_NAME });
}

/**
 * Get Telemetry_Pull_Consumer_System_Poller_Group objects
 *
 * @param {Configuration} config - config
 * @param {FilterOptions} [filter] - filtering options
 *
 * @returns {Component[]} array of Telemetry_Pull_Consumer_System_Poller_Group objects
 */
function getTelemetryPullConsumerSystemPollerGroups(config, filter = {}) {
    return _module.getComponents(config, {
        ...filter,
        ...{
            class: CLASSES.PULL_CONSUMER_SYSTEM_POLLER_GROUP_CLASS_NAME
        }
    });
}

/**
 * @param {Configuration} config - config
 * @param {string | function} [namespace] - namespace
 *
 * @returns {boolean} true when Splunk consumer configured with "legacy" format
 */
function hasSplunkLegacy(config, namespace) {
    return _module.getTelemetryConsumers(config, {
        filter: (c) => c.type === 'Splunk' && c.format === 'legacy',
        namespace
    }).length > 0;
}

/**
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} once data sources mapped to data receivers
 */
function mapComponents(convertedConfig) {
    // convertedConfig.mappings
    //   for forwarder: map source to destination, so we can tag dataContext as it passes through pipeline
    //   we can inspect dataContext.sourceId which can be the pollerId or eventListenerId
    //   then lookup the corresponding destinations (consumers to load)
    //   for pull consumer: map consumer to the poller so we can look up configuration to use to then fetch data
    _module.getComponents(convertedConfig).forEach((component) => {
        if (useForMapping(component.class) && component.enable) {
            const receivers = [];
            if (component.class === CLASSES.PULL_CONSUMER_SYSTEM_POLLER_GROUP_CLASS_NAME) {
                receivers.push(_module.getTelemetryPullConsumers(convertedConfig, {
                    id: component.pullConsumer,
                    namespace: component.namespace
                })[0]);
            } else if (!(component.class === CLASSES.SYSTEM_POLLER_CLASS_NAME && component.interval === 0)) {
                _module.getTelemetryConsumers(convertedConfig, { namespace: component.namespace })
                    .forEach((c) => receivers.push(c));
            }

            const enabledReceivers = receivers.filter((r) => r.enable);
            if (enabledReceivers.length) {
                convertedConfig.mappings[component.id] = enabledReceivers.map((p) => {
                    logger.debug(`Creating a route for data to "${p.traceName}" (${p.class}) from "${component.traceName}" (${component.class})`);
                    return p.id;
                });
            } else {
                logger.debug(`No data route created for "${component.traceName}" (${component.class}) - no data sources/receivers`);
            }
        }
    });
}

/**
 * Normalize configuration and expand all references.
 *
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} once configuration normalized
 */
async function normalizeComponents(convertedConfig) {
    // ensure we're getting our "base" config for missing components based on schema
    const defaults = await getComponentDefaults();
    normalizeTelemetrySystems(convertedConfig);
    normalizeTelemetrySystemPollers(convertedConfig, defaults);
    normalizeTelemetryPullConsumerSystemPollerGroups(convertedConfig);
    normalizeTelemetryIHealthPollers(convertedConfig, defaults);
    normalizeTelemetryEndpoints(convertedConfig);
    normalizeTelemetryListeners(convertedConfig);
    normalizeTelemetryConsumers(convertedConfig);
    normalizeTelemetryPullConsumers(convertedConfig);
    generateComponentsIDs(convertedConfig);
    postProcessTelemetryPullConsumerSystemPollerGroups(convertedConfig);
}

/**
 * Expand endpoints references in Telemetry_System_Poller objects.
 * 'endpointList' (Array) property will be renamed to 'endpoints' and converted to 'Object'
 *
 * Note: once expanded then all components with class Telemetry_Endpoints will be removed
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} once Telemetry_Endpoints objects normalized
 */
function normalizeTelemetryEndpoints(convertedConfig) {
    const telemetrySystemPollers = _module.getTelemetrySystemPollers(convertedConfig);
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
        endpoint.path = endpoint.protocol === 'snmp' || endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;
    }

    function parseEndpointItem(endpoint, key) {
        const innerEndpoint = util.deepCopy(endpoint.items[key]);
        fixEndpointPath(innerEndpoint);
        innerEndpoint.enable = endpoint.enable && innerEndpoint.enable;
        // Only add 'basePath' prefix to http endpoints
        if (innerEndpoint.protocol === 'http') {
            innerEndpoint.path = `${endpoint.basePath}${innerEndpoint.path}`;
        }
        // 'key' is endpoint's name too, but if 'name' defined, then use it
        // because it might be actual endpoint's name and 'key' (in this situation)
        // might be just 'unique key' to store endpoints with similar names but
        // different paths under Telemetry_Endpoints (e.g 'key' indicates different
        // BIG-IP versions)
        innerEndpoint.name = innerEndpoint.name || key;
        return innerEndpoint;
    }

    // remove leading and trailing '/'
    function trimPath(val) {
        return val.substring(
            val.startsWith('/') ? 1 : 0,
            val.endsWith('/') ? (val.length - 1) : val.length
        );
    }

    function processEndpoint(endpoint, cb) {
        if (typeof endpoint === 'object') {
            // array of definitions - can be all of the following
            if (Array.isArray(endpoint)) {
                endpoint.forEach((innerEndpoint) => processEndpoint(innerEndpoint, cb));
            // endpoint is Telemetry_Endpoints
            } else if (endpoint.class === CLASSES.ENDPOINTS_CLASS_NAME || endpoint.items) {
                // don't need to copy 'endpoint' because it was either reference or inline config
                computeBasePath(endpoint);
                Object.keys(endpoint.items).forEach((key) => cb(parseEndpointItem(endpoint, key)));
            // endpoint is Telemetry_Endpoint
            } else if (typeof endpoint.path === 'string') {
                // it has 'name' and 'path' properties already (see endpoints_schema.json)
                fixEndpointPath(endpoint);
                cb(endpoint);
            }
        } else if (typeof endpoint === 'string') {
            const refs = trimPath(endpoint).split('/');
            // reference to a Telemetry_Endpoints object
            // format is ObjectName/pathName
            endpoint = telemetryEndpoints.find((e) => e.name === refs[0]);
            if (refs.length > 1) {
                // reference to a child of Telemetry_Endpoints.items
                endpoint = util.deepCopy(endpoint);
                endpoint.items = { [refs[1]]: endpoint.items[refs[1]] };
            }
            processEndpoint(endpoint, cb);
        }
    }

    telemetrySystemPollers.forEach((poller) => {
        telemetryEndpoints = getTelemetryEndpoints(convertedConfig, { namespace: poller.namespace });
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

    // remove those endpoints - we don't need them any more
    removeComponents(convertedConfig, { class: CLASSES.ENDPOINTS_CLASS_NAME });
}

/**
 * Normalize Telemetry_iHealth_Poller objects
 *
 * Note: all unbound Telemetry_iHealth_Pollers will be removed
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} once Telemetry_iHealth_Poller objects normalized
 */
function normalizeTelemetryIHealthPollers(convertedConfig) {
    /**
     * Don't need to normalize like Telemetry_System_Poller because:
     * - bound/attached pollers processed in 'normalizeTelemetrySystems' already
     * - unbound Telemetry_iHealth_Poller should be ignored because
     *   - to follow old behavior
     *   - Telemetry_iHealth_Poller has no ability to configure host, port and etc.
     *     and should be attached to Telemetry_System instead
     */
    const pollersWithoutSystem = _module
        .getTelemetryIHealthPollers(convertedConfig, { filter: (p) => typeof p.system === 'undefined' });

    // remove those pollers - we don't need them any more
    removeComponents(convertedConfig, {
        class: CLASSES.IHEALTH_POLLER_CLASS_NAME,
        filter: (c) => pollersWithoutSystem.indexOf(c) !== -1
    });
}

/**
 * Normalize Telemetry_Listener objects
 *
 * - Names automatically generated
 * - Defaults not specified in schema will be added
 *
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} once Telemetry_Listener objects normalized
 */
function normalizeTelemetryListeners(convertedConfig) {
    const listeners = _module.getTelemetryListeners(convertedConfig);
    listeners.forEach((listener) => {
        listener.tag = listener.tag || {};
        listener.traceName = `${getTracePrefix(listener)}${listener.name}`;

        let traceConfigs = getTracerConfig(listener);
        traceConfigs = Array.isArray(traceConfigs) ? traceConfigs : [traceConfigs];
        listener.trace = traceConfigs.find((t) => t.type === 'output')
            || getTracerConfig(listener, false);
        listener.traceInput = traceConfigs.find((t) => t.type === 'input')
            || getTracerConfig(listener, { enable: false, type: 'input' });
    });
}

/**
 * Normalize Telemetry_Consumer objects
 *
 * - Names automatically generated
 * - Defaults not specified in schema will be added
 *
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} once Telemetry_Consumer objects normalized
 */
function normalizeTelemetryConsumers(convertedConfig) {
    const consumers = _module.getTelemetryConsumers(convertedConfig);
    consumers.forEach((consumer) => {
        consumer.traceName = `${getTracePrefix(consumer)}${consumer.name}`;
        consumer.trace = getTracerConfig(consumer);
        consumer.allowSelfSignedCert = getAllowSelfSignedCertVal(consumer);
    });
}

/**
 * Normalize Telemetry_Pull_Consumer objects
 *
 * - Names automatically generated
 * - Defaults not specified in schema will be added
 *
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} once Telemetry_Pull_Consumer objects normalized
 */
function normalizeTelemetryPullConsumers(convertedConfig) {
    const pullConsumers = _module.getTelemetryPullConsumers(convertedConfig);
    pullConsumers.forEach((consumer) => {
        consumer.traceName = `${getTracePrefix(consumer)}${consumer.name}`;
        consumer.trace = getTracerConfig(consumer);
        delete consumer.systemPoller;
    });
}

/**
 * Normalize Telemetry_Pull_Consumer_System_Poller_Group objects
 *
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} once Telemetry_Pull_Consumer_System_Poller_Group objects normalized
 */
function normalizeTelemetryPullConsumerSystemPollerGroups(convertedConfig) {
    // at that point Telemetry_System and Telemetry_System_Poller
    // objects should be normalized already. Should happen BEFORE
    // Telemetry_Pull_Consumer normalization
    /**
     * Combination of (class, namespace, name) is unique because:
     * - component's name is unique withing namespace
     * - Telemetry_Pull_Consumer_System_Poller_Group is not public class
     * As result:
     * - safe to assign name based on component's name
     *   without checking for existence
     * - safe to refer to a pull consumer by name within namespace scope
     */
    const systemPollerGroups = getTelemetryPullConsumerSystemPollerGroups(convertedConfig);

    systemPollerGroups.forEach((pollerGroup) => {
        const pullConsumer = _module.getTelemetryPullConsumers(convertedConfig, {
            name: pollerGroup.pullConsumer,
            namespace: pollerGroup.namespace
        })[0];

        pollerGroup.enable = pullConsumer.enable;
        pollerGroup.name = `${pollerGroup.class}_${pullConsumer.name}`;
        pollerGroup.traceName = `${getTracePrefix(pollerGroup)}${pollerGroup.name}`;
        // disable tracing, rely on pull consumer and system poller(s) tracing
        pollerGroup.trace = { enable: false };
        pollerGroup.systemPollers = Array.isArray(pullConsumer.systemPoller)
            ? pullConsumer.systemPoller
            : [pullConsumer.systemPoller];
    });
}

/**
 * Normalize Telemetry_System objects
 *
 * Note: once normalize then all Telemetry_Systems will be removed
 *
 * - Pollers nested in the systems will be extracted into separate components
 * - Names automatically generated
 *
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} once Telemetry_System objects normalized
 */
function normalizeTelemetrySystems(convertedConfig) {
    const telemetrySystems = getTelemetrySystems(convertedConfig);
    const preExistingTelemetrySystemPollers = _module.getTelemetrySystemPollers(convertedConfig);
    const preExistingTelemetryIHealthPollers = _module.getTelemetryIHealthPollers(convertedConfig);

    // remove Telemetry_Systems from the array of components
    removeComponents(convertedConfig, { class: CLASSES.SYSTEM_CLASS_NAME });

    let nameID;
    let existingNames;
    const assignPollerName = (type, poller) => {
        do {
            nameID += 1;
            poller.name = `${type}_${nameID}`;
        } while (existingNames.indexOf(poller.name) !== -1);
    };

    telemetrySystems.forEach((system) => {
        const fetchTMStats = hasSplunkLegacy(convertedConfig, system.namespace);
        // reset nameID for each system - don't want to reuse name within system only
        nameID = 0;
        system.systemPollers = [];
        if (system.systemPoller) {
            system.systemPollers = Array.isArray(system.systemPoller) ? system.systemPoller : [system.systemPoller];
            delete system.systemPoller;
        }
        system.allowSelfSignedCert = getAllowSelfSignedCertVal(system);
        system.systemPollers.forEach((systemPoller) => {
            // systemPoller is a string ref
            let pollerObj;
            if (typeof systemPoller === 'string') {
                // looking for unbound pre-existing Telemetry_System_Poller in same namespace
                pollerObj = preExistingTelemetrySystemPollers
                    .find((p) => p.namespace === system.namespace && p.name === systemPoller);
                if (!pollerObj) {
                    logger.debug(`Unable to find Telemetry_System_Poller referenced by name "${systemPoller}" for Telemetry_System "${system.name}" in Telemetry_Namespace "${system.namespace}"`);
                    return;
                }
                pollerObj.usedAsRef = true;
            } else {
                // systemPoller is a nested object, so extract out into separate component
                pollerObj = systemPoller;
                // refresh list of existing name within system
                existingNames = _module.getTelemetrySystemPollers(convertedConfig, {
                    namespace: system.namespace,
                    filter: (p) => p.systemName === system.name
                }).map((p) => p.name);
                assignPollerName('SystemPoller', pollerObj);
            }
            pollerObj = updateSystemPollerConfig(system, util.deepCopy(pollerObj), fetchTMStats);
            convertedConfig.components.push(pollerObj);
        });

        // Hoist iHealthPoller
        const iHealthPoller = system.iHealthPoller || undefined;
        if (typeof iHealthPoller !== 'undefined') {
            let pollerObj;
            // Reset nameID counter
            nameID = 0;
            // iHealthPoller is a reference
            if (typeof iHealthPoller === 'string') {
                // looking for unbound pre-existing Telemetry_iHealth_Poller in same namespace
                pollerObj = preExistingTelemetryIHealthPollers
                    .find((p) => p.namespace === system.namespace && p.name === iHealthPoller);
                if (!pollerObj) {
                    logger.debug(`Unable to find Telemetry_iHealth_Poller referenced by name "${iHealthPoller}" for Telemetry_System "${system.name}" in Telemetry_Namespace "${system.namespace}"`);
                    return;
                }
                pollerObj.usedAsRef = true;
            } else {
                // iHealth is a nested object, so extract out into separate component
                pollerObj = iHealthPoller;
                // set to empty list becuase only 1 iHealth Poller per System allowed to be configured
                // no need to search for other iHealth pollers withing the system's scope
                existingNames = [];
                assignPollerName('iHealthPoller', pollerObj);
            }
            pollerObj = updateIHealthPollerConfig(system, util.deepCopy(pollerObj));
            convertedConfig.components.push(pollerObj);
        }
    });
}

/**
 * Normalize Telemetry_System_Poller objects
 *
 * - System pollers that do not have associated system will create system from defaults
 * - Names automatically generated
 *
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 * @param {object} componentDefaults - default components values
 *
 * @returns {void} once Telemetry_System_Poller objects normalized
 */
function normalizeTelemetrySystemPollers(convertedConfig, componentDefaults) {
    const pollersWithoutSystem = _module
        .getTelemetrySystemPollers(convertedConfig, {
            filter: (poller) => !poller.systemName
        });

    // remove those pollers - we don't need them any more
    removeComponents(convertedConfig, {
        class: CLASSES.SYSTEM_POLLER_CLASS_NAME,
        filter: (c) => pollersWithoutSystem.indexOf(c) !== -1
    });

    function createSystemFromSystemPoller(systemPoller) {
        const newSystem = util.deepCopy(componentDefaults[CLASSES.SYSTEM_CLASS_NAME]);
        POLLER_KEYS.toCopyToMissingSystem.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(systemPoller, key)) {
                newSystem[key] = util.deepCopy(systemPoller[key]);
            }
        });
        return newSystem;
    }
    pollersWithoutSystem.forEach((systemPoller) => {
        if (systemPoller.usedAsRef) {
            return;
        }
        const newSystem = createSystemFromSystemPoller(systemPoller);
        convertedConfig.components.push(updateSystemPollerConfig(
            newSystem,
            systemPoller, // don't need a copy because it is last time we do modifications
            hasSplunkLegacy(convertedConfig, newSystem.namespace)
        ));
    });
}

/**
 * Post Process Telemetry_Pull_Consumer_System_Poller_Group objects
 *
 * Note: This method mutates 'convertedConfig'.
 *
 * @param {Configuration} convertedConfig - object to save normalized config to
 *
 * @returns {void} once Telemetry_Pull_Consumer_System_Poller_Group objects updated
 */
function postProcessTelemetryPullConsumerSystemPollerGroups(convertedConfig) {
    // at that point IDs should be generated already
    getTelemetryPullConsumerSystemPollerGroups(convertedConfig)
        .forEach((pg) => {
            // updating pull consumer info
            const pullConsumer = _module.getTelemetryPullConsumers(convertedConfig, {
                name: pg.pullConsumer,
                namespace: pg.namespace
            })[0];

            // convert all names/refs to IDs
            pg.pullConsumer = pullConsumer.id;
            pg.pullConsumerName = pullConsumer.traceName;
            pg.systemPollers = _module.getTelemetrySystemPollers(convertedConfig, {
                filter: (sp) => sp.enable,
                name: pg.systemPollers,
                namespace: pg.namespace
            })
                .map((sp) => sp.id);
        });
}

/**
 * Remove components from .components and .mappings
 *
 * Note: This method mutates 'config'.
 *
 * @param {Configuration} config - config
 * @param {FilterOptions} [filter] - filterting options
 *
 * @returns {void} once components removed
 */
function removeComponents(config, filter) {
    if (!config || !config.components) {
        return;
    }
    const componentsToRemove = _module.getComponents(config, filter);
    if (componentsToRemove.length === 0) {
        return;
    }
    if (config.components.length === componentsToRemove.length) {
        config.components = [];
        config.mappings = {};
        return;
    }
    config.components = config.components.filter((c) => componentsToRemove.indexOf(c) === -1);
    if (util.isObjectEmpty(config.mappings)) {
        return;
    }
    componentsToRemove.forEach((component) => {
        if (util.isObjectEmpty(config.mappings)) {
            return;
        }
        if (config.mappings[component.id]) {
            delete config.mappings[component.id];
        } else {
            Object.keys(config.mappings).forEach((id) => {
                const index = config.mappings[id].indexOf(component.id);
                if (index !== -1) {
                    config.mappings[id].splice(index, 1);
                }
                if (config.mappings[id].length === 0) {
                    delete config.mappings[id];
                }
            });
        }
    });
}

/**
 * Note: This method mutates 'pollerConfig'.
 *
 * @param {Component} systemConfig - config for instance of Telemetry_System
 * @param {Component} pollerConfig - config for instance of Telemetry_System_Poller
 * @param {boolean} fetchTMStats - whether or not to fetch TMStats
 *
 * @returns {Component} once config for instance of Telemetry_System_Poller updated
 */
function updateSystemPollerConfig(systemConfig, pollerConfig, fetchTMStats) {
    pollerConfig.class = CLASSES.SYSTEM_POLLER_CLASS_NAME;
    pollerConfig.enable = !!systemConfig.enable && !!pollerConfig.enable;
    pollerConfig.namespace = systemConfig.namespace;
    pollerConfig.systemName = systemConfig.name;
    pollerConfig.trace = getPollerTraceValue(systemConfig.trace, pollerConfig.trace);
    pollerConfig.traceName = `${getTracePrefix(pollerConfig)}${systemConfig.name}::${pollerConfig.name}`;
    pollerConfig.connection = {
        host: systemConfig.host, // has default value from the schema
        port: systemConfig.port, // has default value from the schema
        protocol: systemConfig.protocol, // has default value from the schema
        allowSelfSignedCert: getAllowSelfSignedCertVal(systemConfig)
    };
    pollerConfig.dataOpts = {
        actions: pollerConfig.actions,
        noTMStats: !fetchTMStats
    };
    if (typeof pollerConfig.tag === 'object') {
        pollerConfig.dataOpts.tags = pollerConfig.tag;
    }

    if (typeof systemConfig.username !== 'undefined') {
        pollerConfig.credentials = {
            username: systemConfig.username
        };
        if (typeof systemConfig.passphrase !== 'undefined') {
            pollerConfig.credentials.passphrase = systemConfig.passphrase;
        }
    }
    pollerConfig.trace = getTracerConfig(pollerConfig);
    POLLER_KEYS.toDelete.forEach((key) => {
        delete pollerConfig[key];
    });
    return pollerConfig;
}

/**
 * Note: This method mutates 'pollerConfig'.
 *
 * @param {Component} systemConfig - config for instance of Telemetry_System
 * @param {Component} pollerConfig - config for instance of Telemetry_iHealth_Poller
 *
 * @returns {Component} config for instance of Telemetry_iHealth_Poller updated
 */
function updateIHealthPollerConfig(systemConfig, pollerConfig) {
    pollerConfig.class = CLASSES.IHEALTH_POLLER_CLASS_NAME;
    pollerConfig.enable = !!systemConfig.enable && !!pollerConfig.enable;
    pollerConfig.namespace = systemConfig.namespace;
    pollerConfig.trace = getPollerTraceValue(systemConfig.trace, pollerConfig.trace);
    pollerConfig.traceName = `${getTracePrefix(pollerConfig)}${systemConfig.name}::${pollerConfig.name}`;

    pollerConfig.iHealth = {
        name: pollerConfig.name,
        credentials: {
            username: pollerConfig.username,
            passphrase: pollerConfig.passphrase
        },
        downloadFolder: pollerConfig.downloadFolder || constants.DEVICE_TMP_DIR,
        interval: {
            timeWindow: {
                start: pollerConfig.interval.timeWindow.start,
                end: pollerConfig.interval.timeWindow.end
            },
            frequency: pollerConfig.interval.frequency
        }
    };
    if (typeof pollerConfig.interval.day !== 'undefined') {
        pollerConfig.iHealth.interval.day = pollerConfig.interval.day;
    }

    if (typeof pollerConfig.proxy === 'object') {
        const ihProxy = pollerConfig.proxy;
        pollerConfig.iHealth.proxy = {
            connection: {
                host: ihProxy.host, // required by the schema
                port: ihProxy.port, // has default value from the schema
                protocol: ihProxy.protocol, // has default value from the schema
                allowSelfSignedCert: getAllowSelfSignedCertVal(ihProxy)
            }
        };
        if (typeof ihProxy.username === 'string') {
            pollerConfig.iHealth.proxy.credentials = {
                username: ihProxy.username
            };
            if (typeof ihProxy.passphrase !== 'undefined') {
                pollerConfig.iHealth.proxy.credentials.passphrase = ihProxy.passphrase;
            }
        }
    }

    pollerConfig.system = {
        name: systemConfig.name,
        connection: {
            host: systemConfig.host, // has default value from the schema
            port: systemConfig.port, // has default value from the schema
            protocol: systemConfig.protocol, // has default value from the schema
            allowSelfSignedCert: getAllowSelfSignedCertVal(systemConfig)
        }
    };
    if (typeof systemConfig.username !== 'undefined') {
        pollerConfig.system.credentials = {
            username: systemConfig.username
        };
        if (typeof systemConfig.passphrase !== 'undefined') {
            pollerConfig.system.credentials.passphrase = systemConfig.passphrase;
        }
    }
    pollerConfig.trace = getTracerConfig(pollerConfig);

    IHEALTH_POLLER_KEYS.toDelete.forEach((key) => {
        delete pollerConfig[key];
    });

    return pollerConfig;
}

/**
 * Determines whether class type is used as key for mapping
 *
 * @param {string} className - the config object's class name
 *
 * @returns {boolean} - true if class is a type that should be used as key
 */
function useForMapping(className) {
    const dataSourceClasses = [
        CLASSES.EVENT_LISTENER_CLASS_NAME,
        CLASSES.IHEALTH_POLLER_CLASS_NAME,
        CLASSES.SYSTEM_POLLER_CLASS_NAME,
        CLASSES.PULL_CONSUMER_SYSTEM_POLLER_GROUP_CLASS_NAME
    ];
    return dataSourceClasses.indexOf(className) > -1;
}

// eslint-disable-next-line no-multi-assign
_module = module.exports = {
    /**
     * Decrypt all secrets
     *
     * Note: this method mutates 'data'
     *
     * @param {object} data - declaration or configuration to decrypt
     *
     * @returns {Promise<object>} resolved with decrypted secrets
     */
    decryptSecrets(data) {
        return deviceUtil.decryptAllSecrets(data);
    },

    /**
     * Get config components
     *
     * Note: 'className' or/and 'namespace' might be functions that will
     * be passed directly to Array.prototype.filter
     *
     * @param {Configuration} config - config
     * @param {FilterOptions} [filter] - filtering options
     *
     * @returns {Component[]} array of components
     */
    getComponents(config, filter = {}) {
        if (!config || !config.components) {
            return [];
        }
        let components = config.components;

        ['class', 'id', 'name', 'namespace'].forEach((prop) => {
            const fprop = filter[prop];
            let fn;
            if (typeof fprop === 'string') {
                fn = (c) => c[prop] === fprop;
            } else if (typeof fprop === 'function') {
                fn = (c) => fprop(c[prop]);
            } else if (Array.isArray(fprop)) {
                fn = (c) => fprop.includes(c[prop]);
            }
            if (fn) {
                components = components.filter(fn);
            }
        });

        if (typeof filter.filter === 'function') {
            components = components.filter(filter.filter);
        }

        return components;
    },

    /**
     * Generates SHA256 hash for the Component object
     *
     * Sorts keys in A-Z order and uses values as an input data.
     * Repeats the process recursevly.
     *
     * NOTE:
     * - use decrypted config for determenistic results
     * - currently tested and verfied for following classes
     *   - Telemetry_iHealth_Poller
     * - IGNORES following top-level properties (not sensitive data):
     *   - id
     *   - enable
     *   - trace
     * - IGNORES folloving values:
     *   - null
     *   - undefined
     *
     * @param {Component} config
     *
     * @returns {string} SHA256 hash
     */
    getComponentHash(config) {
        const values = [];
        const ignoreKeys = ['enable', 'id', 'trace'];
        const ignoreValues = [null, undefined]; // should never appear in the config, not allowed by the schema

        function grab(data, pkey = '', level = 0) {
            if (Array.isArray(data)) {
                data.forEach((item, idx) => grab(item, `${pkey}.${idx}`, level + 1));
            } else if (typeof data === 'object' && data !== null) {
                let keys = Object.keys(data);
                if (level === 0) {
                    keys = keys.filter((k) => !ignoreKeys.includes(k));
                }
                keys.sort()
                    .forEach((key) => grab(data[key], `${pkey}.${key}`, level + 1));
            } else if (!ignoreValues.includes(data)) {
                values.push(pkey, data);
            }
        }

        grab(config);

        const hash = crypto.createHash('sha256');
        hash.update(values.join(''));
        return hash.digest('hex');
    },

    /**
     * Get configured and enabled receivers for component
     *
     * @param {Configuration} config - config
     * @param {Component} component - component
     *
     * @returns {Component[]} array of receivers
     */
    getReceivers(config, component) {
        const ids = config.mappings[component.id];
        if (!Array.isArray(ids) || ids.length === 0) {
            return [];
        }
        return _module.getComponents(config, {
            id: ids,
            namespace: component.namespace
        });
    },

    /**
     * Get Telemetry_Consumer objects
     *
     * @param {Configuration} config - config
     * @param {FilterOptions} [filter] - filtering options
     *
     * @returns {Component[]} array of Telemetry_Consumer objects
     */
    getTelemetryConsumers(config, filter = {}) {
        return _module.getComponents(config, {
            ...filter,
            ...{
                class: CLASSES.CONSUMER_CLASS_NAME
            }
        });
    },

    /**
     * Get controls object from config
     *
     * @param {Configuration} config  - the config to lookup the controls from
     *
     * @returns {Component} the controls object if exists, otherwise {}
     */
    getTelemetryControls(config) {
        const controls = _module.getComponents(config, {
            class: CLASSES.CONTROLS_CLASS_NAME,
            namespace: constants.DEFAULT_UNNAMED_NAMESPACE
        });
        return controls.length ? controls[0] : {};
    },

    /**
     * Get Telemetry_iHealth_Poller objects
     *
     * @param {Configuration} config - config
     * @param {FilterOptions} [filter] - filtering options
     *
     * @returns {Component[]} array of Telemetry_iHealth_Poller objects
     */
    getTelemetryIHealthPollers(config, filter = {}) {
        return _module.getComponents(config, {
            ...filter,
            ...{
                class: CLASSES.IHEALTH_POLLER_CLASS_NAME
            }
        });
    },

    /**
     * Get Telemetry_Listener objects
     *
     * @param {Configuration} config - config
     * @param {FilterOptions} [filter] - filtering options
     *
     * @returns {Component[]} array of Telemetry_Listener objects
     */
    getTelemetryListeners(config, filter = {}) {
        return _module.getComponents(config, {
            ...filter,
            ...{
                class: CLASSES.EVENT_LISTENER_CLASS_NAME
            }
        });
    },

    /**
     * Get Telemetry_Pull_Consumer objects
     *
     * @param {Configuration} config - config
     * @param {FilterOptions} [filter] - filtering options
     *
     * @returns {Component[]} array of Telemetry_Pull_Consumer objects
     */
    getTelemetryPullConsumers(config, filter = {}) {
        return _module.getComponents(config, {
            ...filter,
            ...{
                class: CLASSES.PULL_CONSUMER_CLASS_NAME
            }
        });
    },

    /**
     * Get Telemetry_System_Poller objects
     *
     * @param {Configuration} config - config
     * @param {FilterOptions} [filter] - filtering options
     *
     * @returns {Component[]} array of Telemetry_System_Poller objects
     */
    getTelemetrySystemPollers(config, filter = {}) {
        return _module.getComponents(config, {
            ...filter,
            ...{
                class: CLASSES.SYSTEM_POLLER_CLASS_NAME
            }
        });
    },

    /**
     * Get Telemetry_System_Poller objects for Telemetry_Pull_Consumer_System_Poller_Group
     *
     * @param {Configuration} config - config
     * @param {Component} pollerGroup - Telemetry_Pull_Consumer_System_Poller_Group object
     *
     * @returns {Component[]} array of Telemetry_System_Poller objects
     */
    getTelemetrySystemPollersForGroup(config, pollerGroup) {
        return _module.getTelemetrySystemPollers(config, {
            id: pollerGroup.systemPollers,
            namespace: pollerGroup.namespace
        });
    },

    /**
     * Get Telemetry_Pull_Consumer_System_Poller_Group object for Telemetry_Pull_Consumer
     *
     * @param {Configuration} config - config
     * @param {Component} pullConsumer - Telemetry_Pull_Consumer object
     *
     * @returns {Component | undefined} Telemetry_Pull_Consumer_System_Poller_Group object
     */
    getTelemetryPullConsumerSystemPollerGroup(config, pullConsumer) {
        return getTelemetryPullConsumerSystemPollerGroups(config, { namespace: pullConsumer.namespace })
            .filter((pg) => pg.pullConsumer === pullConsumer.id && config.mappings[pg.id])
            .find((pg) => config.mappings[pg.id].indexOf(pullConsumer.id) !== -1);
    },

    /**
     * Get JSON Schema validation functions
     *
     * @param {boolean} [rebuildCache = false] - re-build cached validators
     *
     * @returns {SchemaValidatorFunctions} available config validation functions
     */
    getValidators(rebuildCache) {
        if (rebuildCache || !_module.validatorsCache) {
            _module.validatorsCache = declValidator.getValidators();
        }
        return _module.validatorsCache;
    },

    /**
     * Check if config has "enabled" components
     *
     * @param {Configuration} config - config
     *
     * @returns {boolean} true if config has "enabled" components
     */
    hasEnabledComponents(config) {
        return _module.getComponents(config, {
            filter: (c) => c.class !== CLASSES.CONTROLS_CLASS_NAME && c.enable
        }).length > 0;
    },

    /**
     * Merged 'newConfig' into 'config'. Namespace(s) in 'config' will be overridden by namespace(s) from 'newConfig'
     * if exist.
     *
     * Note: This method mutates 'config'.
     *
     * @param {object} declaration - declaration to merge
     * @param {Configuration} config - config to use to merge to
     *
     * @returns {Configuration} resolve with merged normalized config
     */
    async mergeDeclaration(declaration, config) {
        const newNormalizedConfig = await _module.normalizeDeclaration(declaration, true);
        // all objects have .namespace property - get all namespaces in new config
        const namespaces = _module.getComponents(newNormalizedConfig)
            .map((c) => c.namespace)
            .filter((val, index, self) => self.indexOf(val) === index);
        // remove namespaces from existing config
        removeComponents(config, { namespace: namespaces });
        cleanupComponents(newNormalizedConfig);
        config.mappings = Object.assign(config.mappings, newNormalizedConfig.mappings);
        config.components = config.components.concat(newNormalizedConfig.components);

        return config;
    },

    /**
     * Converts config to new normalized format
     * - polymorphic components like poller, systems and endpoints are normalized
     * - mappings for components are added for easy lookup
     *
     * @param {object} declaration - the config to normalize (declared components must be expanded)
     * @param {boolean} [noCleanup = false] - ignore cleanup
     *
     * @returns {Promise<Configuration>} normalized config
     */
    async normalizeDeclaration(declaration, noCleanup = false) {
        const convertedConfig = {
            mappings: {},
            components: []
        };
        if (!(util.isObjectEmpty(declaration) || Array.isArray(declaration) || typeof declaration !== 'object')) {
            componentizeConfig(declaration, convertedConfig);
            await normalizeComponents(convertedConfig);
            mapComponents(convertedConfig);

            if (!noCleanup) {
                cleanupComponents(convertedConfig);
            }
        }

        return convertedConfig;
    },

    /**
     * Validate JSON data against config schema
     *
     * Note: this method mutates 'data'
     *
     * @param {object} validator - the validator function to use
     * @param {object} data      - data to validate against config schema
     * @param {object} [context] - context to pass to validator
     *
     * @returns {object} the validated data
    */
    async validate(validator, data, context) {
        return declValidator.validate(validator, data, context);
    }
};

/**
 * @typedef {object} AdditionalOption
 * @property {string} name
 * @property {any} value
 */
/**
 * @typedef {object} Component
 * @property {string} class - class name a component belongs to
 * @property {boolean} enable - true if component enabled
 * @property {string} id - unique ID for config's current life span
 * @property {string} name - name
 * @property {string} namespace - namespace a component belongs to
 * @property {TraceConfig} trace - tracer's cofnig
 * @property {string} traceName - unique name computed using namespace and object's name,
 *     should be used for logging and etc.
 *
 * Note:
 * - component will have newly generated 'id' every time when:
 *   - config loaded on application start
 *   - declaration submitted to 'default' namespace (/declare) (every component
 *     will have newly generated 'id' despite on namespace it belongs to)
 *   - declaration submitted for a particular namespace (every component in a namespace will have newly generated 'id')
 * - mappings contains only:
 *   - enabled components
 *   - if poller has 0 interval it will not be mapped to Telemetry_Consumer
 */
/**
 * @typedef {object} Configuration
 * @property {Component[]} components - configuration components
 * @property {object<string, string[]>} mappings - data routing/mapping between different components using their IDs
 *
 * {
 *     mappings: {
 *         $pollerid: [ $consumerid ]
 *         $eventListenerId: [ $consumerid ]
 *         $pullConsumerId: [ $pollerId ]
 *     },
 *     components: [
 *         {
 *             id : $uuid,
 *             name: $objectName,
 *             class: $className,
 *             .... {rest of config}
 *         }
 *     ]
 * }
 */
/**
 * @typedef {object} Connection
 * @property {string} host - host
 * @property {boolean} allowSelfSignedCert - allow self signed certs
 * @property {number} port - port
 * @property {'http' | 'https'} protocol - protocol
 */
/**
 * @typedef {Component} ConsumerComponent
 * @property {string} type - consumer's type
 */
/**
 * @typedef {object} Credentials
 * @property {string} username - username
 * @property {Secret | string} passphrase - passphrase
 */
/**
 * @typedef {object} CredentialsPartial
 * @property {string} username - username
 * @property {PassphraseSecret | string} [passphrase] - passphrase
 */
/**
 * @typedef {object} DataAction
 * @property {boolean} enable - enable/disable
 */
/**
 * @typedef DataActions
 * @type {Array<ExcludeDataAction | IncludeDataAction | SetTagDataAction>}
 */
/**
 * @typedef {DataAction} ExcludeDataAction
 * @property {object} excludeData
 * @property {object} locations
 * @property {object} [ifAllMatch]
 * @property {object} [ifAnyMatch]
 */
/**
 * @typedef {object} FilterOptions
 * @param {StringFilter} [class] - class name(s) or function to use as filter
 * @param {function(obj: Component): boolean} [filter] - function to use as filter
 * @param {StringFilter} [id] - id(s) or function to use as filter
 * @param {StringFilter} [name] - name(s) or function to use as filter
 * @param {StringFilter} [namespace] - namespace name(s) or function to use as filter
 */
/**
 * @typedef {AdditionalOption} HttpAgentOption
 * @property {'keepAlive' | 'keepAliveMsecs' | 'maxSockets' | 'maxFreeSockets'} name - HTTP agent's option name
 * @property {boolean | number} value
 */
/**
 * @typedef {Component} IHealthPollerCompontent
 * @property {object} iHealth - iHealth poller config
 * @property {string} iHealth.name - poller's name
 * @property {Credentials} iHealth.credentials - F5 iHealth Service credentials
 * @property {string} iHealth.downloadFolder - Qkview download directory
 * @property {object} iHealth.interval - polling interval
 * @property {object} iHealth.interval.timeWindow - polli ng time window
 * @property {string} iHealth.interval.start - start time
 * @property {string} iHealth.interval.end - end time
 * @property {string} iHealth.interval.frequency - polling frequency
 * @property {number | string} iHealth.interval.day - day of week/month
 * @property {Proxy} [iHealth.proxy] - proxy configuration
 * @property {object} system - F5 Device config
 * @property {Connection} system.connection - connectivity config
 * @property {CredentialsPartial} [system.credentials] - credentials
 * @property {string} system.name - system's name
 */
/**
 * @typedef {DataAction} IncludeDataAction
 * @property {object} includeData
 * @property {object} locations
 * @property {object} [ifAllMatch]
 * @property {object} [ifAnyMatch]
 */
/**
 * @typedef {object} Proxy
 * @property {Connection} connection - connectivity config
 * @property {string} connection.host - proxy host
 * @property {ProxyCredentials} [credentials] - authentiction data
 */
/**
 * @typedef {CredentialsPartial} ProxyCredentials
 * @property {string} username - username
 * @property {Secret | string} [passphrase] - passphrase
 */
/**
 * @typedef {Component} PullConsumerSystemPollerGroup
 * @property {string[]} systemPollers - list of System Pollers IDs (enabled only)
 * @property {string} pullConsumer - pull consumer ID
 * @property {string} pullConsumerName - pull consumer name (traceName)
 */
/**
 * @typedef {object} Secret
 * @property {string} cipherText - encrypted secret
 * @property {string} class - class name
 * @property {string} protected - type of protection
 */
/**
 * @typedef {DataAction} SetTagDataAction
 * @property {object} setTag - tags to set
 * @property {object} [locations]
 * @property {object} [ifAllMatch]
 * @property {object} [ifAnyMatch]
 */
/**
 * @typedef {(function(s: string): boolean) | string | string[]} StringFilter
 */
/**
 * @typedef {Component} SystemPollerComponent
 * @property {Connection} connection - connectivity config
 * @property {CredentialsPartial} [credentials] - credentials
 * @property {object} dataOpts - data modifications config
 * @property {DataActions} dataOpts.actions
 * @property {boolean} dataOpts.noTMStats - if 'true' then exclude 'tmstats' from stats
 * @property {object<string, string>} dataOpts.tags - old-style tagging
 * @property {Object<string, SystemPollerEndpoint>} endpoints - endpoints to poll data from
 * @property {HttpAgentOption[]} httpAgentOpts - additional options for HTTP agent
 * @property {number} interval - polling interval in seconds
 * @property {string} systemName - system's names it belongs to
 */
/**
 * @typedef {object} SystemPollerEndpoint
 * @property {boolean} enable - enabled/disabled
 * @property {string} name - endpoint name
 * @property {string} path - endpoint path
 * @property {'http' | 'snmp'} protocol - data retrieval protocol
 */
/**
 * @typedef {object} TraceConfig
 * @property {boolean} enable - enabled/disabled
 * @property {string} encoding - output encoding
 * @property {number} maxRecords - max records to store
 * @property {string} path - path to destination file
 * @property {string} type - tracer's type - input or output
 */
