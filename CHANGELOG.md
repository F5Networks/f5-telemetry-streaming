# Changelog
Changes to this project are documented in this file. More detail and links can be found in the Telemetry Streaming [Document Revision History](https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/revision-history.html).

## 1.20.0
### Added
- AUTOTOOL-2311: [GitHub #119](https://github.com/F5Networks/f5-telemetry-streaming/issues/119): Added Capacity_Float to system.diskStorage
- AUTOTOOL-2330: [GitHub #74](https://github.com/F5Networks/f5-telemetry-streaming/issues/74): Added system.configSyncSucceeded to default output and f5_system_configSyncSucceeded to Prometheus output
### Fixed
### Changed
- AUTOTOOL-2297: Update npm packages (aws-sdk from v2.854.0 to v2.885.0)
### Removed

## 1.19.0
### Added
- AUTOTOOL-2280: [GitHub #79](https://github.com/F5Networks/f5-telemetry-streaming/issues/79): Expose totNativeConns and totCompatConns on SSL profile stats
- AUTOTOOL-2160: Added monitor checks for memory thresholds, which prevents restnoded from crashing on reaching memory limits (runs by default)
- AUTOTOOL-1915: Added new Event Listener endpoint (/eventListener/$eventListener and /namespace/$namespace/eventListener/$eventListener) to send a debug message to an Event Listener
- AUTOTOOL-2266: Added ability to configure "compressionType" for Splunk consumer
- AUTOTOOL-2314: [GitHub #120](https://github.com/F5Networks/f5-telemetry-streaming/issues/120) Added 'swap' metric to 'system' group (System Poller output)
- AUTOTOOL-2115: Namespaces support for iHealth Poller
### Fixed
- AUTOTOOL-494: iHealth Poller creates corrupted Qkview files
- AUTOTOOL-2164: [GitHub #108](https://github.com/F5Networks/f5-telemetry-streaming/issues/108) Fixed Route Domain ID handling for Virtual Server and Pool stats
- [GitHub #109](https://github.com/F5Networks/f5-telemetry-streaming/issues/109): Splunk debug output does not log HTTP Response payload
- AUTOTOOL-2304: Update example output for maxConns, pktsIn, pktsOut, and totConns
- AUTOTOOL-494: iHealth Poller creates corrupted Qkview files
- AUTOTOOL-2310: Tracer unable to access destination directory
- AUTOTOOL-2368: Tracer(s) from other namespaces should not stop when namespace-only declaration posted
- AUTOTOOL-2376: iHealth Poller downloadFolder should not be required on local device
### Changed
- AUTOTOOL-2091: Trace full payload sent to StatsD Consumer
- AUTOTOOL-2250: System Poller recurring scheduling changed so that System Poller executions do not overlap
- AUTOTOOL-2213: Update npm packages (applicationinsights from v1.8.9 to v.1.8.10, aws-sdk from v2.830.0 to v2.854.0, eventemitter2 from v6.4.3 to v6.4.4, google-auth-library from v6.1.4 to v.6.1.6, lodash from v.4.17.20 to v4.17.21)
- AUTOTOOL-1509: Remove excessive data formatting from tracer
### Removed

## 1.18.0
### Added
- AUTOTOOL-1987: Added new Namespace declare endpoint (/namespace/$namespace/declare) which supports POST and GET
- AUTOTOOL-2148 [GitHub #104](https://github.com/F5Networks/f5-telemetry-streaming/issues/104): Add support for TLS Client Authentication to Generic HTTP Consumer
### Fixed
- AUTOTOOL-1710: Fix Event Listener startup errors that might cause restnoded to crash
- AUTOTOOL-2227: Splunk multiEvent format should ignore 'References'
### Changed
- AUTOTOOL-2111: Update npm packages (applicationinsights from 1.8.7 to 1.8.9, aws-sdk from 2.775.0 to 2.830.0, google-auth-library from 6.1.1 to 6.1.4, mustache from 4.0.0 to 4.1.0)
- AUTOTOOL-2212: Add AWS specific certificates to AWS Consumers
### Removed

## 1.17.0
### Added
- AUTOTOOL-2027 [GitHub #91](https://github.com/F5Networks/f5-telemetry-streaming/issues/91): Add custom timestamp for APM Events
- AUTOTOOL-2043: [GitHub #92](https://github.com/F5Networks/f5-telemetry-streaming/issues/92) Add support for Generic_HTTP proxy options
- AUTOTOOL-1834: Updated config diff handling for namespace endpoint support
- AUTOTOOL-1847: Added 'multiMetric' format for Splunk consumer (v8+ only) (experimental feature)
- AUTOTOOL-1988: Added new Namespace SystemPoller endpoint (/namespace/$namespace/systempoller/$systemOrPoller/$poller?)
- AUTOTOOL-2056 [GitHub #93](https://github.com/F5Networks/f5-telemetry-streaming/issues/93): Add additional traffic stats for virtual servers and pools
- AUTOTOOL-1984 [GitHub #85](https://github.com/F5Networks/f5-telemetry-streaming/issues/85): Add support for Splunk proxy options
- AUTOTOOL-2134: New consumer: F5_Cloud
- AUTOTOOL-2028 [GitHub #90](https://github.com/F5Networks/f5-telemetry-streaming/issues/90): Add support for Kafka TLS client authentication
### Fixed
- AUTOTOOL-2089: Fix error where unavailable Custom Endpoint would return HTTP 500
### Changed
- AUTOTOOL-1832: telemetry/declare returns HTTP 503 on attempt to post declaration while previous one is still in processing
- AUTOTOOL-1983: No major updates for npm packages (package-lock.json updates only).
- AUTOTOOL-1914: Store up to 10 items in trace file
- AUTOTOOL-2086: Add deprecation notice for Splunk Legacy format 
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
