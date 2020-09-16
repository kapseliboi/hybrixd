#!/bin/sh
OLDPATH=$PATH
WHEREAMI=$(pwd)

echo "[.] Remove npm readme"
rm README.npm.md || true

echo "[.] Remove pipeline scripts"
rm -rf ./scripts/pipeline

echo "[.] Remove hybrixd.conf"
rm -rf  hybrixd.conf || true

export PATH="$OLDPATH"
cd "$WHEREAMI"

exit 0
