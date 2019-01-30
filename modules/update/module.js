// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - storage/module.js
// Module to provide storage

var scheduler = require('../../lib/scheduler');

var fs = require('fs');
var execSync = require('child_process').execSync;

var projectId = '7832991'; // the hybrixd gitlab project id

// exports
exports.init = init;
exports.exec = exec;
exports.update = update;

// initialization function
function init () {
}

// exec
function exec (properties) {
  // decode our serialized properties
  var processID = properties.processID;
  // var source = properties.source;
  var command = properties.command;
  var subprocesses = [];
  // set request to what command we are performing
  global.hybrixd.proc[processID].request = command;

  var lastUpdated = '';
  if (fs.existsSync('../UPDATED')) {
    lastUpdated = fs.readFileSync('../UPDATED', 'utf8');
    // TODO validate if it is a valid timestamp string (without line end)
  }

  subprocesses.push('curl("https://gitlab.com","/api/v4/projects/' + projectId + '/repository/commits' + (lastUpdated ? '?since=' + lastUpdated : '') + '","GET")');
  subprocesses.push('test(data === [],1,2,data)'); // if no commits were done since last version
  subprocesses.push('stop(0,"hybrixd is up to date.")');
  subprocesses.push('tran(".0.committed_date",2,1)');
  subprocesses.push('stop(1,"Could not retrieve update information.")');
  subprocesses.push('test(data === "' + lastUpdated + '",1,2,data)');
  subprocesses.push('stop(0,"hybrixd is up to date.")');
  subprocesses.push('logs(0,"Update available: "+data,data)');
  subprocesses.push("func('update',{updated:data})");
  // Restart hybrixd
  subprocesses.push('rout("/command/reload")');

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, subprocesses);
}

function update (data) {
  execSync('rm -rf ../update/*');
  execSync('mkdir -p ../update');

  console.log(' [.] Retrieving archive package.');
  execSync('curl -OL "https://gitlab.com/api/v4/projects/' + projectId + '/repository/archive.tar.gz"');

  console.log(' [.] Unpacking archive.');
  execSync('tar xvf archive.tar.gz -C ../update');
  execSync('rm -f archive.tar.gz');
  execSync('printf "' + data.updated + '" > ../UPDATED');

  console.log(' [.] Updating files.');
  execSync('mv -f ../update/*/* ..');

  console.log(' [.] Clean up.');
  execSync('rm -f archive.tar.gz');
  execSync('rm -rf ../update/*');

  scheduler.stop(data.processID, 0, 'Update succesfull');
}
