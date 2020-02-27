/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

/* eslint-disable import/order */

require('./shared/restoreCache')();
require('./shared/disableAjv'); // consumers imports config with ajv

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const config = require('../../src/lib/config');
const constants = require('../../src/lib/constants');
const consumers = require('../../src/lib/consumers');

chai.use(chaiAsPromised);
const assert = chai.assert;

describe('Consumers', () => {
    it('should get valid consumers', () => {
        const exampleConfig = {};
        exampleConfig[constants.CONFIG_CLASSES.CONSUMERS_CLASS_NAME] = {
            My_Consumer: {
                class: 'Consumer',
                type: 'default'
            },
            My_Consumer_Fake: {
                class: 'Consumer',
                type: 'unknowntype'
            }
        };
        config.emit('change', exampleConfig); // emit change event, then wait a short period
        return assert.isFulfilled(new Promise(resolve => setTimeout(() => { resolve(); }, 250))
            .then(() => {
                const loadedConsumers = consumers.getConsumers();
                assert.strictEqual(loadedConsumers.length, 1, 'should load default consumer');
            }));
    });

    it('should return empty list of consumers', () => {
        config.emit('change', {}); // emit change event, then wait a short period
        return new Promise(resolve => setTimeout(() => { resolve(); }, 250))
            .then(() => {
                const loadedConsumers = consumers.getConsumers();
                assert.strictEqual(loadedConsumers.length, 0);
            })
            .catch(err => Promise.reject(err));
    });
});
