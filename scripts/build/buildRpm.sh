#!/bin/bash

set -e

MAINDIR=$(pwd)
FINALBUILDDIR=${MAINDIR}/dist

FULL_VERSION=$(node -e "v=require('./package.json').version.split('-');v.length===1?v.push('1'):'';console.log(v.join('-'));")
VERSION=$(echo $FULL_VERSION | cut -d - -f 1)
RELEASE=$(echo $FULL_VERSION | cut -d - -f 2)
PKG_NAME=$(node -e "console.log(require('./package.json').name);")

rpmbuild -bb --define "main ${MAINDIR}" --define '_topdir %{main}/rpmbuild' --define "_name ${PKG_NAME}" --define "_version ${VERSION}" --define "_release ${RELEASE}" project.spec

pushd rpmbuild/RPMS/noarch
rpmFile=$(ls -t *.rpm 2>/dev/null | head -1)
mkdir -p ${FINALBUILDDIR}
cp ${rpmFile} ${FINALBUILDDIR}
sha256sum "${rpmFile}" > "${FINALBUILDDIR}/${rpmFile}.sha256"
popd

rm -rf rpmbuild/
echo "NEW RPM FILE ${FINALBUILDDIR}/${rpmFile}"