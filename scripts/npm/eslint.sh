#!/bin/sh
OLDPATH="$PATH"
WHEREAMI="`pwd`"
export PATH="$WHEREAMI/node_binaries/bin:$PATH"

node "$WHEREAMI/../common/node_modules/.bin/eslint" $@

export PATH="$OLDPATH"
