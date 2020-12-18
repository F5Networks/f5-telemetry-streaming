/*
 * Copyright 2018. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */

'use strict';

const google = require('google-auth-library');
const protoLoader = require('@grpc/proto-loader');
const grpc = require('grpc-js-0.2-modified');
const util = require('../../utils/misc');
const constants = require('../../constants');

const auth = google.auth;
const PROTO_PATH = `${__dirname}/deos.proto`;
const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    }
);

const deosProto = grpc.loadPackageDefinition(packageDefinition).deos.ingestion.v1alpa1;

/**
 * See {@link ../README.md#context} for documentation
 */
module.exports = function (context) {
    const data = context.event.data;
    const targetAudience = context.config.targetAudience;
    const serviceAccount = context.config.serviceAccount;
    // convert service account from camelCase
    Object.keys(serviceAccount).forEach((key) => {
        const newKey = util.camelCaseToUnderscoreCase(key);
        if (key !== newKey) {
            serviceAccount[newKey] = serviceAccount[key];
            delete serviceAccount[key];
        }
    });
    const clientAuth = auth.fromJSON(serviceAccount);
    // add the oauth target audience field to JWT client
    clientAuth.additionalClaims = { target_audience: `https://${targetAudience}` };
    // generate a JWT token_id
    return clientAuth.authorize()
        .then(() => {
            const metadata = new grpc.Metadata();
            metadata.add('Authorization', `Bearer ${clientAuth.gtoken.rawToken.id_token}`);
            const url = `${targetAudience}:${context.config.port}`;
            let client;
            if (!context.config.useSSL) {
                client = new deosProto.Ingestion(url, grpc.credentials.createInsecure());
            } else {
                const sslCreds = grpc.credentials.createSsl();
                const combinedCreds = grpc.credentials.combineChannelCredentials(sslCreds);
                client = new deosProto.Ingestion(url, combinedCreds);
            }

            let configSchema;
            /**
             * adding the ability to create custom payload_schema using configuration
             * for example (notice "custom"):
             *    {
             *      "AsmIncidents_Endpoint": {
             *          "class": "Telemetry_Endpoints",
             *          "items": {
             *              "custom:asmincidents": {
             *                  "path": "/mgmt/tm/asm/events/incidents?$select=virtualServerName"
             *              },
             *              "custom:asmsystem": {
             *                  "path": "/mgmt/tm/sys/global-settings?$select=hostname"
             *              }
             *          }
             *      }
             *    }
             * is this case payload_schema will be:
             *      `urn:f5_magneto:big-ip:event-schema:custom:v1`
             */
            if (context.event.isCustom
                && context.event.type === constants.EVENT_TYPES.SYSTEM_POLLER
                && Object.keys(data).every(key => key.indexOf(':') !== -1
                    || key === 'telemetryEventCategory'
                    || key === 'telemetryServiceInfo')) {
                Object.keys(data).forEach((key) => {
                    if (key.includes(':')) {
                        const labels = key.split(':', 2);
                        const newLabel = labels[0];
                        const originalLabel = labels[1];
                        data[originalLabel] = data[key];
                        delete data[key];
                        configSchema = newLabel;
                    }
                });
                context.logger.debug(`custom name : ${configSchema}`);
            } else {
                configSchema = `${context.event.type}-event`;
            }

            const ingestionRequest = {
                account_id: `urn:f5_cs::account:${context.config.f5csTenantId}`,
                source_id: serviceAccount.private_key_id,
                compression_type: 0,
                timestamp_usec: Date.now() * 1000,
                signature_type: 0,
                serialization_type: 1,
                payload: Buffer.from(JSON.stringify(data), 'utf8'),
                payload_schema: `urn:f5_magneto:big-ip:event-schema:${configSchema.toLowerCase()}:v1`
            };

            context.logger.debug(`account_id : urn:f5_cs::account:${context.config.f5csTenantId}`);
            context.logger.debug(`payload_schema : urn:f5_magneto:big-ip:event-schema:${configSchema.toLowerCase()}:v1`);
            context.logger.debug(`data : ${JSON.stringify(data)}`);

            return new Promise((resolve) => {
                client.post(ingestionRequest, metadata, (err, response) => {
                    if (err) {
                        context.logger.exception(`failure, error: ${err}`, err);
                    } else if (response) {
                        context.logger.debug(`success, response: ${JSON.stringify(response)}`);
                    }
                    resolve(client);
                });
            });
        })
        .catch((err) => {
            context.logger.exception(err);
        });
};
