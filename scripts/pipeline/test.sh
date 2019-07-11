#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`

echo "[i] node version $(node --version)"

echo "[.] remove transports module"

rm -rf "./modules/transport"

echo "[.] Starting hybrixd"
./hybrixd > /dev/null &

sleep 20s

echo "[.] Enable hybrixd api queue test mode"
./hybrixd /c/apiqueue/test/start

# verbose output of percentages
sh ./scripts/npm/test.sh v
FAILED=$?

echo "[.] Stopping hybrixd"
./hybrixd /c/stop

if [ "$FAILED" -eq 0  ]; then
    echo "[v] Test succeeded."
else
    echo "[!] Test failed!"
    cat "var/log/hybrixd.log"
    exit 1;
fi

export PATH="$OLDPATH"
cd "$WHEREAMI"

exit 0
