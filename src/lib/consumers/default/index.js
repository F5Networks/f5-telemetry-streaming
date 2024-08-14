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

/* eslint-disable no-unused-expressions */

const API = require('../api');

/**
 * @module consumers/default
 *
 * @typedef {import('../api').ConsumerCallback} ConsumerCallback
 * @typedef {import('../api').ConsumerConfig} ConsumerConfig
 * @typedef {import('../api').ConsumerInterface} ConsumerInterface
 * @typedef {import('../api').ConsumerModuleInterface} ConsumerModuleInterface
 * @typedef {import('../../dataPipeline').DataEventCtxV2} DataCtx
 */

/**
 * Telemetry Streaming Default Pull Consumer
 *
 * @implements {ConsumerInterface}
 */
class DefaultPullConsumer extends API.Consumer {
    /** @inheritdoc */
    get allowsPull() {
        return true;
    }

    /** @inheritdoc */
    get allowsPush() {
        return false;
    }

    /** @inheritdoc */
    onData(dataCtxs, emask, callback) {
        this.logger.verbose(`Data types '${dataCtxs.map((d) => d.type).join(', ')}' processed`);
        callback(null, {
            contentType: 'application/json',
            data: dataCtxs.map((d) => d.data)
        });
    }
}

/**
 * Telemetry Streaming Default Push Consumer
 *
 * @implements {ConsumerInterface}
 */
class DefaultPushConsumer extends API.Consumer {
    /** @inheritdoc */
    get allowsPull() {
        return false;
    }

    /** @inheritdoc */
    get allowsPush() {
        return true;
    }

    /** @inheritdoc */
    onData(dataCtx, emask, callback) {
        this.logger.verbose(`Data type '${dataCtx.type}' processed`);
        this.writeTraceData(dataCtx.data);
        callback && callback(null, dataCtx.data);
    }
}

/**
 * Telemetry Streaming Default Consumer Module
 *
 * @implements {ConsumerModuleInterface}
 */
class DefaultConsumerModule extends API.ConsumerModule {
    /** @inheritdoc */
    async createConsumer({ config }) {
        if (config.class === 'Telemetry_Consumer') {
            return new DefaultPushConsumer();
        }
        return new DefaultPullConsumer();
    }
}

/**
 * Load Telemetry Streaming Default Consumer module
 *
 * Note: called once only if not in memory yet
 *
 * @param {API.ModuleConfig} moduleConfig - module's config
 *
 * @return {API.ConsumerModuleInterface} module instance
 */
module.exports = {
    async load() {
        return new DefaultConsumerModule();
    }
};
