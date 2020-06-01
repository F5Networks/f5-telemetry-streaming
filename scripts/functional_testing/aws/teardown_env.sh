#!/bin/bash

# Exit on any failed commands
set -e

function set_vars() {
    outputFile="env_metadata/aws.sh"
    source "${outputFile}"

    # contains deployment_info and state to teardown
    cp -a env_metadata/aws_byol/. .
}

function check_env_vars() {
    source ./scripts/functional_testing/util.sh
    # Required Environment Variables:
    checkEnvVariable AWS_ACCESS_KEY_ID
    checkEnvVariable AWS_SECRET_ACCESS_KEY
}

function teardown() {
    /deployment-tool/deploy.sh --deployment-plan aws_byol --action delete
}

function main() {
    set_vars
    check_env_vars
    teardown
}

main