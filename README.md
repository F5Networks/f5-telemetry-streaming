# f5-telemetry-streaming

[![Slack Status](https://f5cloudsolutions.herokuapp.com/badge.svg)](https://f5cloudsolutions.herokuapp.com)
[![Releases](https://img.shields.io/github/release/f5networks/f5-telemetry-streaming.svg)](https://github.com/f5networks/f5-telemetry-streaming/releases)
[![Issues](https://img.shields.io/github/issues/f5networks/f5-telemetry-streaming.svg)](https://github.com/f5networks/f5-telemetry-streaming/issues)

## Introduction

Telemetry Streaming (TS) is an iControl LX Extension delivered as a TMOS-independent RPM file. Installing the TS Extension on BIG-IP enables you to declaratively aggregate, normalize, and forward statistics and events from the BIG-IP to a consumer application by POSTing a single TS JSON declaration to TS’s declarative REST API endpoint.

**IMPORTANT** Beginning with TS 1.7.0, the RPM and checksum files will no longer be located in the **/dist** directory in this repository.  These files can be found on the [Release page](https://github.com/F5Networks/f5-telemetry-streaming/releases), as **Assets**.  You can find historical files on GitHub by using the **Branch** drop-down, clicking the **Tags** tab, and then selecting the appropriate release.

## Documentation

For the documentation on Telemetry Streaming, including download, installation, and usage instructions, see the Telemetry Streaming User guide at [http://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/](http://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/).

### Example Telemetry Streaming declarations

The Telemetry Streaming documentation contains a variety of example declarations you can use directly or modify to suit your needs. See the [Consumers](https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/userguide/setting-up-consumer.html) and [Example Declarations](https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/userguide/declarations.html) pages.

## Filing Issues and Getting Help

If you come across a bug or other issue when using Telemetry Streaming, use [GitHub Issues](https://github.com/f5networks/f5-telemetry-streaming/issues) to submit an issue for our team.  You can also see the current known issues on that page, which are tagged with a purple Known Issue label.  

**Important**: Github Issues are consistently monitored by F5 staff, but should be considered as best effort only and you should not expect to receive the same level of response as provided by F5 Support. Please open a case as described below with F5 if this is a critical issue.

Because Telemetry Streaming has been created and fully tested by F5 Networks, it is fully supported by F5. This means you can get assistance if necessary from [F5 Technical Support](https://support.f5.com/csp/article/K25327565).

Be sure to see the [Support page](SUPPORT.md) in this repo for more details and supported versions of Telemetry Streaming.

## Copyright

Copyright 2014-2020 F5 Networks Inc.

### F5 Networks Contributor License Agreement

Before you start contributing to any project sponsored by F5 Networks, Inc. (F5) on GitHub, you will need to sign a Contributor License Agreement (CLA).  

If you are signing as an individual, we recommend that you talk to your employer (if applicable) before signing the CLA since some employment agreements may have restrictions on your contributions to other projects. Otherwise by submitting a CLA you represent that you are legally entitled to grant the licenses recited therein.  

If your employer has rights to intellectual property that you create, such as your contributions, you represent that you have received permission to make contributions on behalf of that employer, that your employer has waived such rights for your contributions, or that your employer has executed a separate CLA with F5.

If you are signing on behalf of a company, you represent that you are legally entitled to grant the license recited therein. You represent further that each employee of the entity that submits contributions is authorized to submit such contributions on behalf of the entity pursuant to the CLA.