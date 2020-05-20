#!/bin/sh
OLDPATH=$PATH
WHEREAMI=$(pwd)

echo "[.] Remove npm readme"
rm README.npm.md || true

echo "[.] Remove pipeline scripts"
rm -rf ./scripts/pipeline

exit 0
