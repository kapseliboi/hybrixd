#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
export PATH=$WHEREAMI/node/bin:"$PATH"
NODEINST=`which node`
UGLIFY=node_modules/uglify-es/bin/uglifyjs
CSSMIN=node_modules/cssmin/bin/cssmin

OUTPATH=../hybridd-public

echo "[.] Creating hybridd release..."

# Create path if required, clean otherwise
mkdir -p $OUTPATH
echo "[.] Cleaning target path"
rm -rfv $OUTPATH/* >/dev/null

# Copy the main entrypoint
cp hybridd $OUTPATH/
# Copy license
cp LICENSE.md $OUTPATH/
# Copy readme
cp README.md $OUTPATH/

# Copy configuration
# TODO create a default here
cp hybridd.conf $OUTPATH/

# Copy node_modules
cp -r node_modules $OUTPATH/


#TODO node runtime
#TODO default dummy conf??

# Only handle files in the following folders
FOLDERS="lib modules recipes recipes.EXTRA scripts common"

function join_by { local IFS="$1"; shift; echo "$*"; }

# Only copy files certain with certain exenstions
for FILE in $(find -L . -name '*.js' -or -name '*.css'  -or -name '*.json' -or -name '*.html' -or -name '*.ico' -or -name '*.svg' -or -name '*.lzma' -or -name '*.ttf' -or -name '*.woff' -or -name '*.woff2' -or -name '*.eot'); do

    # Skip files in ./common/node and ./common/node_modules
    if [[ $FILE != "./common/node"* ]]; then

        IFS='/' read -ra FILEPATH <<< "$FILE"
        FOLDER="${FILEPATH[1]}"
        if [[ $FOLDERS =~ (^|[[:space:]])$FOLDER($|[[:space:]]) ]]; then

            EXT=${FILE##*.}
            unset 'FILEPATH[${#FILEPATH[@]}-1]'
            FOLDER=$(join_by / "${FILEPATH[@]}")

            mkdir -p $OUTPATH/$FOLDER
            case $EXT in
                js)
                    $UGLIFY $FILE --compress --mangle > $OUTPATH/$FILE
                    ;;
                css)
                    $CSSMIN $FILE > $OUTPATH/$FILE
                    ;;
                *)
                    cp $FILE $OUTPATH/$FOLDER
                    ;;
            esac
        fi

   fi
done

echo "[.] Release created in $OUTPATH"
echo "[.] Make sure you have a proper hybridd.conf and node binaries."
