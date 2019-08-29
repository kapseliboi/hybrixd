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

cd "$NODE/scripts/docs"
node "$NODE/scripts/docs/docs.js"

node "$NODE/scripts/docs/conf.js"

node "$NODE/scripts/docs/cli.js" "$HYBRIXD/cli-wallet"



cd "$WHEREAMI"
export PATH="$OLDPATH"
