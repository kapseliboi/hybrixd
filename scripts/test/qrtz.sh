#!/bin/sh

OLDPATH=$PATH
WHEREAMI=`pwd`

# $NODE/scripts/test  => $NODE
SCRIPTDIR="`dirname \"$0\"`"
NODE="`cd \"$SCRIPTDIR/../..\" && pwd`"

echo "[i] Running Quartz tests"

TEST_QRTZ_OUTPUT=$(sh "$NODE/hybrixd" "/e/testquartz/test")

TEST_QRTZ_OUTPUT_NO_WHITESPACE="$(echo "${TEST_QRTZ_OUTPUT}" | tr -d '[:space:]')"

if [ "$TEST_QRTZ_OUTPUT_NO_WHITESPACE" != "OK" ]; then
    echo " $TEST_QRTZ_OUTPUT"
    echo "[!] Quartz test failed!"
    export PATH="$OLDPATH"
    cd "$WHEREAMI"
    exit 1
else
    echo "[v] Quartz test succeeded."
fi

export PATH="$OLDPATH"
cd "$WHEREAMI"
