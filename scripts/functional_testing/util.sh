#!/bin/sh

# Exit on any failed commands
set -e

# Check if an environment variable is set. If not set, log and exit.
function checkEnvVariable {
    if [ -z "${!1}" ]
    then
        echo "EnvVar '$1' should be set."
        exit 1
    fi
}
