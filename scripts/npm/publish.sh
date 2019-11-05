echo "Publishing to NPM"

# Publish on NPM
npm install npm-cli-login
node ./node_modules/npm-cli-login/bin/npm-cli-login.js -u "$NPM_USER" -p "$NPM_PASSWORD" -e "$NPM_MAIL"
npm publish

# Publish on Github
sed -i -e "\$i \,\"publishConfig\": { \"registry\": \"https://npm.pkg.github.com/\" }" package.json
node ./node_modules/npm-cli-login/bin/npm-cli-login.js -u "$GITHUB_USER" -p "$GITHUB_PASSWORD" -e "$GITHUB_MAIL" -r "https://npm.pkg.github.com/"
npm publish
