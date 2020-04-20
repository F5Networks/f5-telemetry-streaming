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

const logger = require('./logger');
const VERSION = require('./constants').VERSION;
const APP_NAME = require('./constants').APP_NAME;
const TELEMETRY_CONSUMER = require('./constants').CONFIG_CLASSES.CONSUMER_CLASS_NAME;

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
        name: APP_NAME,
        version: VERSION
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
            teemRecord = new TeemRecord(`${APP_NAME} Telemetry Data`, '1');
        })
        .then(() => teemRecord.calculateAssetId())
        .then(() => teemRecord.addRegKey())
        .then(() => teemRecord.addPlatformInfo())
        .then(() => teemRecord.addProvisionedModules())
        .then(() => teemRecord.addClassCount(config))
        .then(() => {
            const extraFields = this._getCountByClassTypes(config, TELEMETRY_CONSUMER, 'consumers');
            return teemRecord.addJsonObject(extraFields);
        })
        .then(() => this.teemDevice.reportRecord(teemRecord))
        .catch(err => this.logger.exception('Unable to send analytics data', err));
};

/**
 * Count the number of types per class.
 *
 * @param {Object} declaration - the declaration to search through
 * @param {String} className - the declaration class to count
 * @param {String} keyName - the key to use when building count results
 *
 * @returns {Object} An object containing count results by type { keyName: { <type>: <count> } }
 */
TeemReporter.prototype._getCountByClassTypes = function (declaration, className, keyName) {
    const results = { [keyName]: {} };
    function getObjectWithClass(subDecl, cb) {
        Object.keys(subDecl).forEach((key) => {
            const val = subDecl[key];
            if (typeof val === 'object') {
                if (val.class === className) {
                    cb(val);
                }
                getObjectWithClass(val, cb);
            }
        });
    }

    getObjectWithClass(declaration, (obj) => {
        results[keyName][obj.type] = results[keyName][obj.type] ? results[keyName][obj.type] += 1 : 1;
    });

    return results;
};

module.exports = {
    TeemReporter
};
