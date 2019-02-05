#!/bin/sh

set -e

RELEASE=$(($(ls -v dist/*.rpm|tail -1|sed -rn 's/.*-([0-9]+).noarch.rpm/\1/p') + 1))
MAINDIR=$(pwd)
FINALBUILDDIR=${MAINDIR}/dist/new_build

rpmbuild -bb --define "main $(pwd)" --define '_topdir %{main}/rpmbuild' --define "_name f5-telemetry" --define "_release ${RELEASE}" f5-telemetry.spec
cd rpmbuild/RPMS/noarch
FN=$(ls -t *.rpm 2>/dev/null | head -1)
mkdir -p ${FINALBUILDDIR}
cp ${FN} ${FINALBUILDDIR}
sha256sum "${FN}" > "${FINALBUILDDIR}/${FN}.sha256"

cd ${MAINDIR}
rm -rf rpmbuild/
echo "RPM FILE ${FINALBUILDDIR}/${FN}"