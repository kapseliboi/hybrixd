#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`

# $NODE/scripts/npm  => $NODE
SCRIPTDIR="`dirname \"$0\"`"
NODE="`cd \"$SCRIPTDIR/../..\" && pwd`"

export PATH="$NODE/node_binaries/bin:$PATH"

sh "$NODE/scripts/test/assets.sh" && sh "$NODE/scripts/test/qrtz.sh" && sh "$NODE/scripts/test/hybrix-jslib.sh"


if [ "$?" -eq 0  ]; then
    echo "[v] All tests succeeded."
else
    echo "[!] On or more tests failed!"
    export PATH="$OLDPATH"
    cd "$WHEREAMI"
    exit 1;
fi


export PATH="$OLDPATH"
cd "$WHEREAMI"
