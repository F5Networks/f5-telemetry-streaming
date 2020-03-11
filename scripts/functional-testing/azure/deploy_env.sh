#!/bin/bash

# Log in to Azure, deploy a BIG-IP and assign a User-Managed Identity to the VM

# Exit on any failed commands
set -e

source "$(dirname $0)/../util.sh"

# Required Environment Variables:
checkEnvVariable AZURE_SVCP_USERNAME
checkEnvVariable AZURE_LOG_KEY
checkEnvVariable AZURE_TENANT
checkEnvVariable AZURE_PIPELINE_RESOURCE_GROUP
checkEnvVariable AZURE_TEMPLATE_URI
checkEnvVariable CICD_AUTH_OS_PASSWORD
checkEnvVariable AZURE_MANAGED_IDENTITY_ID

instanceName=tsbigipvm01

# Login using Service Principal
az login --service-principal --username $AZURE_SVCP_USERNAME --password $AZURE_LOG_KEY --tenant $AZURE_TENANT

# Deploy resources using ARM template
az group deployment create -g $AZURE_PIPELINE_RESOURCE_GROUP \
--name pipeline.${CI_PIPELINE_ID} --template-uri $AZURE_TEMPLATE_URI \
--parameters adminPasswordOrKey=$CICD_AUTH_OS_PASSWORD dnsLabel=tsbigip imageName=Good25Mbps allowUsageAnalytics=No instanceName=$instanceName

# Assign the Managed Identity to the VM
az vm identity assign -g $AZURE_PIPELINE_RESOURCE_GROUP -n $instanceName --identities $AZURE_MANAGED_IDENTITY_ID