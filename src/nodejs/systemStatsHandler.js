/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const log = require('./logger.js');
const http = require('./httpRequestHandler.js');

const uriMap = {
    cpu: '/mgmt/tm/cloud/sys/cpu-info-stat',
    host: '/mgmt/tm/cloud/sys/host-info-stat',
    disk: '/mgmt/tm/cloud/sys/disk-info',
    tmm: '/mgmt/tm/cloud/sys/tmm-stat',
    db: '/mgmt/tm/sys/db'
};

const pull = function() {
    var promises = [];
    Object.keys(uriMap).forEach(key => {
        promises.push(http.get(uriMap[key]));
    });
    return Promise.all(promises);
};

module.exports = {
    pull: pull
};