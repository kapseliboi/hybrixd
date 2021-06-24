#!/bin/sh
OLDPATH=$PATH
WHEREAMI=$(pwd)
export PATH=$WHEREAMI/node_binaries/bin:"$PATH"

# prepare variable for DEBUG purposes
if [ "$DEBUG_ENABLED" = "1" ]; then
    echo "[i] Running in debug-mode";
    DEBUG="-debug"
    mode=debug
else
    echo "[i] Running in release-mode"
    DEBUG=""
    mode=release
fi

echo "[i] Node version $(node --version) $(command -v node)"

# echo " [i] Install node_modules dependencies"
# curl --location --header "Private-Token: $CI_JOB_TOKEN" "https://gitlab.com/api/v4/projects/hybrix%2Fhybrixd%2Fdependencies%2Fnode_modules/jobs/artifacts/master/download?job=node_modules" -o node_modules.zip

# echo "[.] Unzip and replace node_modules"
# # remove link to node_modules and unzip the downloaded artifact to the directory (|| true --> on error, no problem)
# rm -rf  node_modules || true
# unzip -q -o artifacts-node_modules.zip -d node_modules/

git clone --quiet -n "https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.com/hybrix/hybrixd/dependencies/node_modules.git" --depth 1 --single-branch --branch master
cd node_modules
git checkout
cd ..

echo "[.] Retrieve common artifact"

curl -s --location --header "PRIVATE-TOKEN:$HYBRIX_BOT_GITLAB_PIPELINE_TOKEN" "https://gitlab.com/api/v4/projects/hybrix%2Fhybrixd%2Fcommon/jobs/artifacts/master/download?job=common" -o artifacts-common.zip

echo "[.] Unzip and replace common"
# remove link to common and unzip the downloaded artifact to the directory (|| true --> on error, no problem)
rm -rf  common || true
# note that chmod (file attributes) error: Not supported is a known issue that does not cause problems, but cannot be suppressed
unzip -q -o artifacts-common.zip -d common/

# remove the zip-file (|| true --> on error, no problem)
rm -rf  artifacts-common.zip || true

echo "[.] Retrieve interface artifact"
curl -s --location --header "PRIVATE-TOKEN:$HYBRIX_BOT_GITLAB_PIPELINE_TOKEN" "https://gitlab.com/api/v4/projects/hybrix%2Fhybrixd%2Finterface/jobs/artifacts/master/download?job=interface" -o artifacts-interface.zip

echo "[.] Unzip and replace interface"
# remove link to interface
rm -rf  interface || true


echo "[.] Retrieve interface source for generation of documentation"
# get content of interface/lib for generation of documentation
cd ..
git clone --quiet -n "https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.com/hybrix/hybrixd/interface.git" --depth 1
cd interface
git checkout origin/master -- lib
cd ..
cd node


# unzip the downloaded artifact to the directory
unzip -q -o artifacts-interface.zip -d ./interface/

# remove the zip-file (|| true --> on error, no problem)
rm -rf  artifacts-interface.zip || true

echo "[.] Retrieve deterministic artifact"
curl -s --location --header "PRIVATE-TOKEN:$HYBRIX_BOT_GITLAB_PIPELINE_TOKEN" "https://gitlab.com/api/v4/projects/hybrix%2Fhybrixd%2Fclient%2Fmodules%2Fdeterministic/jobs/artifacts/master/download?job=deterministic" -o artifacts-deterministic.zip


echo "[.] Unzip and replace deterministic"
# unzip the downloaded artifact to the directory (consider the artifact is packed as /modules/name/filename.lzma)
unzip -q -o artifacts-deterministic.zip -d artifacts-deterministic/
rm -rf ./modules/deterministic
cp -rf artifacts-deterministic/ ./modules/deterministic/

# remove the unzipped-files and the zip-file (|| true --> on error, no problem)
rm -rf  artifacts-deterministic || true
rm -rf  artifacts-deterministic.zip || true

BRANCH_WEB_WALLET=master

echo "[.] Retrieve web-wallet artifact from branch:  $BRANCH_WEB_WALLET"
curl -s --location --header "PRIVATE-TOKEN:$HYBRIX_BOT_GITLAB_PIPELINE_TOKEN" "https://gitlab.com/api/v4/projects/hybrix%2Fhybrixd%2Fclient%2Fimplementations%2Fweb-wallet/jobs/artifacts/$BRANCH_WEB_WALLET/download?job=web-wallet" -o artifacts-web-wallet.zip

