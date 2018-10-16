#!/bin/bash

#TODO: back to #!/bin/sh

OLDPATH="$PATH"
WHEREAMI=`pwd`
export PATH=$WHEREAMI/node/bin:"$PATH"
NODEINST=`which node`
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
jsdoc "$NODE/lib/scheduler/quartz.js"  -d "$NODE/docs"

echo "[.] Creating hybridd release..."

# Create path if required, clean otherwise
mkdir -p "$DIST"
echo "[.] Cleaning target path"
rm -rfv "$DIST/*" >/dev/null

echo "[.] Processing Files"
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

# Only handle files in the following folders
FOLDERS="lib modules recipes recipes.EXTRA common"

#TODO: For DASH: Test if there are enough remaining arguments: if [ "$#" -gt 0 ]; then shift; fi

function join_by { local IFS="$1"; shift; echo "$*"; }
# Only copy files certain with certain exenstions
for FILE in $(find -L . -name '*.js' -or -name '*.css'  -or -name '*.json' -or -name '*.html' -or -name '*.ico' -or -name '*.svg' -or -name '*.lzma' -or -name '*.ttf' -or -name '*.woff' -or -name '*.woff2' -or -name '*.eot'); do

    # Skip files in ./common/node and ./common/node_modules
    if [[ $FILE != "./common/node"* ]]; then

#TODO: Rewrite <<< (this is not DASH)
        IFS='/' read -ra FILEPATH <<< "$FILE"
        FOLDER="${FILEPATH[1]}"
        if [[ $FOLDERS =~ (^|[[:space:]])$FOLDER($|[[:space:]]) ]]; then

            EXT="${FILE##*.}"
            unset 'FILEPATH[${#FILEPATH[@]}-1]'
            FOLDER=$(join_by / "${FILEPATH[@]}")

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
