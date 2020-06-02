#!/bin/bash

# Exit on any failed commands
set -e

function check_env_vars() {
    source ./scripts/functional_testing/util.sh

    # Required Environment Variables:
    checkEnvVariable AWS_IAM_ACCESS_KEY_ID
    checkEnvVariable AWS_IAM_ACCESS_KEY
    checkEnvVariable LICENSE_KEY
}

function set_vars() {
    outputFile="aws.sh"
    # remapping (renamed to avoid docs conflicts)
    printf "export AWS_ACCESS_KEY_ID=%s \n" "${AWS_IAM_ACCESS_KEY_ID}" > "${outputFile}"
    printf "export AWS_SECRET_ACCESS_KEY=%s \n" "${AWS_IAM_ACCESS_KEY}" >> "${outputFile}"
    printf "export F5_DISABLE_SSL_WARNINGS=true \n" "${AWS_IAM_ACCESS_KEY}" >> "${outputFile}"
    printf "export CLOUD_ENV_FILE=env_metadata/aws_byol/deployment_info.json \n" >> "${outputFile}"
    source "${outputFile}"
}

function deploy() {
    sed -i ':a;N;$!ba;s/,\n        "license.*}"\n        }//' /deployment-tool/plans/aws_byol/do_template.json
    /deployment-tool/deploy.sh --deployment-plan aws_byol --action create --output-folder env_metadata/aws_byol --deployment-vars "license_key:${LICENSE_KEY}"
}

function main() {
    check_env_vars
    set_vars
    deploy
    mv aws.sh env_metadata
    cat env_metadata/aws_byol/deployment_info.json
}

main