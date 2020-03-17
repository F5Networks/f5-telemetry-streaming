#!/bin/bash
# Log in to Azure, deploy a BIG-IP and assign a User-Managed Identity to the VM

# Exit on any failed commands
set -e

source ./scripts/functional_testing/util.sh

# Required Environment Variables:
checkEnvVariable AZURE_VM_DOMAIN
checkEnvVariable AZURE_WORKSPACE_MI
checkEnvVariable AZURE_CLIENT_ID
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
--name "pipeline.${CI_PIPELINE_ID}" --template-uri $AZURE_TEMPLATE_URI \
--parameters adminPasswordOrKey=$CICD_AUTH_OS_PASSWORD dnsLabel=tsbigip imageName=Good25Mbps allowUsageAnalytics=No instanceName=$instanceName

# Assign the Managed Identity to the VM
az vm identity assign -g $AZURE_PIPELINE_RESOURCE_GROUP -n $instanceName --identities $AZURE_MANAGED_IDENTITY_ID

AZURE_VM_IP=$(az vm show -d -g $AZURE_PIPELINE_RESOURCE_GROUP -n $instanceName --query publicIps -o tsv)
AZURE_VM_HOSTNAME="$instanceName.$AZURE_VM_DOMAIN"
echo "Instance created: IP: $AZURE_VM_IP HOST: $AZURE_VM_HOSTNAME ... Verifying connection. Device info: "

auth=$(echo -n "admin:$CICD_AUTH_OS_PASSWORD" | base64)
curl "https://$AZURE_VM_IP:8443/mgmt/shared/identified-devices/config/device-info" -H "Authorization: Basic $auth" -k


printf "export AZURE_VM_IP=%s \n export AZURE_VM_HOSTNAME=%s \n" "$AZURE_VM_IP" "$AZURE_VM_HOSTNAME" > ./deploy_output/azure.sh
