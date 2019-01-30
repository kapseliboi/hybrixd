var scheduler = require('../../lib/scheduler');
var valuate = require('./valuate');
var parse = require('./parse-prices');

var prices;

function init () {
}

function exec (properties) {
  var target = properties.target;
  var processID = properties.processID;
  var command = properties.command;
  var subprocesses = [];

  if (command.length === 1) {
    if (command[0] === 'cron') {
      subprocesses.push("each $sources 'download'");
      subprocesses.push("func 'valuations' 'parse'");
      subprocesses.push("poke 'local::prices'");
      subprocesses.push("done 'Finished'");

      //      subprocesses.push("peek 'local::prices'");
    } else if (command[0] === 'download') {
      subprocesses.push("poke 'key' ($.key)");
      subprocesses.push("poke 'site' ($.value.site)");
      subprocesses.push("poke 'type' ($.value.type)");
      subprocesses.push("curl '$site' '' 'GET' {} {parsing:'$type'}");
      subprocesses.push('done');
    }
  } else if (command.length >= 2) {
    subprocesses.push("data {source: '$0', target:'$1', amount:'$2', prices: $local::prices}");
    subprocesses.push("func 'valuations' 'valuate'");
    subprocesses.push('done');
  }
  scheduler.fire(processID, subprocesses);
}

exports.init = init;
exports.parse = parse.parse;
exports.valuate = valuate.valuate;
exports.exec = exec;
