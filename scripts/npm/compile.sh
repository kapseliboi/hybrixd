#!/bin/sh
OLDPATH="$PATH"
WHEREAMI="`pwd`"

UGLIFY="node_modules/uglify-es/bin/uglifyjs"
CSSMIN="node_modules/cssmin/bin/cssmin"

# $HYBRIXD/node/scripts/npm  => $HYBRIXD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

NODE="$HYBRIXD/node"
DIST="$NODE/dist"

export PATH="$NODE/node_binaries/bin:$PATH"
NODEINST="`which node`"
NPMINST="`which npm`"


# QUARTZ
echo "[.] Generate Quartz documentation."
mkdir -p "$NODE/docs"
cd "$NODE/scripts/docs"
sh "$NODE/scripts/docs/docs.sh"

echo "[.] Creating hybrixd release..."

# Create path if required, clean otherwise
mkdir -p "$DIST"
echo "[.] Cleaning target path"
rm -rfv "$DIST/*" >/dev/null

echo "[.] Processing files"
cd "$NODE"

# Copy the main entrypoint
cp "$NODE/hybrixd" "$DIST/"
# Copy license
cp "$NODE/LICENSE.md" "$DIST/"
# Copy readme
cp "$NODE/README.md" "$DIST/"

# Copy package.json
cp "$NODE/package.json" "$DIST/"

# Copy configuration
# TODO create a default here
cp "$NODE/hybrixd.conf" "$DIST/"

# Copy node_modules
rsync -avq "$NODE/node_modules" "$DIST/"

# Copy modules
rsync -avq "$NODE/modules" "$DIST/"

# Copy interface
rsync -avq "$NODE/interface" "$DIST/"

# Copy common
rsync -avq "$NODE/common/crypto" "$DIST/common/"
rsync -avq "$NODE/common/node_modules" "$DIST/common/"
cp $NODE/common/*.js "$DIST/common/"
cp $NODE/common/*.json "$DIST/common/"
#TODO node runtime
#TODO default dummy conf??

FOLDERS="lib docs recipes recipes.EXTRA"

# Only copy files certain with certain exenstions
for FILE in $(find $FOLDERS -name '*.js' -or -name '*.js.map' -or -name '*.css' -or -name '*.json' -or -name '*.html' -or -name '*.ico' -or -name '*.png' -or -name '*.svg' -or -name '*.lzma' -or -name '*.ttf' -or -name '*.woff' -or -name '*.woff2' -or -name '*.eot'); do
    EXT="${FILE##*.}"
    FOLDER=$(dirname "${FILE}")
    mkdir -p "$DIST/$FOLDER"
  #  case "$EXT" in
   #     js)
    #        $UGLIFY "$FILE" --compress --mangle > "$DIST/$FILE"
     #       ;;
      #  css)
       #     $CSSMIN "$FILE" > "$DIST/$FILE"
        #    ;;
        #*)
            cp "$FILE" "$DIST/$FOLDER"
         #   ;;
#    esac
done


echo "[.] Prune node npm dev dependencies "
cd "$DIST"
"$NPMINST" prune --production

echo "[.] Prune common npm dev dependencies "
cd "$DIST/common"
"$NPMINST" prune --production


echo "[.] Release created in node/dist"
echo "[.] Make sure you have a proper hybrixd.conf and node binaries."
export PATH="$OLDPATH"
cd "$WHEREAMI"
