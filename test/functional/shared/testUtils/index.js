/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assignDefaults = require('lodash/defaults');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const pathUtil = require('path');

const constants = require('../constants');
const miscUtils = require('../utils/misc');
const promiseUtils = require('../utils/promise');

chai.use(chaiAsPromised);
const assert = chai.assert;

/**
 * @module test/functional/shared/testUtils
 *
 * @typedef {import(".,/harness").BigIp} BigIp
 */

const LISTENER_PROTOCOLS = constants.TELEMETRY.LISTENER.PROTOCOLS;

/**
 * Wrap value into array if not yet
 *
 * @private
 *
 * @param {any} val - value to wrap
 *
 * @returns {Array<any>} wrapped value
 */
function toArray(val) {
    return Array.isArray(val) ? val : [val];
}

/**
 * Uninstall all TS packages
 *
 * @private
 *
 * @param {harness.BigIp} bigip - BigIp instance
 *
 * @returns Promise resolved once TS packages removed from F5 device
 */
function uninstallAllTSpackages(bigip) {
    return promiseUtils.loopUntil((breakCb) => bigip.appLX.default.list()
        .then((packages) => {
            bigip.logger.info('List of installed packages', { packages });
            const tsPkg = packages.find((pkg) => pkg.packageName.includes('f5-telemetry'));
            if (!tsPkg) {
                return breakCb();
            }
            bigip.logger.info('Uninstalling Telemetry Streaming package', { tsPkg });
            return bigip.appLX.default.uninstall(tsPkg.packageName);
        }))
        .then(() => bigip.telemetry.installed())
        .then((isOk) => {
            if (!isOk) {
                bigip.logger.info('Telemetry Streaming is not installed');
                return Promise.resolve();
            }
            return Promise.reject(new Error('Unable to uninstall Telemetry Streaming'));
        });
}

