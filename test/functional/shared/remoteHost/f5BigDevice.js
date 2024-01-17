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

const AppLXConnectorManager = require('./appLXConnector').AppLXConnectorManager;
const IControlAPIManager = require('./icontrolAPI').IControlAPIManager;
const IControlConnectorManager = require('./icontrolConnector').IControlConnectorManager;
const RemoteDevice = require('./remoteDevice');

/**
 * @module test/functional/shared/remoteHost/f5BigDevice
 *
 * @typedef {import("./appLXConnector").AppLXConnectorManagerOptions} AppLXConnectorManagerOptions
 * @typedef {import("./icontrolAPI").IControlAPIManagerOptions} IControlAPIManagerOptions
 * @typedef {import("./icontrolConnector").IControlConnectorManagerOptions} IControlConnectorManagerOptions
 * @typedef {import("./icontrolConnector").IControlConnector} IControlConnector
 * @typedef {import("../utils/logger").Logger} Logger
 * @typedef {import("../utils/request").RequestOptions} RequestOptions
 */

/**
 * F5 Device
 *
 * @property {AppLXConnectorManager} appLX - App LX Connector(s) manager
 * @property {IControlAPIManager} icAPI - iControl API manager
 * @property {IControlConnector} icontrol - iControl Connector(s) manager
 * @property {Logger} logger - logger
 */
class F5BigDevice extends RemoteDevice {
    /**
     * Constructor
     *
     * @param {string} host - remote host
     */
    constructor(host) {
        super(host);
        this.logger = this.host.logger.getChild('f5Device');
    }

    /**
     * Initialize App LX Connector(s) manager
     *
     * @param {AppLXConnectorManagerOptions} options - options
     *
     * @returns {AppLXConnectorManager} instance
     */
    initAppLXStack(options) {
        Object.defineProperty(
            this, 'appLX', {
                value: new AppLXConnectorManager(Object.assign(
                    {},
                    Object.assign({}, options || {}),
                    {
                        logger: this.logger
                    }
                ))
            }
        );
        return this.appLX;
    }

    /**
     * Initialize iControl API manager
     *
     * @param {IControlAPIManagerOptions} options - options
     *
     * @returns {IControlAPIManager} instance
     */
    initIControlAPIStack(options) {
        Object.defineProperty(
            this, 'icAPI', {
                value: new IControlAPIManager(Object.assign(
                    {},
                    Object.assign({}, options || {}),
                    {
                        logger: this.logger
                    }
                ))
            }
        );
        return this.icAPI;
    }

    /**
     * Initialize iControl Connector(s) manager
     *
     * @param {IControlConnectorManagerOptions} options - options
     *
     * @returns {IControlConnectorManager} instance
     */
    initIControlStack(options) {
        Object.defineProperty(
            this, 'icontrol', {
                value: new IControlConnectorManager(Object.assign(
                    {},
                    Object.assign({}, options || {}),
                    {
                        logger: this.logger
                    }
                ))
            }
        );
        return this.icontrol;
    }
}

module.exports = F5BigDevice;
