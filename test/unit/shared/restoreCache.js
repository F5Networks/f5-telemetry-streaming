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

/*
 This module helps to restore cache state.
 Be careful with it, read node's documentation about modules and node's internals.
 This approach doesn't solve all issues with cache. For example:

 > content of module_1:
 module.exports = EventEmitter();

 > content of module_2:
 const eventEmitter = require('./module_1');
 const moduleId = randomNumber();
 eventEmitter.on('change', () => console.log(`on change event, moduleId = ${moduleId}`));

 > content of module_3:
 const eventEmitter = require('./module_1');
 const module2Inst1 = require('./module_2');
 eventEmitter.emit('change');
 // you will see just ONE line from module2Inst1
 delete require.cache[require.resolve('./module_2')];
 const module2Inst2 = require('./module_2');
 eventEmitter.emit('change');
 // you will see TWO lines from module2Inst1 and module2Inst2

 So, actually it is memory leak but for tests it should be fine.
*/

// preload popular libs here for optimization

const pathUtil = require('path');
require('sinon');
require('./assert');
require('../../winstonLogger');

const BASE_DIR = process.cwd();
const SRC_DIR = pathUtil.join(BASE_DIR, 'src');

delete require.cache[require.resolve('path')];

/**
 * Verify that modules from '/src' are not cached
 *
 * @param {Object} cache - copy of require.cache
 */
function checkCache(cache) {
    Object.keys(cache).forEach((key) => {
        if (key.startsWith(SRC_DIR)) {
            /* eslint-disable no-console */
            console.warn(`WARN: Module '${key.slice(BASE_DIR.length)}' found in require.cache!`);
            // might be better to raise error here
        }
    });
}

/**
 * Restore require.cache to desired state. It will force node to reload modules on
 * attempt to import them. All *Tests.js file will have their own instances of 'fs', 'os' and etc.
 *
 * @param {Object} preExistedCache - copy of require.cache
 * @param {boolean} [allowSrcDir] - allow modules from './src'
 */
function restoreCache(preExistedCache, allowSrcDir) {
    Object.keys(require.cache).forEach((key) => {
        delete require.cache[key];
    });
    Object.assign(require.cache, preExistedCache);
    if (!allowSrcDir) {
        checkCache(require.cache);
    }
}

/**
 * Restore initial require.cache state
 *
 * @returns {Function} that restores initial require.cache state
 */
module.exports = (function () {
    console.info('Saving initial \'require.cache\' state');
    console.info(`Source code directory - ${SRC_DIR}`);

    // just to be sure that modules from /src are not imported yet
    checkCache(require.cache);
    const preExistedCache = Object.assign({}, require.cache);

    class ModuleCache {
        constructor() {
            this.cacheStack = [];
        }

        remember() {
            this.cacheStack.push(Object.assign({}, require.cache));
        }

        restore() {
            const allowSrcDir = this.cacheStack.length > 0;
            restoreCache(this.cacheStack.pop() || preExistedCache, allowSrcDir);
        }
    }

    return function () {
        restoreCache(preExistedCache);
        return new ModuleCache();
    };
}());
