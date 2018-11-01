#!/bin/sh
WHEREAMI=`pwd`
OLDPATH=$PATH
# $HYBRIDD/$NODE/scripts/npm  => $HYBRIDD

SCRIPTDIR="`dirname \"$0\"`"
HYBRIDD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

INTERFACE="$HYBRIDD/interface"
NODE="$HYBRIDD/node"
DETERMINISTIC="$HYBRIDD/deterministic"
NODEJS="$HYBRIDD/nodejs"
COMMON="$HYBRIDD/common"
INTERFACE="$HYBRIDD/interface"
WEB_WALLET="$HYBRIDD/web-wallet"


$NODE/node_binaries/bin/node docs.js

cd "$WHEREAMI"
export PATH="$OLDPATH"
