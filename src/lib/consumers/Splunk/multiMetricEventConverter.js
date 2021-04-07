/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const METRIC_PREFIX = 'metric_name:';

/**
 * Merge options (basically just merge objects)
 *
 * @param {Object} target - target object to merge to
 * @param {Object} [sources...] - objects to merge
 *
 * @returns {Object} target object
 */
const mergeOptions = function () {
    return Object.assign.apply(null, arguments);
};

/**
 * Merge 'telemetryStreamingStatisticSet' key (if exists) with new value
 *
 * @param {Object} event - event
 * @param {Object} setName - set's name to add
 */
const mergeTsStatisticSetName = function (event, setName) {
    const existingSetName = event.fields.telemetryStreamingStatisticSet;
    event.fields.telemetryStreamingStatisticSet = `${setName}${existingSetName ? `.${existingSetName}` : ''}`;
};

/**
 * Convert values to metrics (if numbers).
 *
 * Note: nested objects and arrays will be skipped anyway
 *
 * @this MEMContext
 * @param {Object} data - object to convert
 * @param {DataOptions} [options] - options
 *
 * @returns {Object} object with metrics
 */
const toMetrics = function (data, options) {
    const ret = {};
    options = options || {};
    Object.keys(data).forEach((field) => {
        let metricVal = data[field];
        if (options.deleteCb && options.deleteCb(field, metricVal)) {
            return;
        }
        if (options.skipCb && options.skipCb(field, metricVal)) {
            if (typeof metricVal !== 'string') {
                metricVal = metricVal.toString();
            }
        } else {
            if (options.renameCb) {
                field = options.renameCb(field, metricVal);
            }
            if (options.prefixCb) {
                field = options.prefixCb(field, metricVal);
            }
            const originVal = metricVal;
            metricVal = options.castCb(field, metricVal);
            if (Number.isFinite(metricVal)) {
                field = `${METRIC_PREFIX}${field}`;
            } else {
                metricVal = originVal;
            }
        }
        // Splunk doesn't like nested objects - ignore them
        if (typeof metricVal !== 'object') {
            ret[field] = metricVal;
        }
    });
    return ret;
};

/**
 * Process data set
 *
 * @this MEMContext
 * @param {Object} data - data to convert
 * @param {Object.<string, DataOptions>} dataOptions - map specific property to DataOptions
 * @param {EventReadyCb} cb - callback to call once event generated
 */
const processData = function (data, dataOptions, cb) {
    if (!data) {
        return;
    }
    Object.keys(data).forEach((key) => {
        const options = dataOptions[key] ? mergeOptions({}, this.defaultOptions, dataOptions[key])
            : this.defaultOptions;

        if (options.enabled !== false) {
            options.handler.call(this, data[key], options, (chunk) => {
                mergeTsStatisticSetName(chunk, key);
                cb(chunk);
            });
        }
    });
};

/**
 * Transform array to object (map)
 *
 * @param {Array} data - data to transform
 * @param {DataOptions} options - transformation options
 *
 * @returns {Object} object created from array
 */
const arrayToMap = function (data, options) {
    const result = {};
    const keyName = options.keyName || 'name';
    data.forEach((item) => {
        result[item] = {
            [keyName]: item
        };
    });
    return result;
};

/**
 * Process object
 *
 * @this MEMContext
 * @param {Object} data - data to process
 * @param {DataOptions} options - options for data processing
 * @param {EventReadyCb} cb - callback to pass event too
 */
const processObject = function (data, options, cb) {
    const event = this.getEventBaseStructure();
    event.fields = Object.assign(
        toMetrics.call(this, data, options),
        event.fields // event.fields might override some metrics
    );
    if (options.keyName && options.objectName) {
        event.fields[options.keyName] = options.objectName;
    }
    cb(event);

    const subCollectionsOptions = options.subCollections || {};
    const ignoreSubCollectionCb = options.ignoreSubCollectionCb;

    Object.keys(data).forEach((key) => {
        let value = data[key];
        if (typeof value === 'object') {
            if (!(ignoreSubCollectionCb && ignoreSubCollectionCb(key, value))) {
                if (Array.isArray(value)) {
                    value = arrayToMap(value, subCollectionsOptions[key] || {});
                }
                processData.call(this, { [key]: value }, { [key]: subCollectionsOptions[key] }, (subChunk) => {
                    if (options.parentKey && options.objectName) {
                        subChunk.fields[options.parentKey] = options.objectName;
                    }
                    cb(subChunk);
                });
            }
        }
    });
};

