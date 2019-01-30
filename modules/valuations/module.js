var scheduler = require('../../lib/scheduler');
var download = require('./download-prices');
var valuate = require('./valuate');
var parse = require('./parse-prices');

var prices;

function init () {
  prices = parse.parse();
}

function exec (properties) {
  var processID = properties.processID;
  var command = properties.command;

  if (command.length === 1) {
    var subprocesses = [];
    if (command[0] === 'cron') {
      prices = parse.parse();
      subprocesses.push('each($sources,"download")');
    } else if (command[0] === 'download') {
      // todo curl to url
      // todo save to local var object
      subprocesses.push('logs("Hi!")');
      subprocesses.push('done(null)');
    }
    scheduler.fire(processID, subprocesses);
  } else if (command.length >= 2) {
    var result = valuate.valuate(prices, command[0], command[1]);
    if (result.error) {
      return {error: result.error || 0, data: 'No valuation available for ' + command[0] + ':' + command[1]};
    }
    var amount = command.length === 3 ? Number(command[2]) : 1;
    return {error: 0, data: result.rate * amount};
  }
}

exports.init = init;
exports.exec = exec;
