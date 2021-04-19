#!/bin/sh
OLDPATH="$PATH"
WHEREAMI="`pwd`"

# $HYBRIXD/node/scripts/npm  => $HYBRIXD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

NODE="$HYBRIXD/node"
DIST="$NODE/dist"

export PATH="$NODE/node_binaries/bin:$PATH"
NPMINST="`which npm`"


# QUARTZ
echo "[.] Generate qrtz documentation."
mkdir -p "$NODE/docs"
cd "$NODE/scripts/docs"
sh "$NODE/scripts/docs/docs.sh"

echo "[.] Generate icons."
sh "$NODE/scripts/icons/icons.sh"

cd "$NODE"
echo "[.] Bundle qrtz tests."
node "$NODE/scripts/npm/compileQrtzTests.js"
cd "$NODE"

echo "[.] Creating hybrixd release..."

# Create path if required, clean otherwise
mkdir -p "$DIST"
echo "[.] Cleaning target path"
rm -rfv "$DIST" >/dev/null

mkdir -p "$DIST"

echo "[.] Processing files"
cd "$NODE"

# Copy the main entrypoint
cp "$NODE/hybrixd" "$DIST/"
# Copy the main entrypoint
cp "$NODE/hstat" "$DIST/"
# Copy the qrtz entrypoint
cp "$NODE/qrtz" "$DIST/"
# Copy license
cp "$NODE/LICENSE.md" "$DIST/"
# Copy readme's
cp "$NODE/README.release.md" "$DIST/README.md"
cp "$NODE/README.npm.md" "$DIST/README.npm.md"

# Copy package.json
cp "$NODE/package.json" "$DIST/"
echo "[.] Copy node_modules..."
# Copy node_modules
cp -r "$NODE/node_modules" "$DIST/"

echo "[.] Copy modules..."
rsync -avq "$NODE/modules" "$DIST/"

echo "[.] Copy hybrix-jslib..."
rsync -avq "$NODE/interface" "$DIST/"

echo "[.] Copy files..."
rsync -avq "$NODE/files" "$DIST/"

echo "[.] Copy scripts..."
# Copy npm setup and test scripts
mkdir -p "$DIST/scripts/npm/"
cp "$NODE/scripts/npm/test.sh" "$DIST/scripts/npm/test.sh"
cp "$NODE/scripts/npm/setup.sh" "$DIST/scripts/npm/setup.sh"
cp "$NODE/scripts/npm/update.sh" "$DIST/scripts/npm/update.sh"
cp -r "$NODE/scripts/test" "$DIST/scripts/test"

# Copy pipeline scripts
rsync -avq "$NODE/scripts/pipeline" "$DIST/scripts/"

echo "[.] Copy common..."
rsync -avq "$NODE/common/crypto" "$DIST/common/"
rsync -avq "$NODE/common/byte" "$DIST/common/"
rsync -avq "$NODE/common/node_modules" "$DIST/common/"
cp "$NODE"/common/*.js "$DIST/common/"
cp "$NODE"/common/*.json "$DIST/common/"
#TODO node runtime

echo "[.] Copy recipes..."
mkdir -p "$DIST/recipes"
rsync -aq --include="*.json" --include="*/" --exclude="*" "./recipes/" "$DIST/recipes/"
mkdir -p "$DIST/recipes.EXTRA"
rsync -aq --include="*.json" --include="*/" --exclude="*" "./recipes.EXTRA/" "$DIST/recipes.EXTRA/"

echo "[.] Copy lib..."
mkdir -p "$DIST/lib"
rsync -avq --include="*.js" --include="*.js.map" --include="*.css" --include="*.json" --include="*.html" --include="*.ico" --include="*.png" --include="*.svg" --include="*.lzma" --include="*.ttg" --include="*.woff" --include="*.woff2" --include="*.eot"  --include="*/" --exclude="*" "./lib/" "$DIST/lib/"

echo "[.] Copy docs..."
mkdir -p "$DIST/docs"
rsync -avq --include="*.js" --include="*.js.map" --include="*.css" --include="*.json" --include="*.html" --include="*.ico" --include="*.png" --include="*.svg" --include="*.lzma" --include="*.ttg" --include="*.woff" --include="*.woff2" --include="*.eot"  --include="*/" --exclude="*" "./docs/" "$DIST/docs/"

echo "[.] Prune node npm dev dependencies "
cd "$DIST"
"$NPMINST" prune --production

echo "[.] Prune common npm dev dependencies "
cd "$DIST/common"
"$NPMINST" prune --production

echo "[.] Release created in node/dist"
export PATH="$OLDPATH"
cd "$WHEREAMI"
