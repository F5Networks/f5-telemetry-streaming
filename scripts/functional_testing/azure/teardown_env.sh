#!/bin/bash
# Log in to Azure and execute a new deployment to remove all resources in the Resource Group

# Exit on any failed commands
set -e

source ./scripts/functional_testing/util.sh

# Required Environment Variables:
checkEnvVariable AZURE_SVCP_USERNAME
checkEnvVariable AZURE_LOG_KEY
checkEnvVariable AZURE_TENANT
checkEnvVariable AZURE_PIPELINE_RESOURCE_GROUP

az login --service-principal --username $AZURE_SVCP_USERNAME --password $AZURE_LOG_KEY --tenant $AZURE_TENANT

az group deployment create --mode complete --template-file ./scripts/functional_testing/azure/remove_all_rg_resources.json \
-g $AZURE_PIPELINE_RESOURCE_GROUP