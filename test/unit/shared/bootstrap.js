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

const values = require('object.values');
require('./restoreCache');

if (!Object.values) {
    values.shim();
}

/* eslint-disable no-console */

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
    throw reason;
});

// because we're restoring cache
// it instantiates monitor that's supposed to be singleton
// so set these to work around tests
process.setMaxListeners(15);
// tests needing the monitor should manually enable these
// constants.APP_THRESHOLDS.MONITOR_DISABLED
process.env.MONITOR_DISABLED = true;
