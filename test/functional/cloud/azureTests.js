/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');
const constants = require('./../shared/constants');
const testUtil = require('./../shared/util');
const azureUtil = require('./../shared/azureUtil');

const VM_HOSTNAME = process.env[constants.ENV_VARS.AZURE.VM_HOSTNAME];
const VM_IP = process.env[constants.ENV_VARS.AZURE.VM_IP];
const VM_PORT = process.env[constants.ENV_VARS.AZURE.VM_PORT] || 8443;
const VM_USER = process.env[constants.ENV_VARS.AZURE.VM_USER] || 'admin';
const VM_PWD = process.env[constants.ENV_VARS.CICD_AUTH_OS_PASSWORD];
const WORKSPACE_ID = process.env[constants.ENV_VARS.AZURE.WORKSPACE_MI];
const TENANT_ID = process.env[constants.ENV_VARS.AZURE.TENANT];
const CLIENT_SECRET = process.env[constants.ENV_VARS.AZURE.LOG_KEY];
const CLIENT_ID = process.env[constants.ENV_VARS.AZURE.CLIENT_ID];


describe('Azure Cloud-based Tests', function () {
    this.timeout(180000);
    let options = {};
    let vmAuthToken;

    before((done) => {
        testUtil.getAuthToken(VM_IP, VM_USER, VM_PWD, VM_PORT)
            .then((data) => {
                vmAuthToken = data.token;
                options = {
                    protocol: 'https',
                    port: VM_PORT,
                    headers: {
                        'X-F5-Auth-Token': vmAuthToken
                    }
                };
                done();
            })
            .catch((err) => { done(err); });
    });

    describe('Setup', () => {
        it('should install package', () => {
            const packageDetails = testUtil.getPackageDetails();
            const fullPath = `${packageDetails.path}/${packageDetails.name}`;
            return testUtil.installPackage(VM_IP, vmAuthToken, fullPath, VM_PORT)
                .then(() => {
                    testUtil.logger.info(`Successfully installed RPM: ${fullPath} on ${VM_IP}`);
                });
        });

        it('should verify TS service is running', () => {
            const uri = `${constants.BASE_ILX_URI}/info`;

            return new Promise(resolve => setTimeout(resolve, 5000))
                .then(() => testUtil.makeRequest(VM_IP, uri, options))
                .then((data) => {
                    data = data || {};
                    testUtil.logger.info(`${uri} response`, { host: VM_IP, data });
                    return assert.notStrictEqual(data.version, undefined);
                });
        });
    });

    describe('Managed Identities', () => {
        let laReaderToken;
        it('should get log reader oauth token', () => azureUtil.getOAuthToken(CLIENT_ID, CLIENT_SECRET, TENANT_ID)
            .then((data) => {
                laReaderToken = data.access_token;
                return assert.notStrictEqual(laReaderToken, undefined);
            }));

        it('should post systemPoller declaration with useManagedIdentity enabled', () => {
            const declaration = {
                class: 'Telemetry',
                My_System: {
                    class: 'Telemetry_System',
                    systemPoller: {
                        interval: 60
                    }
                },
                My_MI_Consumer: {
                    class: 'Telemetry_Consumer',
                    type: 'Azure_Log_Analytics',
                    workspaceId: WORKSPACE_ID,
                    useManagedIdentity: true
                }
            };

            const deviceInfo = {
                ip: VM_IP,
                username: VM_USER,
                port: VM_PORT,
                password: VM_PWD
            };
            return testUtil.postDeclaration(deviceInfo, declaration)
                .then((response) => {
                    testUtil.logger.info('Response from declaration post', { hostname: VM_HOSTNAME, response });
                    return assert.strictEqual(response.message, 'success', 'POST declaration should return success');
                });
        });

        it('should retrieve systemPoller info from Log Analytics workspace', function () {
            this.timeout(45000);
            const queryString = [
                'F5Telemetry_system_CL',
                `where hostname_s == "${VM_HOSTNAME}"`,
                'where TimeGenerated > ago(5m)'
            ].join(' | ');

            return new Promise(resolve => setTimeout(resolve, 30000))
                .then(() => azureUtil.queryLogs(laReaderToken, WORKSPACE_ID, queryString))
                .then((results) => {
                    testUtil.logger.info('Response from Log Analytics:', { hostname: VM_HOSTNAME, results });
                    const hasRows = results.tables[0] && results.tables[0].rows && results.tables[0].rows[0];
                    return assert(hasRows, 'Log Analytics query returned no tables/rows');
                });
        });
    });
});
