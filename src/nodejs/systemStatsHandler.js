/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const log = require('./logger.js'); // eslint-disable-line no-unused-vars
const http = require('./httpRequestHandler.js');
const pStats = require('./properties.json').stats;

// TODO: place in normalize.js or similar as this is going to grow
function normalizeData(data) {
    let nData = {};
    if (data.entries) {
        // device object returned is complicated, simplify
        Object.keys(data.entries).forEach((k) => {
            let v = data.entries[k];
            v = v.nestedStats ? v.nestedStats : v;
            v = v.entries ? v.entries : v;
            const kM = k.replace('https://localhost/', '');
            nData[kM] = v;
        });
    } else {
        nData = data;
    }

    return nData;
}

function getStat(name, stat) {
    return http.get(stat.uri)
        .then((data) => {
            const normalizedData = normalizeData(data);
            return { name, data: normalizedData };
        })
        .catch((err) => {
            const msg = `getStat: ${err}`;
            log.error(msg);
            throw new Error(msg);
        });
}

function pullStats() {
    const promises = [];
    Object.keys(pStats).forEach((k) => {
        promises.push(getStat(k, pStats[k]));
    });
    return Promise.all(promises);
}

module.exports = {
    pull: pullStats
};
