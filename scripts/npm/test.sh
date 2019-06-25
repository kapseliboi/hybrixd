#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
NODEINST=`which node`

# $HYBRIXD/interface/scripts/npm  => $HYBRIXD
SCRIPTDIR="`dirname \"$0\"`"
NODE="`cd \"$SCRIPTDIR/../..\" && pwd`"

export PATH="$NODE/node_binaries/bin:$PATH"

echo " [i] Running Interface tests"

TEST_INTERFACE_OUTPUT=$(node "$NODE/interface/test.js" --path="$NODE/interface")
echo "$TEST_INTERFACE_OUTPUT"
SUCCESS_RATE=$(echo "$TEST_INTERFACE_OUTPUT" | grep "SUCCESS RATE: ")

PERCENTAGE=${SUCCESS_RATE//[a-zA-Z: %]/}
if [[ "$PERCENTAGE" -lt "80" ]]; then
    echo " [!] Interface test failed!"
    exit 1
else
    echo " [v] Interface test succeeded."
fi

echo " [i] Running Quartz tests"

TEST_QRTZ_OUTPUT=$(sh "$NODE/hybrixd" "/e/testquartz/test")

TEST_QRTZ_OUTPUT_NO_WHITESPACE="$(echo "${TEST_QRTZ_OUTPUT}" | tr -d '[:space:]')"


if [ "$TEST_QRTZ_OUTPUT_NO_WHITESPACE" != "OK" ]; then
    echo " $TEST_QRTZ_OUTPUT"
    echo " [!] Quartz test failed!"
    exit 1
else
    echo " [v] Quartz test succeeded."
fi



export PATH="$OLDPATH"
cd "$WHEREAMI"
