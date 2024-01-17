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

const TeemDevice = require('@f5devcentral/f5-teem').Device;
const TeemRecord = require('@f5devcentral/f5-teem').Record;

const appInfo = require('./appInfo');
const constants = require('./constants');
const logger = require('./logger');

const CONFIG_CLASSES = constants.CONFIG_CLASSES;

/** @module TeemReporter */

/**
 * TeemReporter class - Handle reporting of analytics data using F5-TEEM
 *
 * @property {Object} assetInfo - assetInformation sent to TEEM
 * @property {Object} teemDevice - TEEM device instance
 */
class TeemReporter {
    /**
     * Constructor
     */
    constructor() {
        this.assetInfo = {
            name: constants.APP_NAME,
            version: appInfo.version
        };
        this.teemDevice = new TeemDevice(this.assetInfo);
        this.logger = logger.getChild('teemReporter');
    }

    /**
     * Perform the actual TEEM processing
     *
     * @param {Object} config - the configuration to use to generate TEEM data
     *
     * @returns {Promise} Guaranteed to always fulfill and not reject on error
     */
    process(config) {
        let teemRecord;

        return Promise.resolve()
            .then(() => {
                teemRecord = new TeemRecord(`${constants.APP_NAME} Telemetry Data`, '1');
            })
            .then(() => teemRecord.calculateAssetId())
            .then(() => teemRecord.addRegKey())
            .then(() => teemRecord.addPlatformInfo())
            .then(() => teemRecord.addProvisionedModules())
            .then(() => teemRecord.addClassCount(config))
            .then(() => teemRecord.addJsonObject(this.fetchExtraData(config)))
            .then(() => this.teemDevice.reportRecord(teemRecord))
            .catch((err) => this.logger.debugException('Unable to send analytics data', err));
    }

    /**
     * Fetch extra data from the configuration
     *
     * @param {Object} config - the configuration to use to fetch extra data from
     *
     * @returns {Object} with extra data fetched from the configuration
     */
    fetchExtraData(config) {
        const extraData = {};
        computeCounters(config, extraData);
        return extraData;
    }
}

/**
 * Calculate counters for Consumers (by type), inlined System Pollers and iHealth Pollers
 *
 * @param {Object} config    - the configuration to use to fetch extra data from
 * @param {Object} extraData - object to write counters to
 */
function computeCounters(config, extraData) {
    extraData = Object.assign(extraData, {
        consumers: {},
        inlineIHealthPollers: 0,
        inlineSystemPollers: 0
    });

    const countConsumerType = (consumer) => {
        extraData.consumers[consumer.type] = (extraData.consumers[consumer.type] || 0) + 1;
    };

    const countInlinePollers = (system) => {
        if (typeof system.iHealthPoller === 'object') {
            extraData.inlineIHealthPollers += 1;
        }
        if (Array.isArray(system.systemPoller)) {
            system.systemPoller.forEach((systemPoller) => {
                if (typeof systemPoller === 'object') {
                    extraData.inlineSystemPollers += 1;
                }
            });
        } else if (typeof system.systemPoller === 'object') {
            extraData.inlineSystemPollers += 1;
        }
    };

    searchObjectsWithClass(config, (obj) => {
        switch (obj.class) {
        case CONFIG_CLASSES.CONSUMER_CLASS_NAME:
            countConsumerType(obj);
            break;
        case CONFIG_CLASSES.SYSTEM_CLASS_NAME:
            countInlinePollers(obj);
            break;
        default:
            // do nothing
        }
    });
}

/**
 * Search for objects with 'class' property
 *
 * @param {Object} subDecl - declaration to traverse
 * @param {Function} cb    - callback to call - cb(obj)
 */
function searchObjectsWithClass(subDecl, cb) {
    Object.keys(subDecl).forEach((key) => {
        const val = subDecl[key];
        if (typeof val === 'object') {
            if (typeof val.class === 'string') {
                cb(val);
            }
            searchObjectsWithClass(val, cb);
        }
    });
}

module.exports = {
    TeemReporter
};
