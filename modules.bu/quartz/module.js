// (C) 2015 Internet of Coins / Metasync / Joachim de Koning
// hybrixd module - zcash/module.js
// Module to connect to zcash or any of its derivatives

// required libraries in this context
const scheduler = require('../../lib/scheduler/scheduler');

// exports
exports.exec = exec;

// standard functions of an asset store results in a process superglobal -> global.hybrixd.process[processID]
// child processes are waited on, and the parent process is then updated by the postprocess() function
function exec (properties) {
  const processID = properties.processID;
  const recipe = properties.target; // The recipe object

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

  const functionName = properties.command[0];

  let qrtzFunctionOrSteps;
  if (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty(functionName)) {
    qrtzFunctionOrSteps = recipe.quartz[functionName];
  } else if (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty('_root')) {
    qrtzFunctionOrSteps = recipe.quartz['_root'];
  } else {
    qrtzFunctionOrSteps = ['fail "Recipe function \'' + functionName + '\' not supported for \'' + id + '\'."'];
  }

  // fire the Qrtz-language program into the subprocess queue
  scheduler.fire(processID, qrtzFunctionOrSteps);
}
