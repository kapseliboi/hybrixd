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



# NODE_BINARIES
if [ ! -e "$NODE/node_binaries" ];then

    echo " [!] node/node_binaries not found."

    if [ ! -e "$NODEJS" ];then
        cd "$HYBRIXD"
        echo " [i] Clone node js runtimes files"
        git clone https://gitlab.com/hybrix/hybrixd/dependencies/nodejs.git
    fi
    echo " [i] Link node_binaries"
    ln -sf "$NODEJS/$SYSTEM" "$NODE/node_binaries"
fi

export PATH="$NODE/node_binaries/bin:$PATH"


# COMMON
if [ ! -e "$NODE/common" ];then

    echo " [!] interface/common not found."

    if [ ! -e "$COMMON" ];then
        cd "$HYBRIXD"
        echo " [i] Clone common files"
        git clone https://www.gitlab.com/hybrix/hybrixd/common.git
    fi
    echo " [i] Link common files"
    ln -sf "$COMMON" "$NODE/common"

fi


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
