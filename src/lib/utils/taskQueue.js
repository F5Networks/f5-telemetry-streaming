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

const Queue = require('heap');

const assert = require('./assert');
const defaultLogger = require('../logger').getChild('TaskQueue');
const generateUuid = require('./misc').generateUuid;

/**
 * @module utils/taskQueue
 *
 * @typedef {import('../logger').Logger} Logger
 */

const NO_TASK = Symbol('NO_TASK');

/** @returns {string} unique ID */
function uniqueID() {
    return generateUuid().slice(0, 5);
}

/**
 * @param {[sec: number, nanosec: number]} ts - high-resolution timestamp
 *
 * @returns {number} high-resolution time to milliseconds
 */
function hrToMs(ts) {
    // seconds -> nanosec -> milisec
    return ((ts[0] * 1e9 + ts[1]) / 1e6);
}

/**
 * Calculate delta for high-resolution timestamps (result = end - start)
 *
 * @param {[number, number]} start - high-resolution timestamp
 *
 * @returns {number} delta in miliseconds
 */
function hrDeltaMs(start) {
    return (hrToMs(process.hrtime()) - hrToMs(start)).toFixed(5);
}

/**
 * @this WorkerCtx
 *
 * @param {Task} task
 *
 * @returns {{called: boolean, fn: function, startTime: [number, number]}} wrapper object
 */
function nextTaskWrapper(task) {
    const tid = task.id;
    const ctx = {
        called: false,
        fn: () => {
            if (ctx.called) {
                this.logger.warning(`"done" callback was called multiple times for task "${tid}" (${hrDeltaMs(ctx.startTime)} ms. elapsed.)`);
            } else {
                ctx.called = true;
                this.logger.verbose(`Task "${tid}" finished in ${hrDeltaMs(ctx.startTime)} ms.`);
                this.doTask();
            }
        },
        startTime: process.hrtime()
    };
    return ctx;
}

/**
 * @this WorkerCtx
 *
 * @returns {void} once next task executed or scheduled
 */
async function doTask() {
    let task = NO_TASK;
    if (this.stopPromise === null) {
        try {
            task = this.getNextTask();
        } catch (err) {
            this.logger.exception('Unable to fetch next task:', err);
        }
    }

    if (task === NO_TASK) {
        this.idle = true;
        this.stopPromise && this.stopPromise.resolve();
        return;
    }

    this.logger.verbose(task);
    const wrapper = nextTaskWrapper.call(this, task);

    try {
        await this.fn(task.task, wrapper.fn, { taskID: task.id, workerID: this.worker.id });
    } catch (err) {
        this.logger.exception(
            `Task "${task.id}" failed with uncaught error after ${hrDeltaMs(wrapper.startTime)} ms.:`,
            err
        );
        !wrapper.called && wrapper.fn();
    }
}

/**
 * Task Queue Worker Private Class
 *
 * @class
 * @private
 *
 * @property {function} do - starts activity
 * @property {string} id - instance ID
 * @property {function(): boolean} isBusy - returns `true` when the worker is busy
 * @property {function(): Promise} stop - stops worker
 */
class Worker {
    /**
     * Constructor
     *
     * @param {string} id - instance ID
     * @param {TaskCallback} fn - function to execute a task on
     * @param {function(): Task} getNextTask - returns next task
     * @param {Logger} logger - parent logger
     */
    constructor(id, fn, getNextTask, logger) {
        assert.string(id, 'id');
        assert.function(fn, 'fn');
        assert.function(getNextTask, 'getNextTask');
        assert.instanceOf(logger, defaultLogger.constructor, 'logger');

        const ctx = {
            fn,
            getNextTask,
            idle: true,
            logger: logger.getChild(id),
            stopPromise: null,
            worker: this
        };
        ctx.doTask = setImmediate.bind(null, doTask.bind(ctx));

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            do: {
                value: () => {
                    if (!this.isBusy()) {
                        ctx.idle = false;
                        ctx.doTask();
                    }
                }
            },
            id: {
                value: id
            },
            isBusy: {
                value: () => !ctx.idle
            },
            stop: {
                value: async () => {
                    if (!this.isBusy()) {
                        ctx.logger.verbose('Idle, stopped');
                        return;
                    }

                    ctx.logger.verbose('Stopping');

                    if (ctx.stopPromise === null) {
                        let resolve;
                        ctx.stopPromise = (new Promise((done) => {
                            resolve = done;
                        }))
                            .then(() => {
                                ctx.stopPromise = null;
                                ctx.logger.verbose('Stopped');
                            });

                        ctx.stopPromise.resolve = resolve;
                    }

                    await ctx.stopPromise;
                }
            }
        });
    }
}

