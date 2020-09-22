#!/bin/sh

OLDPATH=$PATH
WHEREAMI=$(pwd)

# $HYBRIXD/$NODE/scripts/npm  => $HYBRIXD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

export PATH=$WHEREAMI/node_binaries/bin:"$PATH"

cd "$HYBRIXD"

echo "[.] clone hybrixd from github"

git clone https://github.com/hybrix-io/hybrixd.git

cd hybrixd

echo "[.] Run setup"

npm run setup

cd "$HYBRIXD/hybrixd"
sh ./scripts/pipeline/test.sh

export PATH="$OLDPATH"
cd "$WHEREAMI"

exit 0
