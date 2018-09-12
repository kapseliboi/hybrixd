#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
export PATH=$WHEREAMI/node/bin:"$PATH"
NPMINST=`which npm`

node $WHEREAMI/node/bin/npm $@

export PATH=$OLDPATH
