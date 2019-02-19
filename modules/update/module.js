// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - storage/module.js
// Module to provide storage

let execSync = require('child_process').execSync;

// exports
exports.update = update;

function update (proc, data) {
  execSync('rm -rf ../update/*');
  execSync('mkdir -p ../update');

  console.log(' [.] Retrieving archive package.');
  execSync('curl -OL "https://gitlab.com/api/v4/projects/' + data.projectId + '/repository/archive.tar.gz"');

  console.log(' [.] Unpacking archive.');
  execSync('tar xvf archive.tar.gz -C ../update');
  execSync('rm -f archive.tar.gz');

  console.log(' [.] Updating files.');
  execSync('mv -f ../update/*/* ..');

  console.log(' [.] Clean up.');
  execSync('rm -f archive.tar.gz');
  execSync('rm -rf ../update/*');

  proc.pass('Update succesfull');
}