/**
 * Process collection of objects
 *
 * @this MEMContext
 * @param {Object} collection - key-value collection of object
 * @param {DataOptions} options - options for data processing
 * @param {EventReadyCb} cb - callback to pass event too
 */
const processCollectionOfObjects = function (collection, options, cb) {
    Object.keys(collection).forEach((objectName) => {
        const objOptions = mergeOptions({ objectName }, options);
        processObject.call(this, collection[objectName], objOptions, cb);
    });
};

/**
 * Multi-Events Metric Context
 *
 * @property {Object} originData - original data object
 * @property {DataOptions} defaultOptions - default values for DataOptions
 * @property {String} hostname - device's hostname
 * @property {Number} timestamp - data timestamp
 */
class MEMContext {
    /**
     * Constructor
     *
     * @param {Object} data - data to convert
     * @param {DataOptions} defaultOptions - default options to use to process data
     */
    constructor(data, defaultOptions) {
        this.originData = data;
        this.defaultOptions = defaultOptions;
        this.hostname = this.originData.system.hostname;
        this.timestamp = Date.parse(this.originData.telemetryServiceInfo.cycleStart);
    }

    /**
     * Create base structure for event
     *
     * @returns {Object} base event structure
     */
    getEventBaseStructure() {
        return {
            time: this.timestamp,
            source: 'f5-telemetry',
            sourcetype: 'f5:telemetry',
            host: this.hostname,
            fields: {}
        };
    }
}

/**
 * STARTS HERE: Configuration to process Telemetry Streaming 'canonical' output
 */
const DEFAULT_PROPS_TO_SKIP = [
    'application',
    'name',
    'port',
    'tenant'
];

const DEFAULT_CAST_CB = (key, value) => {
    // Number.isNaN works differently, we need global isNaN here
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(value)) {
        return value;
    }
    return parseFloat(value);
};

// default options - will be used as default values
const DEFAULT_OPTS = {
    handler: processCollectionOfObjects,
    keyName: 'name', // key to use to store object's name
    castCb: DEFAULT_CAST_CB,
    // ignore References to sub collection
    ignoreSubCollectionCb: (key, value) => key.endsWith('Reference') && value.link,
    skipCb: key => DEFAULT_PROPS_TO_SKIP.indexOf(key) !== -1
};

// options to process keys like - aWideIps, aaaaWideIps and etc.
const GTM_WIDEIPS_OPTS = {
    handler: processCollectionOfObjects,
    parentKey: 'wideIP',
    subCollections: {
        rules: {
            keyName: 'rule'
        },
        loadBalancingDecisionLogVerbosity: {
            keyName: 'value'
        },
        aliases: {
            keyName: 'alias'
        },
        pools: {
            keyName: 'pool'
        }
    }
};

// options to process keys like - pools, aaaPools and etc.
const LTM_GTM_POOLS = {
    handler: processCollectionOfObjects,
    parentKey: 'poolName'
};

// options to use to disable property processing
const DISABLE_PROP_OPTS = {
    enabled: false
};

