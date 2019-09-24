/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const assert = require('assert');

const constants = require('../../src/lib/constants.js');

/* eslint-disable global-require */

describe('Consumers', () => {
    let config;
    let consumers;

    before(() => {
        config = require('../../src/lib/config.js');
        consumers = require('../../src/lib/consumers.js');
    });
    after(() => {
        Object.keys(require.cache).forEach((key) => {
            delete require.cache[key];
        });
    });

    it('should get valid consumers', () => {
        const exampleConfig = {};
        exampleConfig[constants.CONSUMERS_CLASS_NAME] = {
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

        return new Promise(resolve => setTimeout(() => { resolve(); }, 250))
            .then(() => {
                const loadedConsumers = consumers.getConsumers();
                assert.strictEqual(1, loadedConsumers.length);
            })
            .catch(err => Promise.reject(err));
    });

    it('should return empty list of consumers', () => {
        config.emit('change', {}); // emit change event, then wait a short period

        return new Promise(resolve => setTimeout(() => { resolve(); }, 250))
            .then(() => {
                const loadedConsumers = consumers.getConsumers();
                assert.strictEqual(0, loadedConsumers.length);
            })
            .catch(err => Promise.reject(err));
    });
});
