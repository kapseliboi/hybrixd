// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybridd module - storage/module.js
// Module to provide storage

// required libraries in this context

var IoC = require('../../common/ioc.client/ioc.nodejs.client');
var ioc = new IoC.Interface({http: require('http')});

// exports
exports.init = init;
exports.exec = exec;

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
  global.hybridd.proc[processID].request = properties.command;

  // handle standard cases here, and construct the sequential process list
  switch (command[0]) {
    case 'asset' :
      for (var symbol in global.hybridd.asset) {
        if (symbol.indexOf('.') === -1) {
          subprocesses.push('call("asset://' + symbol + '","status")');
        }
      }

      break;
  }

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, subprocesses);
}
