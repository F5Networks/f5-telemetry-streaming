# Changelog
Changes to this project are documented in this file. More detail and links can be found in the Telemetry Streaming [Document Revision History](https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/revision-history.html).

## 1.17.0
### Added
- AUTOTOOL-1988: Added new Namespace SystemPoller endpoint (/namespace/$namespace/systempoller/$systemOrPoller/$poller?)
- AUTOTOOL-2056 [GitHub #93](https://github.com/F5Networks/f5-telemetry-streaming/issues/93): Add additional traffic stats for virtual servers and pools
### Fixed
### Changed
### Removed

## 1.16.0
### Added
- AUTOTOOL-1829: Add support for the Telemetry_Namespace class in declarations posted to the /declare endpoint
- AUTOTOOL-1830: Added new Namespace PullConsumer endpoint (/namespace/$namespace/pullconsumer/$consumer)
### Fixed
- AUTOTOOL-1967 [GitHub #86](https://github.com/F5Networks/f5-telemetry-streaming/issues/86): Fix bug when TS incorrectly processing iRule stats with multiple events
### Changed
- AUTOTOOL-1874: Update npm packages (ajv from v6.12.4 to v6.12.6, applicationinsights from v1.8.6 to v1.8.7, aws-sdk from v2.749.0 to 2.775.0)
- AUTOTOOL-1961 [GitHub #84](https://github.com/F5Networks/f5-telemetry-streaming/issues/84): Include _ResourceId if available for Azure Log Analytics consumer. Also, metadata calls are now only happening upon consumer(s) load.
- AUTOTOOL-1833 and AUTOTOOL-1908: Update declaration config parsing and use new normalized configs for components
- AUTOTOOL-1831: Update forwarder to use destinationIds for consumer lookup
### Removed

## 1.15.0
### Added
### Fixed
- AUTOTOOL-1790: Fixed syslog event hostname parsing for VCMP hosts
- AUTOTOOL-1768: Resolve memory leak in ElasticSearch consumer, by replacing 'elasticsearch' library with 'request' library
### Changed
- AUTOTOOL-1747: Update npm packages (ajv from v6.12.3 to v6.12.4, applicationinsights from v1.8.5 to v1.8.6, aws-sdk from v2.728.0 to 2.749.0, lodash from v4.7.19 to 4.7.20)
- AUTOTOOL-1894: Update default hostname for StatsD consumer
### Removed

## 1.14.0
### Added
- AUTOTOOL-1648: Added ability to specify fallback hosts for Generic HTTP consumer (experimental feature)
- AUTOTOOL-1627: Add support for AWS CloudWatch Metrics
- AUTOTOOL-1679: Added 'cipherUses' stats for Client and Server SSL profiles
### Fixed
- AUTOTOOL-810: Fixed Event Listener parsing when received multiple events
### Changed
- AUTOTOOL-1680: Update npm packages (ajv from v6.12.2 to v6.12.3, applicationinsights from v1.8.0 to v1.8.5, aws-sdk from v.2.704.0 to 2.728.0, statsd-client from v0.4.4 to v0.4.5)
### Removed


## 1.13.0
### Added
- AUTOTOOL-1640: Add statusReason and monitorStatus fields to System Poller output for BIG-IQ Analytics
### Fixed
- AUTOTOOL-1192: Fix inconsistency in GSLB output: return empty object instead of 'undefined'
- AUTOTOOL-1639: Fix Azure consumer memory leak when calling metadata service on an instance where it is unavailable
- AUTOTOOL-1503: [GitHub #39](https://github.com/F5Networks/f5-telemetry-streaming/issues/39): Update Azure Log Analytics dashboard example
- AUTOTOOL-1695: Fix lodash [Prototype Pollution vulnerability](https://www.npmjs.com/advisories/1523)
- AUTOTOOL-1694: Fix Splunk legacy format missing poolMemberStat data
### Changed
- AUTOTOOL-1547: aws-sdk updated to 2.704.0
- AUTOTOOL-1616: Increased code coverage: Event Listener unit tests
### Removed

## 1.12.0
### Added
- AUTOTOOL-1169: [GitHub #9](https://github.com/F5Networks/f5-telemetry-streaming/issues/9): Add new Prometheus Pull Consumer
- AUTOTOOL-1449: Add information about inlined pollers (System Poller and iHealthPoller) to TEEM report
- AUTOTOOL-1340: [GitHub #41](https://github.com/F5Networks/f5-telemetry-streaming/issues/41): Add support for IAM Roles with AWS_S3 Consumer
- AUTOTOOL-1538: Add TCP support to StatsD consumer
### Fixed
- AUTOTOOL-1506: Added a timeout to Azure metadata service HTTP requests
- AUTOTOOL-557: [GitHub #18](https://github.com/F5Networks/f5-telemetry-streaming/issues/18) Fix renameKeys for networkInterfaces with multiple digits
### Changed
- AUTOTOOL-1432: Update npm packages (aws-sdk from v2.659 to v2.664 and default mocha from v5.2.0 to v7.1.2)
- Updated @f5devcentral/f5-teem package dependency to 1.4.6
### Removed

## 1.11.0
### Added
- AUTOTOOL-1448: Introduce new Pull Consumer class, Pull Consumer API, and 'default' Pull Consumer
- AUTOTOOL-1187: Enable use of Managed Identities for Azure Log Analytics
- AUTOTOOL-1186: New consumer Azure Application Insights
- AUTOTOOL-1218: Enable use of Managed Identities for Azure Application Insights
- AUTOTOOL-768: Enable support of AzureGov for Azure consumers and optional region property
### Fixed
- AUTOTOOL-1334: Fix [Regular Expression Denial of Service vulnerability](https://www.npmjs.com/advisories/1488) and improve start up time on node v4.x and v6.x
- AUTOTOOL-1150: [GitHub #30](https://github.com/F5Networks/f5-telemetry-streaming/issues/30) Fix error when Splunk consumer (configured with 'legacy' format) tries to forward event from Event Listener
- AUTOTOOL-491: [GitHub #17](https://github.com/F5Networks/f5-telemetry-streaming/issues/17) Fix crash in Kafka consumer on attempt to close idle connections to brokers
- AUTOTOOL-1265: Reduce data copying in System Stats
- AUTOTOOL-1266: Reduce data copying in Event Listener
### Changed
- AUTOTOOL-1376: Rename Google StackDriver consumer to 'Google Cloud Monitoring'
- AUTOTOOL-1015: Update f5-teem to 1.4.2 for new reportRecord API
### Removed

## 1.10.0
### Added
- AUTOTOOL-1111: Enable configurable polling with Telemetry_Endpoints (BIG-IP paths) and multiple system poller support
- AUTOTOOL-1148: Allow 'OR' logic by adding ifAnyMatch functionality.
- AUTOTOOL-853: Support F5 systems (ex: Viprion) that have multiple hosts
### Fixed
- AUTOTOOL-1051: Event Listener unable to classify AFM DoS event
- AUTOTOOL-1037: Splunk legacy tmstats - include last_cycle_count
- AUTOTOOL-1019: Splunk legacy tmstats - add tenant and application data
- AUTOTOOL-1128: Declarations with large secrets may timeout
- AUTOTOOL-1154: Passphrases should be obfuscated in consumer trace files
- AUTOTOOL-1147: Add 'profiles' data (profiles attached to Virtual Server) to 'virtualServers'
- AUTOTOOL-896: [GitHub #26](https://github.com/F5Networks/f5-telemetry-streaming/pull/26): Use baseMac instead of hostname to fetch CM device
- AUTOTOOL-1160: cipherText validation when protected by SecureVault
- AUTOTOOL-1239: Caching data about the host device to speed up declaration processing
### Changed
- AUTOTOOL-1062: Update NPM packages
### Removed

## 1.9.0
### Added
- AUTOTOOL-725 and AUTOTOOL-755: Add support for GSLB WideIP and Pools Config and Stats
### Fixed
- AUTOTOOL-1061: Basic auth does not work with ElasticSearch consumer
- AUTOTOOL-1017: Some Splunk legacy tmstats datamodels have period in property name instead of underscore
### Changed
- AUTOTOOL-1068: The username and passphrase settings for AWS CloudWatch consumers are now optional
### Removed

## 1.8.0
### Added
- AUTOTOOL-487: Add support for filtering (System Poller and Event Listener)
- [GitHub #22](https://github.com/F5Networks/f5-telemetry-streaming/pull/22): Reference to pools in virtual server data
- AUTOTOOl-905: Add machineId to System Poller output
- AUTOTOOL-817: Add Google StackDriver as a consumer

### Fixed
### Changed
- AUTOTOOL-784: Improved error handling to preserve stack trace.  Problem was discovered on a Viprion.  Opened AUTOTOOL-853 to support Viprion in future.
### Removed

## 1.7.0
### Added
- AUTOTOOL-690: Collect all supported tmstat tables for Splunk Legacy
- AUTOTOOL-748: Add Telemetry Streaming analytics reporting to F5
- AUTOTOOL-763: Added maxSockets for HTTP and HTTPS connections, defaults to 5
- AUTOTOOL-724: Add example using Generic HTTP Consumer to publish data to Fluentd
### Fixed
- Splunk Tmstat table data is being overwritten when forwarded to Splunk
- Fixed broken promise chain when loading config file
### Changed
### Removed

## 1.6.0
### Added
- Add support for new tagging API
- Collect tmstat's cpu_info_stat for Splunk Legacy
### Fixed
### Changed
### Removed

## 1.5.0
### Added
- Collect mask and ipProtocol for virtual servers
- Collect device groups, ASM state, last ASM change, APM state, AFM state, LTM config time, and GTM config time
- Collect stats for iRules
- Support for CGNAT events logs
- Added "allowSelfSignedCert" to the documentation examples (closing https://github.com/F5Networks/f5-telemetry-streaming/issues/14), and added an associated troubleshooting entry in the documentation on clouddocs.f5.com
### Fixed
- Elastic Search Unable to parse and index some messages with previously used keys
- Elastic Search event data objects containing consecutive periods will be replaced with a single period.
- Splunk Host property is null for TS events
### Changed
### Removed
