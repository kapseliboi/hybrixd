#!/bin/sh
WHEREAMI=`pwd`
OLDPATH=$PATH
# $HYBRIXD/$NODE/scripts/npm  => $HYBRIXD

SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

INTERFACE="$HYBRIXD/interface"
DETERMINISTIC="$HYBRIXD/deterministic"
NODEJS="$HYBRIXD/nodejs"
COMMON="$HYBRIXD/common"
INTERFACE="$HYBRIXD/interface"
WEB_WALLET="$HYBRIXD/web-wallet"
ENVIRONMENT=$1

if [ "$ENVIRONMENT" = "dev" ]; then
    URL_COMMON="https://gitlab.com/hybrix/hybrixd/common.git"
    URL_NODEJS="https://www.gitlab.com/hybrix/hybrixd/dependencies/nodejs.git"
    echo "[i] Environment is development..."
elif [ "$ENVIRONMENT" = "public" ]; then
    URL_COMMON="https://github.com/hybrix-io/hybrixd-common.git"
    URL_NODEJS="https://github.com/hybrix-io/nodejs.git"
    echo "[i] Environment is public..."
else
    echo "[!] Unknown Environment (please use npm run setup[:dev])"
    export PATH="$OLDPATH"
    cd "$WHEREAMI"
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

    echo " [!] $NODE/node_binaries not found."

    if [ ! -e "$NODEJS" ];then
        cd "$HYBRIXD"
        echo " [i] Clone node js runtimes files"
        git clone "$URL_NODEJS"
        if [ "$ENVIRONMENT" = "public" ]; then
            ln -sf "hybrixd-dependencies-nodejs" "nodejs"
        fi
    fi
    echo " [i] Link node_binaries"
    ln -sf "$NODEJS/$SYSTEM" "$NODE/node_binaries"
fi

export PATH="$NODE/node_binaries/bin:$PATH"


# COMMON
if [ ! -e "$NODE/common" ];then

    echo " [!] $NODE/common not found."

    if [ ! -e "$COMMON" ];then
        cd "$HYBRIXD"
        echo " [i] Clone common files"
        git clone "$URL_COMMON"
        if [ "$ENVIRONMENT" = "public" ]; then
            ln -sf "hybrixd-common" "common"
        fi
    fi
    echo " [i] Link common files"
    ln -sf "$COMMON" "$NODE/common"
fi

# GIT HOOKS
sh "$COMMON/hooks/hooks.sh" "$NODE"

export PATH="$OLDPATH"
cd "$WHEREAMI"
