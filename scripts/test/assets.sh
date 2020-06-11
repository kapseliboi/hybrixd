#!/bin/sh
OLDPATH=$PATH
WHEREAMI=$(pwd)

# $NODE/scripts/test  => $NODE
SCRIPTDIR="`dirname \"$0\"`"
NODE="`cd \"$SCRIPTDIR/../..\" && pwd`"

export PATH="$NODE/node_binaries/bin:$PATH"

echo " [i] Running Asset tests"

sh "$NODE/hybrixd" /r/assets/test > "$NODE/test-hybrixd.xml"

if [ -s "$NODE/test-hybrixd.xml" ]; then
    echo " [.] Asset tests completed!"
else
    echo " [!] Asset tests failed!"
    export PATH="$OLDPATH"
    cd "$WHEREAMI"
    exit 1
fi

#echo " [d] test-hybrixd.xml"
#cat "$NODE/test-hybrixd.xml"

echo " [i] Output test data"

sh "$NODE/hybrixd" /r/assets/cli | tee output

TEST_INTERFACE_OUTPUT=$(cat output)

SUCCESS_RATE=$(echo "$TEST_INTERFACE_OUTPUT" | grep "SUCCESS RATE")
rm output

# "      SUCCESS RATE :${PERCENTAGE}%' => "$PERCENTAGE"
PERCENTAGE=$(echo $SUCCESS_RATE| cut -d':' -f2  | cut -d'%' -f1)

if [ "$PERCENTAGE" -lt "80" ]; then
    echo " [!] Asset tests failed!"
    export PATH="$OLDPATH"
    cd "$WHEREAMI"
    exit 1
else
    echo " [v] Asset tests succeeded."
fi

export PATH="$OLDPATH"
cd "$WHEREAMI"
