// (C) 2020 hybrix / Rouke Pouw

// required libraries in this context
const {getLatestVersion, compareVersions} = require('../../common/update.js');
const fs = require('fs');

function get (proc, htmlString) {
  const latestVersion = getLatestVersion(htmlString);
  return latestVersion === 'error'
    ? proc.fail('Could not retrieve version information.')
    : proc.done(latestVersion);
}

function check (proc, htmlString) {
  const latestVersion = getLatestVersion(htmlString);
  if (latestVersion === 'error') return proc.fail('Could not retrieve version information.');

  let currentVersion;
  if (fs.existsSync('../package.json')) {
    try {
      currentVersion = JSON.parse(fs.readFileSync('../package.json')).version;
    } catch (e) {
      return proc.fail('Could not parse version information.');
    }
  } else return proc.fail('No current version information available.');

  switch (compareVersions(latestVersion, currentVersion)) {
    case 0 : return proc.done('Up to date: v' + latestVersion);
    case -1 : return proc.done('Update available: v' + latestVersion + ' (Now running v' + currentVersion + ')');
    case 1 : return proc.done('Experimental: v' + latestVersion + ' (Now running v' + currentVersion + ')');
    default : return proc.fail('Could not compare versions. Latest: v' + latestVersion + ' Now running v' + currentVersion + '');
  }
}

exports.check = check;
exports.get = get;
