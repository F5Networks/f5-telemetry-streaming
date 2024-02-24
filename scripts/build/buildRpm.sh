#!/bin/bash

set -evx


# RPM template: <app-name>-<version>-<release>.<arch>.rpm
# For DEV <release> === <release>.<buildtimestamp>.<commit-sha>.<sanitized-branch>
# DEV RPM: f5-telemetry-1.35.0-0.20240107071243.28507f40.dev_build_info.noarch.rpm
# Release RPM: f5-telemetry-1.35.0-0.noarch.rpm

is_release_tag () {(
    node -e "process.exit(+!(/^(v[0-9]+\.[0-9]+\.[0-9]+|latest)$/.test('$1')));"
)}

package_name () {(
    node -e "console.log(require('./package.json').name);"
)}

package_version () {(
    node -e "v=require('./package.json').version.split('-');v.length===1?v.push('1'):'';console.log(v.join('-'));"
)}

sanitize () {(
    node -e "console.log('${1}'.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_{2,}/g, '_').replace(/^_*|_*$/gm, ''));"
)}

MAINDIR=$(pwd)
FINALBUILDDIR=${MAINDIR}/dist

FULL_VERSION=$(package_version)
PKG_NAME=$(package_name)

VERSION=$(echo $FULL_VERSION | cut -d - -f 1)
RELEASE=$(echo $FULL_VERSION | cut -d - -f 2)

GIT_REF_NAME=${CI_COMMIT_TAG:-${CI_COMMIT_BRANCH:-$(git rev-parse --abbrev-ref HEAD || echo "localenv")}}
GIT_COMMIT_SHA=${CI_COMMIT_SHORT_SHA:-$(git rev-parse --short HEAD1 || echo "no_git_hash")}
BUILD_TIMESTAMP=$(date +%Y%m%d%H%M%S)

if test "${CI_PROJECT_NAME}" == "atg-build";
then
    GIT_REF_NAME='release'
    GIT_COMMIT_SHA='release'
elif ! is_release_tag "${CI_COMMIT_TAG}"; then
    # replace non-alpha-numeric symbols with '_'
    # replace groups of '_' with single '_'
    # remove leading and trailing '_'
    GIT_REF_NAME_SLUG=$(sanitize "${GIT_REF_NAME}")
    RELEASE="${RELEASE}.${BUILD_TIMESTAMP}.${GIT_COMMIT_SHA}.${GIT_REF_NAME_SLUG}"
fi

rpmbuild -bb \
    --define "BUILD_TIMESTAMP ${BUILD_TIMESTAMP}" \
    --define "GIT_REF_NAME ${GIT_REF_NAME}" \
    --define "GIT_COMMIT_SHA ${GIT_COMMIT_SHA}" \
    --define "_name ${PKG_NAME}" \
    --define "_release ${RELEASE}" \
    --define '_topdir %{main}/rpmbuild' \
    --define "_version ${VERSION}" \
    --define "main ${MAINDIR}" \
    project.spec

pushd rpmbuild/RPMS/noarch
rpmFile=$(ls -t *.rpm 2>/dev/null | head -1)
mkdir -p ${FINALBUILDDIR}
cp ${rpmFile} ${FINALBUILDDIR}
sha256sum "${rpmFile}" > "${FINALBUILDDIR}/${rpmFile}.sha256"
popd
#rm -rf rpmbuild/

echo "NEW RPM FILE ${FINALBUILDDIR}/${rpmFile}"