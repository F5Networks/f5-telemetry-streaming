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

const { deepCopy } = require('../utils/misc');
const { EVENT_TYPES } = require('../constants');
const normalizeUtil = require('../utils/normalize');

/**
 * @module ihealth/normalize
 *
 * @typedef {import('./poller').QkviewReport} QkviewReport
 */

const filterKeys = {
    exclude: [
        'name',
        'output',
        'match'
    ]
};
const renameKeys = {
    patterns: {
        h_importance: { constant: 'importance' },
        h_action: { constant: 'action' },
        h_name: { constant: 'name' },
        h_cve_ids: { constant: 'cveIds' },
        h_header: { constant: 'header' },
        h_summary: { constant: 'summary' }
    },
    options: {
        exactMatch: true
    }
};

/**
 * Normalize iHealth data
 *
 * @param {QkviewReport} report - report to normalize
 *
 * @returns {Object} normalized report
 */
module.exports = function (report) {
    const normalized = {
        system: {
            hostname: report.diagnostics.system_information.hostname
        },
        diagnostics: []
    };

    deepCopy(report.diagnostics.diagnostics.diagnostic).forEach((diagnostic) => {
        const ret = normalizeUtil._renameKeys(
            normalizeUtil._filterDataByKeys(diagnostic, filterKeys),
            renameKeys.patterns,
            renameKeys.options
        );

        const reduced = {};
        Object.assign(reduced, ret.run_data);
        Object.assign(reduced, ret.results);
        Object.assign(reduced, ret.fixedInVersions);

        if (reduced.version && reduced.version.length === 0) {
            delete reduced.version;
        }
        normalized.diagnostics.push(reduced);
    });

    const urlParts = report.metadata.qkviewURI.split('/');
    const qkviewID = urlParts[urlParts.length - 1];

    normalized.system.ihealthLink = report.metadata.qkviewURI;
    normalized.system.qkviewNumber = qkviewID;
    normalized.telemetryServiceInfo = {
        cycleStart: new Date(report.metadata.cycleStart).toISOString(),
        cycleEnd: new Date(report.metadata.cycleEnd).toISOString()
    };
    normalized.telemetryEventCategory = EVENT_TYPES.IHEALTH_POLLER;

    return normalized;
};
