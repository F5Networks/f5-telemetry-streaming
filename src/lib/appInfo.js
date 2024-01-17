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
/* eslint-disable no-plusplus */

'use strict';

const fs = require('fs');
const path = require('path');

// Application's folder is the root dir
const PKG_LOCATIONS = Object.freeze([
    '../package.json', // production
    '../../package.json' // development
]);

/**
 * @type {ApplicationInfo}
 */
module.exports = (function appInfo() {
    return deepFreeze(Object.assign({ schemaVersion: getSchemaInfo() }, getPackageInfo()));
}());

/**
 * Depply freezes object
 *
 * @param {object} data
 *
 * @returns {object} fronzen object (same as input, not a copy)
 */
function deepFreeze(data) {
    Object.keys(data).forEach((key) => {
        const value = data[key];
        if (value && typeof value === 'object') {
            deepFreeze(value);
        }
    });
    return Object.freeze(data);
}

/**
 * Read and parse package.json data
 *
 * @returns {PackageInfo}
 */
function getPackageInfo() {
    let pkgInfo;

    PKG_LOCATIONS.some((file) => {
        readPackageInfo(path.join(__dirname, file), (err, data) => {
            if (!err) {
                pkgInfo = data;
            }
        });
        return !!pkgInfo;
    });

    if (!pkgInfo) {
        throw new Error('Unable to find and parse nearest package.json file!');
    }

    return parsePackageInfo(pkgInfo);
}

/**
 * Read and parse JSON Schema data
 *
 * @returns {SchemaInfo}
 */
function getSchemaInfo() {
    const fname = `${__dirname}/../schema/latest/base_schema.json`;
    let schemaCurrentVersion;
    let schemaMinimumVersion;

    try {
        // eslint-disable-next-line global-require,import/no-dynamic-require
        const schemaVersionEnum = require(fname).properties.schemaVersion.enum;
        delete require.cache[require.resolve(fname)];

        schemaCurrentVersion = schemaVersionEnum[0];
        schemaMinimumVersion = schemaVersionEnum[schemaVersionEnum.length - 1];
    } catch (err) {
        schemaCurrentVersion = '0.0.0';
        schemaMinimumVersion = '0.0.0';
    }
    return {
        current: schemaCurrentVersion,
        minimum: schemaMinimumVersion
    };
}

/**
 * Parse package.json data
 *
 * @param {object} pkgInfo - package.json data
 *
 * @returns {PackageInfo}
 */
function parsePackageInfo(pkgInfo) {
    const pkgFullVersion = pkgInfo.version;
    const retval = {
        branch: pkgInfo.gitbranch || 'no-gitbranch',
        buildID: pkgInfo.githash || 'no-githash',
        fullVersion: pkgInfo.version,
        timestamp: pkgInfo.buildtimestamp || 'no-buildtimestamp'
    };

    // expected format is version-release
    let hyphenIdx = pkgFullVersion.length;
    while (hyphenIdx && pkgFullVersion[--hyphenIdx] !== '-') {
        // do nothing
    }
    if (!hyphenIdx) {
        throw new Error('Unable to parse ".version" property from package.json file');
    }

    retval.version = pkgFullVersion.slice(0, hyphenIdx);
    retval.release = pkgFullVersion.slice(hyphenIdx + 1);

    return retval;
}

/**
 * Read package.json file
 *
 * @param {string} file - path to the file
 * @param {function(err: Error, data: object)} cb - callback
 */
function readPackageInfo(file, cb) {
    let readErr;
    let pkgData;

    try {
        pkgData = JSON.parse(fs.readFileSync(file));
    } catch (err) {
        readErr = err;
    }
    cb(readErr, pkgData);
}

/**
 * @typedef ApplicationInfo
 * @type {PackageInfo}
 * @property {SchemaInfo} schemaVersion - JSON Schema version
 */
/**
 * @typedef PackageInfo
 * @type {object}
 * @property {string} branch - source code branch
 * @property {string} buildID - unique build ID (commit ID)
 * @property {string} fullVersion - full version
 * @property {string} release - release number (may contain build metadata)
 * @property {string} timestamp - build timestamp
 * @property {string} version - version sequence (may contain build metadata)
 */
/**
 * @typedef SchemaInfo
 * @type {object}
 * @property {string} current - current schema version
 * @property {string} minimum - minimum schema version
 */
