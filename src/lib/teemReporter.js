/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const TeemDevice = require('@f5devcentral/f5-teem').Device;
const TeemRecord = require('@f5devcentral/f5-teem').Record;

const constants = require('./constants');
const logger = require('./logger');

const CONFIG_CLASSES = constants.CONFIG_CLASSES;

/** @module TeemReporter */

/**
 * TeemReporter class - Handle reporting of analytics data using F5-TEEM
 *
 * @class
 *
 * @property {Object} assetInfo - assetInformation sent to TEEM
 * @property {Object} teemDevice - TEEM device instance
 */
function TeemReporter() {
    this.assetInfo = {
        name: constants.APP_NAME,
        version: constants.VERSION
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
TeemReporter.prototype.process = function (config) {
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
        .catch(err => this.logger.debugException('Unable to send analytics data', err));
};

/**
 * Fetch extra data from the configuration
 *
 * @param {Object} config - the configuration to use to fetch extra data from
 *
 * @returns {Object} with extra data fetched from the configuration
 */
TeemReporter.prototype.fetchExtraData = function (config) {
    const extraData = {};
    computeCounters(config, extraData);
    return extraData;
};

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
