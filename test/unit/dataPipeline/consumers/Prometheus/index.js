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

const assert = require('assert');

const API = require('../../../../../src/lib/consumers/api');

const MODULE_INSTANCES = [];

class PrometheusConsumer extends API.Consumer {
    constructor() {
        super();
        this.isActive = true;
        this.dataCtxs = [];
    }

    get allowsPull() {
        return true;
    }

    get allowsPush() {
        return false;
    }

    onData(dataCtx, emask, callback) {
        assert.ok(this.isActive);
        this.dataCtxs.push(dataCtx);
        if (callback) {
            callback(emask);
        }
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

    reset() {
        this.dataCtxs = [];
    }
}

class PrometheusModule extends API.ConsumerModule {
    constructor() {
        super();
        this.isActive = true;
        this.consumerInstances = [];
        this.deletedInstances = [];
    }

    createConsumer() {
        assert.ok(this.isActive);
        return this.consumerInstances[this.consumerInstances.push(new PrometheusConsumer()) - 1];
    }

    deleteConsumer(instance) {
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
    load() {
        return MODULE_INSTANCES[MODULE_INSTANCES.push(new PrometheusModule()) - 1];
    },
    getInstances() {
        return MODULE_INSTANCES;
    }
};
