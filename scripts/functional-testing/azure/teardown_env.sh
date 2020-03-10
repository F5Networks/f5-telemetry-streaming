# Log in to Azure and execute a new deployment to remove all resources in the Resource Group

# Check if an environment variable is set. If not set, log and exit.
function checkEnvVariable {
    if [ -z "${!1}" ]
    then
        echo "EnvVar '$1' should be set."
        exit 1
    fi
}

# Required Environment Variables:
checkEnvVariable AZURE_SVCP_USERNAME
checkEnvVariable AZURE_LOG_KEY
checkEnvVariable AZURE_TENANT
checkEnvVariable AZURE_PIPELINE_RESOURCE_GROUP

az login --service-principal --username $AZURE_SVCP_USERNAME --password $AZURE_LOG_KEY --tenant $AZURE_TENANT

az group deployment create --mode complete --template-file scripts/functional-testing/azure/remove_all_rg_resources.json \
-g $AZURE_PIPELINE_RESOURCE_GROUP