#!/bin/sh
WHEREAMI=$(pwd)
OLDPATH=$PATH

# $NODE/scripts/npm  => $HYBRIXD
SCRIPTDIR=$(dirname "$0")
NODE=$(cd "$SCRIPTDIR/../.." && pwd)

if [ -e "$NODE/README.release.mdTODO" ]; then
    echo "[!] You are trying to update a developer version of hybrixd. Please us git pull to retrieve updates. Only release versions can be updated using the update command."
    cd "$WHEREAMI"
    export PATH="$OLDPATH"
    exit 1
fi

if ! command -v rsync > /dev/null 2>&1
then
    echo "[!] rsync command not available."
    cd "$WHEREAMI"
    export PATH="$OLDPATH"
    exit 1
fi

TMP="$NODE/tmp"
TMP_LATEST="$TMP/latest"
CURRENT_VERSION=$(cat "$NODE/package.json" \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

curl --silent --location "https://storage.googleapis.com/hybrix-dist" -o "$TMP/versions.xml"

VERSION_XML=$(cat "$TMP/versions.xml")

LATEST_VERSION=$(echo "console.log(require('$NODE/common/update').getLatestVersion(\`$VERSION_XML\`,'node'))" | node);


echo "[i] Current version: $CURRENT_VERSION"
echo "[i] Latest version: $LATEST_VERSION"


if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
    echo "[i] Already up to date with latest version. Nothing to do."
    cd "$WHEREAMI"
    export PATH="$OLDPATH"
    exit 0;
fi

echo "[i] Updating hybrixd."

rm -rf "$TMP_LATEST" > /dev/null 2>&1 || true
echo "[i] Downloading latest package"
mkdir -p "$TMP_LATEST"


echo "[i] Retrieving latest package"
URLPATH="https://storage.googleapis.com/hybrix-dist/node/latest"
URLFILE="hybrixd.node.latest.tar.gz"
rm "$TMP/$URLFILE" > /dev/null 2>&1 || true
curl --silent --location "$URLPATH/$URLFILE" -o "$TMP/$URLFILE"

echo "[i] Unpacking package"
tar xf "$TMP/$URLFILE" -C "$TMP_LATEST/"

echo "[i] Remove package"
rm "$TMP/$URLFILE" || true

echo "[i] Creating backup"

mkdir -p "$NODE/tmp/backup.tmp"

rsync -a \
      --exclude "storage" \
      --exclude "dist" \
      --exclude "var" \
      --exclude "tmp" \
      "$NODE/" "$NODE/tmp/backup.tmp/"

mv "$NODE/tmp/backup.tmp/" "$NODE/tmp/backup/"


echo "[i] Checking if hybrixd is shut down successfully..."
pid=$(ps -ax | grep "node hybrixd.js" | grep -v "grep"  | cut -f 1 -d " ")
if [ -n "$pid" ]; then
    echo "[!] hybrixd is still running. Please stop hybrixd before updating. Use: ./hybrixd stop"
    cd "$WHEREAMI"
    export PATH="$OLDPATH"
    exit 1
fi

rsync -a --delete \
      --exclude "storage" \
      --exclude "dist" \
      --exclude "var" \
      --exclude "tmp" \
      --exclude "hybrixd.conf" \
      --exclude "hybrixd.keys" \
      "$NODE/tmp/latest/" "$NODE/"

echo "[i] hybrixd was updated succesfully to $LATEST_VERSION"
