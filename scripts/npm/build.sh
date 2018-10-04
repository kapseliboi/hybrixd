#!/bin/sh
WHEREAMI=`pwd`

OLDPATH=$PATH
# $HYBRIDD/$NODE/scripts/npm  => $HYBRIDD

SCRIPTDIR="`dirname \"$0\"`"
HYBRIDD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

INTERFACE="$HYBRIDD/interface"
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

export PATH="$NODEJS/$SYSTEM/bin:$PATH"


# NODE
if [ ! -e "$NODE/node" ];then

    echo " [!] interface/node not found."

    if [ ! -e "$NODEJS" ];then
        cd "$HYBRIDD"
        echo " [i] Clone node js runtimes files"
        git clone https://github.com/internetofcoins/nodejs-v8-lts.git
    fi
    echo " [i] Link NODEJS files"
    ln -sf "$NODEJS/$SYSTEM" "$NODE/node"
fi

# COMMON
if [ ! -e "$NODE/common" ];then

    echo " [!] interface/common not found."

    if [ ! -e "$COMMON" ];then
        cd "$HYBRIDD"
        echo " [i] Clone common files"
        git clone https://www.gitlab.com/iochq/hybridd/common.git
    fi
    echo " [i] Link common files"
    ln -sf "$COMMON" "$NODE/common"

fi

# INTERFACE
if [ ! -e "$NODE/interface" ];then

    echo " [!] node/interface not found."

    if [ ! -e "$INTERFACE" ];then
        cd "$HYBRIDD"
        echo " [i] Clone interface files"
        git clone https://www.gitlab.com/iochq/hybridd/interface.git
    fi
    echo " [i] Link interface files"
    ln -sf "$INTERFACE" "$NODE/interface"
fi


# DETERMINISTIC CLIENT MODULES
if [ -e "$DETERMINISTIC" ];then
    cd "$DETERMINISTIC/modules/"
    echo " [i] Build and copy determinstic client modules"
    sh "$DETERMINISTIC/scripts/npm/build.sh"
fi

# WEB WALLET
if [ -e "$WEB_WALLET" ];then
    echo " [i] Copy web wallet files"
    mkdir -p "NODE/modules/web-wallet/files"
    rsync -aK "$WEB_WALLET/dist/" "$NODE/modules/web-wallet/files/"
fi

# QUARTZ
echo "[.] Generate Quartz documentation."
mkdir -p "$NODE/docs"
jsdoc "$NODE/lib/scheduler/quartz.js"  -d "$NODE/docs"

# GIT PRE-PUSH HOOK
if [ ! -x "$NODE/.git/hooks/pre-push" ]; then
  echo "[i] Install git pre-push hook..."
  cp "$NODE/hooks/pre-push" "$NODE/.git/hooks/pre-push"
  chmod +x ./.git/hooks/pre-push
fi

# GIT COMMIT-MSG HOOK
if [ ! -x "$NODE/.git/hooks/commit-msg" ]; then
  echo "[i] Install git commit-msg hook..."
  cp "$NODE/hooks/commit-msg" "$NODE/.git/hooks/commit-msg"
  chmod +x "$NODE/.git/hooks/commit-msg"
fi

cd "$WHEREAMI"

export PATH="$OLDPATH"
