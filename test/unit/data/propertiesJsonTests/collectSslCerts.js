/*
 * Copyright 2022. F5 Networks, Inc. See End User License Agreement ('EULA') for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
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
    name: 'SSL certificates stats',
    tests: [
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set ssl certs to empty object if not configured (with items property)',
            statsToCollect: ['sslCerts'],
            contextToCollect: [],
            expectedData: {
                sslCerts: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/sys\/file\/ssl-cert/,
                    response: {
                        kind: 'tm:sys:file:ssl-cert:ssl-certcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/file/ssl-cert?ver=14.1.0',
                        items: []
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should set ssl certs to empty object if not configured (without items property)',
            statsToCollect: ['sslCerts'],
            contextToCollect: [],
            expectedData: {
                sslCerts: {}
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/sys\/file\/ssl-cert/,
                    response: {
                        kind: 'tm:sys:file:ssl-cert:ssl-certcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/file/ssl-cert?ver=14.1.0'
                    }
                }
            ]
        },
        /**
         * TEST DATA STARTS HERE
         * */
        {
            name: 'should collect ssl certs stats',
            statsToCollect: ['sslCerts'],
            contextToCollect: [],
            expectedData: {
                sslCerts: {
                    'ca-bundle.crt': {
                        expirationDate: 1893455999,
                        expirationString: '2029-12-31T23:59:59.000Z',
                        issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                        name: 'ca-bundle.crt'
                    }
                }
            },
            endpoints: [
                {
                    endpoint: /\/mgmt\/tm\/sys\/file\/ssl-cert/,
                    response: {
                        kind: 'tm:sys:file:ssl-cert:ssl-certcollectionstate',
                        selfLink: 'https://localhost/mgmt/tm/sys/file/ssl-cert?ver=14.1.0',
                        items: [
                            {
                                kind: 'tm:sys:file:ssl-cert:ssl-certstate',
                                name: 'ca-bundle.crt',
                                partition: 'Common',
                                fullPath: '/Common/ca-bundle.crt',
                                generation: 1,
                                selfLink: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~ca-bundle.crt?ver=14.1.0',
                                certificateKeyCurveName: 'none',
                                certificateKeySize: 2048,
                                checksum: 'SHA1:5368116:a98ae01563290479a33b307ae763ff32d157ac9f',
                                createTime: '2020-01-23T01:10:20Z',
                                createdBy: 'root',
                                expirationDate: 1893455999,
                                expirationString: 'Dec 31 23:59:59 2029 GMT',
                                fingerprint: 'SHA256/B5:BD:2C:B7:9C:BD:19:07:29:8D:6B:DF:48:42:E5:16:D8:C7:8F:A6:FC:96:D2:5F:71:AF:81:4E:16:CC:24:5E',
                                isBundle: 'true',
                                issuer: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                                keyType: 'rsa-public',
                                lastUpdateTime: '2020-01-23T01:10:20Z',
                                mode: 33261,
                                revision: 1,
                                size: 5368116,
                                subject: 'CN=Starfield Services Root Certificate Authority,OU=http://certificates.starfieldtech.com/repository/,O=Starfield Technologies, Inc.,L=Scottsdale,ST=Arizona,C=US',
                                systemPath: '/config/ssl/ssl.crt/ca-bundle.crt',
                                updatedBy: 'root',
                                version: 3,
                                bundleCertificatesReference: {
                                    link: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~ca-bundle.crt/bundle-certificates?ver=14.1.0',
                                    isSubcollection: true
                                },
                                certValidatorsReference: {
                                    link: 'https://localhost/mgmt/tm/sys/file/ssl-cert/~Common~ca-bundle.crt/cert-validators?ver=14.1.0',
                                    isSubcollection: true
                                }
                            }
                        ]
                    }
                }
            ]
        }
    ]
};
