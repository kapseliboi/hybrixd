#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`

# $NODE/scripts/npm  => $NODE
SCRIPTDIR="`dirname \"$0\"`"
NODE="`cd \"$SCRIPTDIR/../..\" && pwd`"

export PATH="$NODE/node_binaries/bin:$PATH"

#echo " [i] Running Interface tests"

#sh "$NODE/hybrixd" /r/assets/test > "$NODE/test-hybrixd.xml"

#echo " [i]Output test data"

#sh "$NODE/hybrixd" /r/assets/cli | tee output

#TEST_INTERFACE_OUTPUT=$(cat output)

#SUCCESS_RATE=$(echo "$TEST_INTERFACE_OUTPUT" | grep "SUCCESS RATE")
#rm output

## "      SUCCESS RATE :${PERCENTAGE}%' => "$PERCENTAGE"
#PERCENTAGE=$(echo $SUCCESS_RATE| cut -d':' -f2  | cut -d'%' -f1)

#if [ "$PERCENTAGE" -lt "80" ]; then
 #   echo " [!] Interface test failed!"
#    exit 1
#else
#    echo " [v] Interface test succeeded."
#fi

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
