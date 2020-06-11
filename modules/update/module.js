// (C) 2020 hybrix / Rouke Pouw

// required libraries in this context
const {getLatestVersion, compareVersions} = require('../../common/update.js');
const fs = require('fs');
function check (proc, xmlString) {
  const latestVersion = getLatestVersion(xmlString, 'node');
  let currentVersion;
  if (fs.existsSync('../package.json')) {
    try {
      currentVersion = JSON.parse(fs.readFileSync('../package.json')).version;
    } catch (e) {
      proc.fail('Could not parse version information.');
      return;
    }
  } else {
    proc.fail('No current version information available.');
    return;
  }
  switch (compareVersions(latestVersion, currentVersion)) {
    case 0:
      proc.done('Up to date: v' + latestVersion);
      return;
    case -1:
      proc.done('Update available: v' + latestVersion + ' (Now running v' + currentVersion + ')');
      return;
    case 1:
      proc.done('Experimental: v' + latestVersion + ' (Now running v' + currentVersion + ')');
      return;
    default:
      proc.fail('Could not compare versions. Latest: v' + latestVersion + ' Now running v' + currentVersion + '');
  }
}

exports.check = check;
