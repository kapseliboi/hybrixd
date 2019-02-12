// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - zcash/module.js
// Module to connect to zcash or any of its derivatives

// required libraries in this context
var fs = require('fs');
var Client = require('../../lib/rest').Client;
var functions = require('../../lib/functions');
var WebSocket = require('ws');
var Teletype = require('teletype');
var scheduler = require('../../lib/scheduler');
var modules = require('../../lib/modules');

// exports
exports.init = init;
exports.exec = exec;

// initialization function
function init () {
  modules.initexec('quartz', ['init']);
}

function addSubprocesses (subprocesses, commands, recipe, xpath) {
  for (var i = 0, len = commands.length; i < len; ++i) {
    subprocesses.push(commands[i]);
  }
  // Postprocess: Append formating of result for specific commands
  var command = xpath[0];
  if (command === 'balance' || command === 'fee') { // Append formatting of returned numbers
    subprocesses.push('form()');
    subprocesses.push('done()');
  }
}

// standard functions of an asset store results in a process superglobal -> global.hybrixd.process[processID]
// child processes are waited on, and the parent process is then updated by the postprocess() function
function exec (properties) {
  // decode our serialized properties
  var processID = properties.processID;
  var recipe = properties.target; // The recipe object

  var id; // This variable will contain the recipe.id for sources or the recipe.symbol for assets

  if (recipe.hasOwnProperty('symbol')) { // If recipe defines an asset
    id = recipe.symbol;
  } else if (recipe.hasOwnProperty('source')) { // If recipe defines a source
    id = recipe.source;
  } else if (recipe.hasOwnProperty('engine')) { // If recipe defines an engine
    id = recipe.engine;
  } else {
    console.log(' [i] Error: recipe file contains neither asset symbol nor engine or source id.');
  }

  global.hybrixd.proc[processID].request = properties.command; // set request to what command we are performing

  var recipecall = properties.command[0];

  var subprocesses = [];
  if (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty(recipecall)) {
    addSubprocesses(subprocesses, recipe.quartz[recipecall], recipe, properties.command);
  } else {
    if (global.hybrixd.defaultQuartz.hasOwnProperty('quartz') && global.hybrixd.defaultQuartz.quartz.hasOwnProperty(recipecall)) {
      addSubprocesses(subprocesses, global.hybrixd.defaultQuartz.quartz[recipecall], recipe, properties.command);
    } else {
      subprocesses.push('stop(1,"Recipe function \'' + recipecall + '\' not supported for \'' + id + '\'.")');
    }
  }

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, subprocesses);
}
