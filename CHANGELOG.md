# Changelog
Changes to this project are documented in this file. More detail and links can be found in the Telemetry Streaming [Document Revision History](https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/revision-history.html).

## 1.11.0
### Added
- AUTOTOOL-1187: Enable use of Managed Identities for Azure Log Analytics
- AUTOTOOL-1186: New consumer Azure Application Insights
- AUTOTOOL-1218: Enable use of Managed Identities for Azure Application Insights
- AUTOTOOL-768: Enable support of AzureGov for Azure consumers and optional region property
### Fixed
- AUTOTOOL-1334: Fix [Regular Expression Denial of Service vulnerability](https://www.npmjs.com/advisories/1488) and improve start up time on node v4.x and v6.x
- AUTOTOOL-1150: [GitHub #30](https://github.com/F5Networks/f5-telemetry-streaming/issues/30) Fix error when Splunk consumer (configured with 'legacy' format) tries to forward event from Event Listener
- AUTOTOOL-491: [GitHub #17](https://github.com/F5Networks/f5-telemetry-streaming/issues/17) Fix crash in Kafka consumer on attempt to close idle connections to brokers
### Changed
- AUTOTOOL-1376: Rename Google StackDriver consumer to 'Google Cloud Monitoring'
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
