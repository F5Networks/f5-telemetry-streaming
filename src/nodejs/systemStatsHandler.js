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

// array of stats to pull
const statsMap = {
    tmmInfo: {
        uri: '/mgmt/tm/sys/tmm-info/stats',
        normalize: normalizeData
    },
    tmmTraffic: {
        uri: '/mgmt/tm/sys/tmm-traffic/stats',
        normalize: normalizeData
    }
};

// TODO: place in normalize.js or similar as this is going to grow
function normalizeData(data) {
    let normalizedData;
    try {
        normalizedData = data.entries;
    } catch (e) {
        normalizedData = data;
    }
    return normalizedData;
}

function getStat(name, stat) {
    return http.get(stat.uri)
        .then((data) => {
            const normalizedData = stat.normalize(data);
            return { name, data: normalizedData };
        })
        .catch((err) => {
            throw err;
        });
}

function pullStats() {
    const promises = [];
    Object.keys(statsMap).forEach((key) => {
        promises.push(getStat(key, statsMap[key]));
    });
    return Promise.all(promises);
}

module.exports = {
    pull: pullStats
};
