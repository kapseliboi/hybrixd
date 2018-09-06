#!/bin/sh

# check if we also want to update the other repo's
UPDATE=$1


NODEARCH=`uname -m`
OLDPATH=$PATH
WHEREAMI=`pwd`

DARWIN_FLAG=`uname -a | grep "Darwin"`

# $IOC/$HYBRIDD/scripts/npm  => $IOC
IOC="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )/../../../"


HYBRIDD="$IOC/hybridd"
MODULE_DETERMINISTIC="$IOC/module-deterministic"
NODEJS="$IOC/nodejs-v8-lts"
COMMON="$IOC/ioc-tools"
WEB_WALLET="$IOC/web-wallet"

if [ $(uname) == "Darwin" ]; then
  SYSTEM="darwin-x64"
elif [ $(uname -m) == "i386" ] || [ $(uname -m) == "i686" ]; then
  SYSTEM = x86
elif [ $(uname -m) == "x86_64" ]; then
  SYSTEM = x86_64
else
  echo "[!] Unknown Architecture (or incomplete implementation)"
  exit 1;
fi

# NODE
if [ ! -e "$HYBRIDD/node" ];then

    echo " [!] hybridd/node not found."

    if [ ! -e "$NODEJS" ];then
        cd "$IOC"
        echo " [i] Clone node js runtimes files"
        git clone https://github.com/internetofcoins/nodejs-v8-lts.git
    fi
    echo " [i] Link NODEJS files"
    ln -sf "$NODEJS/$SYSTEM" "$HYBRIDD/node"
fi


# TODO LOCAL NPM
#if [ ! -x "$HYBRIDD/npm" ]; then
  #  echo " [i] Link local npm"
   # chmod +x $HYBRIDD/npm
#fi


# COMMON
if [ ! -e "$HYBRIDD/common" ];then

    echo " [!] hybridd/common not found."

    if [ ! -e "$COMMON" ];then
        cd "$IOC"
        echo " [i] Clone common files"
        git clone https://www.gitlab.com/iochq/ioc-tools.git
    fi
    echo " [i] Link common files"
    ln -sf "$COMMON" "$HYBRIDD/common"

fi

# MODULES DETERMINISTIC
if [ -e "$MODULE_DETERMINISTIC" ];then
    cd "$MODULE_DETERMINISTIC/modules/deterministic/"
    echo " [i] Build and copy client modules"
    sh ./compileall.sh "$HYBRIDD"
fi

# WEB WALLET
if [ -e "$WEB_WALLET" ];then
    cd "$MODULE_DETERMINISTIC/modules/deterministic/"
    echo " [i] Copy web wallet files"
    cp -r "$WEB_WALLET/dist" "$HYBRIDD/modules/web-wallet"
fi

# QUARTZ
echo "[.] Generate Quartz documentation."
mkdir -p "$HYBRIDD/docs"
jsdoc "$HYBRIDD/lib/scheduler/quartz.js"  -d "$HYBRIDD/docs"

# GIT PRE-PUSH HOOK
if [ ! -x "$HYBRIDD/.git/hooks/pre-push" ]; then
  echo "[i] Install git pre-push hook..." | filter
  cp ./hooks/pre-push ./.git/hooks/pre-push
  chmod +x ./.git/hooks/pre-push
fi

# GIT COMMIT-MSG HOOK
if [ ! -x "$HYBRIDD/.git/hooks/commit-msg" ]; then
  echo "[i] Install git commit-msg hook..." | filter
  cp ./hooks/commit-msg ./.git/hooks/commit-msg
  chmod +x ./.git/hooks/commit-msg
fi


cd "$WHEREAMI"
