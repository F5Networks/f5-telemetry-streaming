#!/bin/sh

set -e;  # stop on errors

startDate=$(date)
nycStart=
nycCont=

if [ "$1" = "coverage" ]; then
    echo "Coverage report will be generated at the end."
    nycStart="nyc --silent"
    nycCont="nyc --silent --no-clean"
fi


npx ${nycStart} mocha --opts ./test/unit/.mocha.opts ./test/unit/*.js

for dir in $(ls -d ./test/unit/*/); do
    echo "Running tests in ${dir}"
    npx ${nycCont} mocha --recursive --opts ./test/unit/.mocha.opts "${dir}"
done

if [ "$1" = "coverage" ]; then
    echo "Generating coverage report"
    npx nyc report
fi

echo "Started - ${startDate}"
echo "Finished - $(date)"
