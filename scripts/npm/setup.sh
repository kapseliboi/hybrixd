#!/bin/sh
WHEREAMI=`pwd`
OLDPATH=$PATH

# $HYBRIXD/$NODE/scripts/npm  => $HYBRIXD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"
COMMON="$HYBRIXD/common"
NODEJS="$HYBRIXD/nodejs"

if [ -e "$HYBRIXD/hybrixd" ]; then
    URL_COMMON="https://github.com/hybrix-io/common.git"
    URL_NODEJS="https://github.com/hybrix-io/nodejs.git"
    URL_NODE_MODULES="https://github.com/hybrix-io/node_modules.git"
    NODE="$HYBRIXD/hybrixd"
    ENVIRONMENT="public"
    echo "[i] Environment is public..."
elif [ -e "$HYBRIXD/node" ]; then
    URL_COMMON="https://gitlab.com/hybrix/hybrixd/common.git"
    URL_NODEJS="https://www.gitlab.com/hybrix/hybrixd/dependencies/nodejs.git"
    URL_NODE_MODULES="https://gitlab.com/hybrix/hybrixd/dependencies/node_modules.git"
    NODE="$HYBRIXD/node"
    ENVIRONMENT="dev"
    echo "[i] Environment is development..."
else
    echo "[!] Unknown Environment"
    export PATH="$OLDPATH"
    cd "$WHEREAMI"
    exit 1
fi

if [ "`uname`" = "Darwin" ]; then
    SYSTEM="darwin-x64"
elif [ "`uname -m`" = "i386" ] || [ "`uname -m`" = "i686" ] || [ "`uname -m`" = "x86_64" ]; then
    SYSTEM="linux-x64"
else
    echo "[!] Unknown Architecture (or incomplete implementation)"
    export PATH="$OLDPATH"
    cd "$WHEREAMI"
    exit 1;
fi

# NODE
if [ "$ENVIRONMENT" = "public" ]; then
    if [ ! -e "$HYBRIXD/node" ];then
        echo "[i] linking hybrixd to node folder."
        ln -sf "$HYBRIXD/hybrixd" "$HYBRIXD/node"
    else
        echo "[i] node folder exists."
    fi
fi

# NODE_BINARIES
if [ ! -e "$NODE/node_binaries" ];then

    echo "[!] $NODE/node_binaries not found."

    if [ ! -e "$NODEJS" ];then
        cd "$HYBRIXD"
        echo "[i] Clone node js runtimes files"
        git clone "$URL_NODEJS"
    fi
    echo "[i] Link node_binaries"
    ln -sf "$NODEJS/$SYSTEM" "$NODE/node_binaries"
fi

export PATH="$NODE/node_binaries/bin:$PATH"

# COMMON
if [ ! -e "$NODE/common" ];then

    echo "[!] $NODE/common not found."

    if [ ! -e "$COMMON" ];then
        cd "$HYBRIXD"
        echo "[i] Clone common files"
        git clone "$URL_COMMON"
    fi
    echo "[i] Link common files"
    ln -sf "$COMMON" "$NODE/common"
fi

# NODE_MODULES
if [ "$ENVIRONMENT" = "public" ]; then
    read -p "[?] Do you wish to use the supported node_modules from hybrix? [y/n] " CONFIRM

    if [ "$CONFIRM" = "n" ]; then
        USE_SUPPORTED=false
    else
        USE_SUPPORTED=true
    fi
else
    USE_SUPPORTED=true
fi

echo "[i] Clear node_modules"
rm -rf "$NODE/node_modules"

if [ "$USE_SUPPORTED" = true ]; then

    if [ ! -e "$HYBRIXD/node_modules" ];then
        cd "$HYBRIXD"
        echo "[i] Clone node_modules dependencies"
        git clone "$URL_NODE_MODULES"
    fi

    echo "[i] Link node_modules"
    ln -sf "$HYBRIXD/node_modules" "$NODE/node_modules"
else
    echo "[i] Downloading dependencies from NPM."
    cd "$NODE"
    npm install
fi

# PROJECT XHY
if [ -e "$HYBRIXD/project-xhy" ]; then
    ln -sf "$HYBRIXD/project-xhy" "$NODE/modules/project-xhy"
fi

# GIT HOOKS
sh "$COMMON/hooks/hooks.sh" "$NODE"

export PATH="$OLDPATH"
cd "$WHEREAMI"
