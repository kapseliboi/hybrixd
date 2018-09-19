#!/bin/sh

WHEREAMI=`pwd`

# $HYBRIDD/$NODE/scripts/npm  => $HYBRIDD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIDD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

NODE="$HYBRIDD/node"
DETERMINISTIC="$HYBRIDD/deterministic"
NODEJS="$HYBRIDD/nodejs-v8-lts"
COMMON="$HYBRIDD/common"
INTERFACE="$HYBRIDD/interface"
WEB_WALLET="$HYBRIDD/web-wallet"

if [ "`uname`" = "Darwin" ]; then
    SYSTEM="darwin-x64"
elif [ "`uname -m`" = "i386" ] || [ "`uname -m`" = "i686" ]; then
    SYSTEM="x86"
elif [ "`uname -m`" = "x86_64" ]; then
    SYSTEM="x86_64"
else
    echo "[!] Unknown Architecture (or incomplete implementation)"
    exit 1;
fi


if [ -z "$1" ]; then
    NODES=1
else
    NODES=$1
fi


if [ "$NODES" -gt "1" ]; then
    RESTLINE=$(grep "restport" "$NODE/hybridd.conf")
    RESTPORT=$(echo "$RESTLINE" | cut -d ' ' -f3)

    USERLINE=$(grep "userport" "$NODE/hybridd.conf")
    USERPORT=$(echo "$USERLINE" | cut -d ' ' -f3)


    # Bootscript : add other nodes as peers to first node (which will be captian)
    echo "{\"quartz\":{\"main\":[" > "$NODE/boot.json"
    for (( i=2; i<=$NODES; i++ ))
    do
        echo "\"rout('/engine/cluster/add/localhost:$((RESTPORT+$i-1))')\"," >> "$NODE/boot.json"
    done
    echo "\"stop(0,'Done')\"" >> "$NODE/boot.json"
    echo "]}}" >> "$NODE/boot.json"

    for (( i=2; i<=$NODES; i++ ))
    do

        echo "[i] Preparing Node $i"

        rsync -aK "$NODE/" "$NODE$i/"
        #increment restport
        NEWRESTLINE="restport = "$((RESTPORT+$i-1))
        sed -i -e 's/'"$RESTLINE"'/'"$NEWRESTLINE"'/g' "$NODE$i/hybridd.conf"

        #increment userport
        NEWUSERLINE="userport = "$((USERPORT+$i-1))
        sed -i -e 's/'"$USERLINE"'/'"$NEWUSERLINE"'/g' "$NODE$i/hybridd.conf"

        cd "$NODE$i"
        # Bootscript : aAdd other nodes as peers, first as captain
        echo "{\"quartz\":{\"main\":[" > boot.json
        echo "\"rout('/engine/cluster/captain/localhost:$((RESTPORT))')\","  >> boot.json
        for (( j=2; j<=$NODES; j++ ))
        do
            if [ "$i" != "$j" ]; then
                echo "\"rout('/engine/cluster/add/localhost:$((RESTPORT+$j-1))')\"," >> boot.json
            fi
        done
        echo "\"stop(0,'Done')\"" >> boot.json
        echo "]}}" >> boot.json

        # Start node i in the background
        sh "$NODE$i/hybridd" &

    done
fi

# Start main node
cd "$NODE"
sh "$NODE/hybridd"

cd "$WHEREAMI"
