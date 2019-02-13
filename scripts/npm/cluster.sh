#!/bin/bash

WHEREAMI=`pwd`

# $HYBRIXD/$NODE/scripts/npm  => $HYBRIXD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

NODE="$HYBRIXD/node"
DETERMINISTIC="$HYBRIXD/deterministic"
NODEJS="$HYBRIXD/nodejs-v8-lts"
COMMON="$HYBRIXD/common"
INTERFACE="$HYBRIXD/interface"
WEB_WALLET="$HYBRIXD/web-wallet"

if [ "`uname`" = "Darwin" ]; then
    SYSTEM="darwin-x64"
elif [ "`uname -m`" = "i386" ] || [ "`uname -m`" = "i686" ]; then
    SYSTEM="x86"
elif [ "`uname -m`" = "x86_64" ]; then
    SYSTEM="x86_64"
else
    echo " [!] cluster: unknown architecture (or incomplete implementation)"
    exit 1;
fi

if [ -z "$1" ]; then
    NODES=1
else
    NODES=$1
fi

if [ "$NODES" -gt "1" ]; then
    RESTPORT=8080
    USERPORT=1111
	SERVERLINE='servers = { "http://127.0.0.1:1111" : "/root", "http://127.0.0.1:8080" : "/source/web-wallet" }'
    NODELINE=$(grep "nodeId" "$NODE/hybrixd.conf" | grep -v \# )

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

        echo " [i] cluster: preparing node $i..."

        rsync -aK "$NODE/" "$NODE$i/"

        #replace serverline
        NEWSERVERLINE="servers = { \"http://127.0.0.1:$((USERPORT+$i-1))\" : \"/root\", \"http://127.0.0.1:$((RESTPORT+$i-1))\" : \"/source/web-wallet\" }"
        cat "$NODE/hybrixd.conf" | grep -v 'servers =' > "$NODE$i/hybrixd.conf"
		echo "$NEWSERVERLINE" >> "$NODE$i/hybrixd.conf"

		#force set encryption pubkeys TESTING!
		if [ "$i" = "1" ]; then
          NEWNODELINE="nodeId = 6118abfd4fe4582d0fc7de7295975147c7aa53dd9982c2c962025e7f34b76b63"
        fi
		if [ "$i" = "2" ]; then
          NEWNODELINE="nodeId = 13b2cc321cb565d7bc2f3e6959af295d7315e3137e70ea505ea79161d4502ccc"
        fi
		if [ "$i" = "3" ]; then
          NEWNODELINE="nodeId = ffb2cc321cb565d7bc2f3e6959af295d7315e4d7e9a0bc123459af295d7315e4"
        fi
        sed -i -e 's/'"$NODELINE"'/'"$NEWNODELINE"'/g' "$NODE$i/hybrixd.conf"

		# DEBUG:
		#echo ' ################################### '
		#cat "$NODE$i/hybrixd.conf"
		
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
        sh "$NODE$i/hybrixd" &

    done
fi

# Start main node
cd "$NODE"
sh "$NODE/hybrixd"

cd "$WHEREAMI"
