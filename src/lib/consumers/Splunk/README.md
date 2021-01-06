# F5 Telemetry consumer plug-in - Splunk (optional: + F5 Networks Dashboard Add-on)

## Additional config params

- **format** (string) - available values: "default" - default format, "legacy" - analytics iApp's format (Note: 'legacy' format is deprecated as of TS 1.17), "multiMetric" - Splunk's multiple metric JSON format
- **gzip** (boolean) - true/false to use gzip for data to send or not, by default **true**.
- **dumpUndefinedValues** (boolean) - true/false to dump 'undefined' values to *tracer*. Requires *tracer* to see results.

## Output properties

- **source** - f5.telemetry
- **sourceType** - f5:telemetry:json