/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const hasIn = require('lodash/hasIn');
const icrdk = require('icrdk'); // eslint-disable-line import/no-extraneous-dependencies

/**
 * @module test/functional/shared/remoteHost/appLXConnector
 *
 * @typedef {import("./icontrolConnector").IControlConnector} IControlConnector
 * @typedef {import("../utils/logger").Logger} Logger
 */

const F5_AUTH_HEADER = 'x-f5-auth-token';

/**
 * LX Application Connector
 *
 * @property {Logger} logger - logger
 * @property {IControlConnector} icontrol - iControl Connector
 */
class AppLXConnector {
    /**
     * Constructor
     *
     * @param {IControlConnector} icontrol - iControl Connector
     * @param {Object} [options] - options
     * @param {Logger} [options.logger] - logger
     */
    constructor(icontrol, options) {
        Object.defineProperties(this, {
            icontrol: {
                value: icontrol
            }
        });

        options = options || {};
        this.logger = (options.logger || this.icontrol.logger).getChild('appLX');
    }

    /**
     * Install ILX package
     *
     * @param {string} file - local file (RPM) to install
     * @param {boolean} [reuse] - re-use package that installed already
     *
     * @returns {Promise} resolved upon completion
     */
    install(file, reuse) {
        this.logger.info('Installing LX package', { file, reuse });
        return this.icontrol.echo()
            .then(() => new Promise((resolve, reject) => {
                icrdk.deployToBigIp({
                    AUTH_TOKEN: this.icontrol.authToken,
                    HOST: this.icontrol.transport.host.host,
                    PORT: this.icontrol.transport.defaults().port
                }, file, (err) => {
                    if (err) {
                        // resolve if error is because the package is already installed
                        // in that case error is of type 'string' - instead of in .message
                        if (reuse && /already installed/.test(err)) {
                            this.logger.info('Package installed already.', { file, reuse });
                            resolve();
                        } else {
                            reject(err);
                        }
                    } else {
                        this.logger.info('Package installed.', { file, reuse });
                        resolve();
                    }
                });
            }));
    }

    /**
     * Get list of installed ILX packages
     *
     * @returns {Promise<Array<LXPackageInfo>>} resolved upon completion
     */
    list() {
        this.logger.info('Listing LX packages');
        return this.icontrol.echo()
            .then(() => new Promise((resolve, reject) => {
                // icrdk bug - should pass headers and should send additional requests
                const opts = {
                    headers: {
                        [F5_AUTH_HEADER]: this.icontrol.authToken
                    },
                    HOST: this.icontrol.transport.host.host,
                    PORT: this.icontrol.transport.defaults().port
                };
                const checkDataAndRetry = (data) => {
                    if (data.queryResponse) {
                        this.logger.info('List of installed LX applications', { packages: data.queryResponse });
                        resolve(data.queryResponse);
                    } else if (data.selfLink) {
                        setTimeout(() => {
                            this.icontrol.makeRequestWithAuth({
                                method: 'GET',
                                uri: data.selfLink.replace('https://localhost', '')
                            })
                                .then(checkDataAndRetry);
                        }, 300);
                    } else {
                        reject(new Error(`Unable to fetch data. Unexpected response: ${JSON.stringify(data)}`));
                    }
                };

                icrdk.queryInstalledPackages(opts, (err, queryResults) => {
                    if (err) {
                        reject(err);
                    } else {
                        checkDataAndRetry(queryResults);
                    }
                });
            }));
    }

    /**
     * Uninstall ILX package
     *
     * @param {string} packageName - package to remove from device, should be RPM full name (not path)
     *
     * @returns {Promise} resolved upon completion
     */
    uninstall(packageName) {
        this.logger.info('Uninstalling LX package', { packageName });
        return this.icontrol.echo()
            .then(() => new Promise((resolve, reject) => {
                icrdk.uninstallPackage({
                    AUTH_TOKEN: this.icontrol.authToken,
                    HOST: this.icontrol.transport.host.host,
                    PORT: this.icontrol.transport.defaults().port
                }, packageName, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.logger.info('Package uninstalled', { packageName });
                        resolve();
                    }
                });
            }));
    }
}

/**
 * LX Application Connector Manager
 *
 * @property {Logger} logger - logger
 * @property {IControlConnector} icontrol - iControl Connector
 */
class AppLXConnectorManager {
    /**
     * Constructor
     *
     * @param {AppLXConnectorManagerOptions} options - options
     * @param {IControlConnector} options.icontrol - iControl Connector
     * @param {Logger} [options.logger] - logger
     */
    constructor(options) {
        options = options || {};
        this.logger = (options.logger || options.icontrol.transport.host.logger);

        Object.defineProperties(this, {
            icontrol: {
                value: options.icontrol
            }
        });
    }

    /**
     * Create new LX Application Connector instance
     *
     * @param {AppLXConnectorManagerOptions} [options] - options
     *
     * @returns {AppLXConnector} instance
     */
    create(options) {
        options = options || {};
        return new AppLXConnector(
            options.icontrol || this.icontrol,
            {
                logger: this.logger
            }
        );
    }

    /**
     * Create new LX Application Connector instance and save as property
     *
     * @param {string} name - name to use to save instance as property
     * @param {AppLXConnectorManagerOptions} [options] - options
     *
     * @returns {AppLXConnector} instance
     */
    createAndSave(name) {
        if (hasIn(this, name)) {
            throw new Error(`Can't assign AppLXConnector to '${name}' property - exists already!`);
        }
        Object.defineProperty(this, name, {
            configurable: true,
            value: this.create.apply(this, Array.from(arguments).slice(1))
        });
        return this[name];
    }

    /**
     * Install ILX package
     *
     * @param {string} file - local file (RPM) to install
     * @param {AppLXConnectorManagerOptions} [options] - options
     * @param {boolean} [options.reuse] - re-use package that installed already
     *
     * @returns {Promise} resolved upon completion
     */
    install(file, options) {
        options = options || {};
        return this.create({ icontrol: options.icontrol }).install(file, options.reuse);
    }

    /**
     * Get list of installed ILX packages
     *
     * @param {AppLXConnectorManagerOptions} [options] - options
     *
     * @returns {Promise<Array<LXPackageInfo>>} resolved upon completion
     */
    list(options) {
        options = options || {};
        return this.create({ icontrol: options.icontrol }).list();
    }

    /**
     * Uninstall ILX package
     *
     * @param {string} packageName - package to remove from device, should be RPM full name (not path)
     * @param {AppLXConnectorManagerOptions} [options] - options
     *
     * @returns {Promise} resolved upon completion
     */
    uninstall(packageName, options) {
        options = options || {};
        return this.create({ icontrol: options.icontrol }).uninstall(packageName);
    }
}

module.exports = {
    AppLXConnector,
    AppLXConnectorManager
};

/**
 * @typedef LXPackageInfo
 * @type {Object}
 * @property {string} name - application name
 * @property {string} version - version
 * @property {string} release - release number
 * @property {string} arch - architecture
 * @property {string} packageName - RPM full name
 * @property {Array<string>} tags - tags
 */
/**
 * @typedef AppLXConnectorManagerOptions
 * @type {Object}
 * @property {IControlConnector} [icontrol] - iControl Connector
 */
