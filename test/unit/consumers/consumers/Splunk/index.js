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

/* eslint-disable no-bitwise, no-proto */

'use strict';

const assert = require('assert');

const API = require('../../../../../src/lib/consumers/api');
const hrtimestamp = require('../../../../../src/lib/utils/datetime').hrtimestamp;

const MODULE_INSTANCES = [];
const TIMESTAMP = hrtimestamp();

if (((global.consumersTests || {}).splunk || {}).fail) {
    throw new Error('Expected error on attempt to initialize "Splunk" consumer module');
}

class SplunkConsumer extends API.Consumer {
    constructor() {
        super();
        this.isActive = true;
        this.dataCtxs = [];
    }

    get allowsPull() {
        return false;
    }

    get allowsPush() {
        return true;
    }

    onData(dataCtx) {
        assert.ok(this.isActive);
        this.dataCtxs.push(dataCtx);
    }

    onLoad(config) {
        assert.ok(this.isActive);
        return super.onLoad(config);
    }

    onUnload() {
        if (((global.consumersTests || {}).splunk || {}).failConsumerOnUnload) {
            throw new Error('Expected error on attempt to unload "Splunk" consumer instance');
        }
        assert.ok(this.isActive);
        this.isActive = false;
        return super.onUnload();
    }

    reset() {
        this.dataCtxs = [];
    }
}

class SplunkModule extends API.ConsumerModule {
    constructor() {
        super();
        this.consumerInstances = [];
        this.counter = 0;
        this.deletedInstances = [];
        this.isActive = true;
    }

    createConsumer(config) {
        assert.ok(this.isActive);
        const inst = new SplunkConsumer();
        this.consumerInstances.push({ inst, config });

        const methodToDelete = ((global.consumersTests || {}).splunk || {}).failConsumerMethodAPI;
        if ((this.counter & 0b1) === 0 && methodToDelete) {
            inst[methodToDelete] = null;
        }
        this.counter += 1;
        return inst;
    }

    deleteConsumer(instance) {
        this.counter += 1;
        if ((this.counter & 0b1) === 0 && ((global.consumersTests || {}).splunk || {}).failDeleteConsumer) {
            throw new Error('Expected error on attempt to delete "Splunk" consumer instance');
        }

        assert.ok(this.isActive);
        const idx = this.consumerInstances.findIndex((val) => val.inst === instance);
        if (idx === -1) {
            throw new Error('Unknown consumer instance!');
        }
        this.consumerInstances.splice(idx, 1);
        this.deletedInstances.push(instance);
        return super.deleteConsumer(instance);
    }

    onLoad(config) {
        assert.ok(this.isActive);
        return super.onLoad(config);
    }

    onUnload() {
        assert.ok(this.isActive);
        this.isActive = false;
        return super.onUnload();
    }
}

/**
 * Load Consumer module
 *
 * Note: called once only if not in memory yet
 *
 * @param {API.ModuleConfig} moduleConfig - module's config
 *
 * @return {API.ConsumerModuleInterface} module instance
 */
module.exports = {
    load({ logger, name, path }) {
        if (((global.consumersTests || {}).splunk || {}).failLoad) {
            throw new Error('Expected error splunkModule.load');
        }
        if (((global.consumersTests || {}).splunk || {}).failLoadPromise) {
            return Promise.reject(new Error('Expected error splunkModule.load.promise'));
        }

        const inst = new SplunkModule();
        MODULE_INSTANCES.push({
            inst, logger, name, path
        });

        const methodToDelete = ((global.consumersTests || {}).splunk || {}).failModuleMethodAPI;
        if (methodToDelete) {
            inst[methodToDelete] = null;
        }

        return inst;
    },
    getInstances() {
        return MODULE_INSTANCES;
    },
    getTimestamp() {
        return TIMESTAMP;
    }
};

if (((global.consumersTests || {}).splunk || {}).failExports) {
    module.exports = 10;
}
if (((global.consumersTests || {}).splunk || {}).failExportsLoad) {
    module.exports = { something: 10 };
}
