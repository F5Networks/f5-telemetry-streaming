/*
 * Copyright 2021. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const jwt = require('jsonwebtoken');
const requestsUtil = require('../../utils/requests');
const getCurrentUnixTimeInSeconds = require('../../utils/datetime').getCurrentUnixTimeInSeconds;

/**
 * Caching mechanism for Access Tokens
 * Instead of requesting a new token on each request, can cache the token until it is set to expire.
 *
 * @property {Object} cache             Structure containing the cached token. Structure looks like:
 *  {
 *      <tokenId>: {
 *          access_token:
 *          expiresAt:
 *      }
 *  }
 * @property {Number} latencyBuffer     Number of seconds to add as a buffer to a token's expected expiry time
 */
class TokenCache {
    constructor() {
        this.cache = {};
        this.latencyBuffer = 60;
    }

    /**
     * Caches a token by its tokenId
     *
     * @param {String} tokenId  Unique identifier for a given token
     * @param {Object} token    Access token
     * @returns {Object} Complete token object
     */
    cacheToken(tokenId, token) {
        // When caching new token, prune the cache as well
        this.removeExpiredTokens();
        const expiresAt = getCurrentUnixTimeInSeconds() + token.expires_in;
        this.cache[tokenId] = Object.assign(token, { expiresAt });
        return token;
    }

    /**
     * Given a token's unique identifier, returns an Access Token if the token is still current
     *
     * @param {String} tokenId  Unique identifier for a given token
     * @returns {Object}  Either the cached Token, or undefined if there is no valid access token in the cache
     */
    getToken(tokenId) {
        const token = this.cache[tokenId];
        return this.tokenIsValid(token) ? token : undefined;
    }

    /**
     * Checks whether a given token is valid or not.
     * A token is valid if the token's expiry time (plus the latency buffer) is after the current time
     *
     * @param {Object}  token           Token object
     * @param {Number}  token.expiresAt Token expires time
     * @returns {Boolean}   Whether or not the token is expired
     */
    tokenIsValid(token) {
        token = token || {};
        return (typeof token.expiresAt !== 'undefined')
            && token.expiresAt > (getCurrentUnixTimeInSeconds() + this.latencyBuffer);
    }

    /**
     * Removes all expired tokens from the cache
     */
    removeExpiredTokens() {
        Object.keys(this.cache).forEach((t) => {
            if (!this.tokenIsValid(this.cache[t])) {
                this.removeToken(t);
            }
        });
    }

    /**
     * Remove a specific token from the cache
     *
     * @param {String} tokenId  Unique identifier for a given token
     */
    removeToken(tokenId) {
        delete this.cache[tokenId];
    }

    /**
     * Removes all tokens from the cache
     */
    removeAllTokens() {
        this.cache = {};
    }
}

const tokenCache = new TokenCache();

/**
 * Given Google Cloud Access credentials, requests an Access Token from Google Cloud.
 * Will request following scopes when requesting an Access Token:
 *      - https://www.googleapis.com/auth/monitoring
 *      - https://www.googleapis.com/auth/logging.write
 *
 * @param {Object}  serviceAccount              Google Cloud Service Account properties
 * @param {String}  serviceAccount.serviceEmail Service Account email address
 * @param {String}  serviceAccount.privateKeyId Service Account private key ID
 * @param {String}  serviceAccount.privateKey   Service Account private key
 *
 * @returns {String} Access Token used to authenticate to Google Cloud APIs
 */
function getAccessToken(serviceAccount) {
    const privateKeyId = serviceAccount.privateKeyId;
    const cachedToken = tokenCache.getToken(privateKeyId);
    if (cachedToken && cachedToken.access_token) {
        return Promise.resolve(cachedToken.access_token);
    }

    const scope = 'https://www.googleapis.com/auth/monitoring https://www.googleapis.com/auth/logging.write';
    const jwtAge = 60 * 60; // 1 hour, in seconds
    const jwtSigningOptions = {
        algorithm: 'RS256',
        header: {
            kid: privateKeyId,
            typ: 'JWT',
            alg: 'RS256'
        }
    };

    const jwtRequest = jwt.sign(
        {
            iss: serviceAccount.serviceEmail,
            scope,
            aud: 'https://oauth2.googleapis.com/token',
            exp: getCurrentUnixTimeInSeconds() + jwtAge,
            iat: getCurrentUnixTimeInSeconds()
        },
        serviceAccount.privateKey,
        jwtSigningOptions
    );

    const httpOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        fullURI: 'https://oauth2.googleapis.com/token',
        form: {
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwtRequest
        }
    };

    return requestsUtil.makeRequest(httpOptions)
        .then(token => tokenCache.cacheToken(privateKeyId, token).access_token);
}

/**
 * Given a Google Service Account object, invalidates the cached tokens held by the Token Cache.
 *
 * @param {Object}  serviceAccount                  Service Account object
 * @param {String}  serviceAccount.privateKeyId     PrivateKeyID for the Service Account
 */
function invalidateToken(serviceAccount) {
    tokenCache.removeToken(serviceAccount.privateKeyId);
}

module.exports = {
    getAccessToken,
    invalidateToken
};
