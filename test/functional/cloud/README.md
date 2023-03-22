# Introduction

This directory contains functional tests that require setup and teardown of resources on a cloud patform. For initial coverage, we are going to have weekly scheduled pipeline runs.

### Running
Tests should be run using the following syntax:
```
    npm run test-functional-cloud-{cloudName}
```

### Scripts
Scripts are located at `scripts/functional_testing/{cloudName}`

### AWS
#### Updating BIG-IP Versions
The Deployment Tool specifies the AMI to use in the AWS BIG-IP deployment. That AMI variable (aws_bigip_ami_id) can be updated in the following directory of the Deployment Tool repository:
```
plans/aws_byol/variables.tf
```
**Note:** The AMI used should be a BYOL, All Modules, 1 Boot location AMI (ex: F5 `BIGIP-15.1.0-0.0.6 BYOL-All Modules 1Boot Loc`)

### Azure

#### Updating BIG-IP Versions
BIG-IPs are deployed to Azure using an Azure Resource Manager template, located at `scripts/functional_testing/azure/azure_2nic_byol_deploy.json`, and the template is executed from the deployment script located at `scripts/functional_testing/azure/deploy_env.sh`. The `deploy_env.sh` script uses an Environment Variable to set a custom "imageUrn", which is set by the `AZURE_IMAGE_URN` variable.

Image URNs can be located by querying Azure; example searching for a 15.1.2* image:
```
az vm image list --sku f5-big-all-2slot-byol --publisher f5-networks --all | jq -r '.[] | select(.version | startswith("15.1.2"))'
```
**Note:** The Image used shoudl be a BYOL, All Modules, 2 Slot image

#### Azure_Log_Analytics
#### Prerequisites for a sample minimal setup
A resource group containing:
- A log analytics workspace
- A managed identity with the following permissions:
    - Read permissions to list subscriptions, specificially one that the workspace belongs to
    - Read permissions to list workspaces for this subscription
    - Write permissions to the workspace, either at the workspace resource level or inherited (e.g. the built-in Log Analytics Contributor role)
- The Azure Cli installed on the environment (if running locally and not through the pipeline)

#### Triggering a manual test run locally

1. Make sure environment variables are set. For example, you can run `. env_vars.sh` in which the file contains the following:
    ``` bash
    export AZURE_VM_DOMAIN="{region}.cloudapp.azure.com"
    export AZURE_WORKSPACE_MI="log-workspace-guid"
    export AZURE_SVCP_USERNAME="service-principal-guid"
    export AZURE_LOG_KEY="service-principal-password"
    export AZURE_TENANT="tenant-guid"
    export AZURE_MANAGED_IDENTITY_ID="/subscriptions/{sub-guid}/resourceGroups/{rg-name}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{identity-name}"
    export AZURE_VM_PWD="vm-password"
    export AZURE_PIPELINE_RESOURCE_GROUP="resource-group-to-use-for-deployment-name"
    export AZURE_CLIENT_ID="client-id-for-log-reader"
    ```

2. To deploy the resources for testing, run `. scripts/functional_testing/azure/deploy_env.sh`. For the example template, the deployment typically takes about 10 minutes to complete.

3. Run `npm run test-functional-cloud-azure`

4. To delete the resources for testing, run `. scripts/functional_testing/azure/teardown.sh`. This also usually takes about 10 minutes to complete.