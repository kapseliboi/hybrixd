#!/bin/sh
OLDPATH=$PATH
WHEREAMI=$(pwd)

echo "[.] Remove npm readme"
rm README.npm.md || true

echo "[.] Remove pipeline scripts"
rm -rf ./scripts/pipeline

echo "[.] Reset hybrixd.conf"
echo "[host]" >  hybrixd.conf
echo 'servers = { "http://127.0.0.1:1111" : "/root", "http://127.0.0.1:8080" : "/source/web-wallet", "http://127.0.0.1:8090" : "/source/web-blockexplorer"}' >>  hybrixd.conf

export PATH="$OLDPATH"
cd "$WHEREAMI"

exit 0
