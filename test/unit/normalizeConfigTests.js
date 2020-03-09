/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');

const configWorker = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const deviceUtil = require('../../src/lib/deviceUtil');
const normalizeConfig = require('../../src/lib/normalizeConfig');
const util = require('../../src/lib/util');

const normalizeConfigTestsData = require('./normalizeConfigTestsData');
const testUtil = require('./shared/util');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Configuration Normalization', () => {
    const validateAndFormat = function (declaration) {
        return configWorker.validate(declaration)
            .then(validated => Promise.resolve(util.formatConfig(validated)))
            .then(validated => deviceUtil.decryptAllSecrets(validated));
    };

    beforeEach(() => {
        sinon.stub(deviceUtil, 'encryptSecret').resolvesArg(0);
        sinon.stub(deviceUtil, 'decryptSecret').resolvesArg(0);
        sinon.stub(deviceUtil, 'getDeviceType').resolves(constants.DEVICE_TYPE.BIG_IP);
        sinon.stub(util, 'networkCheck').resolves();
    });

    afterEach(() => {
        sinon.restore();
    });
    /* eslint-disable implicit-arrow-linebreak */
    Object.keys(normalizeConfigTestsData).forEach((testSetKey) => {
        const testSet = normalizeConfigTestsData[testSetKey];
        testUtil.getCallableDescribe(testSet)(testSet.name, () => {
            testSet.tests.forEach((testConf) => {
                testUtil.getCallableIt(testConf)(testConf.name, () =>
                    validateAndFormat(testConf.declaration)
                        .then(configData => assert.deepStrictEqual(
                            normalizeConfig(configData),
                            testConf.expected
                        )));
            });
        });
    });
});
