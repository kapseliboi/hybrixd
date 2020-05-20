#!/bin/sh
OLDPATH=$PATH
WHEREAMI=$(pwd)

VERSION=$(cat package.json | grep version | cut -d'"' -f4)
echo "[i] Version $VERSION"

echo "[.] Use README.npm.md as README.md"
rm -rf ./README.md
mv ./README.npm.md ./README.md

echo "[.] Clean distributables"
sh ./scripts/pipeline/clean.sh

echo "[.] Modify version in package.json"
sed -i -e "s/.*version.*/\"version\": \"$VERSION\",/" package.json

echo "[.] Install npm-cli-login (FIXME: should not be needed)"
#TODO implement without npm-cli-login use .npmrc instead (in interface as well)
npm install npm-cli-login --save-dev

echo "[.] Login to npm"
node ./node_modules/npm-cli-login/bin/npm-cli-login.js -u "$NPM_USER" -p "$NPM_PASSWORD" -e "$NPM_MAIL" -r "https://registry.npmjs.org"

echo "[.] Publish on npm"
npm publish

echo "[.] Modify package.json for github"
sed -i -e 's+"name": "+"name": "@hybrix-io/+g' package.json

echo "//npm.pkg.github.com/:_authToken=$GITHUB_PAT" > .npmrc
echo "@hybrix-io:registry=https://npm.pkg.github.com" >> .npmrc

echo "[.] Publish to github packages"
npm publish
rm .npmrc


export PATH="$OLDPATH"
cd "$WHEREAMI"
