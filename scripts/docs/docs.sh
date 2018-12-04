#!/bin/sh
WHEREAMI=`pwd`
OLDPATH=$PATH

SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

INTERFACE="$HYBRIXD/interface"
NODE="$HYBRIXD/node"
DETERMINISTIC="$HYBRIXD/deterministic"
NODEJS="$HYBRIXD/nodejs"
COMMON="$HYBRIXD/common"
INTERFACE="$HYBRIXD/interface"
WEB_WALLET="$HYBRIXD/web-wallet"


$NODE/node_binaries/bin/node "$NODE/scripts/docs/docs.js"

cd "$WHEREAMI"
export PATH="$OLDPATH"
