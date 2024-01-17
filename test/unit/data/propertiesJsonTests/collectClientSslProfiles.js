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

/* eslint-disable no-useless-escape */

/**
 * NOTE: DO NOT REMOVE 'kind' AND 'selfLink' PROPERTIES FROM RESPONSE's TOP LEVEL
 */
/**
 * TODO: update/remove 'options: { times: XXXX }' when EndpointLoader's cache will be fixed
 */

module.exports = {
    /**
     * Set of data to check actual and expected results only.
     * If you need some additional check feel free to add additional
     * property or write separate test.
     *
     * Note: you can specify 'testOpts' property on the same level as 'name'.
     * Following options available:
     * - only (bool) - run this test only (it.only)
     * */
    name: 'Client SSL profiles stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set client ssl to empty object if not configured',
            statsToCollect: ['clientSslProfiles'],
            contextToCollect: [],
            expectedData: {
                clientSslProfiles: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/profile\/client-ssl\/stats/,
                    response: {
                        kind: 'tm:ltm:profile:client-ssl:client-sslcollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/client-ssl/stats?ver=14.1.0'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect client ssl profiles stats',
            statsToCollect: ['clientSslProfiles'],
            contextToCollect: [],
            expectedData: {
                clientSslProfiles: {
                    '/Common/clientssl': {
                        activeHandshakeRejected: 0,
                        'cipherUses.adhKeyxchg': 0,
                        'cipherUses.aesBulk': 0,
                        'cipherUses.aesGcmBulk': 0,
                        'cipherUses.camelliaBulk': 0,
                        'cipherUses.chacha20Poly1305Bulk': 0,
                        'cipherUses.desBulk': 0,
                        'cipherUses.dhRsaKeyxchg': 0,
                        'cipherUses.dheDssKeyxchg': 0,
                        'cipherUses.ecdhEcdsaKeyxchg': 0,
                        'cipherUses.ecdhRsaKeyxchg': 0,
                        'cipherUses.ecdheEcdsaKeyxchg': 0,
                        'cipherUses.ecdheRsaKeyxchg': 0,
                        'cipherUses.edhRsaKeyxchg': 0,
                        'cipherUses.ideaBulk': 0,
                        'cipherUses.md5Digest': 0,
                        'cipherUses.nullBulk': 0,
                        'cipherUses.nullDigest': 0,
                        'cipherUses.rc2Bulk': 0,
                        'cipherUses.rc4Bulk': 0,
                        'cipherUses.rsaKeyxchg': 0,
                        'cipherUses.shaDigest': 0,
                        currentCompatibleConnections: 0,
                        currentConnections: 0,
                        currentNativeConnections: 0,
                        currentActiveHandshakes: 0,
                        decryptedBytesIn: 0,
                        decryptedBytesOut: 0,
                        encryptedBytesIn: 0,
                        encryptedBytesOut: 0,
                        fatalAlerts: 0,
                        handshakeFailures: 0,
                        peercertInvalid: 0,
                        peercertNone: 0,
                        peercertValid: 0,
                        'protocolUses.dtlsv1': 0,
                        'protocolUses.sslv2': 0,
                        'protocolUses.sslv3': 0,
                        'protocolUses.tlsv1': 0,
                        'protocolUses.tlsv1_1': 0,
                        'protocolUses.tlsv1_2': 0,
                        'protocolUses.tlsv1_3': 0,
                        recordsIn: 0,
                        recordsOut: 0,
                        sniRejects: 0,
                        name: '/Common/clientssl',
                        tenant: 'Common',
                        totCompatConns: 0,
                        totNativeConns: 0
                    }
                }
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/ltm\/profile\/client-ssl\/stats/,
                    response: {
                        kind: 'tm:ltm:profile:client-ssl:client-sslcollectionstats',
                        selfLink: 'https://localhost/mgmt/tm/ltm/profile/client-ssl/stats?ver=14.1.0',
                        entries: {
                            'https://localhost/mgmt/tm/ltm/profile/client-ssl/~Common~clientssl/stats': {
                                nestedStats: {
                                    kind: 'tm:ltm:profile:client-ssl:client-sslstats',
                                    selfLink: 'https://localhost/mgmt/tm/ltm/profile/client-ssl/~Common~clientssl/stats?ver=14.1.0',
                                    entries: {
                                        'common.activeHandshakeRejected': {
                                            value: 0
                                        },
                                        'common.aggregateRenegotiationsRejected': {
                                            value: 0
                                        },
                                        'common.badRecords': {
                                            value: 0
                                        },
                                        'common.c3dUses.conns': {
                                            value: 0
                                        },
                                        'common.cipherUses.adhKeyxchg': {
                                            value: 0
                                        },
                                        'common.cipherUses.aesBulk': {
                                            value: 0
                                        },
                                        'common.cipherUses.aesGcmBulk': {
                                            value: 0
                                        },
                                        'common.cipherUses.camelliaBulk': {
                                            value: 0
                                        },
                                        'common.cipherUses.chacha20Poly1305Bulk': {
                                            value: 0
                                        },
                                        'common.cipherUses.desBulk': {
                                            value: 0
                                        },
                                        'common.cipherUses.dhRsaKeyxchg': {
                                            value: 0
                                        },
                                        'common.cipherUses.dheDssKeyxchg': {
                                            value: 0
                                        },
                                        'common.cipherUses.ecdhEcdsaKeyxchg': {
                                            value: 0
                                        },
                                        'common.cipherUses.ecdhRsaKeyxchg': {
                                            value: 0
                                        },
                                        'common.cipherUses.ecdheEcdsaKeyxchg': {
                                            value: 0
                                        },
                                        'common.cipherUses.ecdheRsaKeyxchg': {
                                            value: 0
                                        },
                                        'common.cipherUses.edhRsaKeyxchg': {
                                            value: 0
                                        },
                                        'common.cipherUses.ideaBulk': {
                                            value: 0
                                        },
                                        'common.cipherUses.md5Digest': {
                                            value: 0
                                        },
                                        'common.cipherUses.nullBulk': {
                                            value: 0
                                        },
                                        'common.cipherUses.nullDigest': {
                                            value: 0
                                        },
                                        'common.cipherUses.rc2Bulk': {
                                            value: 0
                                        },
                                        'common.cipherUses.rc4Bulk': {
                                            value: 0
                                        },
                                        'common.cipherUses.rsaKeyxchg': {
                                            value: 0
                                        },
                                        'common.cipherUses.shaDigest': {
                                            value: 0
                                        },
                                        'common.connectionMirroring.haCtxRecv': {
                                            value: 0
                                        },
                                        'common.connectionMirroring.haCtxSent': {
                                            value: 0
                                        },
                                        'common.connectionMirroring.haFailure': {
                                            value: 0
                                        },
                                        'common.connectionMirroring.haHsSuccess': {
                                            value: 0
                                        },
                                        'common.connectionMirroring.haPeerReady': {
                                            value: 0
                                        },
                                        'common.connectionMirroring.haTimeout': {
                                            value: 0
                                        },
                                        'common.curCompatConns': {
                                            value: 0
                                        },
                                        'common.curConns': {
                                            value: 0
                                        },
                                        'common.curNativeConns': {
                                            value: 0
                                        },
                                        'common.currentActiveHandshakes': {
                                            value: 0
                                        },
                                        'common.decryptedBytesIn': {
                                            value: 0
                                        },
                                        'common.decryptedBytesOut': {
                                            value: 0
                                        },
                                        'common.dtlsTxPushbacks': {
                                            value: 0
                                        },
                                        'common.encryptedBytesIn': {
                                            value: 0
                                        },
                                        'common.encryptedBytesOut': {
                                            value: 0
                                        },
                                        'common.extendedMasterSecrets': {
                                            value: 0
                                        },
                                        'common.fatalAlerts': {
                                            value: 0
                                        },
                                        'common.fullyHwAcceleratedConns': {
                                            value: 0
                                        },
                                        'common.fwdpUses.alertBypasses': {
                                            value: 0
                                        },
                                        'common.fwdpUses.cachedCerts': {
                                            value: 0
                                        },
                                        'common.fwdpUses.clicertFailBypasses': {
                                            value: 0
                                        },
                                        'common.fwdpUses.conns': {
                                            value: 0
                                        },
                                        'common.fwdpUses.dipBypasses': {
                                            value: 0
                                        },
                                        'common.fwdpUses.enforceResumeFailures': {
                                            value: 0
                                        },
                                        'common.fwdpUses.hnBypasses': {
                                            value: 0
                                        },
                                        'common.fwdpUses.sipBypasses': {
                                            value: 0
                                        },
                                        'common.fwdpUses.transparentResumeCnt': {
                                            value: 0
                                        },
                                        'common.fwdpUses.verifiedHsCnt': {
                                            value: 0
                                        },
                                        'common.handshakeFailures': {
                                            value: 0
                                        },
                                        'common.insecureHandshakeAccepts': {
                                            value: 0
                                        },
                                        'common.insecureHandshakeRejects': {
                                            value: 0
                                        },
                                        'common.insecureRenegotiationRejects': {
                                            value: 0
                                        },
                                        'common.maxCompatConns': {
                                            value: 0
                                        },
                                        'common.maxConns': {
                                            value: 0
                                        },
                                        'common.maxNativeConns': {
                                            value: 0
                                        },
                                        'common.midstreamRenegotiations': {
                                            value: 0
                                        },
                                        'common.nonHwAcceleratedConns': {
                                            value: 0
                                        },
                                        'common.ocspFwdpClientssl.cachedResp': {
                                            value: 0
                                        },
                                        'common.ocspFwdpClientssl.certStatusReq': {
                                            value: 0
                                        },
                                        'common.ocspFwdpClientssl.invalidCertResp': {
                                            value: 0
                                        },
                                        'common.ocspFwdpClientssl.respstatusErrResp': {
                                            value: 0
                                        },
                                        'common.ocspFwdpClientssl.revokedResp': {
                                            value: 0
                                        },
                                        'common.ocspFwdpClientssl.stapledResp': {
                                            value: 0
                                        },
                                        'common.ocspFwdpClientssl.unknownResp': {
                                            value: 0
                                        },
                                        'common.partiallyHwAcceleratedConns': {
                                            value: 0
                                        },
                                        'common.peercertInvalid': {
                                            value: 0
                                        },
                                        'common.peercertNone': {
                                            value: 0
                                        },
                                        'common.peercertValid': {
                                            value: 0
                                        },
                                        'common.prematureDisconnects': {
                                            value: 0
                                        },
                                        'common.protocolUses.dtlsv1': {
                                            value: 0
                                        },
                                        'common.protocolUses.sslv2': {
                                            value: 0
                                        },
                                        'common.protocolUses.sslv3': {
                                            value: 0
                                        },
                                        'common.protocolUses.tlsv1': {
                                            value: 0
                                        },
                                        'common.protocolUses.tlsv1_1': {
                                            value: 0
                                        },
                                        'common.protocolUses.tlsv1_2': {
                                            value: 0
                                        },
                                        'common.protocolUses.tlsv1_3': {
                                            value: 0
                                        },
                                        'common.recordsIn': {
                                            value: 0
                                        },
                                        'common.recordsOut': {
                                            value: 0
                                        },
                                        'common.renegotiationsRejected': {
                                            value: 0
                                        },
                                        'common.secureHandshakes': {
                                            value: 0
                                        },
                                        'common.sessCacheCurEntries': {
                                            value: 0
                                        },
                                        'common.sessCacheHits': {
                                            value: 0
                                        },
                                        'common.sessCacheInvalidations': {
                                            value: 0
                                        },
                                        'common.sessCacheLookups': {
                                            value: 0
                                        },
                                        'common.sessCacheOverflows': {
                                            value: 0
                                        },
                                        'common.sessionMirroring.failure': {
                                            value: 0
                                        },
                                        'common.sessionMirroring.success': {
                                            value: 0
                                        },
                                        'common.sesstickUses.reuseFailed': {
                                            value: 0
                                        },
                                        'common.sesstickUses.reused': {
                                            value: 0
                                        },
                                        'common.sniRejects': {
                                            value: 0
                                        },
                                        'common.totCompatConns': {
                                            value: 0
                                        },
                                        'common.totNativeConns': {
                                            value: 0
                                        },
                                        'dynamicRecord.x1': {
                                            value: 0
                                        },
                                        'dynamicRecord.x10': {
                                            value: 0
                                        },
                                        'dynamicRecord.x11': {
                                            value: 0
                                        },
                                        'dynamicRecord.x12': {
                                            value: 0
                                        },
                                        'dynamicRecord.x13': {
                                            value: 0
                                        },
                                        'dynamicRecord.x14': {
                                            value: 0
                                        },
                                        'dynamicRecord.x15': {
                                            value: 0
                                        },
                                        'dynamicRecord.x16': {
                                            value: 0
                                        },
                                        'dynamicRecord.x2': {
                                            value: 0
                                        },
                                        'dynamicRecord.x3': {
                                            value: 0
                                        },
                                        'dynamicRecord.x4': {
                                            value: 0
                                        },
                                        'dynamicRecord.x5': {
                                            value: 0
                                        },
                                        'dynamicRecord.x6': {
                                            value: 0
                                        },
                                        'dynamicRecord.x7': {
                                            value: 0
                                        },
                                        'dynamicRecord.x8': {
                                            value: 0
                                        },
                                        'dynamicRecord.x9': {
                                            value: 0
                                        },
                                        tmName: {
                                            description: '/Common/clientssl'
                                        },
                                        total: {
                                            value: 0
                                        },
                                        typeId: {
                                            description: 'ltm profile client-ssl'
                                        },
                                        vsName: {
                                            description: 'N/A'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        }
    ]
};
