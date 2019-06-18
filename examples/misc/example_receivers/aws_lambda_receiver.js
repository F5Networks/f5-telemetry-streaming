// Example: lambda depicting receiving an HTTP event and placing the body in AWS S3
// the lambda may be fronted by an API gateway using token auth via x-api-key

'use strict';

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-west-2' }); // set region

// create an S3 service object
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

exports.handler = (event, context, callback) => {
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? JSON.stringify({ error: err.message }) : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const bucket = 'f5telemetryanalyticsbucket'; // example bucket name
    const date = new Date().toISOString();
    const file = `${date}.log`;

    const options = {
        Bucket: bucket,
        Key: file,
        Body: event.body,
        ContentType: 'application/json'
    };
    s3.putObject(options).promise()
        .then(() => {
            done(null, { message: 'success' });
        }).catch((err) => {
            done(err);
        });
};
