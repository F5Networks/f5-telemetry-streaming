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

/* eslint-disable import/order */
const moduleCache = require('./shared/restoreCache')();

const fs = require('fs');
const path = require('path');

const assert = require('./shared/assert');
const sourceCode = require('./shared/sourceCode');

const packageInfo = sourceCode('package.json');
const schemaInfo = sourceCode('src/schema/latest/base_schema.json').properties.schemaVersion.enum;

moduleCache.remember();

describe('Application Info (appInfo.js)', () => {
    const packageJSONFilePath = path.join(__dirname, '../../package.json');
    let appInfo;
    let packageJSONRaw;
    let packageJSON;

    function restoreOriginPackageJSON() {
        fs.writeFileSync(packageJSONFilePath, packageJSONRaw);
    }

    function rewritePackageJSON(data) {
        fs.writeFileSync(packageJSONFilePath, JSON.stringify(data, null, 4));
    }

    before(() => {
        packageJSONRaw = fs.readFileSync(packageJSONFilePath);
    });

    after(() => {
        restoreOriginPackageJSON();
    });

    beforeEach(() => {
        moduleCache.restore();
        packageJSON = JSON.parse(packageJSONRaw);
    });

    it('should provide application info (release)', () => {
        const versionInfo = packageInfo.version.split('-');
        if (versionInfo.length === 1) {
            versionInfo.push('1');
        }
        // to be sure that we really have some data
        assert.isNotEmpty(versionInfo[0]);
        assert.isNotEmpty(versionInfo[1]);

        appInfo = sourceCode('src/lib/appInfo');
        assert.deepStrictEqual(appInfo, {
            branch: 'gitbranch',
            buildID: 'githash',
            fullVersion: packageInfo.version,
            release: versionInfo[1],
            schemaVersion: {
                current: schemaInfo[0],
                minimum: '0.9.0'
            },
            timestamp: 'buildtimestamp',
            version: versionInfo[0]
        });
    });

    it('should provide application info (development)', () => {
        rewritePackageJSON(Object.assign(packageJSON, {
            buildtimestamp: '202401070103',
            gitbranch: 'dev-branch',
            githash: 'abcdefabcdef',
            version: '1.34.0-0.202401070102.abcdef.dev_branch'
        }));

        appInfo = sourceCode('src/lib/appInfo');
        assert.deepStrictEqual(appInfo, {
            branch: 'dev-branch',
            buildID: 'abcdefabcdef',
            fullVersion: '1.34.0-0.202401070102.abcdef.dev_branch',
            release: '0.202401070102.abcdef.dev_branch',
            schemaVersion: {
                current: schemaInfo[0],
                minimum: '0.9.0'
            },
            timestamp: '202401070103',
            version: '1.34.0'
        });
    });

    it('should fail when no "release" provided', () => {
        rewritePackageJSON(Object.assign(packageJSON, {
            version: '1.34.0'
        }));

        assert.throws(
            () => sourceCode('src/lib/appInfo'),
            'Unable to parse ".version" property from package.json file'
        );
    });

    it('should use default values for missing fields', () => {
        rewritePackageJSON(Object.assign(packageJSON, {
            buildtimestamp: undefined,
            gitbranch: undefined,
            githash: undefined,
            version: '1.34.0-0.202401070102.abcdef.dev_branch'
        }));

        appInfo = sourceCode('src/lib/appInfo');
        assert.deepStrictEqual(appInfo, {
            branch: 'no-gitbranch',
            buildID: 'no-githash',
            fullVersion: '1.34.0-0.202401070102.abcdef.dev_branch',
            release: '0.202401070102.abcdef.dev_branch',
            schemaVersion: {
                current: schemaInfo[0],
                minimum: '0.9.0'
            },
            timestamp: 'no-buildtimestamp',
            version: '1.34.0'
        });
    });

    it('should not be able to override existing or add new properties', () => (function checkFrozen(data) {
        assert.isFrozen(data, JSON.stringify(data));
        Object.keys(data).forEach((key) => {
            const value = data[key];
            if (value && typeof value === 'object') {
                checkFrozen(value);
            }
        });
    }(sourceCode('src/lib/appInfo'))));
});
