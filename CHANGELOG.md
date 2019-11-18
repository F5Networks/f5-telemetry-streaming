# Changelog
Changes to this project are documented in this file. More detail and links can be found in the Telemetry Streaming [Document Revision History](https://clouddocs.f5.com/products/extensions/f5-telemetry-streaming/latest/revision-history.html).

## 1.8.0
### Added
- [GitHub #22](https://github.com/F5Networks/f5-telemetry-streaming/pull/22): Reference to pools in virtual server data
- AUTOTOOl-905: Add machineId to System Poller output

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
