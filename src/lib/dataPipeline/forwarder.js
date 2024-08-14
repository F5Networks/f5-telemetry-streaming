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

const actionProcessor = require('./actionProcessor');
const DataFilter = require('./dataFilter');

/**
 * @module forwarder
 *
 * @typedef {import('../consumers/api').ConsumerCallback} ConsumerCallback
 * @typedef {import('../consumers').ConsumerCtx} ConsumerCtx
 * @typedef {import('./dataPipeline').DataEventCtxV1} DataEventCtxV1
 * @typedef {import('./dataPipeline').DataEventCtxV2} DataEventCtxV2
 */

/**
 * Consumer Handler Base Class
 */
class ConsumerHandlerBase {
    /** @param {ConsumerCtx} consumerCtx */
    constructor(consumerCtx) {
        this.consumer = consumerCtx.consumer;
        this.ctx = consumerCtx;
        this.dataActions = consumerCtx.config.actions;
        this.filter = new DataFilter(consumerCtx.config);
        this.id = consumerCtx.id;
        this.logger = consumerCtx.logger.getChild('forwarder');
    }

    /**
     * @param {DataCtx} dataCtx - data to pre-process
     *
     * @returns {DataCtx} deep copied and pre-processed data
     */
    _preprocessDataCtx(dataCtx) {
        // copies data
        dataCtx = this.filter.apply(dataCtx);

        try {
            // does modifications in place
            this.dataActions && actionProcessor.processActions(dataCtx, this.dataActions);
        } catch (err) {
            // Catch the error, but do not exit
            this.logger.exception('Error on attempt to process data actions', err);
        }

        return dataCtx;
    }

    /**
     * @param {DataCtx | DataCtx[]} dataCtxs - data to pre-process
     *
     * @returns {DataCtx | DataCtx[]} deep copied and pre-processed data
     */
    _preprocessAllDataCtxs(dataCtxs) {
        if (Array.isArray(dataCtxs)) {
            dataCtxs = dataCtxs.map((dataCtx) => this._preprocessDataCtx(dataCtx));
        } else {
            dataCtxs = this._preprocessDataCtx(dataCtxs);
        }
        return dataCtxs;
    }

    /**
     * Process data
     *
     * @param {DataEventCtxV2 | DataEventCtxV2[]} dataCtx - data context
     * @param {number} emask - event mask
     * @param {ConsumerCallback} [callback] - callback to call once data sent or processed
     */
    process(dataCtxs) {
        return this._preprocessAllDataCtxs(dataCtxs);
    }
}

/**
 * Consumer Handler V1 Class
 *
 * @property {DataEventCtxV1} dataEventCtx
 */
class ConsumerHandlerV1 extends ConsumerHandlerBase {
    /** @param {ConsumerCtx} consumerCtx */
    constructor(consumerCtx) {
        super(consumerCtx);
        this.dataEventCtx = {
            config: consumerCtx.config,
            logger: consumerCtx.logger,
            metadata: consumerCtx.metadata,
            tracer: consumerCtx.tracer
        };
    }

    /**
     * Process data
     *
     * @param {DataEventCtxV2} dataCtx - data context
     */
    process(dataCtx) {
        return Promise.resolve()
            .then(() => this.consumer(
                Object.assign({
                    event: super.process(dataCtx)
                }, this.dataEventCtx)
            ))
            .catch((err) => this.logger.exception('Error on attempt to forward data to consumer', err));
    }
}

/**
 * Consumer Handler V2 Class
 */
class ConsumerHandlerV2 extends ConsumerHandlerBase {
    /**
     * Process data
     *
     * @param {DataEventCtxV2 | DataEventCtxV2[]} dataCtx - data context
     * @param {number} emask - event mask
     * @param {ConsumerCallback} [callback] - callback to call once data sent or processed
     *
     * @returns {any} once data sent or processed
     */
    process(dataCtx, emask, callback) {
        return Promise.resolve()
            .then(() => this.consumer(super.process(dataCtx), emask, callback))
            .catch((err) => this.logger.exception('Error on attempt to forward data to consumer', err));
    }
}

/**
 * Make consumer handler
 *
 * @param {ConsumerCtx} consumerCtx
 *
 * @returns {ConsumerHandlerBase}
 */
module.exports = function makeConsumerHandler(consumerCtx) {
    return new (consumerCtx.v2 ? ConsumerHandlerV2 : ConsumerHandlerV1)(consumerCtx);
};

// TODO: add return type for consumer handler
// TODO: add properties description
// TODO: .process SHOULD NOT use promises!
