// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - zcash/module.js
// Module to connect to zcash or any of its derivatives

// required libraries in this context
let scheduler = require('../../lib/scheduler/scheduler');
let modules = require('../../lib/modules');
let fs = require('fs');

// exports
exports.init = init;
exports.exec = exec;

let defaultQuartz = null; // the default quartz functions

// initialization function
function init () {
  defaultQuartz = JSON.parse(fs.readFileSync('../modules/quartz/default.quartz.json', 'utf8'));

  modules.initexec('quartz', ['init']);
}

function addSubprocesses (subprocesses, commands, recipe, xpath) {
  let command = xpath[0];
  if (recipe.hasOwnProperty('symbol')) { // only for assets
    if (command === 'balance' || command === 'history' || command === 'unspent') {
      subprocesses.push('call validate/$1');
      subprocesses.push('flow valid 2  1');
      subprocesses.push('fail "Invalid address $1"');
    }
    if (command === 'transactionData') { // cache data
      // attempt reload of data
      subprocesses.push('data "$1_$symbol"');
      subprocesses.push('hash');
      subprocesses.push('data tx$');
      subprocesses.push('poke storageHash');
      subprocesses.push('load "$storageHash" 1 @requestData');
      subprocesses.push('unpk 1 @requestData');
      subprocesses.push('logs "getting transaction data from storage $1"');
      subprocesses.push('done');
      subprocesses.push('@requestData');
    }
    if (command === 'history') { // cache data
      subprocesses.push('poke count "$2"');
      subprocesses.push('poke offset "$3"');
      subprocesses.push('vars {"count":"12","offset":"0"}');
      subprocesses.push('data "$1_$count_$offset_$symbol"');
      subprocesses.push('hash');
      subprocesses.push('data tx$');
      subprocesses.push('poke storageHash');
    }
  }

  for (let i = 0, len = commands.length; i < len; ++i) {
    subprocesses.push(commands[i]);
  }

  if (recipe.hasOwnProperty('symbol')) { // only for assets
    // Prepend address validation

    // Postprocess: Append formating of result for specific commands
    if (command === 'balance' || command === 'fee') { // append formatting of returned numbers
      subprocesses.push('form');
      subprocesses.push('done');
    }
    if (command === 'transactionData') { // cache data
      // save/cache rawtx data
      subprocesses.push('poke txData');
      subprocesses.push('pack');
      subprocesses.push('save "$storageHash"');
      subprocesses.push('peek txData');
      subprocesses.push('done');
    }
    if (command === 'transaction') { // append formatting of returned numbers
      subprocesses.push('poke formAmount ${.amount}');
      subprocesses.push('with formAmount form');
      subprocesses.push('poke formFee ${.fee}');
      subprocesses.push('with formFee form');
      subprocesses.push('data {id:"${.id}",timestamp:${.timestamp},height:${.height},amount:"$formAmount",symbol:"${.symbol}",fee:"$formFee",fee-symbol:"${.fee-symbol}",source:"${.source}",target:"${.target}",confirmed:${.confirmed}}');
      subprocesses.push('done');
    }
    if (command === 'history') { // take into account the offset and record count
      subprocesses.push('take $offset $count');
      subprocesses.push('poke historyData');
      subprocesses.push('pack');
      subprocesses.push('save "$storageHash"');      
      subprocesses.push('peek historyData');
      subprocesses.push('done');
      subprocesses.push('@returnCached');
      subprocesses.push('load "$storageHash" 1 @failCache');
      subprocesses.push('unpk 1 @failCache');
      subprocesses.push('logs "getting history data from storage $1"');
      subprocesses.push('done');
      subprocesses.push('@failCache');
      subprocesses.push('fail "Cannot get history!"');
    }
    if (command === 'status') { // significantly shorten the status hash to save bandwidth
      subprocesses.push('take 24 16');
      subprocesses.push('done');
    }
  }
}

// standard functions of an asset store results in a process superglobal -> global.hybrixd.process[processID]
// child processes are waited on, and the parent process is then updated by the postprocess() function
function exec (properties) {
  // decode our serialized properties
  let processID = properties.processID;
  let recipe = properties.target; // The recipe object

  let id; // This variable will contain the recipe.id for sources or the recipe.symbol for assets

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

  let recipecall = properties.command[0];

  let subprocesses = [];
  if (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty(recipecall)) {
    addSubprocesses(subprocesses, recipe.quartz[recipecall], recipe, properties.command);
  } else if (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty('_root')) {
    addSubprocesses(subprocesses, recipe.quartz['_root'], recipe, properties.command);
  } else {
    if (defaultQuartz.hasOwnProperty('quartz') && defaultQuartz.quartz.hasOwnProperty(recipecall)) {
      addSubprocesses(subprocesses, defaultQuartz.quartz[recipecall], recipe, properties.command);
    } else {
      subprocesses.push('stop(1,"Recipe function \'' + recipecall + '\' not supported for \'' + id + '\'.")');
    }
  }

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, subprocesses);
}