// mapping data key <-> options if needed
const PROPERTIES_TO_HANDLERS = {
    telemetryServiceInfo: DISABLE_PROP_OPTS,
    telemetryEventCategory: DISABLE_PROP_OPTS,
    aWideIps: GTM_WIDEIPS_OPTS,
    aaaaWideIps: GTM_WIDEIPS_OPTS,
    cnameWideIps: GTM_WIDEIPS_OPTS,
    mxWideIps: GTM_WIDEIPS_OPTS,
    naptrWideIps: GTM_WIDEIPS_OPTS,
    srvWideIps: GTM_WIDEIPS_OPTS,
    pools: LTM_GTM_POOLS,
    aPools: LTM_GTM_POOLS,
    aaaaPools: LTM_GTM_POOLS,
    cnamePools: LTM_GTM_POOLS,
    mxPools: LTM_GTM_POOLS,
    naptrPools: LTM_GTM_POOLS,
    srvPools: LTM_GTM_POOLS,
    deviceGroups: {
        castCb: (key, value) => {
            if ([
                'commitIdTime',
                'lssTime'
            ].indexOf(key) !== -1) {
                return Date.parse(value);
            }
            return DEFAULT_CAST_CB(key, value);
        }
    },
    iRules: {
        handler: processCollectionOfObjects,
        parentKey: 'iRule'
    },
    ltmPolicies: {
        handler: processCollectionOfObjects,
        parentKey: 'ltmPolicy'
    },
    virtualServers: {
        handler: processCollectionOfObjects,
        parentKey: 'virtualServer'
    },
    system: {
        handler: processObject,
        subCollections: {
            diskStorage: {
                castCb: (key, value) => {
                    if (key === 'Capacity%') {
                        return parseFloat(value);
                    }
                    return DEFAULT_CAST_CB(key, value);
                },
                deleteCb: key => key === 'Capacity_Float',
                renameCb: key => (key === 'Capacity' ? 'Capacity%' : key)
            },
            tmmTraffic: {
                handler: processObject
            }
        },
        castCb: (key, value) => {
            if ([
                'gtmConfigTime',
                'lastAfmDeploy',
                'lastAsmChange',
                'ltmConfigTime',
                'systemTimestamp'
            ].indexOf(key) !== -1) {
                return Date.parse(value);
            }
            return DEFAULT_CAST_CB(key, value);
        },
        deleteCb: key => [
            'diskLatency',
            'diskStorage',
            'networkInterfaces',
            'provisioning',
            'tmmTraffic'
        ].indexOf(key) !== -1
    }
};
/**
 * ENDS HERE: Configuration to process Telemetry Streaming 'canonical' output
 */

/**
 * Convert Telemetry data to Splunk Multi-Event metrics format (v8)
 *
 * @param {Object} data - data to process, TS canonical output
 * @param {EventReadyCb} cb - callback to call for each Splunk Metric Event
 */
module.exports = function (data, cb) {
    processData.call(new MEMContext(data, DEFAULT_OPTS), data, PROPERTIES_TO_HANDLERS, cb);
};

/**
 * Cast value into metric value
 *
 * @callback CastCb
 * @param {String} key - key
 * @param {Any} value - value to cast to metric
 * @returns {Number} metric value
 */
/**
 * Callback to call once Splunk Metric Event created
 *
 * @callback EventReadyCb
 * @param {Object} event - Splunk Metric Event
 */
/**
 * Callback to check whether do delete key or not
 *
 * @callback DeleteCb
 * @param {String} key - key to delete
 * @param {Any} value - value
 * @returns {Boolean} true if key needs to be deleted
 */
/**
 * Callback to call to process data
 *
 * @callback HandlerCb
 * @param {Object} data - data to process
 * @param {DataOptions} options - options for data processing
 * @param {EventReadyCb} cb - callback to pass event to
 */
/**
 * Callback to get prefix to prepend to a key
 *
 * @callback PrefixCb
 * @param {String} key - key to prepend prefix to
 * @param {Any} value - value
 * @returns {String} prefix to prepend to a key
 */
/**
 * Callback to rename a key
 *
 * @callback RenameCb
 * @param {String} key - key to rename
 * @param {Any} value - value
 * @returns {String} renamed key
 */
/**
  * Callback to check whether do skip key or not
 *
 * @callback SkipCb
 * @param {String} key - key to skip
 * @param {Any} value - value
 * @returns {Boolean} true if key needs to be skipped
 */
/**
 * Data processing options
 *
 * @typedef DataOptions
 * @type {Object}
 * @property {CastCb} [castCb] - callback to parse value to metric
 * @property {DeleteCb} [deleteCb] - callback to check if key has to be deleted
 * @property {Boolean} [enabled] - enable processing (should be set to 'false' explicitly to disable)
 * @property {SkipCb} [ignoreSubCollectionCb] - callback to call if collection of data should be ignored
 * @property {String} [keyName] - key to use to store object's name
 * @property {HandlerCb} [handler] - handler to call to process data
 * @property {String} [objectName] - object's name
 * @property {String} [parentKey] - key to use to store parent's name
 * @property {PrefixCb} [prefixCb] - callback to prepend a prefix to a key
 * @property {RenameCb} [renameCb] - callback to rename to a key
 * @property {Object.<string, DataOptions>} [subCollections] - data options for sub collections
 * @property {SkipCb} [skipCb] - callback to check if key has to be skipped
 */
