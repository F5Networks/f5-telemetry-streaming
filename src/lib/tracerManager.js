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

const configWorker = require('./config');
const logger = require('./logger').getChild('tracer');
const promiseUtil = require('./utils/promise');
const tracerUtil = require('./utils/tracer');

/** @module tracer */

/**
 * Registered instances
 *
 * @type {Object<string, Tracer>}
 */
const INSTANCES = {};

/**
 * Create tracer from config and register it
 *
 * Note: if component disabled then 'null' will be returned
 *
 * @public
 * @param {TracerConfig} config - tracer configuration
 *
 * @returns {Tracer|null} Tracer object or null when tracing feature disabled
 */
function fromConfig(config) {
    let tracer = null;
    if (config.enable !== false) {
        tracer = getOrCreate(config.path, {
            encoding: config.encoding,
            inactivityTimeout: config.inactivityTimeout,
            fs: config.fs,
            maxRecords: config.maxRecords
        });
    }
    return tracer;
}

/**
 * Get Tracer instance or create new one
 *
 * @public
 * @param {string} path - destination path
 * @param {TracerOptions} [options] - Tracer options
 *
 * @returns {Tracer} Tracer instance
 */
function getOrCreate(path, options) {
    const normalizedPath = pathUtil.normalize(path);
    options = tracerUtil.setTracerOptionsDefaults(options);
    let tracer = INSTANCES[normalizedPath];

    if (tracer && (tracer.maxRecords !== options.maxRecords
        || tracer.encoding !== options.encoding
        || tracer.inactivityTimeout !== options.inactivityTimeout)) {
        logger.debug(`Updating tracer instance for file '${path}'`);
        unregister(tracer, true);
        tracer = null;
    } else if (!tracer) {
        logger.debug(`Creating new tracer instance for file '${path}'`);
    }
    if (!tracer) {
        tracer = tracerUtil.create(path, options);
        INSTANCES[normalizedPath] = tracer;
    }
    return tracer;
}

/**
 * Registered tracers
 *
 * @public
 * @returns {Array<Tracer>} registered tracers
 */
function registered() {
    return Object.keys(INSTANCES).map((key) => INSTANCES[key]);
}

/**
 * Unregister and stop tracer
 *
 * @public
 * @param {Tracer} tracer - tracer
 * @param {boolean} [catchErr = false] - catch errors on attempt to stop tracer
 *
 * @returns {Promise} resolved once tracer stopped
 */
function unregister(tracer, catchErr) {
    let promise = Promise.resolve();
    if (tracer) {
        // stop tracer to avoid re-using it
        // new tracer will be created if needed
        promise = promise.then(() => tracer.stop());
        if (catchErr) {
            promise = promise.catch((err) => logger.debugException(`Uncaught error on attempt to unregister tracer for file '${tracer.path}'`, err));
        }
        delete INSTANCES[tracer.path];
    }
    return promise;
}

/**
 * Unregister all registered tracers
 *
 * @returns {Promise} resolved once all tracers registered
 */
function unregisterAll() {
    return promiseUtil.allSettled(registered().map((tracer) => unregister(tracer, true)))
        .then((results) => promiseUtil.getValues(results)) // throws errors if found
        .then(() => {}); // explicitly return nothing
}

// config worker change event
configWorker.on('change', (config) => Promise.resolve()
    .then(() => {
        /**
         * This event might be handled by other listeners already
         * and new tracers might be created already too. 'fromConfig'
         * will return same instance if it was created already or create new once if doesn't exist
         * -> that's why this can be done before/after ant other 'change' listener execution.
         * Facts:
         * - no one except this listener can remove old Tracer instances
         * - any listener (include this one) may create new Tracer instances
         * Based on those facts:
         * - fetch all existing Tracer instances
         * - read configuration and create new Tracer instances
         * - Set(preExisting) - Set(newlyCreated) = Set(toRemove);
         */
        logger.debug('configWorker "change" event');
        const registeredTracers = registered();
        // ignore skipUpdate setting - it should not affect not changed tracers
        const configuredTracers = config.components
            .reduce((acc, component) => {
                acc.push(component.trace);
                acc.push(component.traceInput);
                return acc;
            }, [])
            .filter((traceConf) => traceConf)
            .map((traceConf) => fromConfig(traceConf))
            .filter((tracer) => tracer);

        registeredTracers.forEach((tracer) => {
            if (configuredTracers.indexOf(tracer) === -1) {
                unregister(tracer, true);
            }
        });
        logger.info(`${registered().length} tracer(s) running`);
    }));

module.exports = {
    fromConfig,
    registered,
    unregister,
    unregisterAll
};

/**
 * @typedef TracerConfig
 * @type {tracerUtil.TracerOptions}
 * @property {string} path - path to use to write data to
 * @property {boolean} [enable = true] - enable/disable Tracer
 */
