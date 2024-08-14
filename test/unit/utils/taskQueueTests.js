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

/* eslint-disable import/order, no-loop-func, no-restricted-syntax */
const moduleCache = require('../shared/restoreCache')();

const sinon = require('sinon');
const assert = require('../shared/assert');
const stubs = require('../shared/stubs');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const logger = sourceCode('src/lib/logger');
const promiseUtil = sourceCode('src/lib/utils/promise');
const TaskQueue = sourceCode('src/lib/utils/taskQueue');
const constants = sourceCode('src/lib/constants');

moduleCache.remember();

describe('Task Queue', () => {
    const HIGH_PRIO = constants.TASK.HIGH_PRIORITY;
    const LOW_PRIO = constants.TASK.LOW_PRIORITY;
    let coreStub;

    before(() => {
        moduleCache.restore();
    });

    beforeEach(() => {
        coreStub = stubs.default.coreStub({ logger: true });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('constructor()', () => {
        const testTaskNoOp = () => {};

        it('should assign default options', () => {
            const taskQDef = new TaskQueue(testTaskNoOp);
            assert.strictEqual(taskQDef.concurrency, 1, 'should have 1 worker by default');
            assert.strictEqual(taskQDef.maxSize, Number.MAX_SAFE_INTEGER, 'should have no max size');
        });

        it('should apply custom options', () => {
            const customOpts = {
                concurrency: 3,
                usePriority: true,
                maxSize: 5,
                logger
            };
            const taskQCustom = new TaskQueue(testTaskNoOp, customOpts);
            assert.strictEqual(taskQCustom.concurrency, customOpts.concurrency);
            assert.strictEqual(taskQCustom.maxSize, customOpts.maxSize);
        });

        it('should assign a unique name to each instance', () => {
            const queues = [
                new TaskQueue(testTaskNoOp),
                new TaskQueue(testTaskNoOp, { concurrency: 2 }),
                new TaskQueue(testTaskNoOp),
                new TaskQueue(testTaskNoOp, { maxSize: 10 }),
                new TaskQueue(testTaskNoOp)
            ];
            const uniqueNames = Array.from(new Set(queues.map((q) => q.name)));
            assert.equal(uniqueNames.length, queues.length);
        });

        it('should immediately be ready upon instantiation', () => {
            const taskQDef = new TaskQueue(testTaskNoOp);
            assert.isTrue(taskQDef.isIdle());
        });

        it('should throw error on invalid argunents', () => {
            assert.throws(() => new TaskQueue(null), 'fn should be a function');
            assert.throws(() => new TaskQueue(() => {}, {
                concurrency: null
            }), 'concurrency should be a safe number');
            assert.throws(() => new TaskQueue(() => {}, {
                concurrency: 0
            }), 'concurrency should be >= 1, got 0');
            assert.throws(() => new TaskQueue(() => {}, {
                logger: null
            }), 'logger should be an instance of Logger');
            assert.throws(() => new TaskQueue(() => {}, {
                maxSize: 0
            }), 'maxSize should be >= 1, got 0');
            assert.throws(() => new TaskQueue(() => {}, {
                maxSize: Number.MAX_VALUE
            }), 'maxSize should be a safe number');
            assert.throws(() => new TaskQueue(() => {}, {
                maxSize: Number.MAX_SAFE_INTEGER + 1
            }), 'maxSize should be a safe number');
            assert.throws(() => new TaskQueue(() => {}, {
                name: 10
            }), 'name should be a string');
            assert.throws(() => new TaskQueue(() => {}, {
                name: ''
            }), 'name should be a non-empty collection');
            assert.throws(() => new TaskQueue(() => {}, {
                usePriority: ''
            }), 'usePriority should be a boolean');
        });
    });

    describe('operations', () => {
        let taskQ;
        let taskPrioQ;
        let taskMultiQ;
        let processed = [];

        const errorMock = new Error('Simulated error for task run');
        const taskSucceeds = { name: 'successful_task' };
        const taskFails = {
            name: 'failed_task',
            priority: HIGH_PRIO,
            errorOnRun: true
        };

        function processTask(task, cb, info) {
            const taskRet = {
                name: task.name,
                taskID: info.taskID,
                workerID: info.workerID,
                priority: task.priority,
                errored: task.errorOnRun || false
            };
            try {
                if (task.errorOnRun) {
                    throw errorMock;
                } else {
                    task.cb(null, taskRet);
                }
            } catch (err) {
                task.cb(err, taskRet);
            } finally {
                cb();
            }
        }

        function addTaskToQueue(task, q) {
            q = q || taskQ;
            task.priority = task.priority || LOW_PRIO;
            return new Promise((resolve, reject) => {
                task.cb = (err, ret) => {
                    processed.push(ret);
                    if (err) {
                        reject(err);
                    } else {
                        resolve(ret);
                    }
                };
                if (!q.push(task)) {
                    resolve();
                }
            });
        }

        function addTaskToPrioQueue(task) {
            return addTaskToQueue(task, taskPrioQ);
        }

        function addTaskToMultiQueue(task) {
            return addTaskToQueue(task, taskMultiQ);
        }

        function processTasks(taskList, keepTaskIDs, keepWorkerIDs) {
            return promiseUtil.allSettled(taskList)
                .then(() => {
                    const parsedResults = processed.map((t) => {
                        if (!keepTaskIDs) { delete t.taskID; }
                        if (!keepWorkerIDs) { delete t.workerID; }
                        return t;
                    });
                    return Promise.resolve(parsedResults);
                });
        }

        beforeEach(() => {
            taskQ = new TaskQueue(processTask);
            taskPrioQ = new TaskQueue(processTask, { usePriority: true });
            taskMultiQ = new TaskQueue(processTask, { concurrency: 2 });
        });

        afterEach(() => {
            taskQ = undefined;
            taskPrioQ = undefined;
            taskMultiQ = undefined;
            processed = [];
        });

        it('should generate unique id for each task', async () => {
            const tasks = [
                addTaskToQueue({ name: 'task1' }),
                addTaskToQueue({ name: 'task2' }),
                addTaskToQueue({ name: 'task3' })
            ];
            await processTasks(tasks, true);

            const ids = Array.from(new Set(processed.map((t) => t.taskID)));
            assert.equal(ids.length, tasks.length, 'should not have duplicate ids');
        });

        it('should process a task added to the queue', async () => {
            const taskResult = await addTaskToQueue({
                name: 'simple task',
                priority: HIGH_PRIO
            });
            assert.exists(taskResult.taskID);
            assert.strictEqual(taskResult.priority, HIGH_PRIO);
            assert.strictEqual(taskResult.name, 'simple task');
        });

        it('should process multiple tasks with both success and failure', async () => {
            const tasks = [
                addTaskToQueue(taskSucceeds),
                addTaskToQueue(taskFails),
                addTaskToQueue({ name: 'someOtherTask', priority: HIGH_PRIO })
            ];

            await assert.becomes(processTasks(tasks), [
                { name: 'successful_task', priority: LOW_PRIO, errored: false },
                { name: 'failed_task', priority: HIGH_PRIO, errored: true },
                { name: 'someOtherTask', priority: HIGH_PRIO, errored: false }
            ]);
        });

        it('should process tasks according to priority when queue usePriority = true)', async () => {
            const tasks = [
                addTaskToPrioQueue({ name: 'taskLow1' }),
                addTaskToPrioQueue({ name: 'taskHigh1', priority: HIGH_PRIO }),
                addTaskToPrioQueue({ name: 'taskLow2' }),
                addTaskToPrioQueue({ name: 'taskHigh2', priority: HIGH_PRIO })
            ];
            await assert.becomes(processTasks(tasks), [
                { name: 'taskHigh1', priority: HIGH_PRIO, errored: false },
                { name: 'taskHigh2', priority: HIGH_PRIO, errored: false },
                { name: 'taskLow1', priority: LOW_PRIO, errored: false },
                { name: 'taskLow2', priority: LOW_PRIO, errored: false }
            ]);
        });

        it('should support multiple workers queue concurrency > 1)', async () => {
            const tasks = [
                addTaskToMultiQueue(testUtil.deepCopy(taskSucceeds)),
                addTaskToMultiQueue(testUtil.deepCopy(taskSucceeds)),
                addTaskToMultiQueue(testUtil.deepCopy(taskSucceeds)),
                addTaskToMultiQueue(testUtil.deepCopy(taskSucceeds))
            ];
            const results = await processTasks(tasks, true, true);
            assert.lengthOf(Array.from(new Set(results.map((t) => t.workerID))), 2, 'should utilize all workers');
        });

        it('should not add task when exceeded maxSize', async () => {
            const tq = new TaskQueue(processTask, { maxSize: 3 });
            const tasks = [
                addTaskToQueue({ name: 'task1' }, tq),
                addTaskToQueue({ name: 'task2' }, tq),
                addTaskToQueue({ name: 'task3' }, tq),
                addTaskToQueue({ name: 'task4' }, tq),
                addTaskToQueue({ name: 'task5' }, tq)
            ];

            await promiseUtil.allSettled(tasks);
            assert.lengthOf(processed, 3, 'it should run 3 tasks only');
        });

        it('should cleanup queue', async () => {
            addTaskToQueue({ name: 'task1' });
            addTaskToQueue({ name: 'task2' });
            addTaskToQueue({ name: 'task3' });
            addTaskToQueue({ name: 'task4' });
            addTaskToQueue({ name: 'task5' });

            assert.deepStrictEqual(taskQ.size(), 5);

            taskQ.clear();
            assert.deepStrictEqual(taskQ.size(), 0);

            taskQ.clear();
            assert.deepStrictEqual(taskQ.size(), 0);

            // should be run after all
            const taskPromise = addTaskToQueue({ name: 'task6' });
            assert.deepStrictEqual(taskQ.size(), 1);

            const result = await taskPromise;
            assert.deepStrictEqual(taskQ.size(), 0);

            assert.deepStrictEqual(result.name, 'task6');
            assert.lengthOf(processed, 1, 'should not process removed tasks');
        });

        it('should work fine with async function', async () => {
            const tq = new TaskQueue(async (task, cb, info) => {
                processTask(task, cb, info);
            });

            const tasks = [
                addTaskToQueue({ name: 'task1' }, tq),
                addTaskToQueue({ name: 'task2' }, tq),
                addTaskToQueue({ name: 'task3' }, tq)
            ];

            await assert.becomes(processTasks(tasks), [
                { name: 'task1', priority: LOW_PRIO, errored: false },
                { name: 'task2', priority: LOW_PRIO, errored: false },
                { name: 'task3', priority: LOW_PRIO, errored: false }
            ]);
        });

        it('should log error for sync task', async () => {
            const tq = new TaskQueue(() => {
                throw new Error('expected sync error');
            });
            tq.push('test');

            await testUtil.waitTill(() => {
                assert.includeMatch(
                    coreStub.logger.messages.error,
                    /Task.*failed with uncaught error after.*[\s\S]+expected sync error/
                );
                return true;
            }, true);
        });

        it('should log error for async task', async () => {
            const tq = new TaskQueue(async () => {
                throw new Error('expected async error');
            });
            tq.push('test');

            await testUtil.waitTill(() => {
                assert.includeMatch(
                    coreStub.logger.messages.error,
                    /Task.*failed with uncaught error after.*[\s\S]+expected async error/
                );
                return true;
            }, true);
        });

        it('should log error when callback "done" called multiple times', async () => {
            const fns = [
                (task, cb) => {
                    cb();
                    cb();
                    cb();
                },
                (task, cb) => {
                    try {
                        cb();
                        throw new Error('expected error');
                    } finally {
                        cb();
                    }
                },
                async (task, cb) => {
                    cb();
                    cb();
                    cb();
                },
                async (task, cb) => {
                    try {
                        cb();
                        throw new Error('expected error');
                    } finally {
                        cb();
                    }
                },
                async (task, cb) => {
                    cb();
                    await testUtil.sleep(100);
                    cb();
                },
                (task, cb) => {
                    cb();
                    setTimeout(cb, 100);
                }
            ];

            for (const fn of fns) {
                coreStub.logger.removeAllMessages();
                assert.isEmpty(coreStub.logger.messages.warning);

                assert.isTrue((new TaskQueue(fn)).push('test'));

                await testUtil.waitTill(() => {
                    assert.includeMatch(
                        coreStub.logger.messages.warning,
                        /"done" callback was called multiple times for task/
                    );
                    return true;
                }, true);
            }
        });

        it('should stop and resume all workers', async () => {
            const tq = new TaskQueue(async (task, done) => {
                processed.push(task);
                await testUtil.sleep(500);
                done();
            }, { concurrency: 2 });

            tq.push(1);
            tq.push(2);
            tq.push(3);
            tq.push(4);
            tq.push(5);

            await testUtil.waitTill(async () => {
                assert.lengthOf(processed, 2);
                assert.isFalse(tq.isIdle());
                await tq.stop();
                return true;
            }, 1, true);

            assert.lengthOf(processed, 2);
            assert.deepStrictEqual(tq.size(), 3);
            assert.isTrue(tq.isIdle());
            assert.sameDeepMembers(processed, [1, 3]);

            processed = [];
            tq.resume();

            await testUtil.waitTill(async () => {
                assert.lengthOf(processed, 3);
                return true;
            }, 1, true);

            await testUtil.sleep(1000);
            assert.sameDeepMembers(processed, [2, 4, 5]);
            assert.isTrue(tq.isIdle());
        });

        it('should stop all workers (same tick)', async () => {
            const tq = new TaskQueue(async (task, done) => {
                processed.push(task);
                await testUtil.sleep(1000);
                done();
            }, { concurrency: 2 });

            tq.push(1);
            tq.push(2);
            tq.push(3);
            tq.push(4);
            tq.push(5);

            await tq.stop();
            await testUtil.sleep(100);

            assert.deepStrictEqual(tq.size(), 5);
            assert.isTrue(tq.isIdle());
        });

        it('should allow to call .stop() multiple times', async () => {
            const tq = new TaskQueue(async (task, done) => {
                processed.push(task);
                await testUtil.sleep(1000);
                done();
            }, { concurrency: 2 });

            tq.push(1);
            tq.push(2);

            await Promise.all([
                tq.stop(),
                tq.stop(),
                tq.stop(),
                tq.stop(),
                testUtil.sleep(100)
            ]);

            assert.isTrue(tq.isIdle());
            assert.deepStrictEqual(tq.size(), 2);
            assert.deepStrictEqual(processed, []);

            tq.resume();
            assert.isTrue(tq.isIdle());

            await testUtil.sleep(100);
            await Promise.all([
                tq.stop(),
                tq.stop(),
                tq.stop(),
                tq.stop(),
                testUtil.sleep(100)
            ]);

            assert.isTrue(tq.isIdle());
            assert.deepStrictEqual(tq.size(), 0);
            assert.deepStrictEqual(processed, [1, 2]);
        });
    });
});
