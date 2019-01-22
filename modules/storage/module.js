// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - storage/module.js
// Module to provide storage

// required libraries in this context
var storage = require('./storage'); // key-value storage
var execSync = require('child_process').execSync;
var scheduler = require('../../lib/scheduler');

// initialization function
function init () {
  // check for storage directory? if not there make one
  execSync('mkdir -p ../storage'); // TODO replace with Nodejs platform independant version TODO use conf
}

// exec
function exec (properties) {
  // decode our serialized properties
  var processID = properties.processID;
  // var source = properties.source;
  var command = properties.command;
  var subprocesses = [];
  // set request to what command we are performing
  global.hybrixd.proc[processID].request = properties.command;
  // handle standard cases here, and construct the sequential process list
  switch (command[0]) {
    case 'cron' :
      storage.autoClean();
      subprocesses.push('done("Autoclean")');
      break;
    case 'load':
    case 'get':
      subprocesses.push('type("file:data")');
      subprocesses.push('func("storage","get",{key:"' + command[1] + '"})');
      break;
    case 'save':
    case 'set': // stores data and returns proof of work to be solved
      subprocesses.push('func("storage","set",{key:"' + command[1] + '", value:"' + command[2] + '"})');
      break;
    case 'seek': // stores data and returns proof of work to be solved
      subprocesses.push('func("storage","seek",{key:"' + command[1] + '"})');
      break;
    case 'work':
    case 'pow':
      subprocesses.push('func("storage","pow",{key:"' + command[1] + '", pow:"' + command[2] + '"})');
      break;
    case 'burn':
    case 'del':
      subprocesses.push('fail("Deleting data from node storage is not supported!")');
      break;
    case 'meta':
      subprocesses.push('func("storage","meta",{key:"' + command[1] + '"})');
      break;
  }
  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, subprocesses);
}

var get = function (properties) {
  var processID = properties.processID;
  storage.get(properties.key,
    value => { scheduler.stop(processID, 0, value); },
    error => { scheduler.stop(processID, 1, error); }
  );
};

var qrtzLoad = function (properties) {
  var processID = properties.processID;
  storage.qrtzLoad(properties.key,
    value => { scheduler.stop(processID, 0, value); },
    error => { scheduler.stop(processID, 1, error); }
  );
};

var seek = function (properties) {
  var processID = properties.processID;
  storage.seek(properties.key,
    value => { scheduler.stop(processID, 0, value); },
    error => { scheduler.stop(processID, 1, error); }
  );
};

var set = function (properties) {
  var processID = properties.processID;
  storage.set({key: properties.key, value: properties.value},
    hash => { scheduler.stop(processID, 0, hash); },
    error => { scheduler.stop(processID, 1, error); }
  );
};

var pow = function (properties) {
  var processID = properties.processID;
  storage.provideProof({key: properties.key, pow: properties.pow},
    response => { scheduler.stop(processID, 0, response); },
    error => { scheduler.stop(processID, 1, error); }
  );
};

var meta = function (properties) {
  var processID = properties.processID;
  storage.getMeta(properties.key,
    meta => { scheduler.stop(processID, 0, meta); },
    error => { scheduler.stop(processID, 1, error); }
  );
};

// exports
exports.init = init;
exports.exec = exec;
exports.get = get;
exports.set = set;
exports.seek = seek;
exports.pow = pow;
exports.meta = meta;
exports.qrtzLoad = qrtzLoad;
