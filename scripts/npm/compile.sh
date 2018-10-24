#!/bin/sh
OLDPATH="$PATH"
WHEREAMI="`pwd`"
export PATH="$WHEREAMI/node_binaries/bin:$PATH"
NODEINST="`which node`"
UGLIFY=node_modules/uglify-es/bin/uglifyjs
CSSMIN=node_modules/cssmin/bin/cssmin

# $HYBRIDD/node/scripts/npm  => $HYBRIDD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIDD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

NODE="$HYBRIDD/node"
DIST="$NODE/dist"

# QUARTZ
echo "[.] Generate Quartz documentation."
mkdir -p "$NODE/docs"
jsdoc -d="$NODE/docs" "$NODE/lib/scheduler/quartz.js"

echo "[.] Creating hybridd release..."

# Create path if required, clean otherwise
mkdir -p "$DIST"
echo "[.] Cleaning target path"
rm -rfv "$DIST/*" >/dev/null

echo "[.] Processing files"
cd "$NODE"

# Copy the main entrypoint
cp "$NODE/hybridd" "$DIST/"
# Copy license
cp "$NODE/LICENSE.md" "$DIST/"
# Copy readme
cp "$NODE/README.md" "$DIST/"

# Copy configuration
# TODO create a default here
cp "$NODE/hybridd.conf" "$DIST/"

# Copy node_modules
cp -r "$NODE/node_modules" "$DIST/"

#TODO node runtime
#TODO default dummy conf??


# Only copy files certain with certain exenstions
for FILE in $(find -L . -name '*.js' -or -name '*.css'  -or -name '*.json' -or -name '*.html' -or -name '*.ico' -or -name '*.svg' -or -name '*.lzma' -or -name '*.ttf' -or -name '*.woff' -or -name '*.woff2' -or -name '*.eot'); do
    # Skip files in ./common/node and ./common/node_modules
    if [ "$FILE" != "./common/node"* ]; then

        # FILE=BASEFOLDER/SUBFOLDER/.../FILE
        OLD_IFS="$IFS"
        IFS=/     # configure the split part to use / as the delimiter
        set -f    # disable the glob part
        set -- $FILE # $1 is split on : and parts are stored in $1, $2...
        BASEFOLDER="$2"
        IFS="$OLD_IFS"
        # Only handle files in the following folders
        if [ "$BASEFOLDER" = "lib" ] || [ "$BASEFOLDER" = "modules" ] || [ "$BASEFOLDER" = "recipes" ] || [ "$BASEFOLDER" = "recipes.EXTRA" ] || [ "$BASEFOLDER" = "common" ] || [ "$BASEFOLDER" = "interface" ]; then

            EXT="${FILE##*.}"
            FOLDER=$(dirname "${FILE}")
            mkdir -p "$DIST/$FOLDER"
            case "$EXT" in
                js)
                    $UGLIFY "$FILE" --compress --mangle > "$DIST/$FILE"
                    ;;
                css)
                    $CSSMIN "$FILE" > "$DIST/$FILE"
                    ;;
                *)
                    cp "$FILE" "$DIST/$FOLDER"
                    ;;
            esac
        fi

   fi
done

echo "[.] Release created in node/dist"
echo "[.] Make sure you have a proper hybridd.conf and node binaries."
export PATH="$OLDPATH"
cd "$WHEREAMI"
