/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */
const moduleCache = require('../shared/restoreCache')();

const fs = require('fs');
const nock = require('nock');
const path = require('path');
const sinon = require('sinon');

const assert = require('../shared/assert');
const sourceCode = require('../shared/sourceCode');
const testUtil = require('../shared/util');

const deviceUtil = sourceCode('src/lib/utils/device');
const ihealthUtil = sourceCode('src/lib/utils/ihealth');

moduleCache.remember();

describe('iHealth Utils', () => {
    const remoteHostName = 'remote.hostname.remote.domain';

    before(() => {
        moduleCache.restore();
    });

    afterEach(() => {
        testUtil.checkNockActiveMocks(nock);
        nock.cleanAll();
        sinon.restore();
    });

    describe('DeviceAPI', () => {
        let deviceApiInst;
        let deviceGethAuthTokenStub;

        beforeEach(() => {
            deviceApiInst = new ihealthUtil.DeviceAPI(remoteHostName);
            deviceGethAuthTokenStub = sinon.stub(deviceUtil, 'getAuthToken');
            deviceGethAuthTokenStub.resolves({ token: 'token' });
            return deviceApiInst.initialize();
        });

        describe('constructor', () => {
            it('should set defaults', () => {
                assert.strictEqual(deviceApiInst.host, remoteHostName, 'should match host value');
                assert.isEmpty(deviceApiInst.connection, 'should have empty connection options');
                assert.deepStrictEqual(deviceApiInst.credentials, {
                    token: 'token' // see beforeEach
                }, 'should have empty credentials');
            });

            it('should set provided values', () => {
                deviceApiInst = new ihealthUtil.DeviceAPI(remoteHostName, {
                    connection: {
                        allowSelfSignedCert: true,
                        port: 80,
                        protocol: 'http'
                    },
                    credentials: {
                        username: 'username',
                        passphrase: 'passphrase'
                    }
                });

                assert.strictEqual(deviceApiInst.host, remoteHostName, 'should match host value');
                assert.deepStrictEqual(deviceApiInst.connection, {
                    allowSelfSignedCert: true,
                    port: 80,
                    protocol: 'http'
                }, 'should have connection options');
                assert.deepStrictEqual(deviceApiInst.credentials, {
                    username: 'username',
                    passphrase: 'passphrase'
                }, 'should have credentials');
            });
        });

        describe('.buildQkviewCommand()', () => {
            it('should build qkview command using provided absolute path', () => {
                assert.strictEqual(
                    deviceApiInst.buildQkviewCommand('/test/qkview/file/path'),
                    '/usr/bin/qkview -C -f ../../test/qkview/file/path',
                    'should match expected command'
                );
            });
        });

        describe('.buildQkviewPath()', () => {
            it('should build absolute path to qkview file', () => {
                assert.strictEqual(
                    deviceApiInst.buildQkviewPath('qkview.file.name'),
                    '/shared/tmp/qkview.file.name',
                    'should build expected path'
                );
            });
        });

        describe('.createQkview()', () => {
            it('should send command via REST API to create qkview', () => {
                const executeStub = sinon.stub(deviceUtil.DeviceAsyncCLI.prototype, 'execute');
                executeStub.resolves();
                return deviceApiInst.createQkview('qkviewFileName')
                    .then((qkviewPath) => {
                        assert.strictEqual(qkviewPath, '/shared/tmp/qkviewFileName', 'should return path to Qkview file on remote host');
                        assert.strictEqual(executeStub.args[0][0], '/usr/bin/qkview -C -f ../../shared/tmp/qkviewFileName');
                    });
            });

            it('should fail to create qkview', () => {
                sinon.stub(deviceUtil.DeviceAsyncCLI.prototype, 'execute').rejects(new Error('qkview error'));
                return assert.isRejected(
                    deviceApiInst.createQkview('qkviewFileName'),
                    'qkview error'
                );
            });
        });

        describe('.createSymLink()', () => {
            it('should execute shell command', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "ln -s \\"path1\\" \\"path2\\""'
                    },
                    response: {
                        commandResult: 'success'
                    }
                }], {
                    host: remoteHostName
                });
                return deviceApiInst.createSymLink('path1', 'path2');
            });
        });

        describe('.downloadFile()', () => {
            beforeEach(() => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/unix-ls',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"/path/to/remote/file"'
                    },
                    response: {
                        commandResult: '/path/to/remote/file'
                    }
                },
                {
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    method: 'get',
                    response: {
                        version: '14.0'
                    }
                }], {
                    host: remoteHostName
                });
            });

            it('should download file and remove symlink', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "ln -s \\"/path/to/remote/file\\" \\"/var/config/rest/bulk/file\\""'
                    },
                    response: {
                        commandResult: 'success'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/unix-ls',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"/var/config/rest/bulk/file"'
                    },
                    response: {
                        commandResult: '/var/config/rest/bulk/file'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/unix-rm',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"/var/config/rest/bulk/file"'
                    },
                    response: {}
                }], {
                    host: remoteHostName
                });
                const downloadUtilStub = sinon.stub(deviceUtil, 'downloadFileFromDevice').resolves();
                return deviceApiInst.downloadFile('/path/to/remote/file', '/path/to/local/file')
                    .then((localPath) => {
                        assert.strictEqual(localPath, '/path/to/local/file');

                        const args = downloadUtilStub.args[0];
                        assert.strictEqual(args[0], '/path/to/local/file');
                        assert.strictEqual(args[1], remoteHostName);
                        assert.strictEqual(args[2], '/mgmt/shared/file-transfer/bulk/file');
                    });
            });

            it('should remove symlink even when download failed', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "ln -s \\"/path/to/remote/file\\" \\"/var/config/rest/bulk/file\\""'
                    },
                    response: {
                        commandResult: 'success'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/unix-ls',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"/var/config/rest/bulk/file"'
                    },
                    response: {
                        commandResult: '/var/config/rest/bulk/file'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/unix-rm',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"/var/config/rest/bulk/file"'
                    },
                    response: {}
                }], {
                    host: remoteHostName
                });
                sinon.stub(deviceUtil, 'downloadFileFromDevice').rejects(new Error('download rejected'));
                return assert.isRejected(
                    deviceApiInst.downloadFile('/path/to/remote/file', '/path/to/local/file'),
                    /download rejected/
                );
            });

            it('should not try to remove symlink when unable to create it', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "ln -s \\"/path/to/remote/file\\" \\"/var/config/rest/bulk/file\\""'
                    },
                    code: 400
                }], {
                    host: remoteHostName
                });
                sinon.stub(deviceUtil, 'downloadFileFromDevice').rejects(new Error('download rejected'));
                return assert.isRejected(
                    deviceApiInst.downloadFile('/path/to/remote/file', '/path/to/local/file'),
                    /Bad status code/
                );
            });
        });

        describe('.getAuthToken()', () => {
            it('should get auth token', () => {
                deviceApiInst = new ihealthUtil.DeviceAPI(remoteHostName);
                return deviceApiInst.initialize()
                    .then(() => {
                        assert.deepStrictEqual(deviceApiInst.credentials, {
                            token: 'token'
                        });
                    });
            });

            it('should reuse auth token', () => {
                const callsBefore = deviceGethAuthTokenStub.callCount;
                deviceApiInst = new ihealthUtil.DeviceAPI(remoteHostName);
                return deviceApiInst.getAuthToken()
                    .then(() => deviceApiInst.getAuthToken())
                    .then(() => {
                        assert.strictEqual(deviceGethAuthTokenStub.callCount - callsBefore, 1, 'should re-use token');
                    });
            });
        });

        describe('.getDACLIOptions()', () => {
            it('should generate new script name on each call and copy other options', () => {
                deviceApiInst = new ihealthUtil.DeviceAPI(remoteHostName, {
                    connection: {
                        port: 80,
                        protocol: 'http',
                        allowSelfSignedCert: true
                    },
                    credentials: {
                        username: 'username',
                        passphrase: 'passphrase'
                    }
                });
                const opts1 = deviceApiInst.getDACLIOptions();
                const opts2 = deviceApiInst.getDACLIOptions();

                assert.notStrictEqual(opts1.scriptName, opts2.scriptName, 'should generate different name');
                assert.deepStrictEqual(opts1.connection, opts2.connection, 'should be copied');
                assert.deepStrictEqual(opts1.credentials, opts2.credentials, 'should be copied');
                assert.isFalse(opts1.connection === opts2.connection, 'should not have reference to the same object');
                assert.isFalse(opts1.credentials === opts2.credentials, 'should not have reference to the same object');
            });
        });

        describe('.getDefaultRequestOptions()', () => {
            it('should return options for deviceUtil.makeRequest', () => {
                deviceApiInst = new ihealthUtil.DeviceAPI(remoteHostName, {
                    connection: {
                        allowSelfSignedCert: true,
                        port: 80,
                        protocol: 'http'
                    },
                    credentials: {
                        username: 'username',
                        passphrase: 'passphrase'
                    }
                });
                return deviceApiInst.initialize()
                    .then(() => {
                        assert.deepStrictEqual(deviceApiInst.getDefaultRequestOptions(), {
                            allowSelfSignedCert: true,
                            credentials: {
                                token: 'token', // see beforeEach
                                username: 'username'
                            },
                            port: 80,
                            protocol: 'http'
                        });
                    });
            });

            it('should return options for deviceUtil.makeRequest when initialized with empty options', () => {
                deviceApiInst = new ihealthUtil.DeviceAPI(remoteHostName);
                assert.deepStrictEqual(deviceApiInst.getDefaultRequestOptions(), {
                    credentials: {
                        token: undefined,
                        username: undefined
                    }
                });
            });
        });

        describe('.getDeviceInfo()', () => {
            it('should return device info', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    method: 'get',
                    response: {
                        baseMac: '00:00:00:00:00:00',
                        build: '0.0.0',
                        chassisSerialNumber: '00000000-0000-0000-000000000000',
                        halUuid: '00000000-0000-0000-0000-000000000000',
                        hostMac: '00:00:00:00:00:00',
                        hostname: 'localhost.localdomain',
                        isClustered: false,
                        isVirtual: true,
                        machineId: '00000000-0000-0000-000000000000',
                        managementAddress: '192.168.1.10',
                        mcpDeviceName: '/Common/localhost.localdomain',
                        physicalMemory: 7168,
                        platform: 'Z100',
                        product: 'BIG-IP',
                        trustDomainGuid: '3ed9b666-e28c-4958-9726fa163e25ef8a',
                        version: '13.1.0',
                        generation: 0,
                        lastUpdateMicros: 0,
                        kind: 'shared:resolver:device-groups:deviceinfostate',
                        selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
                    }
                }], {
                    host: remoteHostName
                });
                return assert.becomes(
                    deviceApiInst.getDeviceInfo(),
                    {
                        baseMac: '00:00:00:00:00:00',
                        build: '0.0.0',
                        chassisSerialNumber: '00000000-0000-0000-000000000000',
                        halUuid: '00000000-0000-0000-0000-000000000000',
                        hostMac: '00:00:00:00:00:00',
                        hostname: 'localhost.localdomain',
                        isClustered: false,
                        isVirtual: true,
                        machineId: '00000000-0000-0000-000000000000',
                        managementAddress: '192.168.1.10',
                        mcpDeviceName: '/Common/localhost.localdomain',
                        physicalMemory: 7168,
                        platform: 'Z100',
                        product: 'BIG-IP',
                        trustDomainGuid: '3ed9b666-e28c-4958-9726fa163e25ef8a',
                        version: '13.1.0'
                    },
                    'should return expected device info'
                );
            });
        });

        describe('.getDownloadInfo()', () => {
            it('should return data for BIG-IP versions older than 14.0', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    method: 'get',
                    response: {
                        version: '13.1'
                    }
                }], {
                    host: remoteHostName
                });
                return assert.becomes(
                    deviceApiInst.getDownloadInfo(),
                    {
                        dir: '/var/config/rest/madm',
                        uri: '/mgmt/shared/file-transfer/madm/'
                    },
                    'should return expected download info'
                );
            });

            it('should return data for BIG-IP versions newer than or equal 14.0', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/shared/identified-devices/config/device-info',
                    method: 'get',
                    response: {
                        version: '14.0'
                    }
                }], {
                    host: remoteHostName
                });
                return assert.becomes(
                    deviceApiInst.getDownloadInfo(),
                    {
                        dir: '/var/config/rest/bulk',
                        uri: '/mgmt/shared/file-transfer/bulk/'
                    },
                    'should return expected download info'
                );
            });
        });

        describe('.getMD5sum()', () => {
            it('should send command via REST API to calculate MD5 sum', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "cat \\"qkviewFileName.md5sum\\""'
                    },
                    response: {
                        commandResult: 'md5sum "qkviewFileName" > "qkviewFileName.md5sum"'
                    }
                },
                {
                    endpoint: '/mgmt/tm/util/unix-rm',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"qkviewFileName.md5sum"'
                    },
                    response: {}
                }], {
                    host: remoteHostName
                });

                const executeStub = sinon.stub(deviceUtil.DeviceAsyncCLI.prototype, 'execute');
                executeStub.resolves();

                return deviceApiInst.getMD5sum('qkviewFileName')
                    .then((md5sum) => {
                        assert.strictEqual(md5sum, 'md5sum');
                        assert.strictEqual(executeStub.args[0][0], 'md5sum "qkviewFileName" > "qkviewFileName.md5sum"');
                    });
            });

            it('should reject when unable to calculate MD5 sum', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/bash',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '-c "cat \\"qkviewFileName.md5sum\\""'
                    },
                    response: {}
                },
                {
                    endpoint: '/mgmt/tm/util/unix-rm',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"qkviewFileName.md5sum"'
                    },
                    response: {}
                }], {
                    host: remoteHostName
                });

                const executeStub = sinon.stub(deviceUtil.DeviceAsyncCLI.prototype, 'execute');
                executeStub.resolves();

                return assert.isRejected(
                    deviceApiInst.getMD5sum('qkviewFileName'),
                    /MD5 file "qkviewFileName.md5sum" is empty/
                );
            });
        });

        describe('.pathExists()', () => {
            it('should resolve if path exists', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/unix-ls',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"/path/to/file"'
                    },
                    response: {
                        commandResult: '/path/to/file'
                    }
                }], {
                    host: remoteHostName
                });
                return deviceApiInst.pathExists('/path/to/file');
            });

            it('should fail if path doesn\'t exist', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/unix-ls',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"/path/to/file"'
                    },
                    response: {
                        commandResult: '/path/to/another/file\n/path/to/another/file2'
                    }
                }], {
                    host: remoteHostName
                });
                return assert.isRejected(
                    deviceApiInst.pathExists('/path/to/file'),
                    'pathExists: /path/to/file doesn\'t exist'
                );
            });
        });

        describe('.removeFile()', () => {
            it('should remove path', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/unix-rm',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"/path/to/remove"'
                    },
                    response: {}
                }], {
                    host: remoteHostName
                });
                return deviceApiInst.removeFile('/path/to/remove');
            });

            it('should not reject when unable to remove path', () => {
                testUtil.mockEndpoints([{
                    endpoint: '/mgmt/tm/util/unix-rm',
                    method: 'post',
                    request: {
                        command: 'run',
                        utilCmdArgs: '"/path/to/remove"'
                    },
                    response: {
                        commandResult: 'some error message'
                    }
                }], {
                    host: remoteHostName
                });
                return assert.isFulfilled(deviceApiInst.removeFile('/path/to/remove'));
            });
        });
    });

    describe('LocalDeviceAPI', () => {
        it('should set host to localhost', () => {
            const inst = new ihealthUtil.LocalDeviceAPI();
            assert.strictEqual(inst.host, 'localhost');
        });
    });

    describe('QkviewManager', () => {
        const downloadFolder = 'downloadFolder';
        let initializeStub;
        let qkmInst;

        beforeEach(() => {
            qkmInst = new ihealthUtil.QkviewManager(remoteHostName, { downloadFolder });
            initializeStub = sinon.stub(ihealthUtil.QkviewManager.prototype, 'initialize');
            initializeStub.callsFake(function () { return this; });
        });

        describe('constructor', () => {
            it('should initialize without options', () => {
                qkmInst = new ihealthUtil.QkviewManager(remoteHostName);
                assert.strictEqual(qkmInst.downloadFolder, '', 'should set to empty string by default');
                assert.instanceOf(qkmInst.localDevice, ihealthUtil.LocalDeviceAPI);
                assert.instanceOf(qkmInst.remoteDevice, ihealthUtil.DeviceAPI);
            });

            it('should initialize with options', () => {
                qkmInst = new ihealthUtil.QkviewManager(remoteHostName, {
                    connection: {
                        port: 443,
                        protocol: 'https',
                        allowSelfSignedCert: true
                    },
                    credentials: {
                        username: 'username',
                        passphrase: 'passphrase',
                        token: 'token'
                    },
                    downloadFolder
                });
                assert.strictEqual(qkmInst.downloadFolder, downloadFolder);
                assert.instanceOf(qkmInst.localDevice, ihealthUtil.LocalDeviceAPI);
                assert.instanceOf(qkmInst.remoteDevice, ihealthUtil.DeviceAPI);
                assert.strictEqual(qkmInst.localDevice.host, 'localhost');
                assert.strictEqual(qkmInst.remoteDevice.host, remoteHostName);
                assert.deepStrictEqual(qkmInst.remoteDevice.connection, {
                    port: 443,
                    protocol: 'https',
                    allowSelfSignedCert: true
                });
                assert.deepStrictEqual(qkmInst.remoteDevice.credentials, {
                    username: 'username',
                    passphrase: 'passphrase',
                    token: 'token'
                });
            });
        });

        describe('.createQkview()', () => {
            it('should call remote device to create qkview', () => {
                const remoteQkviewCall = sinon.stub(qkmInst.remoteDevice, 'createQkview');
                remoteQkviewCall.resolves();
                return qkmInst.createQkview()
                    .then(() => {
                        assert.strictEqual(remoteQkviewCall.callCount, 1, 'should call just once');
                        assert.isTrue(remoteQkviewCall.args[0][0].startsWith('qkview_telemetry_'));
                    });
            });
        });

        describe('.downloadFile()', () => {
            it('should download file from remote device and check MD5 sums', () => {
                const remoteDownloadFile = sinon.stub(qkmInst.remoteDevice, 'downloadFile');
                remoteDownloadFile.callsFake((remote, local) => Promise.resolve(local));

                const remoteMD5Sum = sinon.stub(qkmInst.remoteDevice, 'getMD5sum');
                remoteMD5Sum.resolves('MD5');

                const localMD5Sum = sinon.stub(qkmInst.localDevice, 'getMD5sum');
                localMD5Sum.resolves('MD5');

                return qkmInst.downloadFile('remotePath', 'localPath')
                    .then(() => {
                        assert.strictEqual(remoteDownloadFile.callCount, 1);
                        assert.strictEqual(remoteMD5Sum.callCount, 1);
                        assert.strictEqual(localMD5Sum.callCount, 1);
                        assert.strictEqual(remoteDownloadFile.args[0][0], 'remotePath');
                        assert.strictEqual(remoteDownloadFile.args[0][1], 'localPath');
                        assert.strictEqual(remoteMD5Sum.args[0][0], 'remotePath');
                        assert.strictEqual(localMD5Sum.args[0][0], 'localPath');
                        assert.strictEqual(initializeStub.callCount, 1, 'should initialize only once');
                        return qkmInst.downloadFile('remotePath', 'localPath');
                    })
                    .then(() => {
                        assert.strictEqual(initializeStub.callCount, 1, 'should initialize only once');
                    });
            });

            it('should fail when MD5 doesn\'t match', () => {
                const remoteDownloadFile = sinon.stub(qkmInst.remoteDevice, 'downloadFile');
                remoteDownloadFile.resolvesArg(1);

                const remoteMD5Sum = sinon.stub(qkmInst.remoteDevice, 'getMD5sum');
                remoteMD5Sum.resolves('MD5remote');

                const localMD5Sum = sinon.stub(qkmInst.localDevice, 'getMD5sum');
                localMD5Sum.resolves('MD5local');

                return assert.isRejected(
                    qkmInst.downloadFile('remotePath', 'localPath'),
                    /MD5 sum for downloaded Qkview file !== MD5 sum for Qkview on remote host/
                );
            });

            it('should fail when not MD5 sums returned', () => {
                const remoteDownloadFile = sinon.stub(qkmInst.remoteDevice, 'downloadFile');
                remoteDownloadFile.callsFake((remote, local) => Promise.resolve(local));

                const remoteMD5Sum = sinon.stub(qkmInst.remoteDevice, 'getMD5sum');
                remoteMD5Sum.resolves();

                const localMD5Sum = sinon.stub(qkmInst.localDevice, 'getMD5sum');
                localMD5Sum.resolves();

                return assert.isRejected(
                    qkmInst.downloadFile('remotePath', 'localPath'),
                    /MD5 sum for downloaded Qkview file !== MD5 sum for Qkview on remote host/
                );
            });
        });

        describe('.generateQkviewName()', () => {
            it('should generate new name each time', () => {
                const name1 = qkmInst.generateQkviewName();
                const name2 = qkmInst.generateQkviewName();
                assert.isTrue(name1.startsWith('qkview_telemetry_'));
                assert.isTrue(name2.startsWith('qkview_telemetry_'));
                assert.isTrue(name1.length > 0, 'should not be empty');
                assert.isTrue(name2.length > 0, 'should not be empty');
                assert.notStrictEqual(name1, name2, 'should generate unique name');
            });
        });

        describe('.initialize()', () => {
            beforeEach(() => {
                initializeStub.restore();
            });

            it('should initialize devices', () => {
                testUtil.mockEndpoints(
                    [{
                        endpoint: '/mgmt/shared/authn/login',
                        code: 200,
                        method: 'post',
                        request: {
                            username: 'username',
                            password: 'passphrase',
                            loginProviderName: 'tmos'
                        },
                        response: {
                            token: {
                                token: 'token'
                            }
                        }
                    },
                    {
                        endpoint: '/mgmt/shared/identified-devices/config/device-info',
                        method: 'get',
                        response: {
                            baseMac: '00:00:00:00:00:00',
                            build: '0.0.0',
                            chassisSerialNumber: '00000000-0000-0000-000000000000',
                            halUuid: '00000000-0000-0000-0000-000000000000',
                            hostMac: '00:00:00:00:00:00',
                            hostname: remoteHostName,
                            isClustered: false,
                            isVirtual: true,
                            machineId: '00000000-0000-0000-000000000000',
                            managementAddress: '192.168.1.10',
                            mcpDeviceName: remoteHostName,
                            physicalMemory: 7168,
                            platform: 'Z100',
                            product: 'BIG-IP',
                            trustDomainGuid: '3ed9b666-e28c-4958-9726fa163e25ef8',
                            version: '13.1.0',
                            generation: 0,
                            lastUpdateMicros: 0,
                            kind: 'shared:resolver:device-groups:deviceinfostate',
                            selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
                        }
                    }],
                    {
                        host: remoteHostName,
                        port: 443,
                        proto: 'https'
                    }
                );
                testUtil.mockEndpoints(
                    [{
                        endpoint: '/mgmt/shared/identified-devices/config/device-info',
                        method: 'get',
                        response: {
                            baseMac: '00:00:00:00:00:01',
                            build: '0.0.1',
                            chassisSerialNumber: '00000000-0000-0000-000000000001',
                            halUuid: '00000000-0000-0000-0000-000000000001',
                            hostMac: '00:00:00:00:00:01',
                            hostname: 'localhost.localdomain',
                            isClustered: false,
                            isVirtual: true,
                            machineId: '00000000-0000-0000-000000000001',
                            managementAddress: '192.168.1.10',
                            mcpDeviceName: '/Common/localhost.localdomain',
                            physicalMemory: 7168,
                            platform: 'Z100',
                            product: 'BIG-IP',
                            trustDomainGuid: '3ed9b666-e28c-4958-9726fa163e25ef8a',
                            version: '13.1.0',
                            generation: 0,
                            lastUpdateMicros: 0,
                            kind: 'shared:resolver:device-groups:deviceinfostate',
                            selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
                        }
                    }]
                );
                qkmInst = new ihealthUtil.QkviewManager(remoteHostName, {
                    connection: {
                        port: 443,
                        protocol: 'https',
                        allowSelfSignedCert: true
                    },
                    credentials: {
                        username: 'username',
                        passphrase: 'passphrase'
                    },
                    downloadFolder
                });
                return qkmInst.initialize()
                    .then((retInst) => {
                        assert.isTrue(retInst.localDevice !== retInst.remoteDevice);
                        assert.instanceOf(retInst.localDevice, ihealthUtil.LocalDeviceAPI);
                        assert.instanceOf(retInst.remoteDevice, ihealthUtil.DeviceAPI);
                    });
            });

            it('should fail to initialize when downloadFolder not specified', () => {
                testUtil.mockEndpoints(
                    [{
                        endpoint: '/mgmt/shared/authn/login',
                        code: 200,
                        method: 'post',
                        request: {
                            username: 'username',
                            password: 'passphrase',
                            loginProviderName: 'tmos'
                        },
                        response: {
                            token: {
                                token: 'token'
                            }
                        }
                    },
                    {
                        endpoint: '/mgmt/shared/identified-devices/config/device-info',
                        method: 'get',
                        response: {
                            baseMac: '00:00:00:00:00:00',
                            build: '0.0.0',
                            chassisSerialNumber: '00000000-0000-0000-000000000000',
                            halUuid: '00000000-0000-0000-0000-000000000000',
                            hostMac: '00:00:00:00:00:00',
                            hostname: remoteHostName,
                            isClustered: false,
                            isVirtual: true,
                            machineId: '00000000-0000-0000-000000000000',
                            managementAddress: '192.168.1.10',
                            mcpDeviceName: remoteHostName,
                            physicalMemory: 7168,
                            platform: 'Z100',
                            product: 'BIG-IP',
                            trustDomainGuid: '3ed9b666-e28c-4958-9726fa163e25ef8',
                            version: '13.1.0',
                            generation: 0,
                            lastUpdateMicros: 0,
                            kind: 'shared:resolver:device-groups:deviceinfostate',
                            selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
                        }
                    }],
                    {
                        host: remoteHostName,
                        port: 443,
                        proto: 'https'
                    }
                );
                testUtil.mockEndpoints(
                    [{
                        endpoint: '/mgmt/shared/identified-devices/config/device-info',
                        method: 'get',
                        response: {
                            baseMac: '00:00:00:00:00:01',
                            build: '0.0.1',
                            chassisSerialNumber: '00000000-0000-0000-000000000001',
                            halUuid: '00000000-0000-0000-0000-000000000001',
                            hostMac: '00:00:00:00:00:01',
                            hostname: 'localhost.localdomain',
                            isClustered: false,
                            isVirtual: true,
                            machineId: '00000000-0000-0000-000000000001',
                            managementAddress: '192.168.1.10',
                            mcpDeviceName: '/Common/localhost.localdomain',
                            physicalMemory: 7168,
                            platform: 'Z100',
                            product: 'BIG-IP',
                            trustDomainGuid: '3ed9b666-e28c-4958-9726fa163e25ef8a',
                            version: '13.1.0',
                            generation: 0,
                            lastUpdateMicros: 0,
                            kind: 'shared:resolver:device-groups:deviceinfostate',
                            selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
                        }
                    }]
                );
                qkmInst = new ihealthUtil.QkviewManager(remoteHostName, {
                    connection: {
                        port: 443,
                        protocol: 'https',
                        allowSelfSignedCert: true
                    },
                    credentials: {
                        username: 'username',
                        passphrase: 'passphrase'
                    }
                });
                return assert.isRejected(qkmInst.initialize(), /Should specify directory for downloads/);
            });

            it('should set remote device to local device when REST API returns same device info', () => {
                testUtil.mockEndpoints(
                    [{
                        endpoint: '/mgmt/shared/authn/login',
                        code: 200,
                        method: 'post',
                        request: {
                            username: 'username',
                            password: 'passphrase',
                            loginProviderName: 'tmos'
                        },
                        response: {
                            token: {
                                token: 'token'
                            }
                        }
                    },
                    {
                        endpoint: '/mgmt/shared/identified-devices/config/device-info',
                        method: 'get',
                        response: {
                            baseMac: '00:00:00:00:00:00',
                            build: '0.0.0',
                            chassisSerialNumber: '00000000-0000-0000-000000000000',
                            halUuid: '00000000-0000-0000-0000-000000000000',
                            hostMac: '00:00:00:00:00:00',
                            hostname: remoteHostName,
                            isClustered: false,
                            isVirtual: true,
                            machineId: '00000000-0000-0000-000000000000',
                            managementAddress: '192.168.1.10',
                            mcpDeviceName: remoteHostName,
                            physicalMemory: 7168,
                            platform: 'Z100',
                            product: 'BIG-IP',
                            trustDomainGuid: '3ed9b666-e28c-4958-9726fa163e25ef8',
                            version: '13.1.0',
                            generation: 0,
                            lastUpdateMicros: 0,
                            kind: 'shared:resolver:device-groups:deviceinfostate',
                            selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
                        }
                    }],
                    {
                        host: remoteHostName,
                        port: 443,
                        proto: 'https'
                    }
                );
                testUtil.mockEndpoints(
                    [{
                        endpoint: '/mgmt/shared/identified-devices/config/device-info',
                        method: 'get',
                        response: {
                            baseMac: '00:00:00:00:00:00',
                            build: '0.0.0',
                            chassisSerialNumber: '00000000-0000-0000-000000000000',
                            halUuid: '00000000-0000-0000-0000-000000000000',
                            hostMac: '00:00:00:00:00:00',
                            hostname: remoteHostName,
                            isClustered: false,
                            isVirtual: true,
                            machineId: '00000000-0000-0000-000000000000',
                            managementAddress: '192.168.1.10',
                            mcpDeviceName: remoteHostName,
                            physicalMemory: 7168,
                            platform: 'Z100',
                            product: 'BIG-IP',
                            trustDomainGuid: '3ed9b666-e28c-4958-9726fa163e25ef8',
                            version: '13.1.0',
                            generation: 0,
                            lastUpdateMicros: 0,
                            kind: 'shared:resolver:device-groups:deviceinfostate',
                            selfLink: 'https://localhost/mgmt/shared/identified-devices/config/device-info'
                        }
                    }]
                );
                qkmInst = new ihealthUtil.QkviewManager(remoteHostName, {
                    connection: {
                        port: 443,
                        protocol: 'https',
                        allowSelfSignedCert: true
                    },
                    credentials: {
                        username: 'username',
                        passphrase: 'passphrase'
                    }
                });
                return qkmInst.initialize()
                    .then((retInst) => {
                        assert.isTrue(retInst.localDevice === retInst.remoteDevice);
                        assert.instanceOf(retInst.localDevice, ihealthUtil.LocalDeviceAPI);
                        assert.instanceOf(retInst.remoteDevice, ihealthUtil.LocalDeviceAPI);
                    });
            });
        });

        describe('.process()', () => {
            let getDeviceInfoStub;
            beforeEach(() => {
                sinon.stub(ihealthUtil.DeviceAPI.prototype, 'initialize').resolves({});
                getDeviceInfoStub = sinon.stub(ihealthUtil.DeviceAPI.prototype, 'getDeviceInfo');
                getDeviceInfoStub.callsFake(function () {
                    return { local: this instanceof ihealthUtil.LocalDeviceAPI };
                });
                initializeStub.restore();
            });

            it('should create and download Qkview from remote host (and remove it from remote device)', () => {
                sinon.stub(ihealthUtil.QkviewManager.prototype, 'createQkview').resolves('/remote/path/to/remote.qkview');
                sinon.stub(ihealthUtil.QkviewManager.prototype, 'downloadFile').resolvesArg(1);
                const initializeSpy = sinon.spy(ihealthUtil.QkviewManager.prototype, 'initialize');

                const removedFiles = [];
                sinon.stub(ihealthUtil.DeviceAPI.prototype, 'removeFile').callsFake(function (fileToRemove) {
                    removedFiles.push({
                        file: fileToRemove,
                        local: this instanceof ihealthUtil.LocalDeviceAPI
                    });
                });

                qkmInst = new ihealthUtil.QkviewManager(remoteHostName, { downloadFolder });
                return qkmInst.process()
                    .then((localPath) => {
                        assert.strictEqual(localPath, path.join(downloadFolder, 'remote.qkview'));
                        assert.deepStrictEqual(removedFiles, [{ local: false, file: '/remote/path/to/remote.qkview' }]);
                        assert.strictEqual(initializeSpy.callCount, 1, 'should initialize only once');
                        return qkmInst.process();
                    })
                    .then(() => {
                        assert.strictEqual(initializeSpy.callCount, 1, 'should initialize only once');
                    });
            });

            it('should cleanup when failed', () => {
                sinon.stub(ihealthUtil.QkviewManager.prototype, 'createQkview').resolves('/remote/path/to/remote.qkview');
                sinon.stub(ihealthUtil.QkviewManager.prototype, 'downloadFile').rejects(new Error('downloadError'));

                const removedFiles = [];
                sinon.stub(ihealthUtil.DeviceAPI.prototype, 'removeFile').callsFake(function (fileToRemove) {
                    removedFiles.push({
                        file: fileToRemove,
                        local: this instanceof ihealthUtil.LocalDeviceAPI
                    });
                });

                qkmInst = new ihealthUtil.QkviewManager(remoteHostName, { downloadFolder });
                return assert.isRejected(qkmInst.process(), /downloadError/)
                    .then(() => {
                        assert.deepStrictEqual(removedFiles, [
                            {
                                local: false,
                                file: '/remote/path/to/remote.qkview'
                            },
                            {
                                local: true,
                                file: path.join(downloadFolder, 'remote.qkview')
                            }
                        ]);
                    });
            });

            it('should skip download when remote device is local device', () => {
                sinon.stub(ihealthUtil.QkviewManager.prototype, 'createQkview').resolves('/remote/path/to/remote.qkview');
                sinon.stub(ihealthUtil.QkviewManager.prototype, 'downloadFile').rejects(new Error('downloadError'));
                getDeviceInfoStub.reset();
                getDeviceInfoStub.resolves({ sameDevice: true });

                const removedFiles = [];
                sinon.stub(ihealthUtil.DeviceAPI.prototype, 'removeFile').callsFake(function (fileToRemove) {
                    removedFiles.push({
                        file: fileToRemove,
                        local: this instanceof ihealthUtil.LocalDeviceAPI
                    });
                });

                qkmInst = new ihealthUtil.QkviewManager(remoteHostName, { downloadFolder });
                return qkmInst.process()
                    .then((localPath) => {
                        assert.strictEqual(localPath, '/remote/path/to/remote.qkview');
                        assert.isEmpty(removedFiles);
                    });
            });
        });
    });

    describe('IHealthAPI', () => {
        let ihealthAPI;

        beforeEach(() => {
            ihealthAPI = new ihealthUtil.IHealthAPI({
                username: 'username',
                passphrase: 'passphrase'
            });

            testUtil.mockEndpoints(
                [{
                    endpoint: '/auth/pub/sso/login/ihealth-api',
                    code: 200,
                    method: 'post',
                    request: {
                        user_id: 'username',
                        user_secret: 'passphrase'
                    },
                    requestHeaders: {
                        'Content-Type': 'application/json'
                    },
                    responseHeaders: {
                        'Set-Cookie': 'someCookie=someValue; Path=/; Domain=.f5.com'
                    }
                }],
                {
                    host: 'api.f5.com',
                    port: 443,
                    proto: 'https'
                }
            );
        });

        describe('constructor', () => {
            beforeEach(() => {
                nock.cleanAll();
            });

            it('should fail when no credentials provided', () => {
                assert.throws(
                    () => new ihealthUtil.IHealthAPI({}),
                    /Username and passphrase are required!/
                );
                assert.throws(
                    () => new ihealthUtil.IHealthAPI({ username: 'username' }),
                    /Username and passphrase are required!/
                );
                assert.throws(
                    () => new ihealthUtil.IHealthAPI({ passphrase: 'passphrase' }),
                    /Username and passphrase are required!/
                );
            });
        });

        describe('.authenticate()', () => {
            const setupNockEndpoint = (endpointOpts) => {
                testUtil.mockEndpoints(
                    [Object.assign({
                        endpoint: '/auth/pub/sso/login/ihealth-api',
                        code: 200,
                        method: 'post',
                        request: {
                            user_id: 'username',
                            user_secret: 'passphrase'
                        },
                        requestHeaders: {
                            'Content-Type': 'application/json'
                        },
                        responseHeaders: {
                            'Set-Cookie': 'someCookie=someValue; Path=/; Domain=.f5.com'
                        }
                    }, endpointOpts || {})],
                    {
                        host: 'api.f5.com',
                        port: 443,
                        proto: 'https'
                    }
                );
            };

            beforeEach(() => {
                nock.cleanAll();
            });

            it('should authenticate to F5 iHealth Service', () => {
                setupNockEndpoint();
                return ihealthAPI.authenticate();
            });

            it('should fail to authenticate to F5 iHealth Service', () => {
                setupNockEndpoint({ code: 400 });
                return assert.isRejected(
                    ihealthAPI.authenticate(),
                    /Bad status code/
                );
            });
        });

        describe('.fetchQkviewDiagnostics()', () => {
            const qkviewURI = 'https://ihealth-api.f5.com/qkview/myLovelyQkview';
            const setupNockEndpoint = (endpointOpts) => {
                testUtil.mockEndpoints(
                    [Object.assign({
                        endpoint: '/qkview/myLovelyQkview/diagnostics.json',
                        code: 200,
                        method: 'get',
                        requestHeaders: {
                            Accept: 'application/vnd.f5.ihealth.api.v1.0+json',
                            Cookie: 'someCookie=someValue'
                        },
                        response: {
                            diagnostics: 'JSON'
                        }
                    }, endpointOpts || {})],
                    {
                        host: 'ihealth-api.f5.com',
                        port: 443,
                        proto: 'https'
                    }
                );
            };

            it('should be able to fetch diagnostics JSON', () => {
                setupNockEndpoint();
                return assert.becomes(
                    ihealthAPI.authenticate()
                        .then(() => ihealthAPI.fetchQkviewDiagnostics(qkviewURI)),
                    { diagnostics: 'JSON' }
                );
            });

            it('should fail when unable to fetch diagnostics JSON', () => {
                setupNockEndpoint({ code: 400 });
                return assert.isRejected(
                    ihealthAPI.authenticate()
                        .then(() => ihealthAPI.fetchQkviewDiagnostics(qkviewURI)),
                    /Bad status code/
                );
            });

            it('should fail when response has no \'diagnostics\' key', () => {
                setupNockEndpoint({
                    response: {
                        anotherDiagnostics: 'JSON'
                    }
                });
                return assert.isRejected(
                    ihealthAPI.authenticate()
                        .then(() => ihealthAPI.fetchQkviewDiagnostics(qkviewURI)),
                    /Missing 'diagnostics' in JSON response from F5 iHeath Service/
                );
            });

            it('should fail when response is not parsed JSON object', () => {
                setupNockEndpoint({
                    response: 'someString'
                });
                return assert.isRejected(
                    ihealthAPI.authenticate()
                        .then(() => ihealthAPI.fetchQkviewDiagnostics(qkviewURI)),
                    /Invalid JSON response from F5 iHeath Service/
                );
            });
        });

        describe('.isQkviewReportReady()', () => {
            const setupNockEndpoint = (endpointOpts) => {
                testUtil.mockEndpoints(
                    [Object.assign({
                        endpoint: '/qkview/myLovelyQkview',
                        code: 200,
                        method: 'get',
                        requestHeaders: {
                            Accept: 'application/vnd.f5.ihealth.api.v1.0',
                            Cookie: 'someCookie=someValue'
                        }
                    }, endpointOpts || {})],
                    {
                        host: 'ihealth-api.f5.com',
                        port: 443,
                        proto: 'https'
                    }
                );
            };

            it('should return true when Qkview report is ready', () => {
                setupNockEndpoint();
                return assert.becomes(
                    ihealthAPI.authenticate()
                        .then(() => ihealthAPI.isQkviewReportReady('https://ihealth-api.f5.com/qkview/myLovelyQkview')),
                    true
                );
            });

            it('should return false when Qkview report is not ready', () => {
                setupNockEndpoint({ code: 202 });
                return assert.becomes(
                    ihealthAPI.authenticate()
                        .then(() => ihealthAPI.isQkviewReportReady('https://ihealth-api.f5.com/qkview/myLovelyQkview')),
                    false
                );
            });
        });

        describe('.uploadQkview()', () => {
            const createReadStreamOrigin = fs.createReadStream;
            const qkviewFileStreamFile = 'qkviewFileStreamFile';
            const setupNockEndpoint = (endpointOpts) => {
                testUtil.mockEndpoints(
                    [Object.assign({
                        endpoint: '/qkview-analyzer/api/qkviews',
                        code: 200,
                        method: 'post',
                        requestHeaders: {
                            Accept: 'application/vnd.f5.ihealth.api.v1.0+json',
                            Cookie: 'someCookie=someValue'
                        },
                        response: {
                            result: 'OK',
                            location: 'qkviewLocationURI'
                        }
                    }, endpointOpts || {})],
                    {
                        host: 'ihealth-api.f5.com',
                        port: 443,
                        proto: 'https'
                    }
                );
            };

            beforeEach(() => {
                sinon.stub(fs, 'createReadStream').callsFake(function () {
                    if (arguments[0] === qkviewFileStreamFile) {
                        return qkviewFileStreamFile;
                    }
                    return createReadStreamOrigin.apply(fs, arguments);
                });
            });

            it('should upload Qkview file', () => {
                setupNockEndpoint();
                return assert.becomes(
                    ihealthAPI.authenticate()
                        .then(() => ihealthAPI.uploadQkview(qkviewFileStreamFile)),
                    'qkviewLocationURI'
                );
            });

            it('should fail when unable to parse response', () => {
                setupNockEndpoint({ response: '[some data' });
                return assert.isRejected(
                    ihealthAPI.authenticate()
                        .then(() => ihealthAPI.uploadQkview(qkviewFileStreamFile)),
                    /Unable to upload Qkview to F5 iHealth server.*unable to parse response body/
                );
            });

            it('should fail when received invalid response', () => {
                setupNockEndpoint({
                    response: {
                        result: 'OK'
                    }
                });
                return assert.isRejected(
                    ihealthAPI.authenticate()
                        .then(() => ihealthAPI.uploadQkview(qkviewFileStreamFile)),
                    /Unable to upload Qkview to F5 iHealth server.*unable to find "location" in response body/
                );
            });
        });

        describe('proxy', () => {
            beforeEach(() => {
                nock.cleanAll();
            });

            it('should work with proxy', () => {
                sinon.stub(ihealthUtil.IHealthAPI.prototype, 'sendRequest').callsFake((opts) => {
                    assert.deepStrictEqual(opts.proxy, {
                        host: 'proxyHost',
                        port: 443,
                        protocol: 'https',
                        username: 'username',
                        passphrase: 'passphrase'
                    });
                });
                ihealthAPI = new ihealthUtil.IHealthAPI({
                    username: 'username',
                    passphrase: 'passphrase'
                }, {
                    proxy: {
                        credentials: {
                            username: 'username',
                            passphrase: 'passphrase'
                        },
                        connection: {
                            host: 'proxyHost',
                            port: 443,
                            protocol: 'https'
                        }
                    }
                });
                return ihealthAPI.authenticate();
            });

            it('should return default value for strictSSL', () => {
                assert.isTrue(ihealthAPI.getStrictSSL());
            });

            it('should return default value for strictSSL', () => {
                ihealthAPI = new ihealthUtil.IHealthAPI({
                    username: 'username',
                    passphrase: 'passphrase'
                }, {
                    proxy: {
                        credentials: {
                            username: 'username',
                            passphrase: 'passphrase'
                        },
                        connection: {
                            host: 'proxyHost',
                            port: 443,
                            protocol: 'https',
                            allowSelfSignedCert: true
                        }
                    }
                });
                assert.isFalse(ihealthAPI.getStrictSSL());
            });
        });
    });

    describe('IHealthManager', () => {
        let ihealthMgr;
        let initializeStub;

        beforeEach(() => {
            ihealthMgr = new ihealthUtil.IHealthManager({
                username: 'username',
                passphrase: 'passphrase'
            });
            initializeStub = sinon.stub(ihealthUtil.IHealthManager.prototype, 'initialize');
            initializeStub.callsFake(function () { return this; });
        });

        describe('constructor', () => {
            it('should set default options', () => {
                assert.strictEqual(ihealthMgr.qkviewFile, undefined);
                assert.strictEqual(ihealthMgr.qkviewURI, undefined);
                assert.strictEqual(ihealthMgr.api.username, 'username');
                assert.strictEqual(ihealthMgr.api.passphrase, 'passphrase');
            });

            it('should set available options', () => {
                ihealthMgr = new ihealthUtil.IHealthManager({
                    username: 'username',
                    passphrase: 'passphrase'
                }, {
                    qkviewFile: 'qkviewFile',
                    qkviewURI: 'qkviewURI'
                });
                assert.strictEqual(ihealthMgr.qkviewFile, 'qkviewFile');
                assert.strictEqual(ihealthMgr.qkviewURI, 'qkviewURI');
                assert.strictEqual(ihealthMgr.api.username, 'username');
                assert.strictEqual(ihealthMgr.api.passphrase, 'passphrase');
            });
        });

        describe('.fetchQkviewDiagnostics()', () => {
            it('should fail to fetch diagnostics when no qkviewURI specified', () => assert.isRejected(
                ihealthMgr.fetchQkviewDiagnostics(),
                /Qkview URI not specified/
            ));

            it('should fetch diagnostics', () => {
                ihealthMgr.qkviewURI = 'qkviewURI';
                sinon.stub(ihealthUtil.IHealthAPI.prototype, 'fetchQkviewDiagnostics')
                    .callsFake((qkURI) => Promise.resolve()
                        .then(() => {
                            assert.strictEqual(qkURI, 'qkviewURI');
                            return { diagnostics: 'JSON' };
                        }));
                return assert.becomes(
                    ihealthMgr.fetchQkviewDiagnostics(),
                    { diagnostics: 'JSON' }
                )
                    .then(() => {
                        assert.strictEqual(initializeStub.callCount, 1, 'should initialize only once');
                        return ihealthMgr.fetchQkviewDiagnostics();
                    })
                    .then(() => {
                        assert.strictEqual(initializeStub.callCount, 1, 'should initialize only once');
                    });
            });

            it('should fetch diagnostics from URI passed as arg', () => {
                ihealthMgr.qkviewURI = 'qkviewURI';
                sinon.stub(ihealthUtil.IHealthAPI.prototype, 'fetchQkviewDiagnostics')
                    .callsFake((qkURI) => Promise.resolve()
                        .then(() => {
                            assert.strictEqual(qkURI, 'qkviewURI_arg');
                            return { diagnostics: 'JSON' };
                        }));
                return assert.becomes(
                    ihealthMgr.fetchQkviewDiagnostics('qkviewURI_arg'),
                    { diagnostics: 'JSON' }
                );
            });
        });

        describe('.initialize()', () => {
            beforeEach(() => {
                initializeStub.restore();
            });

            it('should authenticate to F5 iHealth Service', () => {
                testUtil.mockEndpoints(
                    [{
                        endpoint: '/auth/pub/sso/login/ihealth-api',
                        code: 200,
                        method: 'post',
                        request: {
                            user_id: 'username',
                            user_secret: 'passphrase'
                        },
                        requestHeaders: {
                            'Content-Type': 'application/json'
                        },
                        responseHeaders: {
                            'Set-Cookie': 'someCookie=someValue; Path=/; Domain=.f5.com'
                        }
                    }],
                    {
                        host: 'api.f5.com',
                        port: 443,
                        proto: 'https'
                    }
                );
                return ihealthMgr.initialize()
                    .then((retInst) => {
                        assert.isTrue(ihealthMgr === retInst);
                        assert.instanceOf(retInst, ihealthUtil.IHealthManager);
                    });
            });
        });

        describe('.isQkviewReportReady()', () => {
            it('should fail to check report status when no qkviewURI specified', () => assert.isRejected(
                ihealthMgr.isQkviewReportReady(),
                /Qkview URI not specified/
            ));

            it('should be able to check report status', () => {
                ihealthMgr.qkviewURI = 'qkviewURI';
                sinon.stub(ihealthUtil.IHealthAPI.prototype, 'isQkviewReportReady')
                    .callsFake((qkURI) => Promise.resolve()
                        .then(() => {
                            assert.strictEqual(qkURI, 'qkviewURI');
                            return true;
                        }));
                return assert.becomes(ihealthMgr.isQkviewReportReady(), true)
                    .then(() => {
                        assert.strictEqual(initializeStub.callCount, 1, 'should initialize only once');
                        return ihealthMgr.isQkviewReportReady();
                    })
                    .then(() => {
                        assert.strictEqual(initializeStub.callCount, 1, 'should initialize only once');
                    });
            });

            it('should be able to check report status using URI passed as arg', () => {
                ihealthMgr.qkviewURI = 'qkviewURI';
                sinon.stub(ihealthUtil.IHealthAPI.prototype, 'isQkviewReportReady')
                    .callsFake((qkURI) => Promise.resolve()
                        .then(() => {
                            assert.strictEqual(qkURI, 'qkviewURI_arg');
                            return true;
                        }));
                return assert.becomes(ihealthMgr.isQkviewReportReady('qkviewURI_arg'), true);
            });
        });

        describe('.uploadQkview()', () => {
            it('should fail to upload Qkview when file not specified', () => assert.isRejected(
                ihealthMgr.uploadQkview(),
                /Path to Qkview file not specified/
            ));

            it('should be able to upload Qkview', () => {
                ihealthMgr.qkviewFile = 'qkviewFile';
                sinon.stub(ihealthUtil.IHealthAPI.prototype, 'uploadQkview')
                    .callsFake((qkFile) => Promise.resolve()
                        .then(() => {
                            assert.strictEqual(qkFile, 'qkviewFile');
                            return 'qkviewURIFromIHealth';
                        }));
                return assert.becomes(ihealthMgr.uploadQkview(), 'qkviewURIFromIHealth')
                    .then(() => {
                        assert.strictEqual(ihealthMgr.qkviewURI, 'qkviewURIFromIHealth');
                        assert.strictEqual(initializeStub.callCount, 1, 'should initialize only once');
                        return ihealthMgr.uploadQkview();
                    })
                    .then(() => {
                        assert.strictEqual(initializeStub.callCount, 1, 'should initialize only once');
                    });
            });

            it('should be able to upload Qkview file passed as arg', () => {
                ihealthMgr.qkviewFile = 'qkviewFile';
                sinon.stub(ihealthUtil.IHealthAPI.prototype, 'uploadQkview')
                    .callsFake((qkFile) => Promise.resolve()
                        .then(() => {
                            assert.strictEqual(qkFile, 'qkviewFile_arg');
                            return 'qkviewURIFromIHealth';
                        }));
                return assert.becomes(ihealthMgr.uploadQkview('qkviewFile_arg'), 'qkviewURIFromIHealth')
                    .then(() => {
                        assert.strictEqual(ihealthMgr.qkviewURI, 'qkviewURIFromIHealth');
                    });
            });
        });
    });
});