echo "[.] Retrieve cli-wallet artifact"
curl -s --location "https://download.hybrix.io/releases/cli-wallet/latest/hybrix.cli-wallet.latest.zip" -o artifacts-cli-wallet.zip
mkdir ../tmp.cli-wallet
unzip -q -o artifacts-cli-wallet.zip -d ../cli-wallet

echo "[.] Compile hybrixd"
# run the build-script of the hybrixd-node
./scripts/npm/compile.sh

echo "[.] Overwrite web-wallet with artifact files"

# unzip the downloaded artifact to the directory
rm -rf ./dist/modules/web-wallet
mkdir -p ./dist/modules/web-wallet
chmod 755 ./dist/modules/web-wallet
unzip -q -o artifacts-web-wallet.zip -d ./dist/modules/web-wallet/

# remove the unzipped-files and the zip-file (|| true --> on error, no problem)
rm -rf  artifacts-web-wallet || true
rm -rf  artifacts-web-wallet.zip || true

echo "[.] Retrieve web-blockexplorer artifact"
curl -s --location --header "PRIVATE-TOKEN:$HYBRIX_BOT_GITLAB_PIPELINE_TOKEN" "https://gitlab.com/api/v4/projects/hybrix%2Fhybrixd%2Fclient%2Fimplementations%2Fweb-blockexplorer/jobs/artifacts/master/download?job=web-blockexplorer" -o artifacts-web-blockexplorer.zip

# unzip the downloaded artifact to the directory
rm -rf ./dist/modules/web-blockexplorer
mkdir -p ./dist/modules/web-blockexplorer
chmod 755 ./dist/modules/web-blockexplorer
unzip -q -o artifacts-web-blockexplorer.zip -d ./dist/modules/web-blockexplorer/

# remove the unzipped-files and the zip-file (|| true --> on error, no problem)
rm -rf  artifacts-web-blockexplorer || true
rm -rf  artifacts-web-blockexplorer.zip || true

echo "[.] Retrieve operator-ui artifact"
curl -s --location --header "PRIVATE-TOKEN:$HYBRIX_BOT_GITLAB_PIPELINE_TOKEN" "https://gitlab.com/api/v4/projects/hybrix%2Fhybrixd%2Fclient%2Fimplementations%2Foperator-ui/jobs/artifacts/master/download?job=build" -o artifacts-operator-ui.zip

echo "[.] Overwrite operator-ui with artifact files"

rm -rf ./dist/lib/router/report
mkdir -p ./dist/lib/router/report
chmod 755 ./dist/lib/router/report
unzip -q -o artifacts-operator-ui.zip -d ./dist/lib/router/report/

# remove the unzipped-files and the zip-file (|| true --> on error, no problem)
rm -rf  artifacts-operator-ui || true
rm -rf  artifacts-operator-ui.zip || true


echo "[.] Clean git files"
rm -rf ./.git* || true

echo "[.] Collect version information "

# create a .version file
timestamp=$(date -u '+%Y-%m-%dT%H:%M:%S+00:00')


npmlist=$(npm list --only=prod --depth=0 -json)

echo "{\"${CI_PROJECT_PATH_SLUG}\":{\"mode\":\"${mode}\", \"project_path\":\"${CI_PROJECT_PATH}\", \"commit_ref_name\":\"${CI_COMMIT_REF_NAME}\", \"commit_ref_slug\":\"${CI_COMMIT_REF_SLUG}\", \"commit_sha\":\"${CI_COMMIT_SHA}\", \"pipeline_url\":\"${CI_PIPELINE_URL}\", \"packaged\":\"${timestamp}\", \"npm-list\":${npmlist}}}" > .version

# concatenate all .version files in the package
find . -name ".version" -print | xargs cat | tr '\n' ' ' | sed 's:} {:,:g' > dist/versions.json

# prettify json in .versions
echo "const util = require('util'); const fs = require('fs'); var obj = JSON.parse(fs.readFileSync('dist/versions.json', 'utf8')); const fs_writeFile = util.promisify(fs.writeFile); const fs_readFile = util.promisify(fs.readFile); fs_writeFile('dist/versions.json', JSON.stringify(obj, null, 4));" > .prettify.js
node .prettify.js

# don't remove .version-files
rm -rf .version

echo "[.] Clean up tmp files"

# clean up and prepare the artifacts (instead of having a dist)
mv ./dist /tmp
rm -rf ./*
mv /tmp/dist/* ./

echo "[.] Remove hidden files from artifact"
# remove all files starting with a .
find -name ".*" -type f -delete

echo "[.] Done"
export PATH="$OLDPATH"
cd "$WHEREAMI"
