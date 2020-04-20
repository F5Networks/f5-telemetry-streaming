#!/bin/bash
# Log in to Azure and execute a new deployment to remove all resources in the Resource Group

# Exit on any failed commands
set -e

cloudType=$1

source ./scripts/functional_testing/util.sh

checkEnvVariable AZURE_PIPELINE_RESOURCE_GROUP

if [[ "$cloudType" == "gov" ]]; then
    checkEnvVariable AZUREGOV_SVCP_USERNAME
    checkEnvVariable AZUREGOV_LOG_KEY
    checkEnvVariable AZUREGOV_TENANT

    az cloud set --name AzureUSGovernment
    az login --service-principal --username $AZUREGOV_SVCP_USERNAME --password $AZUREGOV_LOG_KEY --tenant $AZUREGOV_TENANT
else
    checkEnvVariable AZURE_SVCP_USERNAME
    checkEnvVariable AZURE_LOG_KEY
    checkEnvVariable AZURE_TENANT

    az login --service-principal --username $AZURE_SVCP_USERNAME --password $AZURE_LOG_KEY --tenant $AZURE_TENANT
fi


az group deployment create --mode complete --template-file ./scripts/functional_testing/azure/remove_all_rg_resources.json \
-g $AZURE_PIPELINE_RESOURCE_GROUP