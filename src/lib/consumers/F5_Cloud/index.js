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

const grpc = require('@grpc/grpc-js');
const google = require('google-auth-library');
const protoLoader = require('@grpc/proto-loader');

const constants = require('../../constants');
const util = require('../../utils/misc');

// required for gRPC
require('../shared/http2patch');

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
    const data = context.event.type === constants.EVENT_TYPES.RAW_EVENT ? context.event.data.data : context.event.data;
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

            let configSchema = `${context.event.type}-event`;
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
                && Object.keys(data).every((key) => key.indexOf(':') !== -1
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
                context.logger.verbose(`custom name : ${configSchema}`);
            }

            const ingestionRequest = {
                account_id: `urn:f5_cs::account:${context.config.f5csTenantId}`,
                source_id: context.config.f5csSensorId,
                compression_type: 0,
                timestamp_usec: Date.now() * 1000,
                signature_type: 0,
                serialization_type: 1,
                payload: Buffer.from(context.event.type === constants.EVENT_TYPES.RAW_EVENT ? data : JSON.stringify(data), 'utf8'),
                payload_schema: `urn:${context.config.payloadSchemaNid}:big-ip:event-schema:${configSchema.toLowerCase()}:v${context.config.eventSchemaVersion}`
            };

            context.logger.verbose(`account_id : ${ingestionRequest.account_id}`);
            context.logger.verbose(`source_id : ${ingestionRequest.source_id}`);
            context.logger.verbose(`payload_schema : ${ingestionRequest.payload_schema}`);
            context.logger.verbose(`data : ${JSON.stringify(data)}`);

            return new Promise((resolve) => {
                client.post(ingestionRequest, metadata, (err, response) => {
                    if (err) {
                        context.logger.exception(`failure, error: ${err}`, err);
                    } else if (response) {
                        context.logger.verbose(`success, response: ${JSON.stringify(response)}`);
                    }
                    resolve(client);
                });
            });
        })
        .catch((err) => {
            context.logger.exception(err);
        });
};
