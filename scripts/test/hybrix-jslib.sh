#!/bin/sh
WHEREAMI=$(pwd)
OLDPATH=$PATH

# $NODE/scripts/test  => $NODE
SCRIPTDIR="`dirname \"$0\"`"
NODE="`cd \"$SCRIPTDIR/../..\" && pwd`"

export PATH="$NODE/node_binaries/bin:$PATH"

echo "[i] Running hybrix-jslib tests"

cd $NODE/scripts/test

node "$NODE/scripts/test/hybrix-jslib.js"

if [ "$?" -ne 0  ]; then
    echo "[!] hybrix-jslib tests failed!"
    export PATH="$OLDPATH"
    cd "$WHEREAMI"
    exit 1;
fi


export PATH="$OLDPATH"
cd "$WHEREAMI"
