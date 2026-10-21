/**
 * Copyright 2026 F5, Inc.
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

const util = require('../../utils/misc');
const azureUtil = require('../shared/azureUtil');
const promiseUtil = require('../../utils/promise');
const requestsUtil = require('../../utils/requests');
const EVENT_TYPES = require('../../constants').EVENT_TYPES;

const DEFAULT_API_VERSION = '2023-01-01';
const DEFAULT_SCOPE = 'https://monitor.azure.com/.default';
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

const tokenCache = {};

function buildTokenCacheKey(config) {
    return `${config.tenantId}:${config.clientId}:${config.tokenEndpoint || ''}`;
}

function getTokenEndpoint(config) {
    return config.tokenEndpoint
        || `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;
}

function getAccessToken(context, forceRefresh) {
    const cacheKey = buildTokenCacheKey(context.config);
    const cachedToken = tokenCache[cacheKey];

    if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
        return Promise.resolve(cachedToken.accessToken);
    }

    const requestOptions = {
        method: 'POST',
        fullURI: getTokenEndpoint(context.config),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: [
            `client_id=${encodeURIComponent(context.config.clientId)}`,
            `client_secret=${encodeURIComponent(context.config.clientSecret)}`,
            `scope=${encodeURIComponent(context.config.scope || DEFAULT_SCOPE)}`,
            'grant_type=client_credentials'
        ].join('&'),
        json: false,
        allowSelfSignedCert: context.config.allowSelfSignedCert
    };

    return requestsUtil.makeRequest(requestOptions)
        .then((response) => {
            if (!response || !response.access_token) {
                throw new Error('Microsoft Entra token response did not contain an access_token.');
            }

            const expiresInSeconds = Number(response.expires_in) || 3600;
            tokenCache[cacheKey] = {
                accessToken: response.access_token,
                expiresAt: Date.now() + (expiresInSeconds * 1000)
            };
            return response.access_token;
        });
}

function getIngestionUri(config, streamName) {
    const endpoint = config.dataCollectionEndpoint.replace(/\/+$/, '');
    const ruleId = encodeURIComponent(config.dataCollectionRuleImmutableId);
    const stream = encodeURIComponent(streamName);
    const apiVersion = encodeURIComponent(config.apiVersion || DEFAULT_API_VERSION);
    return `${endpoint}/dataCollectionRules/${ruleId}/streams/${stream}?api-version=${apiVersion}`;
}

function createResponseError(response, fullURI) {
    const statusCode = response[1].statusCode;
    const error = new Error(`Azure Monitor Logs Ingestion request failed with status code ${statusCode} for ${fullURI}`);
    error.statusCode = statusCode;
    return error;
}

function sendRequest(context, streamName, data, forceTokenRefresh) {
    let fullURI;
    return getAccessToken(context, forceTokenRefresh)
        .then((accessToken) => {
            fullURI = getIngestionUri(context.config, streamName);
            const requestOptions = {
                method: 'POST',
                fullURI,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: data,
                allowSelfSignedCert: context.config.allowSelfSignedCert,
                continueOnErrorCode: true,
                includeResponseObject: true
            };

            if (context.tracer) {
                const requestOptionsCopy = util.deepCopy(requestOptions);
                requestOptionsCopy.headers.Authorization = '*****';
                context.tracer.write(requestOptionsCopy);
            }

            return requestsUtil.makeRequest(requestOptions);
        })
        .then((response) => {
            const statusCode = response[1].statusCode;
            if ([200, 202, 204].indexOf(statusCode) !== -1) {
                return response[0];
            }
            if (statusCode === 401 && !forceTokenRefresh) {
                return sendRequest(context, streamName, data, true);
            }
            throw createResponseError(response, fullURI);
        });
}

function sendWithRetry(context, streamName, data) {
    return promiseUtil.retry(
        () => sendRequest(context, streamName, data, false),
        {
            maxTries: context.config.maxRetryAttempts || 3,
            delay: 1000,
            backoff: 1000,
            callback: (error) => error.statusCode === 429 || error.statusCode >= 500
        }
    );
}

function prepareData(context, type, data, poolMemberMapping, allPoolMembers) {
    const isPropertyBased = (context.config.format || '').startsWith('propertyBased');

    if (typeof data !== 'object') {
        data = { value: data };
    }

    if (isPropertyBased && azureUtil.isConfigItems(
        data,
        type,
        poolMemberMapping.isPoolMembersType(type)
    )) {
        data = azureUtil.transformConfigItems(data);
        if (poolMemberMapping.isPoolType(type)) {
            data.forEach((pool) => {
                azureUtil.splitMembersFromPools(
                    pool,
                    allPoolMembers[poolMemberMapping.getPoolMembersType(type)]
                );
            });
        }
    } else {
        data = [data];
    }

    data.forEach((item) => azureUtil.scrubReservedKeys(item));
    return data;
}

/**
 * See {@link ../README.md#context} for documentation.
 */
module.exports = function (context) {
    const dataByType = {};
    const allPoolMembers = {};
    const poolMemberMapping = new azureUtil.ClassPoolToMembersMapping();
    poolMemberMapping.buildPoolMemeberHolder(allPoolMembers);

    if (context.event.type !== EVENT_TYPES.SYSTEM_POLLER) {
        dataByType[context.event.type] = JSON.parse(JSON.stringify(context.event.data));
    } else {
        if ((context.config.format || '').endsWith('V2')
                && context.event.data.system
                && context.event.data.system.asmAttackSignatures) {
            context.event.data.asmAttackSignatures = context.event.data.system.asmAttackSignatures;
            delete context.event.data.system.asmAttackSignatures;
        }
        Object.keys(context.event.data).forEach((type) => {
            dataByType[type] = context.event.data[type];
        });
    }

    const promises = [];
    Object.keys(dataByType).concat(Object.keys(allPoolMembers)).forEach((type) => {
        const streamName = context.config.streamMappings[type];
        if (!streamName) {
            context.logger.debug(`No Azure Monitor Logs Ingestion stream mapping configured for telemetry type "${type}".`);
            return;
        }

        const sourceData = poolMemberMapping.isPoolMembersType(type)
            ? allPoolMembers[type]
            : dataByType[type];
        if (poolMemberMapping.isPoolMembersType(type) && Object.keys(sourceData).length === 0) {
            return;
        }

        const data = prepareData(context, type, sourceData, poolMemberMapping, allPoolMembers);
        promises.push(sendWithRetry(context, streamName, data));
    });

    return promiseUtil.allSettled(promises)
        .then((results) => {
            promiseUtil.getValues(results);
            context.logger.verbose('success');
        })
        .catch((error) => {
            context.logger.exception('Unable to forward to Azure Monitor Logs Ingestion consumer.', error);
        });
};
