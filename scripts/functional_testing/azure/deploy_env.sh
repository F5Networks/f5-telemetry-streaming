#!/bin/bash
# Log in to Azure, deploy a BIG-IP and assign a User-Managed Identity to the VM

# Exit on any failed commands
set -e

cloudType=$1
instanceName="tsbigip$CI_JOB_ID"

function check_env_vars() {
    source ./scripts/functional_testing/util.sh

    # Required Environment Variables:
    checkEnvVariable AZURE_PIPELINE_RESOURCE_GROUP
    checkEnvVariable AZURE_TEMPLATE_URI
    checkEnvVariable AZURE_VM_PWD

    if [[ "$cloudType" == "gov" ]]; then
        checkEnvVariable AZUREGOV_VM_DOMAIN
        checkEnvVariable AZUREGOV_WORKSPACE_MI
        checkEnvVariable AZUREGOV_CLIENT_ID
        checkEnvVariable AZUREGOV_SVCP_USERNAME
        checkEnvVariable AZUREGOV_LOG_KEY
        checkEnvVariable AZUREGOV_TENANT
        checkEnvVariable AZUREGOV_MANAGED_IDENTITY_ID
        checkEnvVariable AZUREGOV_APPINS_APP_ID
        checkEnvVariable AZUREGOV_APPINS_API_KEY
    else
        checkEnvVariable AZURE_VM_DOMAIN
        checkEnvVariable AZURE_WORKSPACE_MI
        checkEnvVariable AZURE_CLIENT_ID
        checkEnvVariable AZURE_SVCP_USERNAME
        checkEnvVariable AZURE_LOG_KEY
        checkEnvVariable AZURE_TENANT
        checkEnvVariable AZURE_MANAGED_IDENTITY_ID
        checkEnvVariable AZURE_APPINS_APP_ID
        checkEnvVariable AZURE_APPINS_API_KEY
    fi
}

function login() {
    if [[ "$cloudType" == "gov" ]]; then
        username=$AZUREGOV_SVCP_USERNAME
        password=$AZUREGOV_LOG_KEY
        tenant=$AZUREGOV_TENANT
        echo "Setting cloud to Azure Gov"
        az cloud set --name AzureUSGovernment
    else
        username=$AZURE_SVCP_USERNAME
        password=$AZURE_LOG_KEY
        tenant=$AZURE_TENANT
    fi

    echo "Logging in using service principal"
    az login --service-principal --username $username --password $password --tenant $tenant
}

function deploy() {
    echo "Creating deployment from template"
    az group deployment create -g $AZURE_PIPELINE_RESOURCE_GROUP \
    --name "pipeline.${CI_PIPELINE_ID}" --template-uri $AZURE_TEMPLATE_URI \
    --parameters adminPasswordOrKey=$AZURE_VM_PWD dnsLabel=tsbigip imageName=Good25Mbps allowUsageAnalytics=No instanceName=$instanceName
}

function assign_mi() {
    if [[ "$cloudType" == "gov" ]]; then
        miResourceId=$AZUREGOV_MANAGED_IDENTITY_ID
    else
        miResourceId=$AZURE_MANAGED_IDENTITY_ID
    fi
    echo "Assigning managed identity to VM"
    az vm identity assign -g $AZURE_PIPELINE_RESOURCE_GROUP -n $instanceName --identities $miResourceId
}

function output_vm_info() {
    vmIp=$(az vm show -d -g $AZURE_PIPELINE_RESOURCE_GROUP -n $instanceName --query publicIps -o tsv)
    if [[ "$cloudType" == "gov" ]]; then
        vmHostname="$instanceName.$AZUREGOV_VM_DOMAIN"
    else
        vmHostname="$instanceName.$AZURE_VM_DOMAIN"
    fi
    echo "Instance created: IP: $vmIp HOST: $vmHostname ... Verifying connection. Device info: "

    auth=$(echo -n "admin:$AZURE_VM_PWD" | base64)
    curl "https://$vmIp:8443/mgmt/shared/identified-devices/config/device-info" -H "Authorization: Basic $auth" -k -i

    if [[ "$cloudType" == "gov" ]]; then
        printf "export AZURE_VM_IP=%s \n export AZURE_VM_HOSTNAME=%s \n" "$vmIp" "$vmHostname" > ./deploy_output_gov/azure_gov.sh
        printf "export AZURE_SVCP_USERNAME=%s \n export AZURE_CLIENT_ID=%s \n" "$AZUREGOV_SVCP_USERNAME" "$AZUREGOV_CLIENT_ID" >> ./deploy_output_gov/azure_gov.sh
        printf "export AZURE_WORKSPACE_MI=%s \n export AZURE_LOG_KEY=%s \n" "$AZUREGOV_WORKSPACE_MI" "$AZUREGOV_LOG_KEY" >> ./deploy_output_gov/azure_gov.sh
        printf "export AZURE_TENANT=%s \n export AZURE_MANAGED_IDENTITY_ID=%s \n" "$AZUREGOV_TENANT" "$AZUREGOV_MANAGED_IDENTITY_ID" >> ./deploy_output_gov/azure_gov.sh
        printf "export AZURE_APPINS_APP_ID=%s \n export AZURE_APPINS_API_KEY=%s \n" "$AZUREGOV_APPINS_APP_ID" "$AZUREGOV_APPINS_API_KEY" >> ./deploy_output_gov/azure_gov.sh
        printf "export AZURE_CLOUD_TYPE=gov" >> ./deploy_output_gov/azure_gov.sh
    else
        printf "export AZURE_VM_IP=%s \n export AZURE_VM_HOSTNAME=%s \n" "$vmIp" "$vmHostname" > ./deploy_output/azure.sh
    fi
}

function main() {
    check_env_vars
    login
    deploy
    assign_mi
    output_vm_info
}

main