module.exports = {
    /**
     * Should configure TS using provided declaration (unit test)
     *
     * @param {function} itFn - mocha 'it'-like function
     * @param {Array<BigIp> | BigIp} bigips - BIG-IP(s) to configure
     * @param {Object | function(BigIp)} declaration - declaration to send or callback
     *      tto call to get declaration for specific BIG-IP. 'null | undefined' to skip
     */
    shouldConfigureTS(itFn, bigips, declaration) {
        if (typeof itFn !== 'function') {
            declaration = bigips;
            bigips = itFn;
            itFn = it;
        }

        declaration = typeof declaration === 'function'
            ? declaration
            : () => miscUtils.deepCopy(declaration);

        toArray(bigips).forEach((bigip) => itFn(
            `should configure TS - ${bigip.name}`,
            function test() {
                const decl = declaration(bigip);
                if (decl === null || typeof decl === 'undefined') {
                    this.skip('No declaration to post');
                    return Promise.resolve();
                }
                return bigip.telemetry.declare(decl);
            }
        ));
    },

    /**
     * Should install TS package (unit test)
     *
     * @param {function} itFn - mocha 'it'-like function
     * @param {Array<BigIp> | BigIp} bigips - BIG-IP(s) to configure
     * @param {Object | function(BigIp)} pkg - pkg to install or callback
     *      tto call to get pkg for specific BIG-IP. 'null | undefined' to skip
     */
    shouldInstallTSPackage(itFn, bigips, pkg) {
        if (typeof itFn !== 'function') {
            pkg = bigips;
            bigips = itFn;
            itFn = it;
        }

        pkg = typeof pkg === 'function' ? pkg : () => miscUtils.deepCopy(pkg);

        toArray(bigips).forEach((bigip) => {
            let installed = false;
            itFn(`should install TS package - ${bigip.name}`, () => {
                const pkgToInstall = pkg(bigip);
                if (pkgToInstall === null || typeof pkgToInstall === 'undefined') {
                    this.skip('No TS package to install');
                    return Promise.resolve();
                }

                return bigip.appLX.default.list()
                    .then((packages) => {
                        bigip.logger.info('List of installed packages', { packages });
                        return bigip.appLX.default.install(
                            pathUtil.join(pkgToInstall.path, pkgToInstall.name),
                            installed
                        );
                    })
                    .then(() => promiseUtils.sleep(1000))
                    .then(() => {
                        installed = true;
                        return bigip.telemetry.installed();
                    })
                    .then((isOk) => {
                        if (isOk) {
                            bigip.logger.info('Telemetry Streaming installed!');
                            return Promise.resolve();
                        }
                        return Promise.reject(new Error('Unable to install Telemetry Streaming'));
                    });
            });
        });
    },

    /**
     * Should remove pre-existing TS declaration (unit test)
     *
     * @param {function} itFn - mocha 'it'-like function
     * @param {Array<BigIp> | BigIp} bigips - BIG-IP(s) to configure
     */
    shouldRemovePreExistingTSDeclaration(itFn, bigips) {
        if (typeof itFn !== 'function') {
            bigips = itFn;
            itFn = it;
        }

        toArray(bigips).forEach((bigip) => itFn(
            `should remove pre-existing TS declaration - ${bigip.name}`,
            () => bigip.telemetry.installed()
                .then((isOk) => {
                    if (!isOk) {
                        bigip.logger.info('Telemetry Streaming is not installed');
                        return Promise.resolve();
                    }
                    bigip.logger.info('Telemetry Streaming is installed already! Need to cleanup config before uninstall');
                    return bigip.telemetry.declare({ class: 'Telemetry' })
                        .then((response) => bigip.logger.info('Existing declaration', { response }))
                        // should wait a bit to apply changes
                        .then(() => promiseUtils.sleep(1000));
                })
        ));
    },

    /**
     * Should remove pre-existing TS package (unit test)
     *
     * @param {function} itFn - mocha 'it'-like function
     * @param {Array<BigIp> | BigIp} bigips - BIG-IP(s) to configure
     */
    shouldRemovePreExistingTSPackage(itFn, bigips) {
        if (typeof itFn !== 'function') {
            bigips = itFn;
            itFn = it;
        }

        toArray(bigips).forEach((bigip) => itFn(
            `should remove pre-existing TS package - ${bigip.name}`,
            () => uninstallAllTSpackages(bigip)
                .catch((error) => {
                    bigip.logger.error('Unable to verify package uninstall due following error', error);
                    return promiseUtils.sleepAndReject(5000, error); // sleep before retry
                })
        ));
    },

    /**
     * Send data to Event Listener (unit test)
     *
     * @param {function} itFn - mocha 'it'-like function
     * @param {Array<BigIp> | BigIp} bigips - BIG-IP(s) to configure
     * @param {Any | function(BigIp)} message - message to send or callback
     *      tto call to get message for specific BIG-IP. 'null | undefined' to skip
     * @param {Object} [options] - options
     * @param {Integer} [options.delay = 100] - delay before sending next message
     * @param {Integer} [options.numberOfMsg = 10] - number of messages to send to BIG-IP (For each port and protocol)
     * @param {Array<string> | string} [options.protocol = ['udp', 'tcp']] - protocol
     * @param {Array<integer> | integer} [options.port = 6514] - port
     */
    shouldSendListenerEvents(itFn, bigips, message, options) {
        if (typeof itFn !== 'function') {
            options = message;
            message = bigips;
            bigips = itFn;
            itFn = it;
        }

        options = assignDefaults(options || {}, {
            delay: 100,
            numberOfMsg: 10,
            port: constants.TELEMETRY.LISTENER.PORT.DEFAULT,
            protocol: LISTENER_PROTOCOLS
        });

        message = typeof message === 'function'
            ? message
            : () => miscUtils.deepCopy(message);

        const protocol = Array.isArray(options.protocol) ? options.protocol : [options.protocol];
        const port = Array.isArray(options.port) ? options.port : [options.port];

        protocol.forEach((proto) => port.forEach((p) => toArray(bigips).forEach((bigip) => itFn(
            `should send events to TS Event Listener (to ${proto.toUpperCase()}:${p}) - ${bigip.name}`,
            function test() {
                let idx = 0;
                return promiseUtils.loopUntil((breakCb) => {
                    if (idx >= options.numberOfMsg) {
                        return breakCb();
                    }
                    idx += 1;

                    const msg = message(bigip, proto, p, idx);
                    if (msg === null || typeof msg === 'undefined') {
                        this.skip('No message to send');
                        return breakCb();
                    }
                    return bigip[proto.toLowerCase()].send(p, msg)
                        .then(() => {
                            if (idx < options.numberOfMsg && options.delay) {
                                bigip.logger.info(`Sleep for ${options.delay}ms. before sending next message (${idx} out of ${options.numberOfMsg})`);
                                return promiseUtils.sleep(options.delay);
                            }
                            return Promise.resolve();
                        });
                });
            }
        ))));
    },

    /**
     * Should verify TS package installation (unit test)
     *
     * @param {function} itFn - mocha 'it'-like function
     * @param {Array<BigIp> | BigIp} bigips - BIG-IP(s) to configure
     */
    shouldVerifyTSPackageInstallation(itFn, bigips) {
        if (typeof itFn !== 'function') {
            bigips = itFn;
            itFn = it;
        }

        toArray(bigips).forEach((bigip) => itFn(
            `should verify TS package installation - ${bigip.name}`,
            () => bigip.telemetry.version()
                .then((verInfo) => {
                    bigip.logger.info('Telemetry Streaming version info', { verInfo });
                    assert.notStrictEqual(verInfo.version, undefined, 'should have "version" property');
                })
        ));
    }
};