/**
 * Task Queue Class
 *
 * @class
 * @public
 *
 * @property {function(): void} clear - clears pending tasks
 * @property {number} concurrency - number of workers
 * @property {function(): boolean} isIdle - returns `true` if all workers are idle
 * @property {number} maxSize - max number of pending tasks in the queue
 * @property {string} name - Task Queue name
 * @property {TaskCallback: boolean} push - returns `true` if task was successfuly added to the queue.
 * @property {function(): void} resume - resume all activities
 * @property {function(): void} stop - stops all workers
 */
class TaskQueue {
    /**
     * Constructor
     *
     * @param {TaskCallback} fn - target function
     * @param {object} [options] - options
     * @param {number} [options.concurrency = 1] - number of workers
     * @param {Logger} [option.logger] - parent logger
     * @param {string} [options.name] - name
     * @param {boolean} [options.usePriority = false] - if true, the queue will use task.priority when processing tasks
     */
    constructor(fn, {
        concurrency = 1,
        logger = defaultLogger,
        maxSize = Number.MAX_SAFE_INTEGER,
        name = `TaskQueue_${uniqueID()}`,
        usePriority = false
    } = {}) {
        assert.function(fn, 'fn');
        assert.safeNumberGrEq(concurrency, 1, 'concurrency');
        assert.instanceOf(logger, defaultLogger.constructor, 'logger');
        assert.safeNumberBetweenInclusive(maxSize, 1, Number.MAX_SAFE_INTEGER, 'maxSize');
        assert.string(name, 'name');
        assert.boolean(usePriority, 'usePriority');

        const queue = usePriority
            ? new Queue((a, b) => a.task.priority - b.task.priority)
            : new Queue();
        const getNextTask = () => (queue.size() ? queue.pop() : NO_TASK);
        const workers = [];

        let siID = null;
        logger = logger.getChild(name);

        /** define static read-only props that should not be overriden */
        Object.defineProperties(this, {
            clear: {
                value: () => {
                    queue.clear();
                }
            },
            concurrency: {
                value: concurrency
            },
            isIdle: {
                value: () => workers.every((w) => !w.isBusy())
            },
            maxSize: {
                value: maxSize
            },
            name: {
                value: name
            },
            push: {
                value: (task) => {
                    if (queue.size() >= this.maxSize) {
                        return false;
                    }

                    queue.push({ task, id: uniqueID() });
                    this.resume();
                    return true;
                }
            },
            resume: {
                value: () => {
                    if (siID === null && this.size() > 0) {
                        siID = setImmediate(() => {
                            siID = null;

                            const wLen = workers.length;
                            const qLen = queue.size();

                            for (let workerIdx = 0, jobIdx = 0; workerIdx < wLen && jobIdx < qLen; workerIdx += 1) {
                                if (!workers[workerIdx].isBusy()) {
                                    workers[workerIdx].do();
                                    jobIdx += 1;
                                }
                            }
                        });
                    }
                }
            },
            size: {
                value: () => queue.size()
            },
            stop: {
                value: async () => {
                    if (siID !== null) {
                        clearImmediate(siID);
                        siID = null;
                    }
                    return Promise.all(workers.map((w) => w.stop()));
                }
            }
        });

        for (let i = 0; i < this.concurrency; i += 1) {
            const id = `worker_${i + 1}`;
            workers.push(new Worker(
                id, fn, getNextTask, logger
            ));
        }
        logger.verbose(`${workers.length} workers created`);
    }
}

module.exports = TaskQueue;

/**
 * @typedef {object} TaskInfo
 * @property {string} taskID - task ID
 * @property {string} workerID - worker ID
 */
/**
 * @typedef {object} Task
 * @property {any} tasks - task's data
 * @property {string} id unique ID
 */
/**
 * Signature for a task that is processed by the TaskQueue
 * NOTE: callback should be called only once
 *
 * @callback TaskCallback
 * @param {any} task - task to execute
 * @param {function} done - callback after task execution regardless of success/failure
 * @param {TaskInfo} info - additional task info available once task is bound/added to queue
 */
/**
 * @typedef {object} WorkerCtx
 * @property {function} fn - function to call to execute a task
 * @property {function(): TaskInfo} getNextTask - returns next task
 * @property {boolean} idle - worker's idle status
 * @property {Logger} logger - logger
 * @property {null | Promise} stopPromise - created once worker.stop() called
 * @property {function} stopPromise.resolve - function to call to let know the worker stopped
 * @property {Worker} worker - worker instance
 */
