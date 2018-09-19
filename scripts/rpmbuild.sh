#!/bin/bash

RELEASE=$(($(ls -v dist/*.rpm|tail -1|sed -rn 's/.*-([0-9]+).noarch.rpm/\1/p') + 1))
MAINDIR=$(pwd)

set -e

rpmbuild --quiet -bb \
    --define "main $(pwd)" \
    --define '_topdir %{main}/rpmbuild' \
    --define "_name f5-telemetry" \
    --define "_release ${RELEASE}" \
    f5-telemetry.spec

cd rpmbuild/RPMS/noarch
FN=$(ls -t *.rpm 2>/dev/null | head -1)
cp ${FN} ${MAINDIR}/dist
sha256sum "${FN}" > "${MAINDIR}/dist/${FN}.sha256"
cd ${MAINDIR}
echo "*** Built RPM: dist/${FN}"

# clean up build directory
rm -Rf rpmbuild
rm -Rf pkgs