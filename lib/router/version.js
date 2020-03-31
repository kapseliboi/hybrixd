exports.serve = serve;

const fs = require('fs');

let version;
try {
  const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'));
  version = packageJson.version;
} catch (e) {}

function serve (request, xpath) {
  if (xpath.length === 2 && xpath[1] === 'details') {
    return {data: '../versions.json', mime: 'file:application/json', error: 0};
  } else if (xpath.length === 1) {
    return typeof version === 'string'
      ? {data: version, error: 0}
      : {data: 'Failed to retrieve version.', error: 500};
  } else {
    return {data: 'Bad request', error: 400};
  }
}
