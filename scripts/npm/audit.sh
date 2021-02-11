#!/bin/sh
WHEREAMI="`pwd`";
OLDPATH="$PATH"

# $NODE/scripts/npm  => $NODE
SCRIPTDIR="`dirname \"$0\"`"
NODE="`cd \"$SCRIPTDIR/../..\" && pwd`"

export PATH="$NODE/node_binaries/bin:$PATH"

cd "$NODE"
echo "[.] Checking hybrixd..."
npm i
npm update
npm audit fix --force

cd "$NODE/modules"

for D in *; do
    if [ -d "${D}" ] && [ -e "$D/package.json" ] && [ -e "$D/node_modules" ]; then
        echo "[.] Checking hybrixd:${D}..."
        cd ${D}
        npm i
        npm update
        npm audit fix --force
        cd ..
    fi
done

export PATH="$OLDPATH"
cd "$WHEREAMI"
