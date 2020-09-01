#!/bin/bash

set -e

NAMESPACE=f5-telemetry-streaming-rpm

function upload {
    # arg[1] - object name
    # arg[2] - path to object
    url=${ARTIFACTORY_BASE_URL}/${NAMESPACE}/${1}
    echo "Uploading ${1} (${2}) to ${url}"

    response=$(curl -H "Authorization: Bearer ${ARTIFACTORY_TOKEN}" -X PUT --data-binary @${2} ${url})
    responseRC=$?

    echo $response
    if [[ "$responseRC" -eq 0 ]] && [[ "$response" == *created* ]]; then
        echo "Upload complete"
    else
        echo "Upload failed"
        exit 1
    fi
}

cd dist
RPM_FILE=$(ls *.rpm)
RPM_NAME=$(basename "$RPM_FILE")

SHA_FILE="${RPM_FILE}.sha256.txt"
SHA_NAME=$(basename "$SHA_FILE")

sha256sum "${RPM_FILE}" > "${SHA_FILE}"
cat "${SHA_FILE}"

upload "${RPM_NAME}" "${RPM_FILE}"
upload "${SHA_NAME}" "${SHA_FILE}"