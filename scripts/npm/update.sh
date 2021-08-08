#!/bin/sh
WHEREAMI=$(pwd)
OLDPATH=$PATH

# $NODE/scripts/npm  => $HYBRIXD
SCRIPTDIR=$(dirname "$0")
NODE=$(cd "$SCRIPTDIR/../.." && pwd)
export PATH=$NODE/node_binaries/bin:"$PATH"

logger(){
  echo "$1 $(date +%Y-%m-%dT%T) $2 $3" | tee -a "$NODE/var/log/hybrixd.log"
}

if [ -e "$NODE/README.release.md" ]; then
    logger "[!]" "update" "You are trying to update a developer version of hybrixd. Please us git pull to retrieve updates. Only release versions can be updated using the update command."
    cd "$WHEREAMI"
    export PATH="$OLDPATH"
    exit 1
fi

if ! command -v rsync > /dev/null 2>&1
then
    logger "[!]" "update" "rsync command not available."
    cd "$WHEREAMI"
    export PATH="$OLDPATH"
    exit 1
fi

if ! command -v curl > /dev/null 2>&1
then
    logger "[!]" "update" "curl command not available."
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

curl --silent --location "https://download.hybrix.io/releases/hybrixd/" -o "$TMP/releases.html"

RELEASES_HTML=$(cat "$TMP/releases.html")

LATEST_VERSION=$(echo "console.log(require('$NODE/common/update').getLatestVersion(\`$RELEASES_HTML\`))" | node);

logger "[i]" "update" "Current version: $CURRENT_VERSION"
logger "[i]" "update" "Latest version: $LATEST_VERSION"

if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
    logger "[i]" "update" "Already up to date with latest version. Nothing to do."
    cd "$WHEREAMI"
    export PATH="$OLDPATH"
    exit 0;
fi

logger "[i]" "update" "Updating hybrixd."

rm -rf "$TMP_LATEST" > /dev/null 2>&1 || true
logger "[i]" "update" "Downloading latest package"
mkdir -p "$TMP_LATEST"

logger "[i]" "update" "Retrieving latest package"
URLPATH="https://download.hybrix.io/releases/hybrixd/latest"
URLFILE="hybrixd.latest.tar.gz"
rm "$TMP/$URLFILE" > /dev/null 2>&1 || true
curl --silent --location "$URLPATH/$URLFILE" -o "$TMP/$URLFILE"

logger "[i]" "update" "Unpacking package"
tar xf "$TMP/$URLFILE" -C "$TMP_LATEST/"

logger "[i]" "update" "Remove package"
rm "$TMP/$URLFILE" || true

logger "[i]" "update" "Creating backup"

mkdir -p "$NODE/tmp/backup.tmp"

rsync -a \
      --exclude "node_binaries" \
      --exclude "storage" \
      --exclude "dist" \
      --exclude "var" \
      --exclude "tmp" \
      --exclude "hybrixd.conf" \
      --exclude "hybrixd.keys" \
      "$NODE/" "$NODE/tmp/backup.tmp/"

mv "$NODE/tmp/backup.tmp/" "$NODE/tmp/backup/"


logger "[i]" "update" "Checking if hybrixd is shut down successfully..."
pid=$(ps -ax | grep "node hybrixd.js" | grep -v "grep"  | cut -f 1 -d " ")
if [ -n "$pid" ]; then
    logger "[!]" "update" "hybrixd is still running. Please stop hybrixd before updating. Use: ./hybrixd stop"
    cd "$WHEREAMI"
    export PATH="$OLDPATH"
    exit 1
fi

rsync -a --delete \
      --exclude "node_binaries" \
      --exclude "storage" \
      --exclude "dist" \
      --exclude "var" \
      --exclude "tmp" \
      --exclude "hybrixd.conf" \
      --exclude "hybrixd.keys" \
      "$NODE/tmp/latest/" "$NODE/"

logger "[i]" "update" "hybrixd was updated succesfully to $LATEST_VERSION"
