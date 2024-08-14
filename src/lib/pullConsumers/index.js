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

const { CONFIG_CLASSES, DATA_PIPELINE, DEFAULT_UNNAMED_NAMESPACE } = require('../constants');
const errors = require('../errors');
const promiseUtil = require('../utils/promise');
const Service = require('../utils/service');

/**
 * @module pullConsumers
 *
 * @typedef {import('../appEvents').ApplicationEvents} ApplicationEvents
 * @typedef {import('../utils/config').Configuration} Configuration
 * @typedef {import('../logger').Logger} Logger
 * @typedef {import('../restAPI').Register} RegisterRestApiHandler
 * @typedef {import('../restAPI').RequestHandler} RestApiHandler
 */

const EE_NAMESPACE = 'pullconsumers';

class PullConsumerService extends Service {
    /** @inheritdoc */
    async _onStart() {
        this._consumers = {};
        this._pollers = {};

        // start listening for events
        this._registerEvents();
    }

    /** @inheritdoc */
    async _onStop() {
        // stop receiving config updates
        this._configListener.off();
        this._configListener = null;

        // stop receiving consumers updates
        this._consumersListener.off();
        this._consumersListener = null;

        // stop receiving REST API updates
        this._restApiListener.off();
        this._restApiListener = null;

        if (this._offRestApiHandlers) {
            await this._offRestApiHandlers();
        }

        // stop public events
        this._offMyEvents.off();
        this._offMyEvents = null;

        this._consumers = null;
        this._pollers = null;
    }

    /** @returns {number} number of active PULL consumers */
    get numberOfConsumers() {
        return Object.keys(this._consumers).length;
    }

    /** @returns {number} number of active PASSIVE pollers */
    get numberOfPollers() {
        return Object.keys(this._pollers).length;
    }

    /** @param {ApplicationEvents} appEvents - application events */
    initialize(appEvents) {
        // function to register subscribers
        this._registerEvents = () => {
            this._configListener = appEvents.on('config.change', onConfigEvent.bind(this), { objectify: true });
            this.logger.debug('Subscribed to Configuration updates.');

            this._consumersListener = appEvents.on('consumers.change', onConsumersChange.bind(this), { objectify: true });
            this.logger.debug('Subscribed to Consumers updates.');

            this._restApiListener = appEvents.on('restapi.register', onRestApi.bind(this), { objectify: true });
            this.logger.debug('Subscribed to REST API updates.');

            this._offMyEvents = appEvents.register(this.ee, EE_NAMESPACE, [
                'config.applied',
                'systemPoller.collect'
            ]);
        };
    }
}

/**
 * @this PullConsumerService
 *
 * @param {Configuration} config
 */
function onConfigEvent(config) {
    Promise.resolve()
        .then(() => {
            this.logger.debug('Config "change" event');

            this._pollers = {};

            config.components
                .filter((comp) => comp.enable
                    && comp.class === CONFIG_CLASSES.PULL_CONSUMER_CLASS_NAME)
                .forEach((comp) => {
                    this._pollers[comp.id] = {
                        consumer: comp,
                        id: comp.id
                    };
                });

            config.components
                .filter((comp) => comp.enable
                    && comp.class === CONFIG_CLASSES.PULL_CONSUMER_SYSTEM_POLLER_GROUP_CLASS_NAME)
                .forEach((comp) => {
                    this._pollers[comp.pullConsumer].poller = comp;
                });
        })
        .catch((err) => {
            this._pollers = {};
            this.logger.exception('Error caught on attempt to apply configuration to Pull Consumer Service:', err);
        })
        // emit in any case to show we are done with config processing
        .then(() => {
            this.logger.info(`${this.numberOfPollers} system pollers registered`);
            this.ee.safeEmitAsync('config.applied', {
                numberOfPollers: this.numberOfPollers
            });
        });
}

/**
 * @this PullConsumerService
 *
 * @param {GetConsumers} getConsumers
 */
function onConsumersChange(getConsumers) {
    Promise.resolve()
        .then(() => {
            this.logger.debug('Consumers "change" event');

            this._consumers = {};
            getConsumers()
                .filter((consumerCtx) => consumerCtx.allowsPull)
                .forEach((consumerCtx) => {
                    this._consumers[consumerCtx.id] = consumerCtx.consumer;
                });
        })
        .catch((err) => {
            this._consumers = {};
            this.logger.exception('Error caught on attempt to apply consumers configuration to Pull Consumer Service:', err);
        })
        // emit in any case to show we are done with config processing
        .then(() => {
            this.logger.info(`${this.numberOfConsumers} pull consumers registered`);
            this.ee.safeEmitAsync('consumer.applied', {
                numberOfConsumers: this.numberOfConsumers
            });
        });
}

/**
 * Apply REST API configuration
 *
 * @this PullConsumerService
 *
 * @param {RegisterRestApiHandler} register - register handler
 */
async function onRestApi(register) {
    // previous handler (if registered) destroyed already
    const requestHandler = makeRequestHandler.call(this);

    const offs = [
        register('GET', '/pullconsumer/:consumer', requestHandler),
        register('GET', '/namespace/:namespace/pullconsumer/:consumer', requestHandler)
    ];
    this._offRestApiHandlers = () => promiseUtil.allSettled(offs.map((off) => off()));
}

/**
 * @this PullConsumerService
 *
 * @returns {RestApiHandler}
 */
function makeRequestHandler() {
    const service = this;
    /**
     * @implements {RestApiHandler}
     */
    return Object.freeze({
        async collectStats(config) {
            if (config.poller.systemPollers.length === 0) {
                return [];
            }

            const promises = config.poller.systemPollers.map((pollerID) => {
                const resolvers = promiseUtil.withResolvers();
                const emitErr = service.ee.safeEmit('systemPoller.collect', pollerID, (error, dataCtx) => {
                    if (error) {
                        resolvers.reject(error);
                    } else {
                        resolvers.resolve(dataCtx);
                    }
                });
                if (typeof emitErr !== 'boolean') {
                    resolvers.reject(emitErr);
                }
                return resolvers.promise;
            });

            return promiseUtil.getValues(await promiseUtil.allSettled(promises));
        },

        getConfig(consumerName, namespace = DEFAULT_UNNAMED_NAMESPACE) {
            const poller = Object.values(service._pollers)
                .find((rec) => rec.consumer.name === consumerName && rec.consumer.namespace === namespace);

            let consumer;
            if (typeof poller !== 'undefined') {
                consumer = service._consumers[poller.id];
            }
            if (typeof consumer === 'undefined') {
                throw new errors.ObjectNotFoundInConfigError(`No active confugration found for Pull Consumer "${consumerName}" (${namespace})`);
            }
            return {
                consumer,
                id: poller.id,
                poller: poller.poller
            };
        },

        processStats(config, rawStats) {
            // TODO: update to send data via dataPipeline
            const resolvers = promiseUtil.withResolvers();
            config.consumer(rawStats, DATA_PIPELINE.PUSH_PULL_EVENT, (error, response) => {
                if (error) {
                    resolvers.reject(error);
                } else {
                    resolvers.resolve(response);
                }
            });
            return resolvers.promise;
        },

        /** @inheritdoc */
        async handle(req, res) {
            const uriParams = req.getUriParams();
            const config = this.getConfig(uriParams.consumer, uriParams.namespace);
            const rawStats = await this.collectStats(config);
            const response = await this.processStats(config, rawStats);

            res.body = response.data;
            res.code = 200;
            res.contentType = response.contentType || undefined;
        },
        name: 'System Poller Service'
    });
}

module.exports = PullConsumerService;
