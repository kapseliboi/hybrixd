#!/bin/sh
WHEREAMI=`pwd`
OLDPATH=$PATH
# $HYBRIXD/$NODE/scripts/npm  => $HYBRIXD

SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

INTERFACE="$HYBRIXD/interface"
NODE="$HYBRIXD/node"
DETERMINISTIC="$HYBRIXD/deterministic"
NODEJS="$HYBRIXD/nodejs"
COMMON="$HYBRIXD/common"
INTERFACE="$HYBRIXD/interface"
WEB_WALLET="$HYBRIXD/web-wallet"
ENVIRONMENT=$1

if [ "$ENVIRONMENT" == "dev" ]; then
    URL="https://gitlab.com/hybrix/hybrixd/common.git"
    echo "[i] Environment is development..."
elif [ "$ENVIRONMENT" == "public" ]; then
    URL="https://github.com/hybrix-io/hybrixd-common.git"
    echo "[i] Environment is public..."
else
    echo "[!] Unknown Environment (please use npm run setup[:dev])"
    exit 1
fi


if [ "`uname`" = "Darwin" ]; then
    SYSTEM="darwin-x64"
elif [ "`uname -m`" = "i386" ] || [ "`uname -m`" = "i686" ]; then
    SYSTEM="x86"
elif [ "`uname -m`" = "x86_64" ]; then
    SYSTEM="x86_64"
else
    echo "[!] Unknown Architecture (or incomplete implementation)"
fi

# NODE_BINARIES
if [ ! -e "$NODE/node_binaries" ];then

    echo " [!] node/node_binaries not found."

    if [ ! -e "$NODEJS" ];then
        cd "$HYBRIXD"
        echo " [i] Clone node js runtimes files"
        git clone https://gitlab.com/hybrix/hybrixd/dependencies/nodejs.git #TODO find this on github for public consumption

    fi
    echo " [i] Link node_binaries"
    ln -sf "$NODEJS/$SYSTEM" "$NODE/node_binaries"
fi

export PATH="$NODE/node_binaries/bin:$PATH"


# COMMON
if [ ! -e "$NODE/common" ];then

    echo " [!] node/common not found."

    if [ ! -e "$COMMON" ];then
        cd "$HYBRIXD"
        echo " [i] Clone common files"
        git clone $URL

    fi
    echo " [i] Link common files"
    ln -sf "$COMMON" "$NODE/common"

fi

# GIT HOOKS
sh "$COMMON/hooks/hooks.sh" "$NODE"

cd "$WHEREAMI"
export PATH="$OLDPATH"
