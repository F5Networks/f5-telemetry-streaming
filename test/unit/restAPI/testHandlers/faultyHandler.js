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

const handler = Object.freeze({
    handle(req) {
        if (req.getQueryParams().reject) {
            return Promise.reject(new Error('expected error - reject'));
        }
        if (req.getQueryParams().throw) {
            throw new Error('expected error - throw');
        }
        return Promise.resolve();
    },
    name: 'Faulty'
});

module.exports = {
    initialize(routerEE) {
        routerEE.on('restapi.register', (register) => register('DELETE', '/faulty', handler));
    }
};
