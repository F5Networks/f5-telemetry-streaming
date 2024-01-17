#!/bin/bash

set -e

dst=node_modules/@opentelemetry/opentelemetry-proto
rm -rf "${dst}"
mkdir -p "${dst}"

git clone \
    -c advice.detachedHead=false \
    -q \
    --depth=1 \
    --branch=v1.0.0 \
    https://github.com/open-telemetry/opentelemetry-proto.git "${dst}"

rm -rf "${dst}/.git"
