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

const sinon = require('sinon');

const assert = require('../shared/assert');
const BigIpApiMock = require('../shared/bigipAPIMock');
const {
    DeviceApiMock,
    IHealthApiMock,
    QkviewManagerMock
} = require('./api/mocks');
const sourceCode = require('../shared/sourceCode');

const utilMisc = sourceCode('src/lib/utils/misc');

const defaultUser = 'admin';
const localhost = 'localhost';

class PollerMock {
    /**
     * @param {IHealthConfig} ihealth
     * @param {DeviceConfig} device
     */
    constructor(ihealth, device) {
        const httpMockOptions = { replyTimes: Infinity };

        this.ihealth = {
            inst: new IHealthApiMock()
        };
        this.ihealth.auth = this.ihealth.inst.mockAuth(
            ihealth.credentials.username,
            ihealth.credentials.password,
            httpMockOptions
        );
        this.ihealth.qkviewDiag = this.ihealth.inst.mockQkviewDiagnostics(
            undefined,
            httpMockOptions
        );
        this.ihealth.qkviewReport = this.ihealth.inst.mockQkviewReport(httpMockOptions);
        this.ihealth.qkviewUpload = this.ihealth.inst.mockQkviewUpload('qkview.*', httpMockOptions);

        if (!device.connection.host || device.connection.host === localhost) {
            // remote device case
            this.localBigIp = {
                inst: new BigIpApiMock(localhost, {
                    port: device.connection.port,
                    protocol: device.connection.protocol
                })
            };
            this.localBigIp.inst.addPasswordlessUser(device.credentials.username || defaultUser);
            this.qkviewMock = {
                inst: new QkviewManagerMock(
                    new DeviceApiMock(this.localBigIp.inst)
                )
            };
            this.qkviewMock.stubs = this.qkviewMock.inst.mockLocalCase(undefined, Object.assign({
                dir: ihealth.downloadFolder
            }, httpMockOptions));
        } else {
            // remote device case
            this.localBigIp = {
                inst: new BigIpApiMock()
            };
            this.localBigIp.inst.addPasswordlessUser(defaultUser);

            this.remoteBigIp = {
                inst: new BigIpApiMock(device.connection.host, {
                    port: device.connection.port,
                    protocol: device.connection.protocol
                })
            };
            this.remoteBigIp.auth = this.remoteBigIp.inst.mockAuth(
                device.credentials.username,
                device.credentials.password,
                httpMockOptions
            );
            this.qkviewMock = {
                inst: new QkviewManagerMock(
                    new DeviceApiMock(this.localBigIp.inst),
                    new DeviceApiMock(this.remoteBigIp.inst)
                )
            };
            this.qkviewMock.stubs = this.qkviewMock.inst.mockRemoteCase(undefined, Object.assign({
                dir: ihealth.downloadFolder
            }, httpMockOptions));
        }

        const createQkviewStub = this.qkviewMock.stubs.local.createQkview
            || this.qkviewMock.stubs.remote.createQkview;

        createQkviewStub.cmdFiles = {};

        createQkviewStub.dacli.createTask.stub.callsFake((_taskId, reqBody) => {
            createQkviewStub.cmdFiles[_taskId] = reqBody.utilCmdArgs.split('../..')[1];
            return [200, { _taskId }];
        });
        createQkviewStub.dacli.pollTaskResult.stub.callsFake((taskId) => {
            const qkviewFile = createQkviewStub.cmdFiles[taskId];
            assert.isDefined(qkviewFile, 'qkviewFile should be defined');
            utilMisc.fs.writeFileSync(qkviewFile, 'qkviewData');
            return [200, { _taskState: 'COMPLETED' }];
        });
    }

    /** Stub for obtaining Qkview diagnostics routine */
    getQkviewDiagStub() {
        const customStub = sinon.stub(
            { method() { return true; } },
            'method'
        );
        customStub.returns(true);

        this.ihealth.qkviewDiag.stub.callsFake((data, template) => (customStub()
            ? [200, template]
            : [500, '', 'qkview report error']));
        return customStub;
    }

    /** Stub for generating Qkview routine */
    getQkviewGenStub() {
        const customStub = sinon.stub(
            { method() { return true; } },
            'method'
        );
        customStub.returns(true);

        const createQkviewStub = this.qkviewMock.stubs.local.createQkview
            || this.qkviewMock.stubs.remote.createQkview;

        createQkviewStub.dacli.pollTaskResult.stub.callsFake((taskId) => {
            const qkviewFile = createQkviewStub.cmdFiles[taskId];
            assert.isDefined(qkviewFile, 'qkviewFile should be defined');
            utilMisc.fs.writeFileSync(qkviewFile, 'qkviewData');

            return [200, { _taskState: customStub() ? 'COMPLETED' : 'FAILED' }];
        });
        return customStub;
    }

    /** Stub for obtaining Qkview report routine */
    getQkviewReportStub() {
        const customStub = sinon.stub(
            { method() { return true; } },
            'method'
        );
        customStub.returns(true);

        this.ihealth.qkviewReport.stub.callsFake((data, template) => {
            if (!customStub()) {
                template.processing_status = 'ERROR';
                template.processing_messages = 'qkview processing error';
            }
            return [200, template];
        });
        return customStub;
    }

    /** Stub for Qkview upload routine */
    getQkviewUploadStub() {
        const customStub = sinon.stub(
            { method() { return true; } },
            'method'
        );
        customStub.returns(true);

        this.ihealth.qkviewUpload.stub.callsFake((data, template) => (customStub()
            ? [303, template]
            : [500, '', 'qkview upload error']));
        return customStub;
    }

    /** Stub for local Qkview removal routine */
    getRemoveLocalFileStub() {
        const customStub = sinon.stub(
            { method() { return true; } },
            'method'
        );
        customStub.returns(true);

        this.qkviewMock.stubs.local.removeQkview.removePath.stub.callsFake(() => (customStub()
            ? [200, '']
            : [500, '', 'remove local qkview error']));
        return customStub;
    }
}

module.exports = PollerMock;

/**
 * @typedef {object} DeviceConfig
 * @property {object} connection
 * @property {string} [connection.host]
 * @property {number} [connection.port]
 * @property {string} [connection.protocol]
 * @property {object} credentials
 * @property {string} [credentials.username]
 * @property {string} [credentials.password]
 */
/**
 * @typedef {object} IHealthCredentials
 * @property {string} username
 * @property {string} password
 */
/**
 * @typedef {object} IHealthConfig
 * @property {IHealthCredentials} credentials
 * @property {string} downloadFolder
 */
