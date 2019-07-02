#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`

echo "[i] node version $(node --version)"

echo "[.] remove transports module"

rm -rf "./modules/transport"

echo "[.] Starting hybrixd"
./hybrixd > log &

sleep 20s

# verbose output of percentages
sh ./scripts/npm/test.sh v
FAILED=$?

echo "[.] Stopping hybrixd"
./hybrixd /c/stop


echo "[.] Create test results"

echo "<?xml version=\"1.0\" encoding=\"UTF-8\" ?><testsuites id=\"20181025_140519\" name=\"Sample (25/10/18 14:05:19)\" tests=\"225\" failures=\"1262\" time=\"0.001\"><testsuite id=\"testsuite.example\" name=\"COBOL Code Review\" tests=\"45\" failures=\"17\" time=\"0.001\">   <testcase id=\"testcase.example\" name=\"Use a program name that matches the source file name\" time=\"0.001\">            <failure message=\"PROGRAM:2 Use a program name that matches the source file name\" type=\"WARNING\">WARNING: Use a program name that matches the source file name blablabla</failure></testcase></testsuite></testsuites>" > test-sample.xml

if [ "$FAILED" ]; then
    echo "[!] Test failed!"
    cat log
    exit 1;
else
    echo "[v] Test succeeded."
fi

export PATH="$OLDPATH"
cd "$WHEREAMI"

exit 0
